import React, { useState } from 'react';
import { QrCode, Trash2, Upload } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type { OrderRecord, PaymentStatus } from '../../types/store';

export function AdminPaymentsTab({
  orders,
  onOrderUpdated,
}: {
  orders: OrderRecord[];
  onOrderUpdated: (updated: OrderRecord) => void;
}) {
  const { site, refreshSite } = useStore();
  const [qrUrl, setQrUrl] = useState(site.payment_qr.qr_image_url || '');
  const [instructions, setInstructions] = useState(site.payment_qr.instructions || '');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [qrFeedback, setQrFeedback] = useState('');

  const handleUploadQr = async (file: File | null) => {
    if (!file) return;
    setUploadingQr(true);
    setQrFeedback('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch<{ url: string }>('/api/admin/upload/site', {
        method: 'POST',
        body: form,
      });
      setQrUrl(res.url);
      await apiFetch('/api/admin/settings/payment_qr', {
        method: 'PUT',
        body: JSON.stringify({ qr_image_url: res.url, instructions }),
      });
      await refreshSite();
      setQrFeedback('Payment QR code uploaded and saved.');
    } catch (err) {
      setQrFeedback(err instanceof Error ? err.message : 'Failed to upload QR code.');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRemoveQr = async () => {
    setSavingQr(true);
    try {
      setQrUrl('');
      await apiFetch('/api/admin/settings/payment_qr', {
        method: 'PUT',
        body: JSON.stringify({ qr_image_url: '', instructions }),
      });
      await refreshSite();
      setQrFeedback('Payment QR code removed.');
    } finally {
      setSavingQr(false);
    }
  };

  const handleSaveInstructions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQr(true);
    try {
      await apiFetch('/api/admin/settings/payment_qr', {
        method: 'PUT',
        body: JSON.stringify({ qr_image_url: qrUrl, instructions }),
      });
      await refreshSite();
      setQrFeedback('Payment instructions saved.');
    } finally {
      setSavingQr(false);
    }
  };

  const handleQuickPaymentUpdate = async (
    order: OrderRecord,
    patch: { payment_status?: PaymentStatus; amount_received?: number; final_price?: number | null }
  ) => {
    const res = await apiFetch<{ order: OrderRecord }>(
      `/api/admin/orders/${encodeURIComponent(order.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }
    );
    onOrderUpdated(res.order);
  };

  return (
    <div className="space-y-8">
      {/* Payment QR Code Management */}
      <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
            Payment QR Code Management
          </h2>
          <p className="text-xs text-[#6D5D58]">
            Upload, replace, or remove your UPI / payment QR code. Customers can view it on their confirmation receipt when active.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-4 flex flex-col items-center justify-center rounded-2xl bg-[#FAF7F2] border border-[#E8DFD5] p-6">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Store Payment QR Code"
                className="w-48 h-48 object-contain rounded-xl bg-white p-2 border border-[#E5D9CC]"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl border border-dashed border-[#D8C9BC] flex flex-col items-center justify-center text-center p-4 text-[#8A756F]">
                <QrCode className="w-8 h-8 mb-2 opacity-60" />
                <span className="text-xs">No payment QR code uploaded yet</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-full bg-[#2A211F] text-white px-4 py-2 text-xs font-semibold cursor-pointer hover:bg-[#433532]">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingQr ? 'Uploading...' : qrUrl ? 'Replace QR' : 'Upload QR'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleUploadQr(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {qrUrl && (
                <button
                  type="button"
                  onClick={handleRemoveQr}
                  disabled={savingQr}
                  className="inline-flex items-center gap-1 rounded-full border border-[#F2C7D2] bg-[#FDF2F4] text-[#A93855] px-4 py-2 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveInstructions} className="md:col-span-8 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Payment Instructions Shown to Customers
              </label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            {qrFeedback && <p className="text-xs text-[#355A38]">{qrFeedback}</p>}

            <button
              type="submit"
              disabled={savingQr}
              className="rounded-full bg-[#D66886] text-white px-6 py-2.5 text-xs font-semibold hover:bg-[#C05270]"
            >
              {savingQr ? 'Saving...' : 'Save Payment Instructions'}
            </button>
          </form>
        </div>
      </div>

      {/* Order Payment Ledger */}
      <div className="bg-white rounded-2xl border border-[#EAE0D5] overflow-hidden">
        <div className="p-5 border-b border-[#EFE7DF]">
          <h3 className="font-display text-xl font-semibold text-[#2A211F]">
            Order Payment Records
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#EFE7DF] text-[#7D6661] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Confirmed / Est.</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Quick Confirm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE4]">
              {orders.map((o) => {
                const total = o.final_price ?? o.estimated_price;
                const balance = Math.max(0, total - (o.amount_received || 0));
                return (
                  <tr key={o.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-[#B55470] tabular-nums">
                      {o.order_code}
                    </td>
                    <td className="py-3 px-4">{o.customer_name}</td>
                    <td className="py-3 px-4 tabular-nums font-medium">₹{total}</td>
                    <td className="py-3 px-4 tabular-nums">₹{o.amount_received || 0}</td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-[#B55470]">
                      ₹{balance}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={o.payment_status}
                        onChange={(e) =>
                          handleQuickPaymentUpdate(o, {
                            payment_status: e.target.value as PaymentStatus,
                          })
                        }
                        className="rounded-lg border border-[#E8DFD5] bg-[#FAF7F2] px-2 py-1 text-xs"
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {o.payment_status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickPaymentUpdate(o, {
                              payment_status: 'Paid',
                              amount_received: total,
                            })
                          }
                          className="rounded-full bg-[#2A211F] text-white px-3 py-1 text-[11px] font-semibold"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
