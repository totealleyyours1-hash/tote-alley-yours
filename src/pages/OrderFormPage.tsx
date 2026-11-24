import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Instagram, MapPin, Minus, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { BAG_COLOR_PALETTE } from '../lib/customiserFonts';
import { computePriceBreakdown, usePageMeta, useStore } from '../context/StoreContext';
import type { CustomDesign, OrderRecord, Product } from '../types/store';
import { SafeImage } from '../components/SafeImage';

export function OrderFormPage() {
  usePageMeta(
    "Complete Your Order Request – Tote'Alley Yours",
    'Review your custom or ready-made tote bag and submit your order request to Tote’Alley Yours.'
  );

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { site, user, draftDesign } = useStore();

  const paramType = searchParams.get('type');
  const paramDesignId = searchParams.get('designId');
  const paramProductId = searchParams.get('productId');
  const paramColor = searchParams.get('color') || '';
  const paramQty = Math.max(1, Number(searchParams.get('qty')) || 1);

  const orderType: 'custom' | 'ready_made' =
    paramType === 'ready_made' || (paramProductId && !paramDesignId) ? 'ready_made' : 'custom';

  const [design, setDesign] = useState<CustomDesign | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState(paramColor);
  const [quantity, setQuantity] = useState(paramQty);
  const [loadingItem, setLoadingItem] = useState(true);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fill from logged-in customer account & default saved address
  useEffect(() => {
    if (!user) return;
    setFullName((prev) => prev || user.full_name);
    setPhone((prev) => prev || user.phone || '');
    setEmail((prev) => prev || user.email);
    const defaultAddr =
      user.saved_addresses.find((a) => a.is_default) || user.saved_addresses[0];
    if (defaultAddr) {
      setAddress((prev) => prev || defaultAddr.address);
      setCity((prev) => prev || defaultAddr.city);
      setStateName((prev) => prev || defaultAddr.state);
      setPinCode((prev) => prev || defaultAddr.pin_code);
      if (defaultAddr.phone) setPhone((prev) => prev || defaultAddr.phone);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoadingItem(true);

    if (orderType === 'ready_made' && paramProductId) {
      apiFetch<{ product: Product }>(`/api/products/${encodeURIComponent(paramProductId)}`)
        .then((res) => {
          if (!active) return;
          setProduct(res.product);
          if (!paramColor && res.product.colors.length > 0) {
            setSelectedColor(res.product.colors[0]);
          }
        })
        .catch(() => {
          if (active) setProduct(null);
        })
        .finally(() => {
          if (active) setLoadingItem(false);
        });
    } else if (paramDesignId) {
      apiFetch<{ design: CustomDesign }>(`/api/designs/${encodeURIComponent(paramDesignId)}`)
        .then((res) => {
          if (active) setDesign(res.design);
        })
        .catch(() => {
          if (active) setDesign(null);
        })
        .finally(() => {
          if (active) setLoadingItem(false);
        });
    } else {
      setLoadingItem(false);
    }

    return () => {
      active = false;
    };
  }, [orderType, paramProductId, paramDesignId, paramColor]);

  const customBreakdown = useMemo(() => {
    if (design) {
      return computePriceBreakdown(design.bag_color, design.elements, site.pricing);
    }
    if (draftDesign.elements.length > 0 || draftDesign.bagColor) {
      return computePriceBreakdown(draftDesign.bagColor, draftDesign.elements, site.pricing);
    }
    return null;
  }, [design, draftDesign, site.pricing]);

  const estimatedTotal = useMemo(() => {
    if (orderType === 'ready_made' && product) {
      return product.price * quantity;
    }
    if (customBreakdown) {
      return customBreakdown.totalEstimatedPrice * quantity;
    }
    return 0;
  }, [orderType, product, customBreakdown, quantity]);

  const handleSelectSavedAddress = (addrId: string) => {
    const found = user?.saved_addresses.find((a) => a.id === addrId);
    if (!found) return;
    setFullName(found.full_name || user?.full_name || '');
    setPhone(found.phone || user?.phone || '');
    setAddress(found.address);
    setCity(found.city);
    setStateName(found.state);
    setPinCode(found.pin_code);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      let designIdToUse = design?.id || paramDesignId || draftDesign.id;
      if (orderType === 'custom' && !designIdToUse) {
        const saved = await apiFetch<{ design: CustomDesign }>('/api/designs', {
          method: 'POST',
          body: JSON.stringify({
            title: draftDesign.title || 'My Custom Tote',
            bag_color: draftDesign.bagColor,
            elements: draftDesign.elements,
          }),
        });
        designIdToUse = saved.design.id;
      }

      const res = await apiFetch<{ order: OrderRecord; receiptToken: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: fullName,
          customer_phone: phone,
          customer_email: email,
          address,
          city,
          state: stateName,
          pin_code: pinCode,
          order_type: orderType,
          product_id: orderType === 'ready_made' ? product?.id : null,
          selected_color: orderType === 'ready_made' ? selectedColor : design?.bag_color || draftDesign.bagColor,
          quantity,
          custom_design_id: orderType === 'custom' ? designIdToUse : null,
        }),
      });

      navigate(
        `/order-confirmation/${encodeURIComponent(res.order.order_code)}?token=${encodeURIComponent(
          res.receiptToken
        )}`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit order. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingItem) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-sm text-[#7D6661]">Loading your order summary...</div>;
  }

  const missingProduct = orderType === 'ready_made' && !product;
  const missingCustom = orderType === 'custom' && !design && !draftDesign.id && draftDesign.elements.length === 0;

  if (missingProduct) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold mb-3">No Tote Selected Yet</h1>
        <p className="text-sm text-[#6D5D58] mb-6">
          Pick an illustrated bag from our Ready-Made Collection or design your own in our studio.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/customise" className="rounded-full bg-[#D66886] text-white px-6 py-3 text-sm font-semibold">
            Customise a Tote
          </Link>
          <Link to="/collection" className="rounded-full bg-[#2A211F] text-white px-6 py-3 text-sm font-semibold">
            Explore Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to={orderType === 'custom' ? '/customise' : `/product/${product?.slug || ''}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D5D58] hover:text-[#2A211F] mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{orderType === 'custom' ? 'Back to Custom Studio' : 'Back to Product Details'}</span>
      </Link>

      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
          Order Request Form
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F]">
          Review &amp; Submit Your Tote Request
        </h1>
        <p className="mt-2 text-sm text-[#5C4D49]">
          No online payment is charged now. Once you place your request, we confirm all details and arrange payment personally via Instagram ({site.business.instagram_handle}).
        </p>
      </div>

      {missingCustom && (
        <div className="mb-6 rounded-2xl bg-[#FDF2F4] border border-[#F1D8DF] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5C4D49]">
            Ordering a plain {BAG_COLOR_PALETTE[draftDesign.bagColor].label} tote? Or head back to add stickers and text first!
          </p>
          <Link
            to="/customise"
            className="text-xs font-semibold text-[#B55470] hover:underline"
          >
            Open Customiser &rarr;
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Delivery Details Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAE0D5] p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFE7DF]">
            <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
              Delivery Details
            </h2>
            {!user && (
              <Link to="/login" className="text-xs font-semibold text-[#B55470] hover:underline">
                Have an account? Sign in &rarr;
              </Link>
            )}
          </div>

          {/* Saved Address Quick Picker */}
          {user && user.saved_addresses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#6D5D58]">Use Saved Address:</p>
              <div className="flex flex-wrap gap-2">
                {user.saved_addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] hover:border-[#D66886] px-3 py-1.5 text-xs font-medium text-[#2A211F]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#B55470]" />
                    <span>{addr.label || addr.city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Delivery Address *</label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Flat no., Building, Street, Landmark"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">State *</label>
              <input
                type="text"
                required
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="State"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">PIN Code *</label>
              <input
                type="text"
                required
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="e.g. 400001"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#FDF2F4] border border-[#F1D8DF] p-4 flex items-start gap-3">
            <Instagram className="w-5 h-5 text-[#D66886] shrink-0 mt-0.5" />
            <div className="text-xs text-[#5C4D49] leading-relaxed">
              <strong className="text-[#2A211F]">Manual Instagram Confirmation:</strong> After submitting, you&apos;ll receive your Order ID and a direct link to message us on{' '}
              <span className="font-semibold">{site.business.instagram_handle}</span> to confirm your design, payment, and delivery date.
            </div>
          </div>
        </div>

        {/* Right Order Review Summary */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#EAE0D5] p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-semibold text-[#2A211F] pb-3 border-b border-[#EFE7DF]">
            Order Summary
          </h2>

          {/* Preview Box */}
          <div className="flex gap-4 items-center">
            <div className="w-24 h-28 rounded-xl overflow-hidden border border-[#E8DFD5] bg-[#FAF7F2] shrink-0">
              <SafeImage
                src={
                  orderType === 'ready_made'
                    ? product?.images[0]
                    : design?.preview_url || draftDesign.previewUrl
                }
                alt={orderType === 'ready_made' ? product?.name || 'Tote' : 'Custom Tote Preview'}
                fallbackLabel="Tote Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#7D6661]">
                {orderType === 'custom' ? 'Customised Tote Bag' : 'Ready-Made Design'}
              </p>
              <h3 className="text-base font-semibold text-[#2A211F] truncate">
                {orderType === 'ready_made'
                  ? product?.name
                  : design?.title || draftDesign.title || 'My Custom Tote'}
              </h3>
              <p className="text-xs text-[#5C4D49] mt-1">
                Colour:{' '}
                <span className="font-medium">
                  {orderType === 'ready_made'
                    ? selectedColor || product?.colors[0]
                    : BAG_COLOR_PALETTE[design?.bag_color || draftDesign.bagColor].label}
                </span>
              </p>
            </div>
          </div>

          {/* Quantity Control */}
          <div className="flex items-center justify-between py-3 border-y border-[#EFE7DF]">
            <span className="text-sm font-medium text-[#5C4D49]">Quantity</span>
            <div className="inline-flex items-center rounded-full border border-[#E8DFD5] bg-[#FAF7F2]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 text-[#2A211F]"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3.5 text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  const maxStock = orderType === 'ready_made' && product ? product.stock : 50;
                  setQuantity((q) => Math.min(maxStock, q + 1));
                }}
                className="p-2 text-[#2A211F]"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom Breakdown Details */}
          {orderType === 'custom' && customBreakdown && (
            <div className="space-y-2 text-xs text-[#5C4D49]">
              <div className="flex justify-between">
                <span>Base Bag ({BAG_COLOR_PALETTE[customBreakdown.bagColor].label})</span>
                <span className="tabular-nums">₹{customBreakdown.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Stickers Placed ({customBreakdown.stickerCount} total · {customBreakdown.freeStickersIncluded} free)
                </span>
                <span className="tabular-nums">
                  {customBreakdown.extraStickerCharge > 0 ? `+₹${customBreakdown.extraStickerCharge}` : '₹0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Custom Text Elements</span>
                <span className="tabular-nums">{customBreakdown.textElementCount}</span>
              </div>
              {quantity > 1 && (
                <div className="flex justify-between">
                  <span>Per-Bag Subtotal &times; {quantity}</span>
                  <span className="tabular-nums">₹{customBreakdown.totalEstimatedPrice} &times; {quantity}</span>
                </div>
              )}
            </div>
          )}

          {orderType === 'ready_made' && product && (
            <div className="space-y-2 text-xs text-[#5C4D49]">
              <div className="flex justify-between">
                <span>Unit Price</span>
                <span className="tabular-nums">₹{product.price}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity</span>
                <span className="tabular-nums">{quantity}</span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#EFE7DF] flex items-center justify-between">
            <span className="text-base font-semibold text-[#2A211F]">Estimated Total</span>
            <span className="text-2xl font-semibold text-[#B55470] tabular-nums">
              ₹{estimatedTotal}
            </span>
          </div>

          {errorMsg && (
            <p className="text-xs text-[#A93855] bg-[#FDF2F4] border border-[#F2C7D2] rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#2A211F] text-white py-3.5 px-6 text-sm font-semibold tracking-wide hover:bg-[#433532] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Submitting Request...' : 'PLACE MY ORDER'}</span>
          </button>
        </aside>
      </form>
    </div>
  );
}
