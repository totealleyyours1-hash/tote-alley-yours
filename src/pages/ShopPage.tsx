import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta } from '../context/StoreContext';
import type { Product } from '../types/store';
import { ProductCard } from '../components/ProductCard';
import { ShoppingJourneyPrompt } from '../components/ShoppingJourneyPrompt';

export function ShopPage() {
  usePageMeta(
    "Shop Tote Bags – Tote'Alley Yours",
    'Choose to customise your own canvas tote bag or explore our original ready-made designs.'
  );

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    apiFetch<{ products: Product[] }>('/api/products')
      .then((res) => setProducts((res.products || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <div className="py-8">
      <ShoppingJourneyPrompt compact />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#B55470] mb-2">
              Studio Picks
            </p>
            <h2 className="font-display text-3xl font-semibold text-[#2A211F]">
              Popular Ready-Made Designs
            </h2>
          </div>
          <Link
            to="/collection"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B55470] hover:underline whitespace-nowrap"
          >
            <span>Browse Full Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
