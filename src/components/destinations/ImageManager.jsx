import { useState, useRef, useCallback } from "react";
import * as api from "../../api/destinations";
import { useToast } from "../../hooks/useToast";
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LinkIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

export default function ImageManager({ destinationId, initialImages = [], onRefresh }) {
  const { toast } = useToast();
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const refresh = useCallback(async () => {
    try {
      const r = await api.getImages(destinationId);
      setImages(r.data || []);
      onRefresh?.();
    } catch {}
  }, [destinationId, onRefresh]);

  // ── File Upload ───────────────────────────────────────────────
  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      await api.addImages(destinationId, fd);
      toast(`${files.length} image(s) uploaded`, "success");
      await refresh();
    } catch (err) {
      toast(err?.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── URL Add ───────────────────────────────────────────────────
  const handleAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      await api.addImagesByUrl(destinationId, [url]);
      setUrlInput("");
      setAddingUrl(false);
      toast("Image URL added", "success");
      await refresh();
    } catch { toast("Failed to add URL", "error"); }
  };

  // ── Set Primary ───────────────────────────────────────────────
  const handleSetPrimary = async (img) => {
    try {
      await api.updateImage(destinationId, img.id, { is_primary: true });
      toast("Primary image updated", "success");
      await refresh();
    } catch { toast("Failed to set primary", "error"); }
  };

  // ── Edit Caption/Alt ──────────────────────────────────────────
  const handleEdit = (img) => {
    setEditingId(img.id);
    setEditCaption(img.caption || "");
    setEditAlt(img.altText || "");
  };

  const handleSaveEdit = async (imgId) => {
    try {
      await api.updateImage(destinationId, imgId, {
        caption: editCaption,
        alt_text: editAlt,
      });
      setEditingId(null);
      toast("Image updated", "success");
      await refresh();
    } catch { toast("Update failed", "error"); }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (img) => {
    if (!window.confirm(`Delete this image?`)) return;
    try {
      await api.removeImage(destinationId, img.id);
      toast("Image deleted", "success");
      await refresh();
    } catch { toast("Delete failed", "error"); }
  };

  // ── Reorder ───────────────────────────────────────────────────
  const handleReorder = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setImages(reordered);
    try {
      await api.reorderImages(destinationId, reordered.map((i) => i.id));
      toast("Images reordered", "success");
      await refresh();
    } catch { toast("Reorder failed", "error"); await refresh(); }
  };

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Images ({images.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingUrl((v) => !v)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50"
          >
            <LinkIcon className="w-4 h-4" /> Add URL
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4" /> Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* URL input */}
      {addingUrl && (
        <div className="flex gap-2 p-3 bg-blue-50 rounded-xl">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Add
          </button>
          <button
            onClick={() => setAddingUrl(false)}
            className="p-2 border rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : (
          <div>
            <PhotoIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Drag & drop images here, or{" "}
              <button
                onClick={() => fileRef.current?.click()}
                className="text-blue-600 hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB each</p>
          </div>
        )}
      </div>

      {/* Gallery grid */}
      {images.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">No images yet</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                img.isPrimary ? "border-blue-500 shadow-lg" : "border-transparent hover:border-gray-300"
              }`}
            >
              {/* Image */}
              <div className="aspect-video bg-gray-100">
                <img
                  src={img.imageUrl || img.thumbnailUrl}
                  alt={img.altText || ""}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.classList.add("flex", "items-center", "justify-center");
                  }}
                />
              </div>

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <StarSolid className="w-3 h-3" /> Primary
                </div>
              )}

              {/* Order badge */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                #{idx + 1}
              </div>

              {/* Edit overlay */}
              {editingId === img.id ? (
                <div className="absolute inset-0 bg-white p-2 flex flex-col gap-1.5 overflow-y-auto">
                  <input
                    type="text"
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Caption..."
                    className="w-full border rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder="Alt text..."
                    className="w-full border rounded px-2 py-1 text-xs"
                  />
                  {/* URL display */}
                  <div className="bg-gray-50 rounded p-1 mt-1">
                    <p className="text-xs text-gray-400 mb-0.5">Image URL:</p>
                    <input
                      type="url"
                      value={img.imageUrl}
                      readOnly
                      onClick={(e) => e.target.select()}
                      className="w-full text-xs text-gray-600 bg-transparent border-0 outline-none cursor-text"
                    />
                  </div>
                  <div className="flex gap-1 mt-auto">
                    <button
                      onClick={() => handleSaveEdit(img.id)}
                      className="flex-1 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                      <CheckIcon className="w-3 h-3 mx-auto" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-1 border rounded text-xs"
                    >
                      <XMarkIcon className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Hover actions */
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1 bg-white rounded-lg p-1 shadow-lg">
                    {!img.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(img)}
                        title="Set as primary"
                        className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600"
                      >
                        <StarIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(img)}
                      title="Edit"
                      className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(idx, idx - 1)}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(idx, idx + 1)}
                      disabled={idx === images.length - 1}
                      title="Move down"
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(img)}
                      title="Delete"
                      className="p-1.5 hover:bg-red-50 rounded text-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Caption */}
              {img.caption && !editingId && (
                <div className="bg-black/60 text-white text-xs p-1.5 absolute bottom-0 left-0 right-0 truncate">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}