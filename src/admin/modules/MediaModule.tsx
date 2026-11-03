import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Copy,
  Check,
  Trash2,
  Pencil,
  RefreshCw,
  Search,
  X,
  Star,
} from "lucide-react";
import { adminFetch, uploadImagesToMediaLibrary } from "../api.ts";
import type { MediaAssetRecord } from "../types.ts";

const ENTITY_CATEGORIES = [
  { key: "all", label: "All Media" },
  { key: "tour", label: "Tours" },
  { key: "destination", label: "Destinations" },
  { key: "country", label: "Countries" },
  { key: "city", label: "Cities" },
  { key: "flight", label: "Flights" },
  { key: "site", label: "Website Hero & About" },
  { key: "general", label: "General" },
];

const MAX_BYTES = 8 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const MediaModule: React.FC = () => {
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadCategory, setUploadCategory] = useState("tour");
  const [uploading, setUploading] = useState(false);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingAsset, setEditingAsset] = useState<MediaAssetRecord | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAssetRecord | null>(null);

  const multiUploadRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceTargetRef = useRef<MediaAssetRecord | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<MediaAssetRecord[]>("/api/admin/media");
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (categoryFilter !== "all" && a.entityType !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.fileName.toLowerCase().includes(q) ||
        a.altTextEn.toLowerCase().includes(q) ||
        a.altTextKa.toLowerCase().includes(q) ||
        a.descriptionEn.toLowerCase().includes(q) ||
        a.entityType.toLowerCase().includes(q)
      );
    });
  }, [assets, categoryFilter, searchQuery]);

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setError("");
    const fileList = Array.from(files);
    for (const file of fileList) {
      if (!file.type.startsWith("image/")) {
        setError(
          `Unsupported file "${file.name}". Only image formats (JPEG, PNG, WebP, AVIF, GIF, SVG) are allowed.`,
        );
        if (multiUploadRef.current) multiUploadRef.current.value = "";
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" exceeds the 8 MB maximum file size limit.`);
        if (multiUploadRef.current) multiUploadRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    try {
      const created = await uploadImagesToMediaLibrary({
        files: fileList,
        entityType: uploadCategory,
      });
      setNotice(`Uploaded ${created.length} image(s) to ${uploadCategory}.`);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (multiUploadRef.current) multiUploadRef.current.value = "";
    }
  };

  const triggerReplaceFile = (asset: MediaAssetRecord) => {
    replaceTargetRef.current = asset;
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = replaceTargetRef.current;
    if (!file || !target) return;

    if (!file.type.startsWith("image/")) {
      setError("Replacement file must be a valid image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Replacement file exceeds 8 MB limit.");
      return;
    }

    setReplacingId(target.id);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await adminFetch(`/api/admin/media/${target.id}/replace`, {
        method: "PUT",
        formData,
      });
      setNotice(`Replaced image file for "${target.fileName}".`);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to replace image");
    } finally {
      setReplacingId(null);
      replaceTargetRef.current = null;
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setSavingMeta(true);
    try {
      await adminFetch(`/api/admin/media/${editingAsset.id}`, {
        method: "PUT",
        body: {
          entityType: editingAsset.entityType,
          altTextKa: editingAsset.altTextKa,
          altTextEn: editingAsset.altTextEn,
          descriptionKa: editingAsset.descriptionKa,
          descriptionEn: editingAsset.descriptionEn,
          isMain: editingAsset.isMain,
        },
      });
      setNotice("Saved image alt text and metadata.");
      setEditingAsset(null);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update media metadata");
    } finally {
      setSavingMeta(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminFetch(`/api/admin/media/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setNotice(`Deleted "${deleteTarget.fileName}".`);
      setDeleteTarget(null);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete media asset");
    }
  };

  const handleCopyUrl = async (asset: MediaAssetRecord) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setNotice(`Asset URL: ${asset.url}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Image & Media Library
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload, organize, preview, replace, and manage bilingual alt text across tours,
            destinations, countries, cities, and flights (max 8 MB per image).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            aria-label="Target media folder"
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700"
          >
            {ENTITY_CATEGORIES.filter((c) => c.key !== "all").map((c) => (
              <option key={c.key} value={c.key}>
                Folder: {c.label}
              </option>
            ))}
          </select>

          <input
            ref={multiUploadRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
            onChange={handleUploadFiles}
            className="hidden"
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
            onChange={handleReplaceFileChange}
            className="hidden"
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => multiUploadRef.current?.click()}
            className="px-4 py-2 text-sm font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload Images"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {ENTITY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                categoryFilter === cat.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filename or alt text..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-emerald-800"
          />
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">Loading media assets...</div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-2">
          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-800">No images in this view</p>
          <p className="text-xs text-slate-500">
            Upload JPEG, PNG, WebP, AVIF, GIF, or SVG files above to populate your media library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={asset.url}
                    alt={asset.altTextEn || asset.fileName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {asset.isMain && (
                    <span className="absolute top-2 left-2 bg-slate-900/85 text-white text-[11px] font-medium px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      Main Cover
                    </span>
                  )}
                </div>

                <div className="p-3.5 space-y-1">
                  <div
                    className="text-xs font-semibold text-slate-900 truncate"
                    title={asset.fileName}
                  >
                    {asset.fileName}
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {asset.entityType} · {formatBytes(asset.sizeBytes)} · {asset.storageProvider}
                  </div>
                  {(asset.altTextEn || asset.altTextKa) && (
                    <p className="text-xs text-slate-600 line-clamp-1 pt-0.5">
                      Alt: {asset.altTextEn || asset.altTextKa}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyUrl(asset)}
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === asset.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy URL
                    </>
                  )}
                </button>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={replacingId === asset.id}
                    onClick={() => triggerReplaceFile(asset)}
                    title="Replace image file"
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200/70 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${replacingId === asset.id ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAsset(asset)}
                    title="Edit alt text & metadata"
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200/70 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(asset)}
                    title="Delete image"
                    className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Edit Image Metadata</h3>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Folder
                </label>
                <select
                  value={editingAsset.entityType}
                  onChange={(e) => setEditingAsset({ ...editingAsset, entityType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {ENTITY_CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alt Text (Georgian)
                  </label>
                  <input
                    type="text"
                    value={editingAsset.altTextKa}
                    onChange={(e) =>
                      setEditingAsset({ ...editingAsset, altTextKa: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alt Text (English)
                  </label>
                  <input
                    type="text"
                    value={editingAsset.altTextEn}
                    onChange={(e) =>
                      setEditingAsset({ ...editingAsset, altTextEn: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (Georgian)
                  </label>
                  <textarea
                    rows={2}
                    value={editingAsset.descriptionKa}
                    onChange={(e) =>
                      setEditingAsset({ ...editingAsset, descriptionKa: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={2}
                    value={editingAsset.descriptionEn}
                    onChange={(e) =>
                      setEditingAsset({ ...editingAsset, descriptionEn: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingAsset.isMain}
                  onChange={(e) => setEditingAsset({ ...editingAsset, isMain: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-900"
                />
                Mark as Main Cover Image
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMeta}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                >
                  {savingMeta ? "Saving..." : "Save Metadata"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete Media Asset?</h3>
            <p className="text-sm text-slate-600">
              Permanently remove <strong>{deleteTarget.fileName}</strong> from storage? Make sure no
              published tour or destination relies on this URL.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
