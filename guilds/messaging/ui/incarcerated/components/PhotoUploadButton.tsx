import { GrAttachment } from "react-icons/gr"
import { useRef } from "react"
import React from "react"

export function PhotoUploadButton({
  onFileSelect,
}: {
  onFileSelect: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) {
      onFileSelect(files)
      e.target.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple // <-- enables multi-select
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-150"
        aria-label="Upload photo"
      >
        <GrAttachment className="w-5 h-5" />
      </button>
    </>
  )
}
