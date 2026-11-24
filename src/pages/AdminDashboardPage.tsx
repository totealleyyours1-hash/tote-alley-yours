import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Package,
  QrCode,
  Settings,
  ShoppingBag,
  Sticker as StickerIcon,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type {
  Category,
  ContactMessage,
  OrderRecord,
  Product,
  ReviewRecord,
  SiteSection,
  Sticker,
} from '../types/store';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminProductsTab } from '../components/admin/AdminProductsTab';
import { AdminStickersTab } from '../components/admin/AdminStickersTab';
import { AdminPaymentsTab } from '../components/admin/AdminPaymentsTab';
import {
  AdminContentTab,
  AdminReviewsAndCustomersTab,
} from '../components/admin/AdminContentTab';

type AdminTab = 'overview' | 'orders' | 'products' | 'stickers' | 'payments' | 'reviews' | 'content';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  inProductionOrders: number;
  readyToShipOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSales: number;
  totalReceived: number;
  customerCount: number;
  pendingReviews: number;
}

export function AdminDashboardPage() {
  usePageMeta("Admin Studio – Tote'Alley Yours");
  const navigate = useNavigate();
  const { user, authReady, logout } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [customers, setCustomers] = useState<
    Array<{
      id: string;
      full_name: string;
      email: string;
      phone: string;
      created_at: string;
      order_count: number;
    }>
  >([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const loadAllAdminData = useCallback(async () => {
    try {
      const [dash, ordRes, prodRes, catRes, stkRes, revRes, secRes, custRes, msgRes] =
        await Promise.all([
          apiFetch<{ stats: DashboardStats }>('/api/admin/dashboard'),
          apiFetch<{ orders: OrderRecord[] }>('/api/admin/orders'),
          apiFetch<{ products: Product[] }>('/api/admin/products'),
          apiFetch<{ categories: Category[] }>('/api/admin/categories'),
          apiFetch<{ stickers: Sticker[] }>('/api/stickers'),
          apiFetch<{ reviews: ReviewRecord[] }>('/api/admin/reviews'),
          apiFetch<{ sections: SiteSection[] }>('/api/admin/sections'),
          apiFetch<{ customers: typeof customers }>('/api/admin/customers'),
          apiFetch<{ messages: ContactMessage[] }>('/api/admin/messages'),
        ]);
      setStats(dash.stats);
      setOrders(ordRes.orders || []);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setStickers(stkRes.stickers || []);
      setReviews(revRes.reviews || []);
      setSections(secRes.sections || []);
      setCustomers(custRes.customers || []);
      setMessages(msgRes.messages || []);
    } catch {
      // handled by auth guard
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }
    void loadAllAdminData();
  }, [authReady, user, navigate, loadAllAdminData]);

  const handleOrderUpdated = (updated: OrderRecord) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    void loadAllAdminData();
  };

  if (!authReady || !user || user.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-sm text-[#7D6661]">
        Verifying admin access...
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
    { id: 'products', label: `Products (${products.length})`, icon: Package },
    { id: 'stickers', label: `Stickers (${stickers.length})`, icon: StickerIcon },
    { id: 'payments', label: 'Payments & QR', icon: QrCode },
    { id: 'reviews', label: 'Reviews & Users', icon: MessageSquareHeart },
    { id: 'content', label: 'Site & Pricing', icon: Settings },
  ];

  const lowStock = products.filter((p) => p.stock <= 5);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8DFD5]">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#B55470]">
            Tote&apos;Alley Yours · Management Studio
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F]">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-full border border-[#E8DFD5] bg-white px-4 py-2 text-xs font-semibold text-[#2A211F] hover:bg-[#FAF7F2]"
          >
            View Live Storefront
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/admin/login');
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2A211F] text-white px-4 py-2 text-xs font-semibold hover:bg-[#433532]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 py-5">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === item.id
                ? 'bg-[#D66886] text-white'
                : 'bg-white border border-[#E8DFD5] text-[#5C4D49] hover:bg-[#FAF7F2]'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#7D6661]">Loading studio metrics...</div>
      ) : tab === 'overview' && stats ? (
        <div className="space-y-8">
          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Orders', value: stats.totalOrders },
              { label: 'Pending Orders', value: stats.pendingOrders },
              { label: 'Confirmed Orders', value: stats.confirmedOrders },
              { label: 'In Production', value: stats.inProductionOrders },
              { label: 'Shipped / Ready', value: stats.shippedOrders + stats.readyToShipOrders },
              { label: 'Delivered Orders', value: stats.deliveredOrders },
              { label: 'Cancelled Orders', value: stats.cancelledOrders },
              { label: 'Total Sales', value: `₹${stats.totalSales}` },
              { label: 'Payments Received', value: `₹${stats.totalReceived}` },
              { label: 'Pending Reviews', value: stats.pendingReviews },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl bg-white border border-[#EAE0D5] p-5"
              >
                <p className="text-xs text-[#7D6661] mb-1">{kpi.label}</p>
                <p className="text-2xl font-semibold text-[#2A211F] tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-8 rounded-2xl bg-white border border-[#EAE0D5] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-semibold text-[#2A211F]">Recent Orders</h2>
                <button
                  type="button"
                  onClick={() => setTab('orders')}
                  className="text-xs font-semibold text-[#B55470] hover:underline"
                >
                  Manage All Orders &rarr;
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-[#6D5D58] py-6">No customer orders placed yet.</p>
              ) : (
                <div className="divide-y divide-[#F3ECE4] text-xs">
                  {orders.slice(0, 6).map((o) => (
                    <div key={o.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono font-semibold text-[#B55470]">{o.order_code}</p>
                        <p className="font-medium text-[#2A211F]">
                          {o.customer_name} · {o.product_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">₹{o.final_price ?? o.estimated_price}</p>
                        <p className="text-[#6D5D58]">{o.order_status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Stock Overview */}
            <div className="lg:col-span-4 rounded-2xl bg-white border border-[#EAE0D5] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-semibold text-[#2A211F]">Stock Overview</h2>
                <button
                  type="button"
                  onClick={() => setTab('products')}
                  className="text-xs font-semibold text-[#B55470] hover:underline"
                >
                  Inventory &rarr;
                </button>
              </div>
              <div className="space-y-3 text-xs">
                {lowStock.length > 0 && (
                  <p className="rounded-xl bg-[#FDF2F4] border border-[#F2C7D2] px-3 py-2 text-[#A93855] font-medium">
                    {lowStock.length} product(s) running low or sold out.
                  </p>
                )}
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#F3ECE4]">
                    <span className="truncate font-medium text-[#2A211F]">{p.name}</span>
                    <span
                      className={`tabular-nums font-semibold shrink-0 ${
                        p.stock <= 0 ? 'text-[#A93855]' : p.stock <= 5 ? 'text-[#B56E2A]' : 'text-[#4F6F52]'
                      }`}
                    >
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'orders' ? (
        <AdminOrdersTab orders={orders} onOrderUpdated={handleOrderUpdated} />
      ) : tab === 'products' ? (
        <AdminProductsTab
          products={products}
          categories={categories}
          onReload={loadAllAdminData}
        />
      ) : tab === 'stickers' ? (
        <AdminStickersTab
          stickers={stickers}
          categories={categories}
          onReload={loadAllAdminData}
        />
      ) : tab === 'payments' ? (
        <AdminPaymentsTab orders={orders} onOrderUpdated={handleOrderUpdated} />
      ) : tab === 'reviews' ? (
        <AdminReviewsAndCustomersTab
          reviews={reviews}
          products={products}
          customers={customers}
          messages={messages}
          onReload={loadAllAdminData}
        />
      ) : (
        <AdminContentTab sections={sections} onReload={loadAllAdminData} />
      )}
    </div>
  );
}
