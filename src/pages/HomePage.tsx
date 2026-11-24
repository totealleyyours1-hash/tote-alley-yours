import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Instagram, MessageCircle, Palette, ShoppingBag, Star } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type { Product, ReviewRecord } from '../types/store';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { ShoppingJourneyPrompt } from '../components/ShoppingJourneyPrompt';

type ShowcaseTab = 'featured' | 'bestseller' | 'new';

export function HomePage() {
  const { site } = useStore();
  usePageMeta(
    "Tote'Alley Yours – Personalised & Ready-Made Tote Bags",
    'Your bag, your rules. Design your own custom canvas tote bag or explore original ready-made illustrations crafted by Tote’Alley Yours.'
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('featured');

  useEffect(() => {
    apiFetch<{ products: Product[] }>('/api/products')
      .then((res) => setProducts(res.products || []))
      .catch(() => {});
    apiFetch<{ reviews: ReviewRecord[] }>('/api/reviews')
      .then((res) => setReviews((res.reviews || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  const displayedProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (activeTab === 'featured') return p.is_featured;
      if (activeTab === 'bestseller') return p.is_bestseller;
      return p.is_new_arrival;
    });
    return (filtered.length > 0 ? filtered : products).slice(0, 3);
  }, [products, activeTab]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#F7F1EB] border-b border-[#E8DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-4">
                {site.homepage.hero_kicker}
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#2A211F] leading-[1.08] text-balance mb-5">
                {site.homepage.hero_title}
              </h1>
              <p className="text-base sm:text-lg text-[#5C4D49] leading-relaxed max-w-xl mb-8">
                {site.homepage.hero_subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/customise"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D66886] text-white px-7 py-3.5 text-sm font-semibold tracking-wide hover:bg-[#C05270] transition-colors whitespace-nowrap"
                >
                  <span>Customise Your Own Tote</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center rounded-full border border-[#2A211F] bg-transparent text-[#2A211F] px-7 py-3.5 text-sm font-semibold tracking-wide hover:bg-[#2A211F] hover:text-white transition-colors whitespace-nowrap"
                >
                  Shop Now
                </Link>
              </div>
              <div className="mt-8 pt-6 border-t border-[#E5D9CC] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#7D6661]">
                <span>Custom Totes from ₹{site.pricing.base_standard_price}</span>
                <span aria-hidden="true">·</span>
                <span>{site.pricing.free_stickers_included} Free Stickers Included</span>
                <span aria-hidden="true">·</span>
                <span>Confirmed Personally on {site.business.instagram_handle}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[320px] lg:min-h-[460px] rounded-2xl overflow-hidden border border-[#E5D9CC] bg-white shadow-sm">
                <SafeImage
                  src={site.homepage.hero_image}
                  alt="Tote'Alley Yours canvas tote bags styled with flowers and books"
                  fallbackLabel="Tote'Alley Yours Studio"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Shopping Journey Prompt */}
      <ShoppingJourneyPrompt />

      {/* Ready-Made Collection Showcase (Featured / Best Sellers / New Arrivals) */}
      <section className="py-16 bg-white border-y border-[#EAE0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
                Ready-Made Collection
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F]">
                Original Studio Illustrations
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F3ECE4] rounded-xl self-start sm:self-auto">
              {(
                [
                  { id: 'featured', label: 'Featured' },
                  { id: 'bestseller', label: 'Best Sellers' },
                  { id: 'new', label: 'New Arrivals' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-[#2A211F] shadow-sm'
                      : 'text-[#6D5D58] hover:text-[#2A211F]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 rounded-full border border-[#D66886] text-[#B55470] px-7 py-3 text-sm font-semibold hover:bg-[#FDF2F4] transition-colors"
            >
              <span>View All Ready-Made Totes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
              Simple &amp; Personal
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F]">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '01.',
                icon: Palette,
                title: 'Design or Select',
                body: 'Create your own custom tote in our Canva-like studio or choose an illustrated bag from our Ready-Made Collection.',
              },
              {
                num: '02.',
                icon: ShoppingBag,
                title: 'Submit Your Request',
                body: 'Fill out the quick delivery form and receive your unique Order ID immediately—no automatic card charges.',
              },
              {
                num: '03.',
                icon: MessageCircle,
                title: 'Finalise on Instagram',
                body: `Message us at ${site.business.instagram_handle} with your Order ID. We confirm your design, final price, UPI payment, and delivery date.`,
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-2xl bg-white border border-[#EAE0D5] p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display text-2xl font-semibold text-[#B55470]">
                      {step.num}
                    </span>
                    <step.icon className="w-5 h-5 text-[#7D6661]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2A211F] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#5C4D49] leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      {reviews.length > 0 && (
        <section className="py-16 bg-[#FDF2F4]/60 border-y border-[#F1D8DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
                  Loved by Customers
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F]">
                  Stories Carried Daily
                </h2>
              </div>
              <Link
                to="/reviews"
                className="text-sm font-semibold text-[#B55470] hover:underline whitespace-nowrap"
              >
                Read &amp; Write Reviews &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((rev) => (
                <article
                  key={rev.id}
                  className="rounded-2xl bg-white border border-[#EFE0E5] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating
                              ? 'fill-[#D66886] text-[#D66886]'
                              : 'text-[#E5D9CC]'
                          }`}
                        />
                      ))}
                    </div>
                    {rev.title && (
                      <h3 className="text-base font-semibold text-[#2A211F] mb-2">{rev.title}</h3>
                    )}
                    <p className="text-sm text-[#5C4D49] leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#F4ECE4] text-xs text-[#7D6661]">
                    <span className="font-semibold text-[#2A211F]">{rev.author_name}</span>
                    {rev.product_name && (
                      <>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{rev.product_name}</span>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About the Brand + Dynamic Admin Sections */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[#EAE0D5] min-h-[300px]">
              <SafeImage
                src={site.homepage.about_image}
                alt="Inside the Tote'Alley Yours studio"
                fallbackLabel="Our Studio"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-3">
                About {site.business.name}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F] mb-4 text-balance">
                {site.homepage.about_title}
              </h2>
              <p className="text-base text-[#5C4D49] leading-relaxed mb-6">
                {site.homepage.about_body}
              </p>
              <div>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2A211F] text-white px-6 py-3 text-sm font-semibold hover:bg-[#433532] transition-colors"
                >
                  <span>Read Our Story</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Admin-Managed Dynamic Sections */}
          {site.sections.map((sec) => (
            <div
              key={sec.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-2xl bg-[#FAF7F2] border border-[#EAE0D5] p-6 sm:p-10"
            >
              <div className={sec.image_url ? 'lg:col-span-7' : 'lg:col-span-12'}>
                {sec.subtitle && (
                  <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#B55470] mb-2">
                    {sec.subtitle}
                  </p>
                )}
                <h2 className="font-display text-3xl font-semibold text-[#2A211F] mb-3">
                  {sec.title}
                </h2>
                <p className="text-sm sm:text-base text-[#5C4D49] leading-relaxed mb-6">{sec.body}</p>
                {sec.cta_text && sec.cta_link && (
                  <Link
                    to={sec.cta_link}
                    className="inline-flex items-center gap-2 rounded-full bg-[#D66886] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#C05270] transition-colors"
                  >
                    <span>{sec.cta_text}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              {sec.image_url && (
                <div className="lg:col-span-5 rounded-xl overflow-hidden aspect-[4/3] border border-[#E5D9CC]">
                  <SafeImage
                    src={sec.image_url}
                    alt={sec.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Instagram Community Section */}
      <section className="py-16 bg-[#FAF7F2]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl bg-[#FDF2F4] border border-[#F1D8DF] px-6 py-12 sm:px-12">
            <Instagram className="w-8 h-8 text-[#D66886] mx-auto mb-4" />
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2A211F] mb-3">
              {site.homepage.instagram_heading}
            </h2>
            <p className="text-sm sm:text-base text-[#5C4D49] max-w-xl mx-auto mb-7 leading-relaxed">
              {site.homepage.instagram_caption}
            </p>
            <a
              href={site.business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#2A211F] text-white px-7 py-3.5 text-sm font-semibold hover:bg-[#433532] transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>Follow {site.business.instagram_handle}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
