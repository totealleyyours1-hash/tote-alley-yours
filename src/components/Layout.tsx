import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Instagram, Menu, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { site, user } = useStore();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b ${
      isActive
        ? 'text-[#2A211F] border-[#D66886]'
        : 'text-[#6D5D58] border-transparent hover:text-[#2A211F] hover:border-[#D66886]/50'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2A211F]">
      {/* Slim Dismissible Announcement Bar */}
      {!bannerDismissed && site.homepage.announcement_text && (
        <div className="bg-[#FDF2F4] border-b border-[#F1D8DF] px-4 py-1.5 text-center relative">
          <p className="text-xs text-[#6E4452] font-medium truncate pr-6">
            {site.homepage.announcement_text}
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C5B6A] hover:text-[#2A211F] p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clean 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="font-display text-2xl font-semibold tracking-tight text-[#2A211F] whitespace-nowrap shrink-0"
          >
            {site.business.name}
          </Link>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
            <NavLink to="/shop" className={navLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/customise" className={navLinkClass}>
              Customise
            </NavLink>
            <NavLink to="/collection" className={navLinkClass}>
              Collection
            </NavLink>
            <NavLink to="/reviews" className={navLinkClass}>
              Reviews
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
          </nav>

          {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? (user.role === 'admin' ? '/admin' : '/account') : '/login'}
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-[#2A211F] text-white px-5 py-2 text-xs font-semibold tracking-wide hover:bg-[#433532] transition-colors whitespace-nowrap shrink-0"
            >
              {user ? (user.role === 'admin' ? 'Admin Studio' : 'My Account') : 'Sign In'}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#E8DFD5] bg-white text-[#2A211F]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E8DFD5] bg-[#FAF7F2] px-4 py-4 space-y-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/shop', label: 'Shop' },
              { to: '/customise', label: 'Customise Your Tote' },
              { to: '/collection', label: 'Ready-Made Collection' },
              { to: '/reviews', label: 'Customer Reviews' },
              { to: '/about', label: 'About Us' },
              { to: '/contact', label: 'Contact Us' },
              {
                to: user ? (user.role === 'admin' ? '/admin' : '/account') : '/login',
                label: user ? (user.role === 'admin' ? 'Admin Dashboard' : 'My Account & Orders') : 'Sign In / Register',
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-[#2A211F] hover:bg-[#FDF2F4]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Boutique Footer */}
      <footer className="bg-[#F3ECE4] border-t border-[#E5D9CC] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-5">
              <div className="mb-4">
                <p className="font-display text-3xl font-semibold text-[#2A211F]">
                  {site.business.name}
                </p>
                <p className="text-sm italic font-display text-[#B55470] mt-0.5">
                  {site.business.tagline}
                </p>
              </div>
              <p className="text-sm text-[#6D5D58] leading-relaxed max-w-sm mb-6">
                Personalised canvas tote bags designed by you and original ready-made illustrations crafted by our studio.
              </p>
              <a
                href={site.business.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#D66886] text-white px-5 py-2.5 text-xs font-semibold tracking-wide hover:bg-[#C05270] transition-colors"
              >
                <Instagram className="w-4 h-4" />
                <span>Follow Us {site.business.instagram_handle}</span>
              </a>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7D6661] mb-4">
                Shop
              </h3>
              <ul className="space-y-2.5 text-sm text-[#4D3F3B]">
                <li>
                  <Link to="/shop" className="hover:text-[#D66886] transition-colors">
                    Start Shopping
                  </Link>
                </li>
                <li>
                  <Link to="/customise" className="hover:text-[#D66886] transition-colors">
                    Customise Your Tote
                  </Link>
                </li>
                <li>
                  <Link to="/collection" className="hover:text-[#D66886] transition-colors">
                    Ready-Made Collection
                  </Link>
                </li>
                <li>
                  <Link to="/reviews" className="hover:text-[#D66886] transition-colors">
                    Customer Reviews
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7D6661] mb-4">
                Studio &amp; Account
              </h3>
              <ul className="space-y-2.5 text-sm text-[#4D3F3B]">
                <li>
                  <Link to="/about" className="hover:text-[#D66886] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#D66886] transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/account" className="hover:text-[#D66886] transition-colors">
                    Customer Account
                  </Link>
                </li>
                <li>
                  <Link to="/admin/login" className="hover:text-[#D66886] transition-colors">
                    Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7D6661] mb-4">
                Connect
              </h3>
              <ul className="space-y-2.5 text-sm text-[#4D3F3B]">
                <li>
                  <a
                    href={`mailto:${site.business.email}`}
                    className="hover:text-[#D66886] transition-colors break-all"
                  >
                    {site.business.email}
                  </a>
                </li>
                <li>
                  <a
                    href={site.business.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#D66886] transition-colors"
                  >
                    Instagram: {site.business.instagram_handle}
                  </a>
                </li>
                <li className="text-xs text-[#6D5D58] pt-1 leading-relaxed">
                  Orders are confirmed and finalised personally via Instagram DM—no automatic card charges.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[#E2D4C5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7D6661]">
            <p>
              &copy; {new Date().getFullYear()} {site.business.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <a href="/sitemap.xml" className="hover:text-[#2A211F] transition-colors">
                Sitemap
              </a>
              <Link to="/contact" className="hover:text-[#2A211F] transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
