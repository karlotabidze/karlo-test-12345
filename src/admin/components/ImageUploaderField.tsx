import React, { useRef, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Star } from "lucide-react";
import { uploadImagesToMediaLibrary } from "../api.ts";

interface SingleImageFieldProps {
  label: string;
  value: string;
  entityType: string;
  onChange: (url: string) => void;
  helperText?: string;
}

export const SingleImageField: React.FC<SingleImageFieldProps> = ({
  label,
  value,
  entityType,
  onChange,
  helperText,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imgBroken, setImgBroken] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImagesToMediaLibrary({
        files,
        entityType,
        isMain: true,
      });
      if (uploaded[0]?.url) {
        setImgBroken(false);
        onChange(uploaded[0].url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="w-36 h-24 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {value && !imgBroken ? (
            <img
              src={value}
              alt={label}
              referrerPolicy="no-referrer"
              onError={() => setImgBroken(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400 text-xs">
              <ImageIcon className="w-5 h-5" />
              <span>No image</span>
            </div>
          )}
        </div>
        <div className="flex-1 w-full space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setImgBroken(false);
                onChange(e.target.value);
              }}
              placeholder="Paste image URL or upload file..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
            />
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

interface GalleryImageFieldProps {
  label: string;
  mainImage: string;
  gallery: string[];
  entityType: string;
  onChangeMain: (url: string) => void;
  onChangeGallery: (urls: string[]) => void;
}

export const GalleryImageField: React.FC<GalleryImageFieldProps> = ({
  label,
  mainImage,
  gallery,
  entityType,
  onChangeMain,
  onChangeGallery,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState("");

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImagesToMediaLibrary({
        files,
        entityType,
      });
      const newUrls = uploaded.map((u) => u.url);
      const nextGallery = Array.from(new Set([...gallery, ...newUrls]));
      onChangeGallery(nextGallery);
      if (!mainImage && newUrls[0]) {
        onChangeMain(newUrls[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gallery upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const addDraftUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    const nextGallery = Array.from(new Set([...gallery, trimmed]));
    onChangeGallery(nextGallery);
    if (!mainImage) onChangeMain(trimmed);
    setUrlDraft("");
  };

  const removeUrl = (target: string) => {
    const next = gallery.filter((u) => u !== target);
    onChangeGallery(next);
    if (mainImage === target) {
      onChangeMain(next[0] || "");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={handleMultiUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading..." : "Upload Gallery Images"}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="Or paste an image URL to append to gallery..."
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-emerald-800"
        />
        <button
          type="button"
          onClick={addDraftUrl}
          className="px-3 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          Add URL
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {gallery.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {gallery.map((url) => {
            const isCover = url === mainImage;
            return (
              <div
                key={url}
                className={`group relative rounded-lg border overflow-hidden bg-slate-100 ${
                  isCover ? "border-emerald-800 ring-2 ring-emerald-800/20" : "border-slate-200"
                }`}
              >
                <img
                  src={url}
                  alt="Gallery preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover"
                />
                <div className="flex items-center justify-between px-2 py-1.5 bg-white border-t border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => onChangeMain(url)}
                    className={`inline-flex items-center gap-1 font-medium cursor-pointer ${
                      isCover ? "text-emerald-800" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isCover ? "fill-emerald-800" : ""}`} />
                    {isCover ? "Main Cover" : "Set Cover"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    aria-label="Remove image"
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          No gallery images added yet. Upload one or more images above.
        </p>
      )}
    </div>
  );
};
