"use client";

import { useRef, useState } from "react";
import { uploadMenuImage, MAX_IMAGE_BYTES } from "@/lib/queries";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ".jpg, .jpeg, .png, .webp";

interface ImageUploaderProps {
  folder: "categories" | "products";
  initialUrl?: string;
  onUpload: (url: string) => void;
  onClear: () => void;
  error?: string;
  id?: string;
}

// Image upload with type + size validation (spec §7.1, §7.2, §6.3)
// Allowed formats: jpg, png, webp — max 5 MB
// Only the public URL is passed back — the DB stores only the URL (spec §6.3)
export default function ImageUploader({
  folder,
  initialUrl,
  onUpload,
  onClear,
  error,
  id = "image-uploader",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = async (file: File) => {
    setUploadError(null);

    // Client-side type validation (spec §7.1)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, and WebP files are accepted.");
      return;
    }

    // Client-side size validation — catches large files before the network round-trip
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be smaller than 5 MB.");
      return;
    }

    // Show a temporary blob preview while uploading
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    const { url, error: err } = await uploadMenuImage(file, folder);

    setUploading(false);

    if (err || !url) {
      // Revoke the blob URL to free memory before clearing the preview
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setUploadError(err?.message ?? "Upload failed. Please try again.");
      return;
    }

    // Replace the temporary blob URL with the permanent Supabase URL
    URL.revokeObjectURL(objectUrl);
    setPreview(url);
    onUpload(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  return (
    <div>
      {preview ? (
        <div className="image-uploader__preview">
          {/*
           * Use a plain <img> here, not next/image.
           * The preview src can be a temporary blob: URL (during upload) or a
           * Supabase HTTPS URL (after upload / in edit mode).  Next.js Image
           * rejects blob: URLs in production because they aren't a configured
           * remote pattern and aren't a local path.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="image-uploader__preview-img"
            style={{ width: 240, height: 180, objectFit: "cover", display: "block" }}
          />
          {!uploading && (
            <button
              type="button"
              className="image-uploader__preview-remove"
              onClick={handleRemove}
              aria-label="Remove image"
            >
              ✕
            </button>
          )}
          {uploading && (
            <div className="image-uploader__uploading" style={{ marginTop: 8 }}>
              <div className="spinner" />
              Uploading…
            </div>
          )}
        </div>
      ) : (
        <div
          className={`image-uploader${dragging ? " dragging" : ""}${
            error || uploadError ? " error" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          id={id}
          aria-label="Click or drag to upload an image"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS}
            className="sr-only"
            onChange={handleFileChange}
            aria-hidden="true"
          />
          <div className="image-uploader__icon" aria-hidden="true">
            📷
          </div>
          <p className="image-uploader__text">
            Click or drag &amp; drop an image here
          </p>
          <p className="image-uploader__hint">
            Accepted formats: JPG, PNG, WebP · Max 5 MB
          </p>
        </div>
      )}

      {(uploadError || error) && (
        <p className="form-error">{uploadError ?? error}</p>
      )}
    </div>
  );
}
