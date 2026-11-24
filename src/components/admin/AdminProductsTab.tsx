import React, { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Category, Product } from '../../types/store';
import { SafeImage } from '../SafeImage';

export function AdminProductsTab({
  products,
  categories,
  onReload,
}: {
  products: Product[];
  categories: Category[];
  onReload: () => Promise<void>;
}) {
  const productCategories = categories.filter((c) => c.type === 'product');

  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('349');
  const [stock, setStock] = useState('15');
  const [categoryId, setCategoryId] = useState('');
  const [colorsText, setColorsText] = useState('Beige, Pastel Pink');
  const [tagsText, setTagsText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Quick category add
  const [newCatName, setNewCatName] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setPrice('349');
    setStock('15');
    setCategoryId(productCategories[0]?.id || '');
    setColorsText('Cream, Pastel Pink');
    setTagsText('');
    setImages([]);
    setIsFeatured(true);
    setIsBestseller(false);
    setIsNewArrival(true);
    setIsPublished(true);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(String(p.price));
    setStock(String(p.stock));
    setCategoryId(p.category_id || '');
    setColorsText(p.colors.join(', '));
    setTagsText(p.tags.join(', '));
    setImages(p.images);
    setIsFeatured(p.is_featured);
    setIsBestseller(p.is_bestseller);
    setIsNewArrival(p.is_new_arrival);
    setIsPublished(p.is_published);
    setError('');
    setModalOpen(true);
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('files', f));
      const res = await apiFetch<{ urls: string[] }>('/api/admin/upload/products', {
        method: 'POST',
        body: form,
      });
      setImages((prev) => [...prev, ...res.urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name,
        description,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        category_id: categoryId || null,
        colors: colorsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tags: tagsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        images,
        is_featured: isFeatured,
        is_bestseller: isBestseller,
        is_new_arrival: isNewArrival,
        is_published: isPublished,
      };

      if (editing) {
        await apiFetch(`/api/admin/products/${encodeURIComponent(editing.id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStock = async (p: Product, nextStock: number) => {
    await apiFetch(`/api/admin/products/${encodeURIComponent(p.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ stock: Math.max(0, nextStock) }),
    });
    await onReload();
  };

  const handleTogglePublish = async (p: Product) => {
    await apiFetch(`/api/admin/products/${encodeURIComponent(p.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: !p.is_published }),
    });
    await onReload();
  };

  const handleDelete = async (p: Product) => {
    await apiFetch(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    await onReload();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCatName.trim(), type: 'product' }),
    });
    setNewCatName('');
    await onReload();
  };

  const handleDeleteCategory = async (id: string) => {
    await apiFetch(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await onReload();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
            Ready-Made Products &amp; Inventory ({products.length})
          </h2>
          <p className="text-xs text-[#6D5D58]">
            Any published product automatically appears in your Ready-Made Collection.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-[#D66886] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#C05270]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-white border border-[#EAE0D5] overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[4/3] bg-[#FAF7F2] relative">
                <SafeImage src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#7D6661]">
                  <span>{p.category_name || 'Uncategorised'}</span>
                  <span className={p.is_published ? 'text-[#4F6F52] font-semibold' : 'text-[#A93855]'}>
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#2A211F] truncate">{p.name}</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold tabular-nums">₹{p.price}</span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      p.stock <= 0 ? 'text-[#A93855]' : p.stock <= 5 ? 'text-[#B56E2A]' : 'text-[#4F6F52]'
                    }`}
                  >
                    {p.stock <= 0 ? 'Sold Out (0)' : `${p.stock} in stock`}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 pt-2 border-t border-[#F3ECE4] space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#6D5D58]">Quick Stock:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickStock(p, p.stock + 5)}
                    className="px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E8DFD5] hover:bg-[#F3ECE4]"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStock(p, p.stock - 1)}
                    className="px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E8DFD5] hover:bg-[#F3ECE4]"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStock(p, 0)}
                    className="px-2 py-1 rounded-lg bg-[#FDF2F4] border border-[#F2C7D2] text-[#A93855]"
                  >
                    Sold Out
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-[#E8DFD5] py-2 text-xs font-semibold hover:bg-[#FAF7F2]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePublish(p)}
                  title={p.is_published ? 'Unpublish' : 'Publish'}
                  className="p-2 rounded-xl border border-[#E8DFD5] hover:bg-[#FAF7F2]"
                >
                  {p.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  title="Delete product"
                  className="p-2 rounded-xl border border-[#F2C7D2] text-[#A93855] hover:bg-[#FDF2F4]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Categories Manager */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4">
        <h3 className="font-display text-xl font-semibold text-[#2A211F]">Product Categories</h3>
        <div className="flex flex-wrap gap-2">
          {productCategories.map((c) => (
            <div
              key={c.id}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] px-3 py-1.5 text-xs font-medium"
            >
              <span>{c.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteCategory(c.id)}
                className="text-[#A93855] hover:opacity-75"
                aria-label={`Delete ${c.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleCreateCategory} className="flex flex-wrap gap-2 max-w-md">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name..."
            className="flex-1 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#2A211F] text-white px-4 py-2 text-xs font-semibold"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DF]">
              <h3 className="font-display text-2xl font-semibold">
                {editing ? 'Edit Product' : 'Add New Ready-Made Product'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-[#6D5D58] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-[#6D5D58] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-[#6D5D58] mb-1">Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block font-medium text-[#6D5D58] mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block font-medium text-[#6D5D58] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5 text-sm"
                >
                  <option value="">Uncategorised</option>
                  {productCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#6D5D58] mb-1">
                  Available Colours (comma separated)
                </label>
                <input
                  type="text"
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-[#6D5D58] mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="floral, bestseller, college"
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5 text-sm"
                />
              </div>

              {/* Multi-image uploader */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block font-medium text-[#6D5D58]">Product Images</label>
                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8C9BC] bg-[#FAF7F2] p-4 cursor-pointer hover:border-[#D66886]">
                  <Upload className="w-4 h-4 text-[#B55470]" />
                  <span>{uploading ? 'Uploading images...' : 'Upload 1 or more product photos (PNG, JPG, WebP)'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleUploadImages(e.target.files)}
                    className="hidden"
                  />
                </label>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {images.map((url, idx) => (
                      <div key={url + idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E8DFD5]">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                          aria-label="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  <span>Published</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span>Featured</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                  />
                  <span>Best Seller</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                  />
                  <span>New Arrival</span>
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-[#A93855]">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-[#E8DFD5] px-5 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-full bg-[#2A211F] text-white px-6 py-2.5 text-xs font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving...' : editing ? 'Save Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
