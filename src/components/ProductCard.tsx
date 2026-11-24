import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Product } from '../types/store';
import { SafeImage } from './SafeImage';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block rounded-2xl bg-white border border-[#EAE0D5] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#F7F1EB]">
        <SafeImage
          src={product.images[0]}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-[#7D6661] mb-1.5">
          <span className="truncate">
            {product.category_name || 'Ready-Made'}
            {soldOut ? ' · Sold Out' : lowStock ? ` · Only ${product.stock} left` : ' · In Stock'}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 tabular-nums text-[#6D5D58]">
            <Star className="w-3.5 h-3.5 fill-[#E8A5B8] text-[#E8A5B8]" />
            {product.rating_avg?.toFixed(1) || '5.0'}
          </span>
        </div>

        <h3 className="text-base font-semibold text-[#2A211F] leading-snug truncate">
          {product.name}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-[#2A211F] tabular-nums">
            ₹{product.price}
          </span>
          <span className="text-xs font-medium text-[#B55470] group-hover:underline">
            View Tote
          </span>
        </div>
      </div>
    </Link>
  );
}
