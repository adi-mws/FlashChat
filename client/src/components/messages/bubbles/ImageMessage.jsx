import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import TimeBadge from "./TimeBadge";
import useDecryptedAttachment from "./useDecryptedAttachment";
import ImageViewer from "../ImageViewer";

/**
 * ImageMessage
 * E2EE encrypted image bubble with lightbox zoom and upload progress overlay.
 */
export default function ImageMessage({ message, isSender, time }) {
  const mimeType = message.fileName?.toLowerCase().endsWith(".png")
    ? "image/png"
    : message.fileName?.toLowerCase().endsWith(".webp")
    ? "image/webp"
    : message.fileName?.toLowerCase().endsWith(".gif")
    ? "image/gif"
    : "image/jpeg";

  const { blobUrl, loading, error } = useDecryptedAttachment(
    message.attachmentUrl,
    message.attachmentEncryption,
    mimeType,
    message.localBlobUrl
  );

  const [viewerOpen, setViewerOpen] = useState(false);
  const caption = message.content || "";

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
        {/* Image Display Area - Standard width box filled by image with standard max-height */}
        <div
          onClick={() => !message.isSending && blobUrl && setViewerOpen(true)}
          className={`relative w-full bg-zinc-800/80 overflow-hidden ${
            blobUrl && !message.isSending ? "cursor-pointer group/img" : ""
          }`}
          style={{ minHeight: 160 }}
        >
          {loading && !message.isSending && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10 min-h-[160px]">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-indigo-400 animate-spin" />
            </div>
          )}

          {error && !message.isSending && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-10 gap-1 min-h-[160px]">
              <AlertCircle size={20} className="text-red-400" />
              <span className="text-[10px] text-red-300">Failed to load image</span>
            </div>
          )}

          {blobUrl && !error && (
            <>
              <img
                src={blobUrl}
                alt={message.fileName || "Image"}
                className={`w-full h-auto min-h-[160px] max-h-[360px] object-cover block transition-transform duration-200 group-hover/img:scale-[1.01] ${
                  message.isSending
                    ? "opacity-75 cursor-default"
                    : "cursor-pointer active:opacity-90"
                }`}
              />

              {!message.isSending && (
                <div className="absolute top-2 right-2 pointer-events-none opacity-80 group-hover/img:opacity-100 transition">
                  <span className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center shadow-sm">
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
                  </span>
                </div>
              )}
            </>
          )}

          {/* Sending Progress Overlay */}
          {message.isSending && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-20">
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
          {!caption && blobUrl && !message.isSending && (
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
