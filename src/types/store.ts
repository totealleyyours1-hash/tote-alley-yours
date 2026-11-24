export type BagColorId = 'beige' | 'white' | 'black' | 'pink';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'In Production'
  | 'Ready to Ship'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface SavedAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  is_default: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  saved_addresses: SavedAddress[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'product' | 'sticker';
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category_id: string | null;
  category_name?: string;
  colors: string[];
  images: string[];
  stock: number;
  tags: string[];
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  is_published: boolean;
  rating_avg?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Sticker {
  id: string;
  name: string;
  category_id: string | null;
  category_name?: string;
  image_url: string;
  tags: string[];
  created_at: string;
}

export interface CanvasElement {
  id: string;
  type: 'sticker' | 'text';
  x: number; // percentage 0..100 inside printable area
  y: number; // percentage 0..100 inside printable area
  width: number; // percentage of printable area width
  height: number; // percentage or auto
  rotation: number; // degrees
  opacity?: number;
  flipX?: boolean;
  // Sticker fields
  stickerId?: string;
  stickerName?: string;
  stickerUrl?: string;
  // Text fields
  text?: string;
  fontFamily?: string;
  fontSize?: number; // px relative to base 400px canvas
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface PriceBreakdown {
  basePrice: number;
  bagColor: BagColorId;
  stickerCount: number;
  freeStickersIncluded: number;
  extraStickerCount: number;
  extraStickerUnitPrice: number;
  extraStickerCharge: number;
  textElementCount: number;
  customTextCharge: number;
  totalEstimatedPrice: number;
}

export interface CustomDesign {
  id: string;
  user_id: string | null;
  title: string;
  bag_color: BagColorId;
  elements: CanvasElement[];
  preview_url: string;
  price_breakdown: PriceBreakdown;
  estimated_price: number;
  created_at: string;
}

export interface OrderRecord {
  id: string;
  order_code: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  order_type: 'custom' | 'ready_made';
  product_id: string | null;
  product_name: string;
  selected_color: string;
  quantity: number;
  custom_design_id: string | null;
  custom_design: {
    bag_color: BagColorId;
    elements: CanvasElement[];
    title?: string;
  } | null;
  preview_url: string;
  price_breakdown: PriceBreakdown | null;
  estimated_price: number;
  final_price: number | null;
  amount_received: number;
  payment_status: PaymentStatus;
  payment_notes: string;
  order_status: OrderStatus;
  estimated_delivery_date: string;
  internal_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewRecord {
  id: string;
  product_id: string | null;
  product_name?: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  photo_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface SiteSection {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  is_published: boolean;
  sort_order: number;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  email: string;
  instagram_handle: string;
  instagram_url: string;
  phone: string;
  city: string;
}

export interface PricingSettings {
  base_standard_price: number;
  base_black_price: number;
  free_stickers_included: number;
  extra_sticker_price: number;
  custom_text_charge: number;
}

export interface HomepageSettings {
  announcement_text: string;
  hero_kicker: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  about_title: string;
  about_body: string;
  about_image: string;
  instagram_heading: string;
  instagram_caption: string;
}

export interface PaymentQrSettings {
  qr_image_url: string;
  instructions: string;
}

export interface PublicSiteData {
  business: BusinessSettings;
  pricing: PricingSettings;
  homepage: HomepageSettings;
  payment_qr: PaymentQrSettings;
  sections: SiteSection[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'replied';
  created_at: string;
}
