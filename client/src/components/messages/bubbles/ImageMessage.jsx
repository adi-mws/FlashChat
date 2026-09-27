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
  const { blobUrl, loading, error } = useDecryptedAttachment(
    message.attachmentUrl,
    message.attachmentEncryption,
    "image/jpeg",
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
        className={`relative max-w-[72%] sm:max-w-[52%] rounded-2xl overflow-hidden shadow-md ${bubble} ${
          message.isSending ? "ring-2 ring-indigo-500/50" : ""
        }`}
      >
        {/* Image Display Area */}
        <div
          className="relative bg-zinc-800"
          style={{ minWidth: 180, minHeight: 120 }}
        >
          {loading && !message.isSending && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-indigo-400 animate-spin" />
            </div>
          )}

          {error && !message.isSending && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-10 gap-1">
              <AlertCircle size={20} className="text-red-400" />
              <span className="text-[10px] text-red-300">Failed to load</span>
            </div>
          )}

          {blobUrl && !error && (
            <>
              <img
                src={blobUrl}
                alt={message.fileName || "Image"}
                onClick={() => !message.isSending && setViewerOpen(true)}
                className={`w-full object-cover block transition-opacity ${
                  message.isSending
                    ? "opacity-75 cursor-default"
                    : "cursor-zoom-in active:opacity-90"
                }`}
                style={{ maxHeight: 320 }}
              />

              {!message.isSending && (
                <div className="absolute top-1.5 right-1.5 pointer-events-none">
                  <span className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={2.5}
                      className="w-3 h-3"
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
