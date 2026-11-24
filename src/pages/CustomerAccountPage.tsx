import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Instagram,
  LogOut,
  MapPin,
  Package,
  Palette,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type {
  CustomDesign,
  OrderRecord,
  SavedAddress,
  UserProfile,
} from '../types/store';
import { SafeImage } from '../components/SafeImage';

type AccountTab = 'orders' | 'designs' | 'profile';

const ORDER_STEPS = [
  'Pending',
  'Confirmed',
  'In Production',
  'Ready to Ship',
  'Shipped',
  'Delivered',
] as const;

export function CustomerAccountPage() {
  usePageMeta("My Account & Orders – Tote'Alley Yours");
  const navigate = useNavigate();
  const { user, authReady, setSession, logout, site } = useStore();

  const [tab, setTab] = useState<AccountTab>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [designs, setDesigns] = useState<CustomDesign[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Profile & Address edit state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');

  const [newLabel, setNewLabel] = useState('Home');
  const [newAddr, setNewAddr] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    setFullName(user.full_name);
    setPhone(user.phone || '');
    setAddresses(user.saved_addresses || []);

    Promise.all([
      apiFetch<{ orders: OrderRecord[] }>('/api/orders/mine'),
      apiFetch<{ designs: CustomDesign[] }>('/api/designs/mine'),
    ])
      .then(([ordRes, dsnRes]) => {
        setOrders(ordRes.orders || []);
        setDesigns(dsnRes.designs || []);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [authReady, user, navigate]);

  const handleSaveProfile = async (nextAddresses = addresses) => {
    setSavingProfile(true);
    setProfileFeedback('');
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          phone,
          saved_addresses: nextAddresses,
        }),
      });
      setSession(res.user);
      setAddresses(res.user.saved_addresses || []);
      setProfileFeedback('Account details saved.');
    } catch (err) {
      setProfileFeedback(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.trim() || !newCity.trim() || !newState.trim() || !newPin.trim()) return;
    const item: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel.trim() || 'Address',
      full_name: fullName,
      phone,
      address: newAddr.trim(),
      city: newCity.trim(),
      state: newState.trim(),
      pin_code: newPin.trim(),
      is_default: addresses.length === 0,
    };
    const next = [...addresses, item];
    setNewAddr('');
    setNewCity('');
    setNewState('');
    setNewPin('');
    await handleSaveProfile(next);
  };

  const handleDeleteAddress = async (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    await handleSaveProfile(next);
  };

  if (!authReady || !user) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-sm text-[#7D6661]">Loading account...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#E8DFD5]">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#B55470] mb-1">
            Customer Account
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F]">
            Welcome back, {user.full_name}
          </h1>
          <p className="text-xs text-[#6D5D58] mt-1">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[#E8DFD5] bg-white px-5 py-2.5 text-xs font-semibold text-[#2A211F] hover:bg-[#FAF7F2] self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 py-6">
        {(
          [
            { id: 'orders', label: `Order History (${orders.length})`, icon: Package },
            { id: 'designs', label: `My Custom Designs (${designs.length})`, icon: Palette },
            { id: 'profile', label: 'Profile & Addresses', icon: User },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[#2A211F] text-white'
                : 'bg-[#F3ECE4] text-[#5C4D49] hover:bg-[#EAE0D5]'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loadingData ? (
        <div className="py-12 text-center text-sm text-[#7D6661]">Loading your history...</div>
      ) : tab === 'orders' ? (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#EAE0D5] p-10 text-center">
              <p className="text-base font-medium text-[#2A211F] mb-2">No orders yet</p>
              <p className="text-sm text-[#6D5D58] mb-5">
                Start designing your own custom canvas tote or pick a ready-made illustration.
              </p>
              <Link
                to="/shop"
                className="inline-flex rounded-full bg-[#D66886] text-white px-6 py-2.5 text-xs font-semibold"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl bg-white border border-[#EAE0D5] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 rounded-xl overflow-hidden border border-[#E8DFD5] bg-[#FAF7F2] shrink-0">
                    <SafeImage src={ord.preview_url} alt={ord.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#B55470] tabular-nums">
                      {ord.order_code}
                    </p>
                    <h2 className="text-base font-semibold text-[#2A211F]">{ord.product_name}</h2>
                    <p className="text-xs text-[#6D5D58] mt-0.5">
                      Qty {ord.quantity} · Status: <strong className="text-[#2A211F]">{ord.order_status}</strong> · Payment: {ord.payment_status}
                    </p>
                    {ord.estimated_delivery_date && (
                      <p className="text-xs text-[#4F6F52] mt-0.5">
                        Estimated Delivery: {ord.estimated_delivery_date}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-[#7D6661]">
                      {ord.final_price !== null ? 'Final Price' : 'Estimated Total'}
                    </p>
                    <p className="text-lg font-semibold text-[#2A211F] tabular-nums">
                      ₹{ord.final_price ?? ord.estimated_price}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(ord)}
                    className="rounded-full border border-[#E8DFD5] bg-[#FAF7F2] hover:bg-[#FDF2F4] px-4 py-2 text-xs font-semibold text-[#2A211F]"
                  >
                    Track &amp; Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'designs' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-2xl bg-white border border-[#EAE0D5] p-10 text-center">
              <p className="text-base font-medium text-[#2A211F] mb-2">No saved custom designs yet</p>
              <Link
                to="/customise"
                className="inline-flex rounded-full bg-[#D66886] text-white px-6 py-2.5 text-xs font-semibold mt-2"
              >
                Open Custom Studio
              </Link>
            </div>
          ) : (
            designs.map((d) => (
              <div key={d.id} className="rounded-2xl bg-white border border-[#EAE0D5] overflow-hidden">
                <div className="aspect-[5/6] bg-[#FAF7F2]">
                  <SafeImage src={d.preview_url} alt={d.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#2A211F] truncate">{d.title}</h3>
                    <span className="text-sm font-semibold text-[#B55470] tabular-nums">
                      ₹{d.estimated_price}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/customise?designId=${encodeURIComponent(d.id)}`}
                      className="text-center rounded-full border border-[#E8DFD5] py-2 text-xs font-semibold text-[#2A211F] hover:bg-[#FAF7F2]"
                    >
                      Edit Design
                    </Link>
                    <Link
                      to={`/order?type=custom&designId=${encodeURIComponent(d.id)}`}
                      className="text-center rounded-full bg-[#2A211F] text-white py-2 text-xs font-semibold hover:bg-[#433532]"
                    >
                      Order Now
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#2A211F]">Personal Info</h2>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm"
              />
            </div>
            {profileFeedback && <p className="text-xs text-[#355A38]">{profileFeedback}</p>}
            <button
              type="button"
              onClick={() => handleSaveProfile()}
              disabled={savingProfile}
              className="rounded-full bg-[#2A211F] text-white px-6 py-2.5 text-xs font-semibold"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6 space-y-4">
              <h2 className="font-display text-2xl font-semibold text-[#2A211F]">Saved Delivery Addresses</h2>
              {addresses.length === 0 ? (
                <p className="text-xs text-[#6D5D58]">No saved addresses yet.</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-[#FAF7F2] border border-[#EFE7DF] p-4"
                    >
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-[#B55470] mt-0.5 shrink-0" />
                        <div className="text-xs text-[#4D3F3B]">
                          <p className="font-semibold text-[#2A211F]">{addr.label}</p>
                          <p>
                            {addr.address}, {addr.city}, {addr.state} – {addr.pin_code}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-[#A93855] hover:opacity-75 p-1"
                        aria-label="Remove address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddAddress} className="pt-4 border-t border-[#EFE7DF] space-y-3">
                <p className="text-xs font-semibold text-[#2A211F]">Add New Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label (Home, Hostel, Office)"
                    className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="PIN Code"
                    className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={newAddr}
                    onChange={(e) => setNewAddr(e.target.value)}
                    placeholder="Street Address / Flat No."
                    className="sm:col-span-2 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="City"
                    className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="State"
                    className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#D66886] text-white px-5 py-2 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Address</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order Tracking Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-semibold text-[#B55470]">
                  {selectedOrder.order_code}
                </p>
                <h2 className="font-display text-2xl font-semibold text-[#2A211F]">
                  {selectedOrder.product_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full border border-[#E8DFD5] px-3 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Live Order Status Stepper */}
            {selectedOrder.order_status === 'Cancelled' ? (
              <div className="rounded-xl bg-[#FDF2F4] border border-[#F2C7D2] p-4 text-xs text-[#A93855]">
                This order has been cancelled. Message {site.business.instagram_handle} if you have questions.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ORDER_STEPS.map((step, idx) => {
                  const activeIdx = ORDER_STEPS.indexOf(
                    selectedOrder.order_status as (typeof ORDER_STEPS)[number]
                  );
                  const done = activeIdx >= idx;
                  return (
                    <div
                      key={step}
                      className={`rounded-xl p-2 text-center border text-[11px] font-medium ${
                        done
                          ? 'bg-[#FDF2F4] border-[#D66886] text-[#2A211F]'
                          : 'bg-[#FAF7F2] border-[#EFE7DF] text-[#8A756F]'
                      }`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <div className="aspect-[5/6] rounded-2xl overflow-hidden border border-[#E8DFD5] bg-[#FAF7F2]">
                <SafeImage
                  src={selectedOrder.preview_url}
                  alt={selectedOrder.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-[#FAF7F2] p-4 space-y-1.5 text-xs">
                  <p className="font-semibold text-[#2A211F]">Payment &amp; Pricing</p>
                  <p>Estimated Total: ₹{selectedOrder.estimated_price}</p>
                  {selectedOrder.final_price !== null && (
                    <p>Confirmed Price: ₹{selectedOrder.final_price}</p>
                  )}
                  <p>Amount Received: ₹{selectedOrder.amount_received}</p>
                  <p>Payment Status: {selectedOrder.payment_status}</p>
                  {selectedOrder.estimated_delivery_date && (
                    <p>Estimated Delivery: {selectedOrder.estimated_delivery_date}</p>
                  )}
                </div>

                <div className="rounded-xl bg-[#FAF7F2] p-4 space-y-1 text-xs">
                  <p className="font-semibold text-[#2A211F]">Delivery To</p>
                  <p>{selectedOrder.customer_name}</p>
                  <p>{selectedOrder.customer_phone}</p>
                  <p>
                    {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} –{' '}
                    {selectedOrder.pin_code}
                  </p>
                </div>

                <a
                  href={site.business.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#D66886] text-white py-2.5 text-xs font-semibold"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Message {site.business.instagram_handle}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
