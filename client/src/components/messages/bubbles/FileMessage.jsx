import React from "react";
import { File as FileIcon, Download } from "lucide-react";
import TimeBadge from "./TimeBadge";
import useDecryptedAttachment from "./useDecryptedAttachment";

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

const EXT_COLORS = {
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

/**
 * FileMessage
 * Renders non-image file attachment cards with decrypt-on-download,
 * extension badges, file size, and upload progress bar.
 */
export default function FileMessage({ message, isSender, time }) {
  const { fileName, fileSize, attachmentUrl, attachmentEncryption } = message;
  const ext = getFileExt(fileName);

  const { blobUrl, loading } = useDecryptedAttachment(
    attachmentUrl,
    attachmentEncryption,
    "application/octet-stream",
    message.localBlobUrl
  );

  const extClass = EXT_COLORS[ext] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  const bubble = isSender
    ? "bg-indigo-600/90 text-white rounded-br-none border border-indigo-500/50"
    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800/80 rounded-bl-none";

  return (
    <div
      className={`relative max-w-[75%] sm:max-w-[55%] rounded-2xl px-3 py-2.5 shadow-sm ${bubble} ${
        message.isSending ? "opacity-90 ring-1 ring-indigo-400/50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* File type icon badge */}
        <div
          className={`w-10 h-10 rounded-xl border flex-shrink-0 flex flex-col items-center justify-center gap-0.5 ${extClass}`}
        >
          <FileIcon size={16} />
          <span className="text-[7px] font-extrabold tracking-wider leading-none">{ext}</span>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-medium leading-snug truncate ${
              isSender ? "text-white" : "text-slate-800 dark:text-zinc-100"
            }`}
          >
            {fileName || "File"}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {fileSize && (
              <span
                className={`text-[10px] ${
                  isSender ? "text-indigo-200" : "text-slate-400 dark:text-zinc-500"
                }`}
              >
                {formatSize(fileSize)}
              </span>
            )}
            {message.isSending && (
              <span className="text-[10px] text-indigo-200 font-semibold">
                {message.uploadProgress || 0}%
              </span>
            )}
            {message.uploadFailed && (
              <span className="text-[10px] text-red-300 font-semibold">Failed</span>
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

        {/* Download action button */}
        {!isSender && (
          loading ? (
            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
          ) : blobUrl ? (
            <a
              href={blobUrl}
              download={fileName}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition"
              title="Download file"
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
