import {
  Camera,
  File,
  Image,
} from "lucide-react";
import React, { useEffect, useRef } from "react";

export default function AttachmentsMenu({
  onClose,
  show,
  triggerRef,
  onSelectImage,
  onCaptureCamera,
  onSelectFile,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !triggerRef?.current?.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, show, triggerRef]);

  const attachmentActions = [
    {
      label: "Photo",
      icon: Image,
      color: "border-violet-500 text-violet-500",
      onClick: onSelectImage,
    },
    {
      label: "Camera",
      icon: Camera,
      color: "border-blue-500 text-blue-500",
      onClick: onCaptureCamera,
    },
    {
      label: "Documents",
      icon: File,
      color: "border-amber-500 text-amber-500",
      onClick: onSelectFile,
    },
  ];

 
  return (
    <div
      ref={menuRef}
      className={`
        absolute bottom-16 left-0 z-50
        rounded-2xl
        border border-slate-200/70
        bg-white 
        shadow-xl shadow-black/10
        dark:border-zinc-800
        dark:bg-zinc-950
        dark:shadow-black/30
        ${show ? "block" : "hidden"}
      `}
    >

      <div className="flex flex-col">
        {attachmentActions.map(
          ({ label, icon: Icon, color, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onClick?.();
                onClose();
              }}
              className="
                group
                flex
                ps-2
                pe-8
                items-center 
                gap-2
                rounded-xl
                transition-all duration-150
                hover:bg-zinc-100
                active:scale-95
                dark:hover:bg-zinc-900
              "
            >
              <span
                className={`
                  flex h-10 w-10
                  items-center justify-center
                  rounded-full
                  shadow-md
                  transition-transform duration-150
                  group-hover:scale-105
                  ${color}
                `}
              >
                <Icon
                  size={16}
                  strokeWidth={2.5}
                />
              </span>

              <span
                className="
                  text-xs
                  font-medium
                  text-zinc-700
                  dark:text-zinc-200
                "
              >
                {label}
              </span>
            </button>
          )
        )}


      

      
      </div>
    </div>
  );
}