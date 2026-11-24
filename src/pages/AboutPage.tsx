import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Instagram, Palette, ShieldCheck } from 'lucide-react';
import { usePageMeta, useStore } from '../context/StoreContext';
import { SafeImage } from '../components/SafeImage';

export function AboutPage() {
  const { site } = useStore();
  usePageMeta(
    "About Us – Tote'Alley Yours",
    "Learn the story behind Tote'Alley Yours, our cotton canvas totes, and our personal customisation process."
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470]">
            Our Story
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#2A211F] leading-tight text-balance">
            {site.homepage.about_title}
          </h1>
          <p className="text-base text-[#5C4D49] leading-relaxed">
            {site.homepage.about_body}
          </p>
          <p className="text-base text-[#5C4D49] leading-relaxed">
            We believe in slow, personal commerce—no impersonal automated checkouts. Every custom tote request is reviewed by a real human on our team over Instagram ({site.business.instagram_handle}), ensuring your layout, colours, and delivery timeline feel just right.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/customise"
              className="inline-flex items-center gap-2 rounded-full bg-[#D66886] text-white px-6 py-3 text-sm font-semibold hover:bg-[#C05270] transition-colors"
            >
              <span>Create Your Custom Tote</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={site.business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#E8DFD5] bg-white px-6 py-3 text-sm font-semibold text-[#2A211F] hover:bg-[#FAF7F2] transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>{site.business.instagram_handle}</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-3xl overflow-hidden border border-[#EAE0D5] aspect-[4/3]">
          <SafeImage
            src={site.homepage.about_image}
            alt="Tote'Alley Yours studio flatlay"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Palette,
            title: 'Two Distinct Worlds',
            text: 'Design your own layout from scratch in our Canva-like studio, or shop curated ready-made artworks illustrated by our team.',
          },
          {
            icon: Heart,
            title: 'Personal Instagram Care',
            text: `Every order is confirmed 1-on-1 via ${site.business.instagram_handle} so there are zero surprises on print placement, pricing, or delivery dates.`,
          },
          {
            icon: ShieldCheck,
            title: 'Everyday Canvas Quality',
            text: 'Heavyweight cotton canvas in Beige, Milk White, Pastel Pink, and Noir Black with reinforced shoulder straps built for books, laptops, and errands.',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl bg-white border border-[#EAE0D5] p-7">
            <item.icon className="w-6 h-6 text-[#D66886] mb-4" />
            <h2 className="text-lg font-semibold text-[#2A211F] mb-2">{item.title}</h2>
            <p className="text-sm text-[#5C4D49] leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
