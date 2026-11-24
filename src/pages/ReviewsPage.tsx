import React, { useEffect, useMemo, useState } from 'react';
import { Star, Upload } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type { Product, ReviewRecord } from '../types/store';
import { SafeImage } from '../components/SafeImage';

export function ReviewsPage() {
  usePageMeta(
    "Customer Reviews – Tote'Alley Yours",
    'Read verified customer reviews and share photos of your Tote’Alley Yours bag.'
  );

  const { user } = useStore();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number>(0);

  const [authorName, setAuthorName] = useState(user?.full_name || '');
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiFetch<{ reviews: ReviewRecord[] }>('/api/reviews')
      .then((res) => setReviews(res.reviews || []))
      .catch(() => {});
    apiFetch<{ products: Product[] }>('/api/products')
      .then((res) => setProducts(res.products || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.full_name && !authorName) setAuthorName(user.full_name);
  }, [user, authorName]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!ratingFilter) return reviews;
    return reviews.filter((r) => r.rating === ratingFilter);
  }, [reviews, ratingFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const form = new FormData();
      form.append('author_name', authorName);
      if (productId) form.append('product_id', productId);
      form.append('rating', String(rating));
      form.append('title', title);
      form.append('comment', comment);
      if (photo) form.append('photo', photo);

      const res = await apiFetch<{ message: string }>('/api/reviews', {
        method: 'POST',
        body: form,
      });
      setStatusMsg({ ok: true, text: res.message });
      setTitle('');
      setComment('');
      setPhoto(null);
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to submit review.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E8DFD5]">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
            Community Love
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#2A211F]">
            Customer Reviews
          </h1>
          <p className="mt-2 text-sm text-[#5C4D49]">
            Average rating <strong className="tabular-nums text-[#2A211F]">{avgRating}/5.0</strong> across{' '}
            <span className="tabular-nums">{reviews.length}</span> approved reviews.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[0, 5, 4, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatingFilter(r)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                ratingFilter === r
                  ? 'bg-[#2A211F] text-white'
                  : 'bg-[#F3ECE4] text-[#5C4D49] hover:bg-[#EAE0D5]'
              }`}
            >
              {r === 0 ? 'All Stars' : `${r} Stars`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-4">
          {filteredReviews.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#EAE0D5] p-8 text-center text-sm text-[#6D5D58]">
              No reviews match this filter yet.
            </div>
          ) : (
            filteredReviews.map((rev) => (
              <article key={rev.id} className="rounded-2xl bg-white border border-[#EAE0D5] p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rev.rating ? 'fill-[#D66886] text-[#D66886]' : 'text-[#E5D9CC]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#8A756F]">{rev.created_at.slice(0, 10)}</span>
                </div>
                {rev.title && <h2 className="text-base font-semibold text-[#2A211F] mb-1">{rev.title}</h2>}
                <p className="text-sm text-[#5C4D49] leading-relaxed">{rev.comment}</p>
                {rev.photo_url && (
                  <div className="mt-3 w-36 h-36 rounded-xl overflow-hidden border border-[#E8DFD5]">
                    <SafeImage src={rev.photo_url} alt={`Photo by ${rev.author_name}`} className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="mt-3 text-xs text-[#7D6661]">
                  <span className="font-semibold text-[#2A211F]">{rev.author_name}</span>
                  {rev.product_name && ` · ${rev.product_name}`}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white border border-[#EAE0D5] p-6 sm:p-7 space-y-4 lg:sticky lg:top-24"
          >
            <h2 className="font-display text-2xl font-semibold text-[#2A211F]">Share Your Tote Review</h2>
            <p className="text-xs text-[#6D5D58]">
              Reviews are checked by our team before publishing on the store.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Tote Purchased (Optional)
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              >
                <option value="">Custom Tote / General Store Experience</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Star Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1"
                    aria-label={`${s} stars`}
                  >
                    <Star
                      className={`w-6 h-6 ${s <= rating ? 'fill-[#D66886] text-[#D66886]' : 'text-[#DFD4C8]'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summary of your experience"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Written Review *</label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us how you style or use your tote!"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Upload Tote Photo (Optional)
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-[#D8C9BC] bg-[#FAF7F2] px-3.5 py-2.5 text-xs text-[#6D5D58] cursor-pointer hover:border-[#D66886]">
                <Upload className="w-4 h-4 text-[#B55470]" />
                <span className="truncate">{photo ? photo.name : 'Choose JPG, PNG, or WebP'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {statusMsg && (
              <p
                className={`text-xs rounded-xl px-3 py-2 ${
                  statusMsg.ok
                    ? 'bg-[#EEF5EE] text-[#355A38] border border-[#C8DEC9]'
                    : 'bg-[#FDF2F4] text-[#A93855] border border-[#F2C7D2]'
                }`}
              >
                {statusMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#D66886] text-white py-3 text-sm font-semibold hover:bg-[#C05270] transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
