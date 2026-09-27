import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../../redux/slices/authSlice";
import { decryptFile } from "../../../lib/crypto";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

function getAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

/**
 * useDecryptedAttachment
 * Decrypts an encrypted file attachment on demand and caches the blob URL.
 */
export default function useDecryptedAttachment(
  attachmentUrl,
  attachmentEncryption,
  mimeType,
  localBlobUrl
) {
  const user = useSelector(selectUser);
  const [blobUrl, setBlobUrl] = useState(localBlobUrl || null);
  const [loading, setLoading] = useState(!localBlobUrl && !!attachmentUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If optimistic message, use local blob immediately
    if (localBlobUrl) {
      setBlobUrl(localBlobUrl);
      setLoading(false);
      return;
    }

    if (!attachmentUrl) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(false);
      try {
        const absUrl = getAbsoluteUrl(attachmentUrl);
        const result = await decryptFile(
          absUrl,
          attachmentEncryption,
          user?.sessionId,
          mimeType,
          user?.id
        );
        if (!cancelled) {
          setBlobUrl(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Attachment decryption failed:", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        // Only revoke URLs we created
        if (prev && prev.startsWith("blob:") && prev !== localBlobUrl) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [attachmentUrl, attachmentEncryption, mimeType, localBlobUrl, user?.sessionId, user?.id]);

  return { blobUrl, loading, error };
}
