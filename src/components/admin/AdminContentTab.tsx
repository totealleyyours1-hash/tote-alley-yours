import React, { useState } from 'react';
import { Check, Eye, EyeOff, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type {
  ContactMessage,
  Product,
  ReviewRecord,
  SiteSection,
} from '../../types/store';

export function AdminReviewsAndCustomersTab({
  reviews,
  products,
  customers,
  messages,
  onReload,
}: {
  reviews: ReviewRecord[];
  products: Product[];
  customers: Array<{
    id: string;
    full_name: string;
    email: string;
    phone: string;
    created_at: string;
    order_count: number;
  }>;
  messages: ContactMessage[];
  onReload: () => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<'reviews' | 'customers' | 'messages'>('reviews');
  const [newRevAuthor, setNewRevAuthor] = useState('');
  const [newRevProd, setNewRevProd] = useState('');
  const [newRevRating, setNewRevRating] = useState(5);
  const [newRevTitle, setNewRevTitle] = useState('');
  const [newRevComment, setNewRevComment] = useState('');

  const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
    await apiFetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await onReload();
  };

  const handleDeleteReview = async (id: string) => {
    await apiFetch(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await onReload();
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/reviews', {
      method: 'POST',
      body: JSON.stringify({
        product_id: newRevProd || null,
        author_name: newRevAuthor,
        rating: newRevRating,
        title: newRevTitle,
        comment: newRevComment,
        status: 'approved',
      }),
    });
    setNewRevAuthor('');
    setNewRevTitle('');
    setNewRevComment('');
    await onReload();
  };

  const handleMarkMessage = async (id: string, status: 'new' | 'replied') => {
    await apiFetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await onReload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'reviews', label: `Customer Reviews (${reviews.length})` },
            { id: 'customers', label: `Registered Customers (${customers.length})` },
            { id: 'messages', label: `Contact Messages (${messages.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold ${
              subTab === t.id ? 'bg-[#2A211F] text-white' : 'bg-white border border-[#E8DFD5] text-[#5C4D49]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white border border-[#EAE0D5] p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#2A211F]">{r.author_name}</span>
                    <span className="text-xs text-[#7D6661]">
                      {r.product_name || 'General Store'}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold capitalize ${
                      r.status === 'approved'
                        ? 'text-[#4F6F52]'
                        : r.status === 'rejected'
                        ? 'text-[#A93855]'
                        : 'text-[#B56E2A]'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < r.rating ? 'fill-[#D66886] text-[#D66886]' : 'text-[#E5D9CC]'
                      }`}
                    />
                  ))}
                </div>

                {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                <p className="text-xs text-[#5C4D49] leading-relaxed">{r.comment}</p>
                {r.photo_url && (
                  <img
                    src={r.photo_url}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover border border-[#E8DFD5]"
                  />
                )}

                <div className="pt-2 flex flex-wrap gap-2">
                  {r.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleModerate(r.id, 'approved')}
                      className="inline-flex items-center gap-1 rounded-full bg-[#EEF5EE] text-[#355A38] px-3 py-1 text-xs font-semibold"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleModerate(r.id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FAF7F2] border border-[#E8DFD5] text-[#6D5D58] px-3 py-1 text-xs font-semibold"
                    >
                      <X className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(r.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#FDF2F4] text-[#A93855] px-3 py-1 text-xs font-semibold"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddReview}
            className="lg:col-span-5 rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-3 text-xs"
          >
            <h3 className="font-display text-xl font-semibold text-[#2A211F]">
              Add Verified Review
            </h3>
            <input
              type="text"
              required
              value={newRevAuthor}
              onChange={(e) => setNewRevAuthor(e.target.value)}
              placeholder="Customer Name"
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <select
              value={newRevProd}
              onChange={(e) => setNewRevProd(e.target.value)}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            >
              <option value="">General Store / Custom Tote</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={newRevRating}
              onChange={(e) => setNewRevRating(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} Stars
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newRevTitle}
              onChange={(e) => setNewRevTitle(e.target.value)}
              placeholder="Headline"
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              required
              value={newRevComment}
              onChange={(e) => setNewRevComment(e.target.value)}
              placeholder="Review comment..."
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-[#2A211F] text-white py-2.5 text-xs font-semibold"
            >
              Publish Review
            </button>
          </form>
        </div>
      )}

      {subTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-[#EAE0D5] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#EFE7DF] text-[#7D6661] uppercase">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE4]">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-semibold">{c.full_name}</td>
                  <td className="py-3 px-4">{c.email}</td>
                  <td className="py-3 px-4">{c.phone || '—'}</td>
                  <td className="py-3 px-4 tabular-nums">{c.order_count}</td>
                  <td className="py-3 px-4">{c.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#EAE0D5] p-8 text-center text-xs text-[#6D5D58]">
              No contact messages yet.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-2xl bg-white border border-[#EAE0D5] p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-[#2A211F]">{m.name}</span>
                    <span className="text-xs text-[#7D6661] ml-2">
                      {m.email} {m.phone && `· ${m.phone}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkMessage(m.id, m.status === 'new' ? 'replied' : 'new')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      m.status === 'replied'
                        ? 'bg-[#EEF5EE] text-[#355A38]'
                        : 'bg-[#FDF2F4] text-[#B55470]'
                    }`}
                  >
                    {m.status === 'replied' ? 'Replied' : 'Mark Replied'}
                  </button>
                </div>
                {m.subject && <p className="text-xs font-semibold">{m.subject}</p>}
                <p className="text-xs text-[#5C4D49] leading-relaxed">{m.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AdminContentTab({
  sections,
  onReload,
}: {
  sections: SiteSection[];
  onReload: () => Promise<void>;
}) {
  const { site, refreshSite } = useStore();

  const [pricing, setPricing] = useState(site.pricing);
  const [business, setBusiness] = useState(site.business);
  const [homepage, setHomepage] = useState(site.homepage);
  const [savingMsg, setSavingMsg] = useState('');

  // New section form
  const [secTitle, setSecTitle] = useState('');
  const [secSubtitle, setSecSubtitle] = useState('');
  const [secBody, setSecBody] = useState('');
  const [secImage, setSecImage] = useState('');
  const [secCtaText, setSecCtaText] = useState('Explore');
  const [secCtaLink, setSecCtaLink] = useState('/shop');

  const uploadSiteAsset = async (file: File | null, onDone: (url: string) => void) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch<{ url: string }>('/api/admin/upload/site', {
      method: 'POST',
      body: form,
    });
    onDone(res.url);
  };

  const saveGroup = async (key: 'pricing' | 'business' | 'homepage', payload: unknown) => {
    setSavingMsg('');
    await apiFetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await refreshSite();
    setSavingMsg(`Saved ${key} updates to live store!`);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/sections', {
      method: 'POST',
      body: JSON.stringify({
        title: secTitle,
        subtitle: secSubtitle,
        body: secBody,
        image_url: secImage,
        cta_text: secCtaText,
        cta_link: secCtaLink,
        is_published: true,
      }),
    });
    setSecTitle('');
    setSecSubtitle('');
    setSecBody('');
    setSecImage('');
    await Promise.all([onReload(), refreshSite()]);
  };

  const handleToggleSection = async (sec: SiteSection) => {
    await apiFetch(`/api/admin/sections/${encodeURIComponent(sec.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: !sec.is_published }),
    });
    await Promise.all([onReload(), refreshSite()]);
  };

  const handleDeleteSection = async (id: string) => {
    await apiFetch(`/api/admin/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await Promise.all([onReload(), refreshSite()]);
  };

  return (
    <div className="space-y-8">
      {savingMsg && (
        <div className="rounded-xl bg-[#EEF5EE] border border-[#C8DEC9] px-4 py-2.5 text-xs font-semibold text-[#355A38]">
          {savingMsg}
        </div>
      )}

      {/* Custom Tote Pricing Controls */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
          Custom Tote Pricing Rules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">
              Beige / White / Pink Base (₹)
            </label>
            <input
              type="number"
              value={pricing.base_standard_price}
              onChange={(e) =>
                setPricing({ ...pricing, base_standard_price: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Black Tote Base (₹)</label>
            <input
              type="number"
              value={pricing.base_black_price}
              onChange={(e) =>
                setPricing({ ...pricing, base_black_price: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Free Stickers Included</label>
            <input
              type="number"
              value={pricing.free_stickers_included}
              onChange={(e) =>
                setPricing({ ...pricing, free_stickers_included: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Extra Sticker Charge (₹)</label>
            <input
              type="number"
              value={pricing.extra_sticker_price}
              onChange={(e) =>
                setPricing({ ...pricing, extra_sticker_price: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Custom Text Charge (₹)</label>
            <input
              type="number"
              value={pricing.custom_text_charge}
              onChange={(e) =>
                setPricing({ ...pricing, custom_text_charge: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm tabular-nums"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => saveGroup('pricing', pricing)}
          className="rounded-full bg-[#2A211F] text-white px-6 py-2.5 text-xs font-semibold"
        >
          Save Pricing Changes
        </button>
      </div>

      {/* Homepage & Banner Editor */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4 text-xs">
        <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
          Homepage Banners &amp; Copy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block font-medium text-[#6D5D58] mb-1">Top Announcement Text</label>
            <input
              type="text"
              value={homepage.announcement_text}
              onChange={(e) => setHomepage({ ...homepage, announcement_text: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Hero Heading</label>
            <input
              type="text"
              value={homepage.hero_title}
              onChange={(e) => setHomepage({ ...homepage, hero_title: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Hero Banner Image</label>
            <div className="flex items-center gap-3">
              <img src={homepage.hero_image} alt="" className="w-16 h-10 rounded-lg object-cover border" />
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Banner</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    uploadSiteAsset(e.target.files?.[0] || null, (url) =>
                      setHomepage((h) => ({ ...h, hero_image: url }))
                    )
                  }
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium text-[#6D5D58] mb-1">Hero Introduction</label>
            <textarea
              rows={2}
              value={homepage.hero_subtitle}
              onChange={(e) => setHomepage({ ...homepage, hero_subtitle: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">About Section Heading</label>
            <input
              type="text"
              value={homepage.about_title}
              onChange={(e) => setHomepage({ ...homepage, about_title: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">About Section Image</label>
            <div className="flex items-center gap-3">
              <img src={homepage.about_image} alt="" className="w-16 h-10 rounded-lg object-cover border" />
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload About Photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    uploadSiteAsset(e.target.files?.[0] || null, (url) =>
                      setHomepage((h) => ({ ...h, about_image: url }))
                    )
                  }
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium text-[#6D5D58] mb-1">About Section Description</label>
            <textarea
              rows={2}
              value={homepage.about_body}
              onChange={(e) => setHomepage({ ...homepage, about_body: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => saveGroup('homepage', homepage)}
          className="rounded-full bg-[#D66886] text-white px-6 py-2.5 text-xs font-semibold"
        >
          Save Homepage Content
        </button>
      </div>

      {/* Business & Social Links */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4 text-xs">
        <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
          Business Details &amp; Social Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Store Email</label>
            <input
              type="email"
              value={business.email}
              onChange={(e) => setBusiness({ ...business, email: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-medium text-[#6D5D58] mb-1">Instagram Handle</label>
            <input
              type="text"
              value={business.instagram_handle}
              onChange={(e) => setBusiness({ ...business, instagram_handle: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-[#6D5D58] mb-1">Instagram Profile URL</label>
            <input
              type="url"
              value={business.instagram_url}
              onChange={(e) => setBusiness({ ...business, instagram_url: e.target.value })}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => saveGroup('business', business)}
          className="rounded-full bg-[#2A211F] text-white px-6 py-2.5 text-xs font-semibold"
        >
          Save Business Details
        </button>
      </div>

      {/* Custom Website Sections */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-5 text-xs">
        <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
          Website Sections ({sections.length})
        </h2>

        <div className="space-y-3">
          {sections.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FAF7F2] border border-[#EFE7DF] p-4"
            >
              <div>
                <p className="text-sm font-semibold text-[#2A211F]">{s.title}</p>
                <p className="text-xs text-[#6D5D58]">{s.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSection(s)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${
                    s.is_published
                      ? 'bg-[#EEF5EE] text-[#355A38]'
                      : 'bg-white border border-[#E8DFD5] text-[#6D5D58]'
                  }`}
                >
                  {s.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{s.is_published ? 'Published' : 'Hidden'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(s.id)}
                  className="p-1.5 rounded-full text-[#A93855] hover:bg-[#FDF2F4]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddSection} className="pt-4 border-t border-[#EFE7DF] space-y-3">
          <p className="font-semibold text-sm text-[#2A211F]">Add New Homepage Section</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={secTitle}
              onChange={(e) => setSecTitle(e.target.value)}
              placeholder="Section Title"
              className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={secSubtitle}
              onChange={(e) => setSecSubtitle(e.target.value)}
              placeholder="Subtitle / Kicker"
              className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              required
              value={secBody}
              onChange={(e) => setSecBody(e.target.value)}
              placeholder="Section paragraph..."
              className="sm:col-span-2 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={secCtaText}
              onChange={(e) => setSecCtaText(e.target.value)}
              placeholder="Button Label"
              className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={secCtaLink}
              onChange={(e) => setSecCtaLink(e.target.value)}
              placeholder="Button Path (e.g. /customise)"
              className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{secImage ? 'Image Uploaded' : 'Upload Section Image (Optional)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    uploadSiteAsset(e.target.files?.[0] || null, (url) => setSecImage(url))
                  }
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#D66886] text-white px-5 py-2 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
