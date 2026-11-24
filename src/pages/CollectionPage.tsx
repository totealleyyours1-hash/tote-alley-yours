import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta } from '../context/StoreContext';
import type { Category, Product } from '../types/store';
import { ProductCard } from '../components/ProductCard';

export function CollectionPage() {
  usePageMeta(
    "Ready-Made Collection – Tote'Alley Yours",
    'Explore original illustrated canvas tote bags designed by Tote’Alley Yours.'
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'newest'>('featured');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ products: Product[] }>('/api/products'),
      apiFetch<{ categories: Category[] }>('/api/categories?type=product'),
    ])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.products || []);
        setCategories(catRes.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const catOk = selectedCat === 'all' || p.category_id === selectedCat;
      const textOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return catOk && textOk;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'newest') sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted;
  }, [products, selectedCat, search, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E8DFD5]">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
            Designed by Our Team
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#2A211F]">
            Ready-Made Collection
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#5C4D49] max-w-xl">
            Original illustrated tote bags curated by our studio. Ready-made designs cannot be customised—want to create your own?{' '}
            <Link to="/customise" className="text-[#B55470] font-semibold hover:underline">
              Open the Custom Studio &rarr;
            </Link>
          </p>
        </div>

        <Link
          to="/customise"
          className="inline-flex items-center gap-2 rounded-full bg-[#FDF2F4] border border-[#F1D8DF] text-[#B55470] px-5 py-2.5 text-xs font-semibold hover:bg-[#F9E3E8] transition-colors self-start md:self-auto whitespace-nowrap"
        >
          <Palette className="w-4 h-4" />
          <span>Design Your Own Instead</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCat('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              selectedCat === 'all'
                ? 'bg-[#2A211F] text-white'
                : 'bg-[#F3ECE4] text-[#5C4D49] hover:bg-[#EAE0D5]'
            }`}
          >
            All Designs
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCat === c.id
                  ? 'bg-[#2A211F] text-white'
                  : 'bg-[#F3ECE4] text-[#5C4D49] hover:bg-[#EAE0D5]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-[#8A756F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tote bags..."
              className="w-full sm:w-56 pl-9 pr-3 py-2 text-xs rounded-full border border-[#E8DFD5] bg-white focus:outline-none focus:border-[#D66886]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort products"
            className="text-xs font-medium rounded-full border border-[#E8DFD5] bg-white px-4 py-2 text-[#2A211F] focus:outline-none focus:border-[#D66886]"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#7D6661]">Loading collection...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white border border-[#EAE0D5]">
          <p className="text-base font-medium text-[#2A211F]">No ready-made tote bags match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCat('all');
              setSearch('');
            }}
            className="mt-4 rounded-full bg-[#2A211F] text-white px-5 py-2 text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
