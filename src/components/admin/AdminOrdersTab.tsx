import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { OrderRecord, OrderStatus, PaymentStatus } from '../../types/store';
import { SafeImage } from '../SafeImage';

const STATUSES: Array<'All' | OrderStatus> = [
  'All',
  'Pending',
  'Confirmed',
  'In Production',
  'Ready to Ship',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export function AdminOrdersTab({
  orders,
  onOrderUpdated,
}: {
  orders: OrderRecord[];
  onOrderUpdated: (updated: OrderRecord) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Editable modal fields
  const [editStatus, setEditStatus] = useState<OrderStatus>('Pending');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [editFinalPrice, setEditFinalPrice] = useState('');
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const openOrder = (ord: OrderRecord) => {
    setSelected(ord);
    setEditStatus(ord.order_status);
    setEditPaymentStatus(ord.payment_status);
    setEditFinalPrice(ord.final_price !== null ? String(ord.final_price) : '');
    setEditAmountReceived(String(ord.amount_received || 0));
    setEditPaymentNotes(ord.payment_notes || '');
    setEditDeliveryDate(ord.estimated_delivery_date || '');
    setEditInternalNotes(ord.internal_notes || '');
    setEditName(ord.customer_name);
    setEditPhone(ord.customer_phone);
    setEditAddress(ord.address);
    setMsg('');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const statusOk = statusFilter === 'All' || o.order_status === statusFilter;
      const qOk =
        !q ||
        o.order_code.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q);
      return statusOk && qOk;
    });
  }, [orders, search, statusFilter]);

  const handleSave = async (overrideStatus?: OrderStatus) => {
    if (!selected) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await apiFetch<{ order: OrderRecord }>(
        `/api/admin/orders/${encodeURIComponent(selected.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            order_status: overrideStatus || editStatus,
            payment_status: editPaymentStatus,
            final_price: editFinalPrice === '' ? null : Number(editFinalPrice),
            amount_received: Number(editAmountReceived) || 0,
            payment_notes: editPaymentNotes,
            estimated_delivery_date: editDeliveryDate,
            internal_notes: editInternalNotes,
            customer_name: editName,
            customer_phone: editPhone,
            address: editAddress,
          }),
        }
      );
      onOrderUpdated(res.order);
      setSelected(res.order);
      setEditStatus(res.order.order_status);
      setMsg('Order updated successfully.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to update order.');
    } finally {
      setSaving(false);
    }
  };

  const modalConfirmedTotal =
    editFinalPrice !== '' ? Number(editFinalPrice) || 0 : selected?.estimated_price || 0;
  const modalRemainingBalance = Math.max(
    0,
    modalConfirmedTotal - (Number(editAmountReceived) || 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8A756F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, customer name, email, phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E8DFD5] bg-white focus:outline-none focus:border-[#D66886]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#2A211F] text-white'
                  : 'bg-white border border-[#E8DFD5] text-[#5C4D49] hover:bg-[#FAF7F2]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#EAE0D5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#EFE7DF] text-[#7D6661] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE4]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#7D6661]">
                    No orders match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#B55470] tabular-nums whitespace-nowrap">
                      {o.order_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#2A211F]">{o.customer_name}</p>
                      <p className="text-[#7D6661]">{o.customer_phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[#2A211F]">{o.product_name}</p>
                      <p className="text-[#7D6661]">Qty {o.quantity}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#2A211F] whitespace-nowrap">
                      {o.order_status}
                    </td>
                    <td className="py-3.5 px-4 text-[#5C4D49] whitespace-nowrap">
                      {o.payment_status}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-[#2A211F]">
                      ₹{o.final_price ?? o.estimated_price}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openOrder(o)}
                        className="rounded-full bg-[#2A211F] text-white px-3.5 py-1.5 text-[11px] font-semibold hover:bg-[#433532]"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Order Management Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EFE7DF]">
              <div>
                <p className="font-mono text-xs font-semibold text-[#B55470]">
                  {selected.order_code} · {selected.order_type === 'custom' ? 'Custom Tote' : 'Ready-Made'}
                </p>
                <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
                  {selected.product_name} (Qty {selected.quantity})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-full border border-[#E8DFD5] hover:bg-[#FAF7F2]"
                aria-label="Close order modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Preview & Breakdown */}
              <div className="lg:col-span-5 space-y-4">
                <div className="aspect-[5/6] rounded-2xl overflow-hidden border border-[#E8DFD5] bg-[#FAF7F2]">
                  <SafeImage
                    src={selected.preview_url}
                    alt={selected.product_name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {selected.price_breakdown && (
                  <div className="rounded-2xl bg-[#FAF7F2] border border-[#EFE7DF] p-4 text-xs space-y-1.5">
                    <p className="font-semibold text-[#2A211F]">Price Breakdown</p>
                    {selected.order_type === 'custom' ? (
                      <>
                        <p>Base Price: ₹{selected.price_breakdown.basePrice}</p>
                        <p>
                          Stickers: {selected.price_breakdown.stickerCount} (
                          {selected.price_breakdown.extraStickerCount} extra = ₹
                          {selected.price_breakdown.extraStickerCharge})
                        </p>
                        <p>Text Layers: {selected.price_breakdown.textElementCount}</p>
                      </>
                    ) : (
                      <p>
                        Unit ₹{Math.round(selected.estimated_price / selected.quantity)} &times;{' '}
                        {selected.quantity}
                      </p>
                    )}
                    <p className="font-semibold text-[#B55470] pt-1">
                      Estimated Total: ₹{selected.estimated_price}
                    </p>
                  </div>
                )}

                {selected.custom_design && selected.custom_design.elements?.length > 0 && (
                  <div className="rounded-2xl bg-[#FAF7F2] border border-[#EFE7DF] p-4 text-xs space-y-1.5">
                    <p className="font-semibold text-[#2A211F]">Custom Design Elements</p>
                    {selected.custom_design.elements.map((el, i) => (
                      <p key={el.id || i} className="text-[#5C4D49]">
                        {el.type === 'sticker'
                          ? `Sticker: ${el.stickerName || 'Custom Sticker'}`
                          : `Text: "${el.text}" (${el.fontFamily}, ${el.color})`}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Editable Order & Payment Controls */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#6D5D58] mb-1">Order Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                      className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm font-medium"
                    >
                      {STATUSES.filter((s) => s !== 'All').map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#6D5D58] mb-1">
                      Estimated Delivery Date
                    </label>
                    <input
                      type="date"
                      value={editDeliveryDate}
                      onChange={(e) => setEditDeliveryDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Payment Tracking */}
                <div className="rounded-2xl bg-[#FDF2F4]/60 border border-[#F1D8DF] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-[#2A211F]">Payment Tracking</p>
                    <span className="font-semibold text-[#B55470] tabular-nums">
                      Remaining Balance: ₹{modalRemainingBalance}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#6D5D58] mb-1">Payment Status</label>
                      <select
                        value={editPaymentStatus}
                        onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full rounded-xl border border-[#E8DFD5] bg-white px-2.5 py-2"
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#6D5D58] mb-1">Final Price (₹)</label>
                      <input
                        type="number"
                        value={editFinalPrice}
                        onChange={(e) => setEditFinalPrice(e.target.value)}
                        placeholder={String(selected.estimated_price)}
                        className="w-full rounded-xl border border-[#E8DFD5] bg-white px-2.5 py-2 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[#6D5D58] mb-1">Amount Received (₹)</label>
                      <input
                        type="number"
                        value={editAmountReceived}
                        onChange={(e) => setEditAmountReceived(e.target.value)}
                        className="w-full rounded-xl border border-[#E8DFD5] bg-white px-2.5 py-2 tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#6D5D58] mb-1">Payment Notes</label>
                    <input
                      type="text"
                      value={editPaymentNotes}
                      onChange={(e) => setEditPaymentNotes(e.target.value)}
                      placeholder="UPI Ref #, Instagram handle, advance received..."
                      className="w-full rounded-xl border border-[#E8DFD5] bg-white px-3 py-2"
                    />
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#6D5D58] mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#6D5D58] mb-1">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-[#6D5D58] mb-1">
                      Delivery Address ({selected.city}, {selected.state} – {selected.pin_code})
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#6D5D58] mb-1">Internal Studio Notes</label>
                  <textarea
                    rows={2}
                    value={editInternalNotes}
                    onChange={(e) => setEditInternalNotes(e.target.value)}
                    placeholder="Private notes about print alignment, packaging, Instagram DM details..."
                    className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2"
                  />
                </div>

                {msg && (
                  <p className="text-xs rounded-xl bg-[#EEF5EE] text-[#355A38] px-3 py-2">{msg}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave('Cancelled')}
                    className="rounded-full border border-[#F2C7D2] bg-[#FDF2F4] text-[#A93855] px-4 py-2.5 text-xs font-semibold hover:bg-[#F9E3E8]"
                  >
                    Cancel Order
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave()}
                    className="rounded-full bg-[#2A211F] text-white px-6 py-2.5 text-xs font-semibold hover:bg-[#433532]"
                  >
                    {saving ? 'Saving...' : 'Save Order Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
