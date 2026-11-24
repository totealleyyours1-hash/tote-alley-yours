import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Minus, Plus, Star, Upload } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type { Product, ReviewRecord } from '../types/store';
import { SafeImage } from '../components/SafeImage';

export function ProductDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review submission state
  const [revName, setRevName] = useState(user?.full_name || '');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revPhoto, setRevPhoto] = useState<File | null>(null);
  const [revStatus, setRevStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submittingRev, setSubmittingRev] = useState(false);

  usePageMeta(
    product ? `${product.name} – Tote'Alley Yours` : "Product Details – Tote'Alley Yours",
    product?.description
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiFetch<{ product: Product; reviews: ReviewRecord[] }>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        setProduct(res.product);
        setReviews(res.reviews || []);
        setSelectedColor(res.product.colors[0] || '');
        setSelectedImage(0);
        setQuantity(1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user?.full_name && !revName) {
      setRevName(user.full_name);
    }
  }, [user, revName]);

  const handlePlaceOrder = () => {
    if (!product || product.stock <= 0) return;
    const params = new URLSearchParams({
      type: 'ready_made',
      productId: product.id,
      color: selectedColor || product.colors[0] || '',
      qty: String(quantity),
    });
    navigate(`/order?${params.toString()}`);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingRev(true);
    setRevStatus(null);
    try {
      const form = new FormData();
      form.append('product_id', product.id);
      form.append('author_name', revName);
      form.append('rating', String(revRating));
      form.append('title', revTitle);
      form.append('comment', revComment);
      if (revPhoto) form.append('photo', revPhoto);

      const res = await apiFetch<{ message: string }>('/api/reviews', {
        method: 'POST',
        body: form,
      });
      setRevStatus({ ok: true, msg: res.message });
      setRevTitle('');
      setRevComment('');
      setRevPhoto(null);
    } catch (err) {
      setRevStatus({
        ok: false,
        msg: err instanceof Error ? err.message : 'Could not submit review.',
      });
    } finally {
      setSubmittingRev(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-[#7D6661]">Loading tote details...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold mb-3">Tote Not Found</h1>
        <p className="text-sm text-[#6D5D58] mb-6">This design may have been unpublished or moved.</p>
        <Link to="/collection" className="rounded-full bg-[#2A211F] text-white px-6 py-3 text-sm font-semibold">
          Back to Collection
        </Link>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/collection"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D5D58] hover:text-[#2A211F] mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Ready-Made Collection</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-[#EAE0D5]">
            <SafeImage
              src={product.images[selectedImage] || product.images[0]}
              alt={product.name}
              fallbackLabel={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex flex-wrap gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border transition-all ${
                    selectedImage === idx
                      ? 'border-[#D66886] ring-2 ring-[#D66886]/30'
                      : 'border-[#E8DFD5] opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAE0D5] p-6 sm:p-8 lg:sticky lg:top-24 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#7D6661] mb-2">
              <span>{product.category_name || 'Ready-Made Original'}</span>
              <span aria-hidden="true">·</span>
              <span>Non-Customisable Design</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F] leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-2xl font-semibold text-[#2A211F] tabular-nums">
                ₹{product.price}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#5C4D49]">
                <Star className="w-4 h-4 fill-[#D66886] text-[#D66886]" />
                <span className="font-semibold tabular-nums">{product.rating_avg?.toFixed(1) || '5.0'}</span>
                <span className="text-[#8A756F]">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#5C4D49] leading-relaxed">{product.description}</p>

          {/* Available Colours */}
          {product.colors.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6661] mb-2.5">
                Available Colour: <span className="text-[#2A211F]">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                      selectedColor === c
                        ? 'border-[#D66886] bg-[#FDF2F4] text-[#2A211F]'
                        : 'border-[#E8DFD5] bg-[#FAF7F2] text-[#5C4D49] hover:border-[#C9BCB0]'
                    }`}
                  >
                    {selectedColor === c && <Check className="w-3.5 h-3.5 text-[#D66886]" />}
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Availability & Quantity */}
          <div className="pt-2 border-t border-[#EFE7DF] space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#6D5D58]">Availability</span>
              <span
                className={`font-semibold tabular-nums ${
                  outOfStock ? 'text-[#A93855]' : product.stock <= 5 ? 'text-[#B56E2A]' : 'text-[#4F6F52]'
                }`}
              >
                {outOfStock
                  ? 'Sold Out'
                  : product.stock <= 5
                  ? `Low Stock · Only ${product.stock} left`
                  : `In Stock (${product.stock} available)`}
              </span>
            </div>

            {!outOfStock && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#6D5D58]">Quantity</span>
                <div className="inline-flex items-center rounded-full border border-[#E8DFD5] bg-[#FAF7F2]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="p-2.5 text-[#2A211F] hover:text-[#D66886]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-sm font-semibold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase quantity"
                    className="p-2.5 text-[#2A211F] hover:text-[#D66886]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={outOfStock}
              className="w-full rounded-full bg-[#2A211F] text-white py-3.5 px-6 text-sm font-semibold tracking-wide hover:bg-[#433532] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {outOfStock ? 'Currently Sold Out' : `Place Order · ₹${product.price * quantity}`}
            </button>

            <p className="text-[11px] text-[#7D6661] text-center leading-relaxed">
              No automatic payment is deducted. Your order request is confirmed personally via Instagram DM (@totealleyours1).
            </p>
          </div>
        </div>
      </div>

      {/* Product Customer Reviews & Submission */}
      <section className="mt-16 pt-12 border-t border-[#E8DFD5] grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-5">
          <h2 className="font-display text-3xl font-semibold text-[#2A211F]">
            Customer Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-[#6D5D58]">
              No reviews yet for this tote bag. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-2xl bg-white border border-[#EAE0D5] p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < r.rating ? 'fill-[#D66886] text-[#D66886]' : 'text-[#E5D9CC]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-[#8A756F]">{r.created_at.slice(0, 10)}</span>
                  </div>
                  {r.title && <h3 className="text-sm font-semibold text-[#2A211F] mb-1">{r.title}</h3>}
                  <p className="text-sm text-[#5C4D49] leading-relaxed">{r.comment}</p>
                  {r.photo_url && (
                    <div className="mt-3 w-28 h-28 rounded-xl overflow-hidden border border-[#E8DFD5]">
                      <SafeImage src={r.photo_url} alt={`Review by ${r.author_name}`} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="mt-3 text-xs font-medium text-[#7D6661]">— {r.author_name}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <form
            onSubmit={handleReviewSubmit}
            className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4"
          >
            <h3 className="font-display text-2xl font-semibold text-[#2A211F]">Write a Review</h3>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Your Name</label>
              <input
                type="text"
                required
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="e.g. Ananya S."
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRevRating(star)}
                    className="p-1"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= revRating ? 'fill-[#D66886] text-[#D66886]' : 'text-[#DFD4C8]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Review Title</label>
              <input
                type="text"
                value={revTitle}
                onChange={(e) => setRevTitle(e.target.value)}
                placeholder="What did you love most?"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Your Experience</label>
              <textarea
                rows={3}
                required
                value={revComment}
                onChange={(e) => setRevComment(e.target.value)}
                placeholder="Share quality, print details, or everyday use..."
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Product Photo (Optional)
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-[#D8C9BC] bg-[#FAF7F2] px-3.5 py-2.5 text-xs text-[#6D5D58] cursor-pointer hover:border-[#D66886]">
                <Upload className="w-4 h-4 text-[#B55470]" />
                <span className="truncate">{revPhoto ? revPhoto.name : 'Upload PNG or JPG photo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setRevPhoto(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {revStatus && (
              <p
                className={`text-xs rounded-xl px-3 py-2 ${
                  revStatus.ok
                    ? 'bg-[#EEF5EE] text-[#355A38] border border-[#C8DEC9]'
                    : 'bg-[#FDF2F4] text-[#A93855] border border-[#F2C7D2]'
                }`}
              >
                {revStatus.msg}
              </p>
            )}

            <button
              type="submit"
              disabled={submittingRev}
              className="w-full rounded-full bg-[#D66886] text-white py-3 text-sm font-semibold hover:bg-[#C05270] transition-colors disabled:opacity-60"
            >
              {submittingRev ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
