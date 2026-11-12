"use client";

import * as React from "react";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Choose one picture and see it before posting. The file is shrunk later, when it is uploaded, so a big camera photo is fine.
 * `file` is the chosen picture (or null) and `onChange` receives the new choice.
 */
export function PhotoPicker({
  file,
  onChange,
  label = "Add a photo",
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  // A temporary address for the preview, given back when the picture changes or the screen closes.
  const preview = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const chosen = event.target.files?.[0] ?? null;
          event.target.value = "";
          onChange(chosen);
        }}
      />
      {preview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Your photo, as it will look"
            className="h-40 w-auto max-w-full rounded-2xl object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove the photo"
            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white outline-none hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => input.current?.click()}
        >
          <ImagePlusIcon aria-hidden="true" /> {label}
        </Button>
      )}
    </div>
  );
}
