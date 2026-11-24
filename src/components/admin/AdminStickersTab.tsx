import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Category, Sticker } from '../../types/store';

export function AdminStickersTab({
  stickers,
  categories,
  onReload,
}: {
  stickers: Sticker[];
  categories: Category[];
  onReload: () => Promise<void>;
}) {
  const stickerCategories = categories.filter((c) => c.type === 'sticker');
  const [filterCat, setFilterCat] = useState<string>('all');

  // Bulk & single upload state
  const [uploadCatId, setUploadCatId] = useState<string>(stickerCategories[0]?.id || '');
  const [uploadTags, setUploadTags] = useState('');
  const [singleName, setSingleName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Category CRUD
  const [newCatName, setNewCatName] = useState('');
  const [renamingCat, setRenamingCat] = useState<{ id: string; name: string } | null>(null);

  // Edit/Replace Sticker Modal
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editTags, setEditTags] = useState('');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const form = new FormData();
      if (uploadCatId) form.append('category_id', uploadCatId);
      if (uploadTags.trim()) form.append('tags', uploadTags.trim());
      if (files.length === 1 && singleName.trim()) form.append('name', singleName.trim());
      Array.from(files).forEach((f) => form.append('files', f));

      const res = await apiFetch<{ count: number }>('/api/admin/stickers/bulk', {
        method: 'POST',
        body: form,
      });
      setUploadMsg(`Uploaded ${res.count} sticker(s) cleanly!`);
      setSingleName('');
      await onReload();
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Sticker upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCatName.trim(), type: 'sticker' }),
    });
    setNewCatName('');
    await onReload();
  };

  const handleRenameCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingCat || !renamingCat.name.trim()) return;
    await apiFetch(`/api/admin/categories/${encodeURIComponent(renamingCat.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: renamingCat.name.trim() }),
    });
    setRenamingCat(null);
    await onReload();
  };

  const handleDeleteCat = async (id: string) => {
    await apiFetch(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await onReload();
  };

  const openEditSticker = (s: Sticker) => {
    setEditingSticker(s);
    setEditName(s.name);
    setEditCat(s.category_id || '');
    setEditTags(s.tags.join(', '));
    setReplaceFile(null);
  };

  const handleSaveStickerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSticker) return;
    const form = new FormData();
    form.append('name', editName);
    form.append('category_id', editCat);
    form.append('tags', editTags);
    if (replaceFile) form.append('file', replaceFile);

    await apiFetch(`/api/admin/stickers/${encodeURIComponent(editingSticker.id)}`, {
      method: 'PUT',
      body: form,
    });
    setEditingSticker(null);
    await onReload();
  };

  const handleDeleteSticker = async (id: string) => {
    await apiFetch(`/api/admin/stickers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await onReload();
  };

  const visibleStickers = useMemo(() => {
    if (filterCat === 'all') return stickers;
    return stickers.filter((s) => s.category_id === filterCat);
  }, [stickers, filterCat]);

  return (
    <div className="space-y-8">
      {/* Fast Bulk Uploader */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
            Sticker Library &amp; Bulk Uploader
          </h2>
          <p className="text-xs text-[#6D5D58]">
            Upload individual transparent PNG/WebP/SVG stickers or up to 50 files in a single fast batch.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Target Collection</label>
            <select
              value={uploadCatId}
              onChange={(e) => setUploadCatId(e.target.value)}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5"
            >
              <option value="">Uncategorised</option>
              {stickerCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">
              Sticker Name (for single file upload)
            </label>
            <input
              type="text"
              value={singleName}
              onChange={(e) => setSingleName(e.target.value)}
              placeholder="Auto-named from filename in bulk"
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              placeholder="cute, pink, floral"
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5"
            />
          </div>
        </div>

        <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5B8C6] bg-[#FDF2F4]/60 p-6 cursor-pointer hover:bg-[#FDF2F4] transition-colors">
          <Upload className="w-6 h-6 text-[#D66886] mb-2" />
          <span className="text-sm font-semibold text-[#2A211F]">
            {uploading ? 'Uploading sticker batch...' : 'Click to Upload Single or Bulk Stickers (up to 50 files)'}
          </span>
          <span className="text-xs text-[#6D5D58] mt-1">
            Supports transparent PNG, WebP, and crisp vector SVG
          </span>
          <input
            type="file"
            multiple
            accept=".png,.webp,.svg,.jpg,.jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => handleBulkUpload(e.target.files)}
            className="hidden"
          />
        </label>

        {uploadMsg && <p className="text-xs font-medium text-[#355A38]">{uploadMsg}</p>}
      </div>

      {/* Category Management */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4">
        <h3 className="font-display text-xl font-semibold text-[#2A211F]">Sticker Categories</h3>
        <div className="flex flex-wrap gap-2">
          {stickerCategories.map((c) => (
            <div
              key={c.id}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] px-3 py-1.5 text-xs font-medium"
            >
              <span>{c.name}</span>
              <button
                type="button"
                onClick={() => setRenamingCat({ id: c.id, name: c.name })}
                className="text-[#6D5D58] hover:text-[#2A211F]"
                aria-label={`Rename ${c.name}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCat(c.id)}
                className="text-[#A93855]"
                aria-label={`Delete ${c.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {renamingCat && (
          <form onSubmit={handleRenameCat} className="flex flex-wrap gap-2 max-w-md">
            <input
              type="text"
              value={renamingCat.name}
              onChange={(e) => setRenamingCat({ ...renamingCat, name: e.target.value })}
              className="flex-1 rounded-xl border border-[#D66886] bg-white px-3 py-2 text-xs"
            />
            <button type="submit" className="rounded-xl bg-[#D66886] text-white px-4 py-2 text-xs font-semibold">
              Save Name
            </button>
            <button
              type="button"
              onClick={() => setRenamingCat(null)}
              className="rounded-xl border border-[#E8DFD5] px-3 py-2 text-xs"
            >
              Cancel
            </button>
          </form>
        )}

        <form onSubmit={handleCreateCat} className="flex flex-wrap gap-2 max-w-md">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Create new sticker category..."
            className="flex-1 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[#2A211F] text-white px-4 py-2 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </form>
      </div>

      {/* Sticker Preview Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-[#2A211F]">
            Uploaded Stickers ({visibleStickers.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterCat('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                filterCat === 'all' ? 'bg-[#2A211F] text-white' : 'bg-white border border-[#E8DFD5]'
              }`}
            >
              All
            </button>
            {stickerCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCat(c.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  filterCat === c.id ? 'bg-[#2A211F] text-white' : 'bg-white border border-[#E8DFD5]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {visibleStickers.map((stk) => (
            <div
              key={stk.id}
              className="rounded-2xl bg-white border border-[#EAE0D5] p-3 flex flex-col justify-between"
            >
              <div className="aspect-square flex items-center justify-center bg-[#FAF7F2] rounded-xl p-2">
                <img src={stk.image_url} alt={stk.name} className="w-full h-full object-contain" />
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-[#2A211F] truncate">{stk.name}</p>
                <p className="text-[10px] text-[#7D6661] truncate">{stk.category_name}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => openEditSticker(stk)}
                  className="flex-1 rounded-lg border border-[#E8DFD5] py-1 text-[11px] font-medium hover:bg-[#FAF7F2]"
                >
                  Edit / Replace
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSticker(stk.id)}
                  className="p-1.5 rounded-lg border border-[#F2C7D2] text-[#A93855] hover:bg-[#FDF2F4]"
                  aria-label={`Delete ${stk.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Replace Sticker Modal */}
      {editingSticker && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setEditingSticker(null)}
        >
          <form
            onSubmit={handleSaveStickerEdit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE7DF]">
              <h3 className="font-display text-xl font-semibold">Edit or Replace Sticker</h3>
              <button type="button" onClick={() => setEditingSticker(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-medium text-[#6D5D58] mb-1">Sticker Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#6D5D58] mb-1">Category</label>
              <select
                value={editCat}
                onChange={(e) => setEditCat(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
              >
                <option value="">Uncategorised</option>
                {stickerCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#6D5D58] mb-1">Tags</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#6D5D58] mb-1">
                Replace Image File (Optional)
              </label>
              <input
                type="file"
                accept=".png,.webp,.svg,.jpg,.jpeg"
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                className="w-full text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSticker(null)}
                className="rounded-full border border-[#E8DFD5] px-4 py-2 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#2A211F] text-white px-5 py-2 font-semibold"
              >
                Save Sticker
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
