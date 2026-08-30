import { EllipsisVertical, Check, CheckCheck, File as FileIcon, Download, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import { decryptFile } from "../../lib/crypto";
import ImageViewer from "./ImageViewer";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

//  Helpers
function getFileExt(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

//  Hook: decrypt + cache a single attachment URL
//  Returns { blobUrl, error, loading }
function useDecryptedAttachment(attachmentUrl, attachmentEncryption, mimeType, localBlobUrl) {
  const user = useSelector(selectUser);
  // If we have a local blob URL (optimistic send), use it directly
  const [blobUrl, setBlobUrl] = useState(localBlobUrl || null);
  const [loading, setLoading] = useState(!localBlobUrl && !!attachmentUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Optimistic message — show local blob immediately, no server fetch needed
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
          user?.id,
          user?.username,
          mimeType
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
        // Only revoke URLs we created (not the localBlobUrl which the parent manages)
        if (prev && prev.startsWith("blob:") && prev !== localBlobUrl) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [attachmentUrl, attachmentEncryption, mimeType, localBlobUrl, user?.id, user?.username]);


  return { blobUrl, loading, error };
}

//  Time + Read badge
function TimeBadge({ time, isSender, message, overlay = false }) {
  return (
    <span
      className={`shrink-0 text-[9px] flex gap-0.5 items-center ${overlay
        ? "bg-black/40 px-1.5 py-0.5 rounded-full text-white/90"
        : isSender
          ? "text-indigo-200"
          : "text-slate-400 dark:text-zinc-500"
        }`}
    >
      {time}
      {isSender ? (
        message.readBy && message.readBy.length > 1 ? (
          <CheckCheck size={12} className={overlay ? "text-white/80" : "text-indigo-200"} />
        ) : (
          <Check size={12} className={overlay ? "text-white/80" : "text-indigo-200"} />
        )
      ) : null}
    </span>
  );
}

//  Type 1 — Plain text
function PlainTextMessage({ message, isSender, time, isMultiLine }) {
  const bubble = isSender
    ? "bg-primary-2 text-white rounded-br-none"
    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none";

  return (
    <div
      className={`relative max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm ${bubble} ${message.isSending ? "opacity-60" : ""
        }`}
    >
      {isMultiLine ? (
        <>
          <div className="text-xs whitespace-pre-wrap break-words">{message.content}</div>
          <div
            className={`mt-1 text-[9px] text-right flex items-center gap-0.5 ${isSender ? "text-indigo-200 justify-end" : "text-slate-400 dark:text-zinc-500"
              }`}
          >
            <TimeBadge time={time} isSender={isSender} message={message} />
          </div>
        </>
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-xs break-words">{message.content}</span>
          <TimeBadge time={time} isSender={isSender} message={message} />
        </div>
      )}
    </div>
  );
}

//  Type 2 — Image with optional caption (E2EE decrypted)
function ImageMessage({ message, isSender, time }) {
  const { blobUrl, loading, error } = useDecryptedAttachment(
    message.attachmentUrl,
    message.attachmentEncryption,
    "image/jpeg",
    message.localBlobUrl   // present on optimistic (sending) messages
  );

  const [viewerOpen, setViewerOpen] = useState(false);

  const caption = message.content || "";
  const bubble = isSender
    ? "bg-primary-2 text-white rounded-br-none"
    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none";

  return (
    <>
      <div
        className={`relative max-w-[72%] sm:max-w-[52%] rounded-2xl overflow-hidden shadow-md ${bubble} ${message.isSending ? "ring-2 ring-indigo-500/50" : ""
          }`}
      >
        {/* Image area */}
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
                className={`w-full object-cover block transition-opacity ${message.isSending ? "opacity-75 cursor-default" : "cursor-zoom-in active:opacity-90"
                  }`}
                style={{ maxHeight: 320 }}
              />
              {/* Subtle expand hint */}
              {!message.isSending && (
                <div className="absolute top-1.5 right-1.5 pointer-events-none">
                  <span className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-3 h-3">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              )}
            </>
          )}

          {/* Sending / Progress Overlay */}
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

          {/* Time badge overlaid on image when no caption */}
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

      {/* Full-screen viewer portal */}
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

// Non-image file (icon + ext + name, no preview)
function FileMessage({ message, isSender, time }) {
  const { fileName, fileSize, attachmentUrl, attachmentEncryption } = message;
  const ext = getFileExt(fileName);

  // For file downloads we need the decrypted blob URL
  const { blobUrl, loading } = useDecryptedAttachment(
    attachmentUrl,
    attachmentEncryption,
    "application/octet-stream",
    message.localBlobUrl
  );

  const extColors = {
    PDF: "bg-red-500/20 text-red-400 border-red-500/30",
    DOC: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    DOCX: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    XLS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    XLSX: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ZIP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    RAR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    MP4: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    MP3: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  const extClass = extColors[ext] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  const bubble = isSender
    ? "bg-indigo-600/90 text-white rounded-br-none border border-indigo-500/50"
    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none";

  return (
    <div
      className={`relative max-w-[75%] sm:max-w-[55%] rounded-2xl px-3 py-2.5 shadow-sm ${bubble} ${message.isSending ? "opacity-90 ring-1 ring-indigo-400/50" : ""
        }`}
    >
      <div className="flex items-center gap-3">
        {/* File type icon */}
        <div className={`w-10 h-10 rounded-xl border flex-shrink-0 flex flex-col items-center justify-center gap-0.5 ${extClass}`}>
          <FileIcon size={16} />
          <span className="text-[7px] font-extrabold tracking-wider leading-none">{ext}</span>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium leading-snug truncate ${isSender ? "text-white" : "text-slate-800 dark:text-zinc-100"}`}>
            {fileName || "File"}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {fileSize && (
              <span className={`text-[10px] ${isSender ? "text-indigo-200" : "text-slate-400 dark:text-zinc-500"}`}>
                {formatSize(fileSize)}
              </span>
            )}
            {message.isSending && (
              <span className="text-[10px] text-indigo-200 font-semibold">
                {message.uploadProgress || 0}%
              </span>
            )}
            {message.uploadFailed && (
              <span className="text-[10px] text-red-300 font-semibold">
                Failed
              </span>
            )}
          </div>

          {/* Progress bar line */}
          {message.isSending && (
            <div className="w-full h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-200"
                style={{ width: `${message.uploadProgress || 5}%` }}
              />
            </div>
          )}
        </div>

        {/* Download — only when decrypted blob is ready */}
        {!isSender && (
          loading ? (
            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
          ) : blobUrl ? (
            <a
              href={blobUrl}
              download={fileName}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition"
            >
              <Download size={14} />
            </a>
          ) : null
        )}
      </div>

      {/* Time */}
      <div className="mt-1.5 flex justify-end">
        <TimeBadge time={time} isSender={isSender} message={message} />
      </div>
    </div>
  );
}

//  Wrapper — picks message type and adds options button
export default function Message({ isSender, message, time, isMultiLine, handleShowMessageOptions }) {
  const type = message.type || "text";

  const OptionsBtn = ({ side }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleShowMessageOptions(e, side, message._id);
      }}
      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition flex-shrink-0"
    >
      <EllipsisVertical size={14} />
    </button>
  );

  return (
    <div className={`w-full flex items-end gap-1.5 group ${isSender ? "justify-end" : "justify-start"}`}>
      {isSender && <OptionsBtn side="sender" />}

      {type === "image" ? (
        <ImageMessage message={message} isSender={isSender} time={time} />
      ) : type === "file" ? (
        <FileMessage message={message} isSender={isSender} time={time} />
      ) : (
        <PlainTextMessage message={message} isSender={isSender} time={time} isMultiLine={isMultiLine} />
      )}

      {!isSender && <OptionsBtn side="receiver" />}
    </div>
  );
}
