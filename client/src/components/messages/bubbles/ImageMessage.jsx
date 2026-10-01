import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, RefreshCw, Download } from "lucide-react";
import TimeBadge from "./TimeBadge";
import useDecryptedAttachment from "./useDecryptedAttachment";
import ImageViewer from "../ImageViewer";

/*
  ImageMessage
  E2EE encrypted image bubble with smooth progress ring, download button,
  download progress on receiving devices, and lightbox viewer.
*/
export default function ImageMessage({ message, isSender, time }) {
  const mimeType = message.fileName?.toLowerCase().endsWith(".png")
    ? "image/png"
    : message.fileName?.toLowerCase().endsWith(".webp")
    ? "image/webp"
    : message.fileName?.toLowerCase().endsWith(".gif")
    ? "image/gif"
    : "image/jpeg";

  const { blobUrl, loading, error, downloadProgress, retry } = useDecryptedAttachment(
    message.attachmentUrl,
    message.attachmentEncryption,
    mimeType,
    message.localBlobUrl
  );

  const [imgError, setImgError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Reset imgError if blobUrl changes
  useEffect(() => {
    setImgError(false);
  }, [blobUrl]);

  const caption = message.content || "";
  const hasError = (error || imgError) && !message.isSending;
  const isImageReady = Boolean(blobUrl && !hasError);

  const handleDownload = (e) => {
    e?.stopPropagation();
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = message.fileName || `flashchat-photo-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const bubble = isSender
    ? "bg-primary-2 text-white rounded-br-none"
    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none";

  return (
    <>
      <div
        className={`relative w-[280px] sm:w-[320px] max-w-[85vw] rounded-2xl overflow-hidden shadow-md select-none ${bubble} ${
          message.isSending ? "ring-2 ring-indigo-500/50" : ""
        }`}
      >
        {/* Image Display Area */}
        <div
          onClick={() => isImageReady && !message.isSending && setViewerOpen(true)}
          className={`relative w-full bg-zinc-800/80 overflow-hidden ${
            isImageReady && !message.isSending ? "cursor-pointer group/img" : ""
          }`}
          style={{ minHeight: 160 }}
        >
          {/* Download & Decrypt Progress Overlay (On recipient/other device) */}
          {loading && !message.isSending && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-20 transition-opacity duration-300">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-400 transition-all duration-300 ease-out"
                    strokeDasharray={`${downloadProgress || 10}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-white tracking-tighter">
                  {downloadProgress || 0}%
                </span>
              </div>
              <span className="text-[10px] text-zinc-200 font-medium tracking-wide">
                Downloading...
              </span>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 z-10 gap-2 min-h-[160px] p-4 text-center">
              <AlertCircle size={22} className="text-red-400" />
              <span className="text-xs text-zinc-300 font-medium">Failed to load photo</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgError(false);
                  retry?.();
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs text-zinc-200 border border-zinc-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          )}

          {isImageReady && (
            <>
              <img
                src={blobUrl}
                alt={message.fileName || "Photo"}
                onError={() => setImgError(true)}
                className={`w-full h-auto min-h-[160px] max-h-[360px] object-cover block transition-transform duration-200 group-hover/img:scale-[1.01] ${
                  message.isSending
                    ? "opacity-75 cursor-default"
                    : "cursor-pointer active:opacity-90"
                }`}
              />

              {!message.isSending && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-80 group-hover/img:opacity-100 transition z-10">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-xs flex items-center justify-center shadow-sm text-white transition active:scale-95 cursor-pointer"
                    title="Download photo"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-xs flex items-center justify-center shadow-sm text-white transition active:scale-95 cursor-pointer"
                    title="Expand photo"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={2.5}
                      className="w-3.5 h-3.5"
                    >
                      <path
                        d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Upload Progress Overlay (On sender device) */}
          {message.isSending && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-20 transition-opacity duration-300">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-indigo-400 transition-all duration-300 ease-out"
                    strokeDasharray={`${message.uploadProgress || 5}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-white tracking-tighter">
                  {message.uploadProgress || 0}%
                </span>
              </div>
              <span className="text-[10px] text-zinc-200 font-medium tracking-wide">
                Sending...
              </span>
            </div>
          )}

          {/* Failure Overlay */}
          {message.uploadFailed && (
            <div className="absolute inset-0 bg-red-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-20 text-red-200">
              <AlertCircle size={22} className="text-red-400" />
              <span className="text-[11px] font-medium">Upload failed</span>
            </div>
          )}

          {/* Time overlay for pure images */}
          {!caption && isImageReady && !message.isSending && (
            <div className="absolute bottom-1.5 right-1.5">
              <TimeBadge time={time} isSender={isSender} message={message} overlay />
            </div>
          )}
        </div>

        {/* Caption */}
        {caption && (
          <div className="px-3 pt-2 pb-2.5">
            <div className="flex items-end gap-2 flex-wrap">
              <span className="text-xs break-words flex-1 leading-snug">{caption}</span>
              <TimeBadge time={time} isSender={isSender} message={message} />
            </div>
          </div>
        )}
      </div>

      {viewerOpen && blobUrl &&
        createPortal(
          <ImageViewer
            src={blobUrl}
            fileName={message.fileName}
            onClose={() => setViewerOpen(false)}
          />,
          document.body
        )
      }
    </>
  );
}
