import { X, File as FileIcon, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Stable object-URL per attachment index
───────────────────────────────────────────────────────────── */
function useObjectUrls(attachments) {
  const [urls, setUrls] = useState({});
  const prevRef = useRef({});

  useEffect(() => {
    const next = {};
    (attachments || []).forEach((att, i) => {
      const file = att.file;
      if (file?.type?.startsWith("image/")) {
        if (prevRef.current[i]?.file === file) {
          next[i] = prevRef.current[i].url;
        } else {
          next[i] = URL.createObjectURL(file);
        }
      }
    });

    Object.entries(prevRef.current).forEach(([k, v]) => {
      if (next[k] === undefined) URL.revokeObjectURL(v.url);
    });

    const nextRef = {};
    Object.entries(next).forEach(([k, url]) => {
      nextRef[k] = { file: attachments[k]?.file, url };
    });
    prevRef.current = nextRef;
    setUrls(next);
  }, [attachments]);

  useEffect(
    () => () => Object.values(prevRef.current).forEach((v) => URL.revokeObjectURL(v.url)),
    []
  );

  return urls;
}

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExt = (name = "") => {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
};

/* ─────────────────────────────────────────────────────────────
   Main component

   Props:
     show                   — boolean
     onClose                — () => void  (called to dismiss without sending)
     selectedAttachements   — [{ file: File }]
     setSelectedAttachements— (arr) => void
     onSend                 — (items: [{file, caption}]) => void
       Called once with ALL files. Parent handles upload + emit.
       Panel closes immediately after calling this.
───────────────────────────────────────────────────────────── */
export default function SelectedAttachementsPreview({
  show,
  onClose,
  selectedAttachements,
  setSelectedAttachements,
  onSend,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [captions, setCaptions] = useState({});
  const captionRef = useRef(null);
  const stripRef = useRef(null);

  const urls = useObjectUrls(selectedAttachements);

  // Keep activeIndex in range when list shrinks
  useEffect(() => {
    if (!selectedAttachements?.length) return;
    if (activeIndex >= selectedAttachements.length) {
      setActiveIndex(Math.max(0, selectedAttachements.length - 1));
    }
  }, [selectedAttachements, activeIndex]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!stripRef.current) return;
    const chip = stripRef.current.children[activeIndex];
    if (chip) chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  // Jump to the newest file when new ones are added
  const prevLengthRef = useRef(0);
  useEffect(() => {
    const len = selectedAttachements?.length || 0;
    if (len > prevLengthRef.current) {
      setActiveIndex(len - 1);
    }
    prevLengthRef.current = len;
  }, [selectedAttachements?.length]);

  if (!show || !selectedAttachements?.length) return null;

  const active = selectedAttachements[activeIndex];
  const activeFile = active?.file;
  const isImage = activeFile?.type?.startsWith("image/");
  const previewUrl = urls[activeIndex];

  const removeAttachment = (index) => {
    const next = selectedAttachements.filter((_, i) => i !== index);
    if (next.length === 0) { onClose(); return; }
    setSelectedAttachements(next);

    // Re-key captions
    const rekeyed = {};
    Object.entries(captions).forEach(([k, v]) => {
      const ki = parseInt(k, 10);
      if (ki < index) rekeyed[ki] = v;
      else if (ki > index) rekeyed[ki - 1] = v;
    });
    setCaptions(rekeyed);
  };

  const handleCaption = (e) => {
    setCaptions((prev) => ({ ...prev, [activeIndex]: e.target.value }));
    const el = captionRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  };

  const goLeft = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goRight = () => setActiveIndex((i) => Math.min(selectedAttachements.length - 1, i + 1));

  const handleSend = () => {
    const items = selectedAttachements.map((att, i) => ({
      file: att.file,
      caption: captions[i] || "",
    }));
    // Hand off everything to the parent; it closes the panel
    onSend(items);
  };

  return (
    <div className="absolute inset-0 z-[100000] flex flex-col bg-zinc-950 text-white select-none">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 flex-shrink-0 bg-zinc-900/60 backdrop-blur">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
        >
          <X size={18} />
        </button>
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          {activeIndex + 1} / {selectedAttachements.length}
        </span>
        <div className="w-8" />
      </div>

      {/* ── Main Preview Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative px-4 py-3">
        {/* Prev / Next arrows */}
        {selectedAttachements.length > 1 && (
          <>
            <button onClick={goLeft} disabled={activeIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-20 transition z-10">
              <ChevronLeft size={20} />
            </button>
            <button onClick={goRight} disabled={activeIndex === selectedAttachements.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-20 transition z-10">
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
          {isImage && previewUrl ? (
            <img
              key={previewUrl}
              src={previewUrl}
              alt={activeFile?.name}
              className="max-w-full object-contain rounded-xl shadow-2xl select-none"
              style={{ maxHeight: "calc(100vh - 300px)" }}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex flex-col items-center justify-center shadow-xl gap-2">
                <FileIcon size={44} className="text-zinc-400" />
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
                  {getFileExt(activeFile?.name)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* File name + caption */}
        <div className="w-full max-w-lg mt-3 space-y-2">
          <div className="text-center">
            <p className="text-xs text-zinc-300 truncate px-2 font-medium">{activeFile?.name}</p>
            {activeFile?.size ? (
              <p className="text-[10px] text-zinc-600 mt-0.5">{formatSize(activeFile.size)}</p>
            ) : null}
          </div>

          <div className="flex items-end gap-2 bg-zinc-800/70 border border-zinc-700/50 rounded-2xl px-4 py-2">
            <textarea
              ref={captionRef}
              value={captions[activeIndex] || ""}
              onChange={handleCaption}
              placeholder="Add a caption… (optional)"
              rows={1}
              className="flex-1 bg-transparent text-xs outline-none resize-none text-zinc-100 placeholder-zinc-600 py-1 min-h-[28px] max-h-32 overflow-y-auto leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* ── Footer: thumbnail strip + send ── */}
      <div className="flex-shrink-0 border-t border-zinc-800/80 bg-zinc-900/80 backdrop-blur px-3 py-2.5 flex items-center gap-3">
        {/* Scrollable thumbnail strip */}
        <div
          ref={stripRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {selectedAttachements.map((att, i) => {
            const f = att.file;
            const isImg = f?.type?.startsWith("image/");
            const thumbUrl = urls[i];
            const isActive = i === activeIndex;

            return (
              <div
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-zinc-900 scale-105"
                    : "opacity-60 hover:opacity-85"
                }`}
              >
                {isImg && thumbUrl ? (
                  <img src={thumbUrl} alt={f?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex flex-col items-center justify-center gap-1">
                    <FileIcon size={18} className="text-zinc-400" />
                    <span className="text-[8px] text-zinc-500 font-bold">{getFileExt(f?.name)}</span>
                  </div>
                )}
                {captions[i] && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500/70 rounded-b" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-600 transition z-10"
                >
                  <X size={9} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all shadow-lg"
        >
          <Send size={17} fill="white" className="text-white" />
        </button>
      </div>
    </div>
  );
}