import { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../../redux/slices/authSlice";
import { decryptFile } from "../../../lib/crypto";

// Global cache for decrypted attachment blobs across the session
export const attachmentBlobCache = new Map();
const inFlightDecryptions = new Map();

/*
  Resolves any relative URL to an absolute URL pointing to the backend.
*/
export function getAbsoluteUrl(url) {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const backendBase = (
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "") : "") ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
}

/*
  useDecryptedAttachment
  Decrypts an encrypted file attachment on demand and caches the blob URL permanently for the session.
  Prevents redundant re-decryptions and invalid object URL revocations.
*/
export default function useDecryptedAttachment(
  attachmentUrl,
  attachmentEncryption,
  mimeType = "application/octet-stream",
  localBlobUrl = null
) {
  const user = useSelector(selectUser);

  // Check cache immediately
  const absUrl = useMemo(() => getAbsoluteUrl(attachmentUrl), [attachmentUrl]);
  const cachedUrl = (attachmentUrl && attachmentBlobCache.get(attachmentUrl)) ||
                    (absUrl && attachmentBlobCache.get(absUrl)) ||
                    null;

  const initialBlobUrl = localBlobUrl || cachedUrl || null;
  const [blobUrl, setBlobUrl] = useState(initialBlobUrl);
  const [loading, setLoading] = useState(!initialBlobUrl && !!attachmentUrl);
  const [downloadProgress, setDownloadProgress] = useState(initialBlobUrl ? 100 : 0);
  const [error, setError] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const retry = useCallback(() => {
    if (attachmentUrl) {
      attachmentBlobCache.delete(attachmentUrl);
      if (absUrl) attachmentBlobCache.delete(absUrl);
    }
    setError(false);
    setRetryCounter((c) => c + 1);
  }, [attachmentUrl, absUrl]);

  // Stable identifier for encryption metadata to prevent effect loops on object recreation
  const encryptionIv = attachmentEncryption?.iv || "";
  const isEncrypted = Boolean(attachmentEncryption?.isEncrypted);

  useEffect(() => {
    // 1. Optimistic local blob
    if (localBlobUrl) {
      setBlobUrl(localBlobUrl);
      setLoading(false);
      setError(false);
      if (attachmentUrl) attachmentBlobCache.set(attachmentUrl, localBlobUrl);
      if (absUrl) attachmentBlobCache.set(absUrl, localBlobUrl);
      return;
    }

    if (!attachmentUrl) {
      setBlobUrl(null);
      setLoading(false);
      return;
    }

    // 2. Already in cache
    const existing = attachmentBlobCache.get(attachmentUrl) || (absUrl && attachmentBlobCache.get(absUrl));
    if (existing) {
      setBlobUrl(existing);
      setLoading(false);
      setError(false);
      return;
    }

    // 3. Not encrypted on server - can be loaded directly from absolute URL
    if (!isEncrypted) {
      const directUrl = absUrl || attachmentUrl;
      attachmentBlobCache.set(attachmentUrl, directUrl);
      if (absUrl) attachmentBlobCache.set(absUrl, directUrl);
      setBlobUrl(directUrl);
      setLoading(false);
      setError(false);
      return;
    }

    // 4. Encrypted attachment: decrypt
    let isCancelled = false;
    setLoading(true);
    setError(false);

    const performDecryption = async () => {
      const cacheKey = absUrl || attachmentUrl;

      // Deduplicate simultaneous requests for same attachment
      if (inFlightDecryptions.has(cacheKey)) {
        try {
          const result = await inFlightDecryptions.get(cacheKey);
          if (!isCancelled) {
            setBlobUrl(result);
            setLoading(false);
          }
          return;
        } catch {
          // Fall through to retry below
        }
      }

      const decryptPromise = (async () => {
        const result = await decryptFile(
          absUrl,
          attachmentEncryption,
          user?.sessionId,
          mimeType,
          user?.id || user?._id,
          (pct) => {
            if (!isCancelled) setDownloadProgress(pct);
          }
        );
        return result;
      })();

      inFlightDecryptions.set(cacheKey, decryptPromise);

      try {
        const decryptedBlobUrl = await decryptPromise;
        attachmentBlobCache.set(attachmentUrl, decryptedBlobUrl);
        if (absUrl) attachmentBlobCache.set(absUrl, decryptedBlobUrl);

        if (!isCancelled) {
          setBlobUrl(decryptedBlobUrl);
          setDownloadProgress(100);
          setLoading(false);
          setError(false);
        }
      } catch (err) {
        console.error("Attachment decryption failed:", err);
        if (!isCancelled) {
          setError(true);
          setLoading(false);
        }
      } finally {
        inFlightDecryptions.delete(cacheKey);
      }
    };

    performDecryption();

    return () => {
      isCancelled = true;
    };
  }, [
    attachmentUrl,
    absUrl,
    localBlobUrl,
    isEncrypted,
    encryptionIv,
    mimeType,
    user?.sessionId,
    user?.id,
    user?._id,
    retryCounter,
  ]);

  return { blobUrl, loading, error, downloadProgress, retry };
}
