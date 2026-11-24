import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, parseJson, slugify, UPLOAD_DIR } from './server/db.ts';
import {
  attachOptionalAuth,
  clearSessionCookie,
  hashPassword,
  isAdminConfigured,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  signOrderReceiptToken,
  signToken,
  verifyAdminPasscode,
  verifyOrderReceiptToken,
  verifyPassword,
  type AuthedRequest,
} from './server/auth.ts';
import { generateId, seedDatabase } from './server/seed.ts';

seedDatabase();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '12mb' }));
app.use(attachOptionalAuth);

// Securely serve uploaded files with safe caching & no SVG script execution headers
app.use('/uploads', (req, res, next) => {
  const safeSubPath = req.path.replace(/^\/+/, '');
  const resolved = path.resolve(UPLOAD_DIR, safeSubPath);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep) && resolved !== UPLOAD_DIR) {
    res.status(403).end();
    return;
  }
  if (resolved.toLowerCase().endsWith('.svg')) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline';");
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer storage configurations
function makeStorage(folder: 'products' | 'stickers' | 'reviews' | 'site') {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_DIR, folder));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      const base = slugify(path.basename(file.originalname, path.extname(file.originalname))).slice(0, 40);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`);
    },
  });
}

const RASTER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const STICKER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

const uploadRasterProduct = multer({
  storage: makeStorage('products'),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, RASTER_EXTS.has(ext));
  },
});

const uploadRasterSite = multer({
  storage: makeStorage('site'),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, RASTER_EXTS.has(ext));
  },
});

const uploadReviewPhoto = multer({
  storage: makeStorage('reviews'),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, RASTER_EXTS.has(ext));
  },
});

const uploadStickerFiles = multer({
  storage: makeStorage('stickers'),
  limits: { fileSize: 5 * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, STICKER_EXTS.has(ext));
  },
});

// Helper functions
function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value_json FROM site_settings WHERE key = ?').get(key) as
    | { value_json: string }
    | undefined;
  return row ? parseJson<T>(row.value_json, fallback) : fallback;
}

function setSetting(key: string, value: unknown): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO site_settings (key, value_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value), now);
}

interface PricingCfg {
  base_standard_price: number;
  base_black_price: number;
  free_stickers_included: number;
  extra_sticker_price: number;
  custom_text_charge: number;
}

function calculateDesignPricing(bagColor: string, elements: Array<{ type: string }>) {
  const pricing = getSetting<PricingCfg>('pricing', {
    base_standard_price: 199,
    base_black_price: 299,
    free_stickers_included: 6,
    extra_sticker_price: 10,
    custom_text_charge: 0,
  });

  const normalizedColor = bagColor === 'black' ? 'black' : bagColor;
  const basePrice =
    normalizedColor === 'black'
      ? Number(pricing.base_black_price) || 299
      : Number(pricing.base_standard_price) || 199;

  const stickerCount = elements.filter((e) => e.type === 'sticker').length;
  const textElementCount = elements.filter((e) => e.type === 'text').length;
  const freeIncluded = Number(pricing.free_stickers_included) || 6;
  const extraCount = Math.max(0, stickerCount - freeIncluded);
  const extraUnitPrice = Number(pricing.extra_sticker_price) || 10;
  const extraStickerCharge = extraCount * extraUnitPrice;
  const customTextCharge =
    textElementCount > 0 ? Number(pricing.custom_text_charge) || 0 : 0;

  return {
    basePrice,
    bagColor: normalizedColor,
    stickerCount,
    freeStickersIncluded: freeIncluded,
    extraStickerCount: extraCount,
    extraStickerUnitPrice: extraUnitPrice,
    extraStickerCharge,
    textElementCount,
    customTextCharge,
    totalEstimatedPrice: basePrice + extraStickerCharge + customTextCharge,
  };
}

function saveDataUrlPreview(dataUrl: string, prefix = 'design'): string {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return '';
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 6 * 1024 * 1024) return '';
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const targetPath = path.resolve(UPLOAD_DIR, 'previews', filename);
  if (!targetPath.startsWith(path.join(UPLOAD_DIR, 'previews') + path.sep)) return '';
  fs.writeFileSync(targetPath, buffer);
  return `/uploads/previews/${filename}`;
}

function formatProductRow(row: Record<string, unknown>) {
  const stats = db
    .prepare(
      "SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews WHERE product_id = ? AND status = 'approved'"
    )
    .get(row.id) as { count: number; avg_rating: number | null };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    category_id: row.category_id,
    category_name: row.category_name || '',
    colors: parseJson<string[]>(row.colors as string, []),
    images: parseJson<string[]>(row.images as string, []),
    stock: row.stock,
    tags: parseJson<string[]>(row.tags as string, []),
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    is_new_arrival: Boolean(row.is_new_arrival),
    is_published: Boolean(row.is_published),
    rating_avg: stats?.avg_rating ? Number(stats.avg_rating.toFixed(1)) : 5.0,
    review_count: stats?.count || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatOrderRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    order_code: row.order_code,
    user_id: row.user_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email,
    address: row.address,
    city: row.city,
    state: row.state,
    pin_code: row.pin_code,
    order_type: row.order_type,
    product_id: row.product_id,
    product_name: row.product_name,
    selected_color: row.selected_color,
    quantity: row.quantity,
    custom_design_id: row.custom_design_id,
    custom_design: parseJson(row.custom_design_json as string, null),
    preview_url: row.preview_url,
    price_breakdown: parseJson(row.price_breakdown_json as string, null),
    estimated_price: row.estimated_price,
    final_price: row.final_price,
    amount_received: row.amount_received,
    payment_status: row.payment_status,
    payment_notes: row.payment_notes,
    order_status: row.order_status,
    estimated_delivery_date: row.estimated_delivery_date,
    internal_notes: row.internal_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ==========================================
// PUBLIC SITE & SETTINGS ROUTES
// ==========================================
app.get('/api/site', (_req, res) => {
  const business = getSetting('business', {});
  const pricing = getSetting('pricing', {});
  const homepage = getSetting('homepage', {});
  const payment_qr = getSetting('payment_qr', { qr_image_url: '', instructions: '' });
  const sections = (
    db
      .prepare('SELECT * FROM site_sections WHERE is_published = 1 ORDER BY sort_order ASC, created_at ASC')
      .all() as Array<Record<string, unknown>>
  ).map((s) => ({
    ...s,
    is_published: Boolean(s.is_published),
  }));

  res.json({ business, pricing, homepage, payment_qr, sections });
});

// ==========================================
// CUSTOMER AUTHENTICATION & ACCOUNT ROUTES
// ==========================================
app.post('/api/auth/register', (req, res) => {
  const { full_name, email, phone, password } = req.body ?? {};
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    res.status(400).json({ error: 'Please enter your full name.' });
    return;
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const id = generateId('usr');
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

  db.prepare(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role, saved_addresses, created_at)
     VALUES (?, ?, ?, ?, ?, 'customer', '[]', ?)`
  ).run(id, full_name.trim(), normalizedEmail, cleanPhone, passwordHash, now);

  const token = signToken({ sub: id, email: normalizedEmail, role: 'customer' });
  setSessionCookie(req, res, token);
  res.status(201).json({
    token,
    user: {
      id,
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: cleanPhone,
      role: 'customer',
      saved_addresses: [],
      created_at: now,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail) as Record<string, unknown> | undefined;

  if (!user || !verifyPassword(password, user.password_hash as string)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signToken({
    sub: user.id as string,
    email: user.email as string,
    role: 'customer',
  });
  setSessionCookie(req, res, token);

  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: 'customer',
      saved_addresses: parseJson(user.saved_addresses as string, []),
      created_at: user.created_at,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, phone, new_password } = req.body ?? {};
  if (!email || !phone || !new_password || typeof new_password !== 'string' || new_password.length < 6) {
    res.status(400).json({
      error: 'Please provide your registered email, registered phone number, and a new password (min 6 characters).',
    });
    return;
  }

  const user = db
    .prepare('SELECT id, phone FROM users WHERE email = ?')
    .get(String(email).trim().toLowerCase()) as { id: string; phone: string } | undefined;

  const cleanInputPhone = String(phone).replace(/\D/g, '');
  const cleanStoredPhone = (user?.phone || '').replace(/\D/g, '');

  if (!user || !cleanStoredPhone || cleanInputPhone !== cleanStoredPhone) {
    res.status(400).json({
      error: 'Email and phone number do not match an existing account. Contact @totealleyours1 if you need help.',
    });
    return;
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(new_password), user.id);
  res.json({ ok: true, message: 'Password updated successfully. You can now sign in.' });
});

app.get('/api/auth/me', (req: AuthedRequest, res) => {
  if (!req.authUser) {
    res.json({ user: null });
    return;
  }
  if (req.authUser.role === 'admin') {
    res.json({
      user: {
        id: req.authUser.sub,
        full_name: "Tote'Alley Yours Admin",
        email: req.authUser.email,
        phone: '',
        role: 'admin',
        saved_addresses: [],
        created_at: '',
      },
    });
    return;
  }
  const user = db
    .prepare('SELECT id, full_name, email, phone, role, saved_addresses, created_at FROM users WHERE id = ?')
    .get(req.authUser.sub) as Record<string, unknown> | undefined;

  if (!user) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: {
      ...user,
      saved_addresses: parseJson(user.saved_addresses as string, []),
    },
  });
});

app.put('/api/account/profile', requireAuth, (req: AuthedRequest, res) => {
  if (!req.authUser || req.authUser.role !== 'customer') {
    res.status(403).json({ error: 'Customer account required.' });
    return;
  }
  const { full_name, phone, saved_addresses } = req.body ?? {};
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.authUser.sub) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  const nextName =
    typeof full_name === 'string' && full_name.trim().length >= 2
      ? full_name.trim()
      : (existing.full_name as string);
  const nextPhone = typeof phone === 'string' ? phone.trim() : (existing.phone as string);
  const nextAddresses = Array.isArray(saved_addresses)
    ? saved_addresses.slice(0, 10)
    : parseJson(existing.saved_addresses as string, []);

  db.prepare('UPDATE users SET full_name = ?, phone = ?, saved_addresses = ? WHERE id = ?').run(
    nextName,
    nextPhone,
    JSON.stringify(nextAddresses),
    req.authUser.sub
  );

  res.json({
    user: {
      id: existing.id,
      full_name: nextName,
      email: existing.email,
      phone: nextPhone,
      role: 'customer',
      saved_addresses: nextAddresses,
      created_at: existing.created_at,
    },
  });
});

// ==========================================
// CATEGORIES, PRODUCTS, STICKERS (PUBLIC)
// ==========================================
app.get('/api/categories', (req, res) => {
  const type = req.query.type;
  if (type === 'product' || type === 'sticker') {
    const rows = db
      .prepare('SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC, name ASC')
      .all(type);
    res.json({ categories: rows });
    return;
  }
  const rows = db.prepare('SELECT * FROM categories ORDER BY type ASC, sort_order ASC, name ASC').all();
  res.json({ categories: rows });
});

app.get('/api/products', (req, res) => {
  const categorySlug = typeof req.query.category === 'string' ? req.query.category : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const filter = typeof req.query.filter === 'string' ? req.query.filter : '';

  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_published = 1
  `;
  const params: unknown[] = [];

  if (categorySlug && categorySlug !== 'all') {
    sql += ' AND c.slug = ?';
    params.push(categorySlug);
  }
  if (filter === 'featured') sql += ' AND p.is_featured = 1';
  if (filter === 'bestseller') sql += ' AND p.is_bestseller = 1';
  if (filter === 'new') sql += ' AND p.is_new_arrival = 1';

  sql += ' ORDER BY p.is_featured DESC, p.created_at DESC';

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  let products = rows.map(formatProductRow);

  if (search) {
    products = products.filter(
      (p) =>
        String(p.name).toLowerCase().includes(search) ||
        String(p.description).toLowerCase().includes(search) ||
        p.tags.some((t) => t.toLowerCase().includes(search))
    );
  }

  res.json({ products });
});

app.get('/api/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE (p.slug = ? OR p.id = ?) AND p.is_published = 1`
    )
    .get(req.params.slug, req.params.slug) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const reviews = db
    .prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC")
    .all(row.id);

  res.json({ product: formatProductRow(row), reviews });
});

app.get('/api/stickers', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, c.name as category_name, c.slug as category_slug
       FROM stickers s
       LEFT JOIN categories c ON s.category_id = c.id
       ORDER BY c.sort_order ASC, s.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const stickers = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category_id: r.category_id,
    category_name: r.category_name || 'General',
    image_url: r.image_url,
    tags: parseJson<string[]>(r.tags as string, []),
    created_at: r.created_at,
  }));

  res.json({ stickers });
});

// ==========================================
// CUSTOM DESIGNS
// ==========================================
app.post('/api/designs', (req: AuthedRequest, res) => {
  const { id: existingId, title, bag_color, elements, preview_data_url } = req.body ?? {};
  const allowedColors = new Set(['beige', 'white', 'black', 'pink']);
  const safeColor = allowedColors.has(bag_color) ? bag_color : 'beige';
  const safeElements = Array.isArray(elements) ? elements.slice(0, 60) : [];

  const priceBreakdown = calculateDesignPricing(safeColor, safeElements);
  const previewUrl = preview_data_url ? saveDataUrlPreview(preview_data_url, 'tote') : '';
  const now = new Date().toISOString();

  const userId = req.authUser?.role === 'customer' ? req.authUser.sub : null;

  if (existingId && typeof existingId === 'string') {
    const existing = db.prepare('SELECT id, user_id, preview_url FROM custom_designs WHERE id = ?').get(existingId) as
      | { id: string; user_id: string | null; preview_url: string }
      | undefined;
    if (existing && (!existing.user_id || existing.user_id === userId || req.authUser?.role === 'admin')) {
      const nextPreview = previewUrl || existing.preview_url;
      db.prepare(
        `UPDATE custom_designs
         SET title = ?, bag_color = ?, elements_json = ?, preview_url = ?, price_breakdown_json = ?, estimated_price = ?, user_id = COALESCE(user_id, ?)
         WHERE id = ?`
      ).run(
        typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : 'My Custom Tote',
        safeColor,
        JSON.stringify(safeElements),
        nextPreview,
        JSON.stringify(priceBreakdown),
        priceBreakdown.totalEstimatedPrice,
        userId,
        existing.id
      );

      res.json({
        design: {
          id: existing.id,
          user_id: existing.user_id || userId,
          title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : 'My Custom Tote',
          bag_color: safeColor,
          elements: safeElements,
          preview_url: nextPreview,
          price_breakdown: priceBreakdown,
          estimated_price: priceBreakdown.totalEstimatedPrice,
          created_at: now,
        },
      });
      return;
    }
  }

  const id = generateId('dsn');
  const cleanTitle = typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : 'My Custom Tote';
  db.prepare(
    `INSERT INTO custom_designs (id, user_id, title, bag_color, elements_json, preview_url, price_breakdown_json, estimated_price, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    cleanTitle,
    safeColor,
    JSON.stringify(safeElements),
    previewUrl,
    JSON.stringify(priceBreakdown),
    priceBreakdown.totalEstimatedPrice,
    now
  );

  res.status(201).json({
    design: {
      id,
      user_id: userId,
      title: cleanTitle,
      bag_color: safeColor,
      elements: safeElements,
      preview_url: previewUrl,
      price_breakdown: priceBreakdown,
      estimated_price: priceBreakdown.totalEstimatedPrice,
      created_at: now,
    },
  });
});

app.get('/api/designs/mine', requireAuth, (req: AuthedRequest, res) => {
  if (!req.authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const rows = db
    .prepare('SELECT * FROM custom_designs WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.authUser.sub) as Array<Record<string, unknown>>;

  res.json({
    designs: rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      bag_color: r.bag_color,
      elements: parseJson(r.elements_json as string, []),
      preview_url: r.preview_url,
      price_breakdown: parseJson(r.price_breakdown_json as string, null),
      estimated_price: r.estimated_price,
      created_at: r.created_at,
    })),
  });
});

app.get('/api/designs/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM custom_designs WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Design not found.' });
    return;
  }
  res.json({
    design: {
      id: row.id,
      user_id: null,
      title: row.title,
      bag_color: row.bag_color,
      elements: parseJson(row.elements_json as string, []),
      preview_url: row.preview_url,
      price_breakdown: parseJson(row.price_breakdown_json as string, null),
      estimated_price: row.estimated_price,
      created_at: row.created_at,
    },
  });
});

// ==========================================
// ORDERS (CUSTOMER CHECKOUT & TRACKING)
// ==========================================
app.post('/api/orders', (req: AuthedRequest, res) => {
  const {
    customer_name,
    customer_phone,
    customer_email,
    address,
    city,
    state,
    pin_code,
    order_type,
    product_id,
    selected_color,
    quantity,
    custom_design_id,
  } = req.body ?? {};

  if (!customer_name || String(customer_name).trim().length < 2) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }
  if (!customer_phone || String(customer_phone).replace(/\D/g, '').length < 8) {
    res.status(400).json({ error: 'Valid phone number is required.' });
    return;
  }
  if (!customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customer_email).trim())) {
    res.status(400).json({ error: 'Valid email address is required.' });
    return;
  }
  if (!address || !city || !state || !pin_code) {
    res.status(400).json({ error: 'Complete delivery address, city, state, and PIN code are required.' });
    return;
  }

  const qty = Math.max(1, Math.min(50, Number(quantity) || 1));
  const now = new Date().toISOString();
  const userId = req.authUser?.role === 'customer' ? req.authUser.sub : null;

  let productName = '';
  let prodId: string | null = null;
  let designId: string | null = null;
  let customDesignSnapshot: string | null = null;
  let previewUrl = '';
  let priceBreakdownJson: string | null = null;
  let estimatedPrice = 0;
  let colorChoice = typeof selected_color === 'string' ? selected_color.trim() : '';

  if (order_type === 'ready_made') {
    const product = db
      .prepare('SELECT * FROM products WHERE id = ? AND is_published = 1')
      .get(product_id) as Record<string, unknown> | undefined;
    if (!product) {
      res.status(404).json({ error: 'Selected product is unavailable.' });
      return;
    }
    const availableStock = Number(product.stock) || 0;
    if (availableStock <= 0 || qty > availableStock) {
      res.status(400).json({
        error:
          availableStock <= 0
            ? 'This product is currently sold out.'
            : `Only ${availableStock} piece(s) left in stock.`,
      });
      return;
    }
    prodId = product.id as string;
    productName = product.name as string;
    const images = parseJson<string[]>(product.images as string, []);
    previewUrl = images[0] || '';
    const colors = parseJson<string[]>(product.colors as string, []);
    if (!colorChoice && colors.length > 0) colorChoice = colors[0];
    estimatedPrice = Number(product.price) * qty;
    priceBreakdownJson = JSON.stringify({
      unitPrice: Number(product.price),
      quantity: qty,
      totalEstimatedPrice: estimatedPrice,
    });
  } else if (order_type === 'custom') {
    const design = db.prepare('SELECT * FROM custom_designs WHERE id = ?').get(custom_design_id) as
      | Record<string, unknown>
      | undefined;
    if (!design) {
      res.status(400).json({ error: 'Custom design could not be found. Please save your design again.' });
      return;
    }
    const elements = parseJson<Array<{ type: string }>>(design.elements_json as string, []);
    const breakdown = calculateDesignPricing(design.bag_color as string, elements);
    designId = design.id as string;
    productName = `Custom Tote (${String(design.bag_color).toUpperCase()})`;
    colorChoice = String(design.bag_color);
    previewUrl = (design.preview_url as string) || '';
    customDesignSnapshot = JSON.stringify({
      bag_color: design.bag_color,
      elements,
      title: design.title,
    });
    estimatedPrice = breakdown.totalEstimatedPrice * qty;
    priceBreakdownJson = JSON.stringify({
      ...breakdown,
      quantity: qty,
      unitEstimatedPrice: breakdown.totalEstimatedPrice,
      totalEstimatedPrice: estimatedPrice,
    });
  } else {
    res.status(400).json({ error: 'Invalid order type.' });
    return;
  }

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
  const orderCode = `TAY-${new Date().getFullYear().toString().slice(-2)}-${1001 + countRow.cnt}`;
  const orderId = generateId('ord');

  db.prepare(
    `INSERT INTO orders (
      id, order_code, user_id, customer_name, customer_phone, customer_email,
      address, city, state, pin_code, order_type, product_id, product_name,
      selected_color, quantity, custom_design_id, custom_design_json, preview_url,
      price_breakdown_json, estimated_price, final_price, amount_received,
      payment_status, payment_notes, order_status, estimated_delivery_date,
      internal_notes, stock_deducted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 'Unpaid', '', 'Pending', '', '', 0, ?, ?)`
  ).run(
    orderId,
    orderCode,
    userId,
    String(customer_name).trim(),
    String(customer_phone).trim(),
    String(customer_email).trim().toLowerCase(),
    String(address).trim(),
    String(city).trim(),
    String(state).trim(),
    String(pin_code).trim(),
    order_type,
    prodId,
    productName,
    colorChoice,
    qty,
    designId,
    customDesignSnapshot,
    previewUrl,
    priceBreakdownJson,
    estimatedPrice,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>;
  const receiptToken = signOrderReceiptToken(orderCode);
  res.status(201).json({ order: formatOrderRow(created), receiptToken });
});

app.get('/api/orders/mine', requireAuth, (req: AuthedRequest, res) => {
  if (!req.authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.authUser.sub) as Array<Record<string, unknown>>;

  res.json({ orders: rows.map(formatOrderRow) });
});

app.get('/api/orders/receipt/:orderCode', (req: AuthedRequest, res) => {
  const row = db
    .prepare('SELECT * FROM orders WHERE order_code = ?')
    .get(req.params.orderCode) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  const isOwner = req.authUser && row.user_id && req.authUser.sub === row.user_id;
  const isAdmin = req.authUser?.role === 'admin';
  const hasValidToken = verifyOrderReceiptToken(token, row.order_code as string);

  if (!isOwner && !isAdmin && !hasValidToken) {
    res.status(403).json({ error: 'Access denied for this order receipt.' });
    return;
  }

  const formatted = formatOrderRow(row);
  // Strip internal admin notes from customer view
  if (!isAdmin) {
    formatted.internal_notes = '';
  }
  res.json({ order: formatted });
});

// ==========================================
// REVIEWS & CONTACT (PUBLIC + AUTH)
// ==========================================
app.get('/api/reviews', (req, res) => {
  const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
  let sql = `
    SELECT r.*, p.name as product_name
    FROM reviews r
    LEFT JOIN products p ON r.product_id = p.id
    WHERE r.status = 'approved'
  `;
  const params: unknown[] = [];
  if (productId) {
    sql += ' AND r.product_id = ?';
    params.push(productId);
  }
  sql += ' ORDER BY r.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ reviews: rows });
});

app.post('/api/reviews', uploadReviewPhoto.single('photo'), (req: AuthedRequest, res) => {
  const { product_id, author_name, rating, title, comment } = req.body ?? {};
  if (!author_name || String(author_name).trim().length < 2) {
    res.status(400).json({ error: 'Please provide your name.' });
    return;
  }
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    return;
  }
  if (!comment || String(comment).trim().length < 5) {
    res.status(400).json({ error: 'Please write a short review.' });
    return;
  }

  const photoUrl = req.file ? `/uploads/reviews/${req.file.filename}` : '';
  const id = generateId('rev');
  const now = new Date().toISOString();
  const userId = req.authUser?.role === 'customer' ? req.authUser.sub : null;
  const prodId = product_id && String(product_id).trim() ? String(product_id).trim() : null;

  db.prepare(
    `INSERT INTO reviews (id, product_id, user_id, author_name, rating, title, comment, photo_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    id,
    prodId,
    userId,
    String(author_name).trim().slice(0, 80),
    numRating,
    typeof title === 'string' ? title.trim().slice(0, 120) : '',
    String(comment).trim().slice(0, 1200),
    photoUrl,
    now
  );

  res.status(201).json({
    ok: true,
    message: 'Thank you! Your review has been submitted and will appear once approved by our team.',
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body ?? {};
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }
  const id = generateId('msg');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO contact_messages (id, name, email, phone, subject, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`
  ).run(
    id,
    String(name).trim().slice(0, 80),
    String(email).trim().slice(0, 120),
    typeof phone === 'string' ? phone.trim().slice(0, 30) : '',
    typeof subject === 'string' ? subject.trim().slice(0, 120) : '',
    String(message).trim().slice(0, 2000),
    now
  );

  res.status(201).json({ ok: true, message: 'Message received! We will get back to you shortly.' });
});

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
app.get('/api/admin/status', (req: AuthedRequest, res) => {
  const status = isAdminConfigured();
  res.json({
    configured: status.configured,
    viaEnv: status.viaEnv,
    authenticatedAsAdmin: req.authUser?.role === 'admin',
  });
});

app.post('/api/admin/claim', (req, res) => {
  const status = isAdminConfigured();
  if (status.configured) {
    res.status(403).json({ error: 'Admin password has already been configured.' });
    return;
  }
  const { email, password } = req.body ?? {};
  const cleanEmail =
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? email.trim().toLowerCase()
      : 'totealleyy1@gmail.com';
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
    return;
  }

  const now = new Date().toISOString();
  const hash = hashPassword(password);
  const insert = db.prepare(
    `INSERT INTO admin_credentials (id, email, password_hash, created_at)
     SELECT 'primary-admin', ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM admin_credentials)`
  );
  const result = insert.run(cleanEmail, hash, now);
  if (result.changes === 0) {
    res.status(403).json({ error: 'Admin credentials already claimed.' });
    return;
  }

  const token = signToken({ sub: 'admin', email: cleanEmail, role: 'admin' });
  setSessionCookie(req, res, token);
  res.status(201).json({
    token,
    user: {
      id: 'admin',
      full_name: "Tote'Alley Yours Admin",
      email: cleanEmail,
      phone: '',
      role: 'admin',
      saved_addresses: [],
      created_at: now,
    },
  });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Admin password is required.' });
    return;
  }
  const status = isAdminConfigured();
  if (!status.configured) {
    res.status(400).json({ error: 'Admin account is not set up yet. Complete first-run setup.' });
    return;
  }
  const check = verifyAdminPasscode(password, typeof email === 'string' ? email : undefined);
  if (!check.ok) {
    res.status(401).json({ error: 'Invalid admin credentials.' });
    return;
  }

  const token = signToken({ sub: 'admin', email: check.email, role: 'admin' });
  setSessionCookie(req, res, token);
  res.json({
    token,
    user: {
      id: 'admin',
      full_name: "Tote'Alley Yours Admin",
      email: check.email,
      phone: '',
      role: 'admin',
      saved_addresses: [],
      created_at: '',
    },
  });
});

// ==========================================
// ADMIN PROTECTED DASHBOARD ROUTES
// ==========================================
app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const orderStats = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN order_status = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN order_status = 'In Production' THEN 1 ELSE 0 END) as in_production,
        SUM(CASE WHEN order_status = 'Ready to Ship' THEN 1 ELSE 0 END) as ready_to_ship,
        SUM(CASE WHEN order_status = 'Shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN order_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN order_status != 'Cancelled' THEN COALESCE(final_price, estimated_price) ELSE 0 END) as total_sales,
        SUM(amount_received) as total_received
       FROM orders`
    )
    .get() as Record<string, number>;

  const recentOrders = (
    db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8').all() as Array<
      Record<string, unknown>
    >
  ).map((r) => formatOrderRow(r));

  const products = db
    .prepare('SELECT id, name, stock, price, is_published FROM products ORDER BY stock ASC')
    .all() as Array<Record<string, unknown>>;

  const lowStockProducts = products.filter((p) => Number(p.stock) <= 5);
  const customerCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  const pendingReviews = (
    db.prepare("SELECT COUNT(*) as cnt FROM reviews WHERE status = 'pending'").get() as { cnt: number }
  ).cnt;

  res.json({
    stats: {
      totalOrders: orderStats?.total || 0,
      pendingOrders: orderStats?.pending || 0,
      confirmedOrders: orderStats?.confirmed || 0,
      inProductionOrders: orderStats?.in_production || 0,
      readyToShipOrders: orderStats?.ready_to_ship || 0,
      shippedOrders: orderStats?.shipped || 0,
      deliveredOrders: orderStats?.delivered || 0,
      cancelledOrders: orderStats?.cancelled || 0,
      totalSales: orderStats?.total_sales || 0,
      totalReceived: orderStats?.total_received || 0,
      customerCount,
      pendingReviews,
    },
    recentOrders,
    stockOverview: products,
    lowStockProducts,
  });
});

// Admin Orders
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let sql = 'SELECT * FROM orders';
  const params: unknown[] = [];
  if (status && status !== 'All') {
    sql += ' WHERE order_status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';

  let orders = (db.prepare(sql).all(...params) as Array<Record<string, unknown>>).map(formatOrderRow);
  if (search) {
    orders = orders.filter(
      (o) =>
        String(o.order_code).toLowerCase().includes(search) ||
        String(o.customer_name).toLowerCase().includes(search) ||
        String(o.customer_email).toLowerCase().includes(search) ||
        String(o.customer_phone).toLowerCase().includes(search)
    );
  }
  res.json({ orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const body = req.body ?? {};
  const allowedStatuses = new Set([
    'Pending',
    'Confirmed',
    'In Production',
    'Ready to Ship',
    'Shipped',
    'Delivered',
    'Cancelled',
  ]);
  const allowedPaymentStatuses = new Set(['Unpaid', 'Partial', 'Paid']);

  const nextStatus = allowedStatuses.has(body.order_status)
    ? body.order_status
    : (existing.order_status as string);
  const nextPaymentStatus = allowedPaymentStatuses.has(body.payment_status)
    ? body.payment_status
    : (existing.payment_status as string);

  const nextFinalPrice =
    body.final_price === null || body.final_price === ''
      ? null
      : body.final_price !== undefined
      ? Math.max(0, Number(body.final_price) || 0)
      : (existing.final_price as number | null);

  const nextAmountReceived =
    body.amount_received !== undefined
      ? Math.max(0, Number(body.amount_received) || 0)
      : Number(existing.amount_received);

  const now = new Date().toISOString();

  const updateTx = db.transaction(() => {
    let stockDeducted = Number(existing.stock_deducted) || 0;

    // Deduct stock when moving out of Pending into an active confirmed stage for ready-made items
    const activeStatuses = new Set(['Confirmed', 'In Production', 'Ready to Ship', 'Shipped', 'Delivered']);
    if (
      existing.order_type === 'ready_made' &&
      existing.product_id &&
      stockDeducted === 0 &&
      activeStatuses.has(nextStatus)
    ) {
      const prod = db.prepare('SELECT stock FROM products WHERE id = ?').get(existing.product_id) as
        | { stock: number }
        | undefined;
      if (prod) {
        const nextStock = Math.max(0, prod.stock - Number(existing.quantity));
        db.prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?').run(
          nextStock,
          now,
          existing.product_id
        );
        stockDeducted = 1;
      }
    }

    // Restore stock if cancelled after previously deducted
    if (
      existing.order_type === 'ready_made' &&
      existing.product_id &&
      stockDeducted === 1 &&
      nextStatus === 'Cancelled'
    ) {
      db.prepare('UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?').run(
        Number(existing.quantity),
        now,
        existing.product_id
      );
      stockDeducted = 0;
    }

    db.prepare(
      `UPDATE orders SET
        customer_name = ?,
        customer_phone = ?,
        customer_email = ?,
        address = ?,
        city = ?,
        state = ?,
        pin_code = ?,
        order_status = ?,
        final_price = ?,
        amount_received = ?,
        payment_status = ?,
        payment_notes = ?,
        estimated_delivery_date = ?,
        internal_notes = ?,
        stock_deducted = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      typeof body.customer_name === 'string' ? body.customer_name.trim() : existing.customer_name,
      typeof body.customer_phone === 'string' ? body.customer_phone.trim() : existing.customer_phone,
      typeof body.customer_email === 'string' ? body.customer_email.trim() : existing.customer_email,
      typeof body.address === 'string' ? body.address.trim() : existing.address,
      typeof body.city === 'string' ? body.city.trim() : existing.city,
      typeof body.state === 'string' ? body.state.trim() : existing.state,
      typeof body.pin_code === 'string' ? body.pin_code.trim() : existing.pin_code,
      nextStatus,
      nextFinalPrice,
      nextAmountReceived,
      nextPaymentStatus,
      typeof body.payment_notes === 'string' ? body.payment_notes : existing.payment_notes,
      typeof body.estimated_delivery_date === 'string'
        ? body.estimated_delivery_date
        : existing.estimated_delivery_date,
      typeof body.internal_notes === 'string' ? body.internal_notes : existing.internal_notes,
      stockDeducted,
      now,
      existing.id
    );
  });

  updateTx();
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id) as Record<string, unknown>;
  res.json({ order: formatOrderRow(updated) });
});

// Admin File Uploads (Product images & Site banners / Payment QR)
app.post('/api/admin/upload/products', requireAdmin, uploadRasterProduct.array('files', 12), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const urls = files.map((f) => `/uploads/products/${f.filename}`);
  res.json({ urls });
});

app.post('/api/admin/upload/site', requireAdmin, uploadRasterSite.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Please upload a valid PNG, JPG, or WebP image.' });
    return;
  }
  res.json({ url: `/uploads/site/${req.file.filename}` });
});

// Admin Products & Inventory
app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;
  res.json({ products: rows.map(formatProductRow) });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const body = req.body ?? {};
  if (!body.name || typeof body.name !== 'string') {
    res.status(400).json({ error: 'Product name is required.' });
    return;
  }
  const id = generateId('prod');
  const baseSlug = slugify(body.name);
  const slugConflict = db.prepare('SELECT id FROM products WHERE slug = ?').get(baseSlug);
  const slug = slugConflict ? `${baseSlug}-${id.slice(-4)}` : baseSlug;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO products (
      id, name, slug, description, price, category_id, colors, images, stock, tags,
      is_featured, is_bestseller, is_new_arrival, is_published, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    body.name.trim(),
    slug,
    typeof body.description === 'string' ? body.description.trim() : '',
    Math.max(0, Number(body.price) || 0),
    body.category_id || null,
    JSON.stringify(Array.isArray(body.colors) ? body.colors : ['Cream']),
    JSON.stringify(Array.isArray(body.images) ? body.images : []),
    Math.max(0, Number(body.stock) || 0),
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    body.is_featured ? 1 : 0,
    body.is_bestseller ? 1 : 0,
    body.is_new_arrival ? 1 : 0,
    body.is_published === false ? 0 : 1,
    now,
    now
  );

  const created = db
    .prepare(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
    )
    .get(id) as Record<string, unknown>;
  res.status(201).json({ product: formatProductRow(created) });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const body = req.body ?? {};
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE products SET
      name = ?,
      description = ?,
      price = ?,
      category_id = ?,
      colors = ?,
      images = ?,
      stock = ?,
      tags = ?,
      is_featured = ?,
      is_bestseller = ?,
      is_new_arrival = ?,
      is_published = ?,
      updated_at = ?
    WHERE id = ?`
  ).run(
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
    typeof body.description === 'string' ? body.description.trim() : existing.description,
    body.price !== undefined ? Math.max(0, Number(body.price) || 0) : existing.price,
    body.category_id !== undefined ? body.category_id || null : existing.category_id,
    body.colors ? JSON.stringify(body.colors) : existing.colors,
    body.images ? JSON.stringify(body.images) : existing.images,
    body.stock !== undefined ? Math.max(0, Number(body.stock) || 0) : existing.stock,
    body.tags ? JSON.stringify(body.tags) : existing.tags,
    body.is_featured !== undefined ? (body.is_featured ? 1 : 0) : existing.is_featured,
    body.is_bestseller !== undefined ? (body.is_bestseller ? 1 : 0) : existing.is_bestseller,
    body.is_new_arrival !== undefined ? (body.is_new_arrival ? 1 : 0) : existing.is_new_arrival,
    body.is_published !== undefined ? (body.is_published ? 1 : 0) : existing.is_published,
    now,
    existing.id
  );

  const updated = db
    .prepare(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
    )
    .get(existing.id) as Record<string, unknown>;
  res.json({ product: formatProductRow(updated) });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin Categories (Product & Sticker)
app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY type ASC, sort_order ASC, name ASC').all();
  res.json({ categories });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, type } = req.body ?? {};
  if (!name || (type !== 'product' && type !== 'sticker')) {
    res.status(400).json({ error: 'Category name and valid type (product or sticker) are required.' });
    return;
  }
  const id = generateId('cat');
  const slug = `${slugify(name)}-${id.slice(-4)}`;
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO categories (id, name, slug, type, sort_order, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(id, String(name).trim(), slug, type, now);

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json({ category: created });
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const { name } = req.body ?? {};
  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(String(name).trim(), req.params.id);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json({ category: updated });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin Stickers (Single & Fast Bulk Upload)
app.post('/api/admin/stickers/bulk', requireAdmin, uploadStickerFiles.array('files', 50), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    res.status(400).json({ error: 'Please select at least one PNG, WebP, or SVG sticker file.' });
    return;
  }

  const categoryId = typeof req.body.category_id === 'string' && req.body.category_id ? req.body.category_id : null;
  const customName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const tagsRaw = typeof req.body.tags === 'string' ? req.body.tags : '';
  const extraTags = tagsRaw
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean);
  const now = new Date().toISOString();

  const insertStmt = db.prepare(
    'INSERT INTO stickers (id, name, category_id, image_url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const createdIds: string[] = [];

  const insertMany = db.transaction(() => {
    for (const file of files) {
      const id = generateId('stk');
      const inferredName =
        files.length === 1 && customName
          ? customName
          : path
              .basename(file.originalname, path.extname(file.originalname))
              .replace(/[-_]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
      const url = `/uploads/stickers/${file.filename}`;
      insertStmt.run(id, inferredName, categoryId, url, JSON.stringify(extraTags), now);
      createdIds.push(id);
    }
  });
  insertMany();

  const placeholders = createdIds.map(() => '?').join(',');
  const created = db
    .prepare(
      `SELECT s.*, c.name as category_name FROM stickers s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id IN (${placeholders})`
    )
    .all(...createdIds);

  res.status(201).json({ stickers: created, count: created.length });
});

app.put('/api/admin/stickers/:id', requireAdmin, uploadStickerFiles.single('file'), (req, res) => {
  const existing = db.prepare('SELECT * FROM stickers WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Sticker not found.' });
    return;
  }

  const nextUrl = req.file ? `/uploads/stickers/${req.file.filename}` : (existing.image_url as string);
  const nextName =
    typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim() : existing.name;
  const nextCategory =
    req.body.category_id !== undefined ? req.body.category_id || null : existing.category_id;
  const nextTags =
    typeof req.body.tags === 'string'
      ? JSON.stringify(
          req.body.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        )
      : existing.tags;

  db.prepare('UPDATE stickers SET name = ?, category_id = ?, image_url = ?, tags = ? WHERE id = ?').run(
    nextName,
    nextCategory,
    nextUrl,
    nextTags,
    existing.id
  );

  const updated = db
    .prepare('SELECT s.*, c.name as category_name FROM stickers s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?')
    .get(existing.id);
  res.json({ sticker: updated });
});

app.delete('/api/admin/stickers/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM stickers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin Reviews
app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  const reviews = db
    .prepare(
      `SELECT r.*, p.name as product_name
       FROM reviews r
       LEFT JOIN products p ON r.product_id = p.id
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`
    )
    .all();
  res.json({ reviews });
});

app.post('/api/admin/reviews', requireAdmin, (req, res) => {
  const { product_id, author_name, rating, title, comment, status } = req.body ?? {};
  if (!author_name || !comment) {
    res.status(400).json({ error: 'Author name and comment are required.' });
    return;
  }
  const id = generateId('rev');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO reviews (id, product_id, user_id, author_name, rating, title, comment, photo_url, status, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, '', ?, ?)`
  ).run(
    id,
    product_id || null,
    String(author_name).trim(),
    Math.min(5, Math.max(1, Number(rating) || 5)),
    typeof title === 'string' ? title.trim() : '',
    String(comment).trim(),
    status === 'pending' || status === 'rejected' ? status : 'approved',
    now
  );
  const created = db
    .prepare('SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.id = ?')
    .get(id);
  res.status(201).json({ review: created });
});

app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }
  const { status, author_name, rating, title, comment } = req.body ?? {};
  const allowed = new Set(['pending', 'approved', 'rejected']);
  const nextStatus = allowed.has(status) ? status : existing.status;

  db.prepare(
    'UPDATE reviews SET status = ?, author_name = ?, rating = ?, title = ?, comment = ? WHERE id = ?'
  ).run(
    nextStatus,
    typeof author_name === 'string' && author_name.trim() ? author_name.trim() : existing.author_name,
    rating !== undefined ? Math.min(5, Math.max(1, Number(rating) || 5)) : existing.rating,
    typeof title === 'string' ? title : existing.title,
    typeof comment === 'string' && comment.trim() ? comment.trim() : existing.comment,
    existing.id
  );

  const updated = db
    .prepare('SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.id = ?')
    .get(existing.id);
  res.json({ review: updated });
});

app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin Settings & CMS Sections
app.put('/api/admin/settings/:key', requireAdmin, (req, res) => {
  const allowedKeys = new Set(['business', 'pricing', 'homepage', 'payment_qr']);
  if (!allowedKeys.has(req.params.key)) {
    res.status(400).json({ error: 'Invalid settings key.' });
    return;
  }
  const current = getSetting<Record<string, unknown>>(req.params.key, {});
  const merged = { ...current, ...(req.body ?? {}) };
  setSetting(req.params.key, merged);
  res.json({ key: req.params.key, value: merged });
});

app.get('/api/admin/sections', requireAdmin, (_req, res) => {
  const sections = (
    db
      .prepare('SELECT * FROM site_sections ORDER BY sort_order ASC, created_at ASC')
      .all() as Array<Record<string, unknown>>
  ).map((s) => ({ ...s, is_published: Boolean(s.is_published) }));
  res.json({ sections });
});

app.post('/api/admin/sections', requireAdmin, (req, res) => {
  const { title, subtitle, body, image_url, cta_text, cta_link, is_published, sort_order } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'Section title is required.' });
    return;
  }
  const id = generateId('sec');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO site_sections (id, title, subtitle, body, image_url, cta_text, cta_link, is_published, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    String(title).trim(),
    typeof subtitle === 'string' ? subtitle.trim() : '',
    typeof body === 'string' ? body.trim() : '',
    typeof image_url === 'string' ? image_url.trim() : '',
    typeof cta_text === 'string' ? cta_text.trim() : '',
    typeof cta_link === 'string' ? cta_link.trim() : '',
    is_published === false ? 0 : 1,
    Number(sort_order) || 0,
    now
  );
  const created = db.prepare('SELECT * FROM site_sections WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json({ section: { ...created, is_published: Boolean(created.is_published) } });
});

app.put('/api/admin/sections/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM site_sections WHERE id = ?').get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }
  const b = req.body ?? {};
  db.prepare(
    `UPDATE site_sections SET
      title = ?, subtitle = ?, body = ?, image_url = ?, cta_text = ?, cta_link = ?, is_published = ?, sort_order = ?
     WHERE id = ?`
  ).run(
    typeof b.title === 'string' && b.title.trim() ? b.title.trim() : existing.title,
    typeof b.subtitle === 'string' ? b.subtitle : existing.subtitle,
    typeof b.body === 'string' ? b.body : existing.body,
    typeof b.image_url === 'string' ? b.image_url : existing.image_url,
    typeof b.cta_text === 'string' ? b.cta_text : existing.cta_text,
    typeof b.cta_link === 'string' ? b.cta_link : existing.cta_link,
    b.is_published !== undefined ? (b.is_published ? 1 : 0) : existing.is_published,
    b.sort_order !== undefined ? Number(b.sort_order) || 0 : existing.sort_order,
    existing.id
  );
  const updated = db.prepare('SELECT * FROM site_sections WHERE id = ?').get(existing.id) as Record<
    string,
    unknown
  >;
  res.json({ section: { ...updated, is_published: Boolean(updated.is_published) } });
});

app.delete('/api/admin/sections/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM site_sections WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Admin Customers & Messages
app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const customers = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
       FROM users u
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ customers });
});

app.get('/api/admin/messages', requireAdmin, (_req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json({ messages });
});

app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const status = req.body?.status === 'replied' ? 'replied' : 'new';
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// ==========================================
// SEO SITEMAP & ROBOTS.TXT
// ==========================================
app.get('/sitemap.xml', (req, res) => {
  const baseUrl =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/+$/, '')
      : `${req.protocol}://${req.get('host')}`;
  const staticPaths = ['/', '/shop', '/customise', '/collection', '/about', '/reviews', '/contact'];
  const products = db.prepare('SELECT slug, updated_at FROM products WHERE is_published = 1').all() as Array<{
    slug: string;
    updated_at: string;
  }>;

  const urls = [
    ...staticPaths.map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq></url>`),
    ...products.map(
      (p) =>
        `<url><loc>${baseUrl}/product/${encodeURIComponent(p.slug)}</loc><lastmod>${p.updated_at.slice(
          0,
          10
        )}</lastmod></url>`
    ),
  ];

  res.setHeader('Content-Type', 'application/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
      '\n'
    )}\n</urlset>`
  );
});

app.get('/robots.txt', (req, res) => {
  const baseUrl =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL.replace(/\/+$/, '')
      : `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// ==========================================
// VITE DEV SERVER OR PRODUCTION STATIC SERVING
// ==========================================
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tote'Alley Yours server running on port ${PORT}`);
  });
}

startServer();
