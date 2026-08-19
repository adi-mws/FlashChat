import { useEffect, useRef, useState, useCallback } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

/**
 * ImageViewer
 * Full-screen lightbox that displays a decrypted blob URL.
 *
 * Props:
 *   src        — blob: URL (already decrypted)
 *   fileName   — original file name (used for the download)
 *   onClose    — () => void
 */
export default function ImageViewer({ src, fileName, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);          // animate-in flag
  const dragStart = useRef(null);
  const imgRef = useRef(null);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  /* ── Zoom ── */
  const zoom = useCallback((delta) => {
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 5));
  }, []);

  const resetTransform = () => { setScale(1); setPos({ x: 0, y: 0 }); };

  /* ── Mouse drag (pan) ── */
  const onMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const onMouseUp = () => setDragging(false);

  /* ── Wheel zoom ── */
  const onWheel = (e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.15 : -0.15);
  };

  /* ── Touch support ── */
  const lastTouchDist = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && scale > 1) {
      setDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - pos.x,
        y: e.touches[0].clientY - pos.y,
      };
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist.current) {
        const delta = (dist - lastTouchDist.current) * 0.01;
        zoom(delta);
      }
      lastTouchDist.current = dist;
    } else if (dragging && e.touches.length === 1) {
      setPos({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  };

  const onTouchEnd = () => { setDragging(false); lastTouchDist.current = null; };

  /* ── Download ── */
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = fileName || "image";
    a.click();
  };

  return (
    <div
      className={`fixed inset-0 z-[999999] flex flex-col transition-all duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.96)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 z-10">
        <p className="text-xs text-zinc-400 font-medium truncate max-w-[60%]">{fileName || "Image"}</p>

        <div className="flex items-center gap-1.5">
          {/* Zoom out */}
          <button
            onClick={() => zoom(-0.25)}
            disabled={scale <= 0.5}
            className="p-2 rounded-xl bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 transition"
          >
            <ZoomOut size={16} />
          </button>

          {/* Scale label */}
          <span className="text-[11px] text-zinc-500 w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom in */}
          <button
            onClick={() => zoom(0.25)}
            disabled={scale >= 5}
            className="p-2 rounded-xl bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 transition"
          >
            <ZoomIn size={16} />
          </button>

          {/* Reset */}
          <button
            onClick={resetTransform}
            className="p-2 rounded-xl bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
            title="Reset zoom"
          >
            <RotateCcw size={15} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition active:scale-95"
          >
            <Download size={14} />
            Save
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Image area ── */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={fileName}
          draggable={false}
          onMouseDown={onMouseDown}
          className="select-none"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.15s ease",
            borderRadius: 8,
            boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
          }}
        />
      </div>

      {/* ── Bottom hint ── */}
      <div className="flex-shrink-0 py-2 text-center">
        <p className="text-[10px] text-zinc-700">
          Scroll to zoom · Drag to pan · Esc to close
        </p>
      </div>
    </div>
  );
}
