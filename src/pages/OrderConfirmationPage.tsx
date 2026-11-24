import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check, Copy, Heart, Instagram } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type { OrderRecord } from '../types/store';
import { SafeImage } from '../components/SafeImage';

export function OrderConfirmationPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { site, resetDraftDesign } = useStore();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  usePageMeta(
    orderCode ? `Order ${orderCode} Received – Tote'Alley Yours` : "Order Confirmation – Tote'Alley Yours"
  );

  useEffect(() => {
    if (!orderCode) return;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    apiFetch<{ order: OrderRecord }>(`/api/orders/receipt/${encodeURIComponent(orderCode)}${qs}`)
      .then((res) => {
        setOrder(res.order);
        resetDraftDesign();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load order receipt.');
      })
      .finally(() => setLoading(false));
  }, [orderCode, token, resetDraftDesign]);

  const handleCopyCode = () => {
    if (!order) return;
    navigator.clipboard
      ?.writeText(
        `Hi @totealleyours1! I just placed order request ${order.order_code} (${order.product_name}, Qty: ${order.quantity}, Est. ₹${order.estimated_price}). Let's finalise it!`
      )
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#7D6661]">
        Confirming your order request...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold mb-3">Order Receipt Unavailable</h1>
        <p className="text-sm text-[#6D5D58] mb-6">{error || 'Order not found.'}</p>
        <Link to="/account" className="rounded-full bg-[#2A211F] text-white px-6 py-3 text-sm font-semibold">
          Go to My Account
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-3xl bg-white border border-[#EAE0D5] overflow-hidden shadow-sm">
        {/* Exact Required Confirmation Banner */}
        <div className="bg-[#FDF2F4] border-b border-[#F1D8DF] px-6 sm:px-10 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-[#F1D8DF] flex items-center justify-center mx-auto mb-5 text-[#D66886]">
            <Heart className="w-5 h-5 fill-[#D66886]" />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2A211F] mb-4">
            THANK YOU FOR CHOOSING TOTE&apos;ALLEY YOURS! ♡
          </h1>

          <div className="max-w-xl mx-auto space-y-2.5 text-sm sm:text-base text-[#4D3F3B] leading-relaxed">
            <p>Your order request has been received.</p>
            <p className="font-semibold text-[#2A211F]">
              To finalise your order, please message us on Instagram at {site.business.instagram_handle}.
            </p>
            <p>
              We will discuss your design, confirm the final price, arrange payment, and agree on your delivery date.
            </p>
            <p>Your order will be confirmed once all details and payment have been verified.</p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={site.business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#D66886] text-white px-7 py-3.5 text-sm font-semibold tracking-wide hover:bg-[#C05270] transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>MESSAGE US ON INSTAGRAM</span>
            </a>

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 rounded-full border border-[#D8C9BC] bg-white text-[#2A211F] px-5 py-3.5 text-xs font-semibold hover:bg-[#FAF7F2] transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-[#4F6F52]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'DM Message Copied!' : 'Copy Order Message for DM'}</span>
            </button>
          </div>
        </div>

        {/* Receipt Summary */}
        <div className="p-6 sm:p-10 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#EFE7DF]">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7D6661]">Unique Order ID</p>
              <p className="font-mono text-2xl font-semibold text-[#2A211F] tabular-nums mt-0.5">
                {order.order_code}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wider text-[#7D6661]">Order Status</p>
              <p className="text-sm font-semibold text-[#B55470] mt-1">
                {order.order_status} · Payment: {order.payment_status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6661] mb-3">
                Product Preview
              </p>
              <div className="aspect-[5/6] rounded-2xl overflow-hidden border border-[#E8DFD5] bg-[#FAF7F2]">
                <SafeImage
                  src={order.preview_url}
                  alt={order.product_name}
                  fallbackLabel={order.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="md:col-span-7 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6661] mb-2">
                  Order Summary
                </p>
                <div className="rounded-2xl bg-[#FAF7F2] border border-[#EFE7DF] p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6D5D58]">Item</span>
                    <span className="font-semibold text-[#2A211F]">{order.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6D5D58]">Colour</span>
                    <span className="text-[#2A211F]">{order.selected_color || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6D5D58]">Quantity</span>
                    <span className="tabular-nums text-[#2A211F]">{order.quantity}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E5D9CC] flex justify-between text-base font-semibold">
                    <span>Estimated Total</span>
                    <span className="tabular-nums text-[#B55470]">₹{order.estimated_price}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6661] mb-2">
                  Customer &amp; Delivery Details
                </p>
                <div className="rounded-2xl bg-[#FAF7F2] border border-[#EFE7DF] p-4 text-sm text-[#4D3F3B] space-y-1">
                  <p className="font-semibold text-[#2A211F]">{order.customer_name}</p>
                  <p>{order.customer_phone} · {order.customer_email}</p>
                  <p className="pt-1">
                    {order.address}, {order.city}, {order.state} – {order.pin_code}
                  </p>
                </div>
              </div>

              {site.payment_qr.qr_image_url && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6661] mb-2">
                    Studio Payment QR (Use after confirming on Instagram)
                  </p>
                  <div className="rounded-2xl bg-[#FAF7F2] border border-[#EFE7DF] p-4 flex items-center gap-4">
                    <img
                      src={site.payment_qr.qr_image_url}
                      alt="Payment QR Code"
                      className="w-24 h-24 rounded-xl object-contain bg-white border border-[#E5D9CC]"
                    />
                    <p className="text-xs text-[#5C4D49] leading-relaxed">
                      {site.payment_qr.instructions ||
                        'Please message us on @totealleyours1 to verify your design and final amount before scanning.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/collection"
                  className="rounded-full border border-[#E8DFD5] bg-white px-5 py-2.5 text-xs font-semibold text-[#2A211F] hover:bg-[#FAF7F2]"
                >
                  Continue Shopping
                </Link>
                <Link
                  to="/account"
                  className="rounded-full border border-[#E8DFD5] bg-white px-5 py-2.5 text-xs font-semibold text-[#2A211F] hover:bg-[#FAF7F2]"
                >
                  Track in My Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
