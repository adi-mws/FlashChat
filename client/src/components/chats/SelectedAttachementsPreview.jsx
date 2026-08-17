import { X, File as FileIcon } from "lucide-react";
import React from "react";

export default function SelectedAttachepmentsPreview({
  show,
  onClose,
  selectedAttachements,
  setSelctedAttachements,
}) {
  const removeAttachment = (index) => {
    const newSelectedAttachements = selectedAttachements.filter(
      (_, i) => i !== index
    );

    setSelctedAttachements(newSelectedAttachements);
  };

  return (
    <div
      className={`${
        show ? "flex" : "hidden"
      } z-[100000] flex-col absolute w-full h-full bg-white dark:text-white dark:bg-zinc-900`}
    >
      {/* Header */}
      <div className="flex justify-start items-center p-2 dark:bg-zinc-800 dark:border-b dark:border-zinc-700">
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Attachments */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto h-full">
        {selectedAttachements.map((attachment, index) => {
          const file = attachment.file;

          const isImage = file?.type?.startsWith("image/");

          const previewUrl = isImage
            ? URL.createObjectURL(file)
            : null;

          return (
            <div
              key={index}
              className="flex items-center gap-3 p-2 border rounded-md dark:border-zinc-700"
            >
              {/* Preview */}
              <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                {isImage ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileIcon size={28} />
                )}
              </div>

              {/* File information */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm truncate">
                  {file?.name}
                </span>

                <span className="text-xs text-zinc-500">
                  {file?.type || "Unknown file"}
                </span>
              </div>

              {/* Remove */}
              <button onClick={() => removeAttachment(index)}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-end items-center p-2 dark:bg-zinc-800 dark:border-t dark:border-zinc-700">
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white"
          onClick={onClose}
        >
          Send
        </button>
      </div>
    </div>
  );
}