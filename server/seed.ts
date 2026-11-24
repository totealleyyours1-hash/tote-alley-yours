import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, UPLOAD_DIR } from './db.ts';

interface SeedStickerDef {
  id: string;
  filename: string;
  name: string;
  categorySlug: string;
  tags: string[];
  svg: string;
}

const STICKER_SVGS: SeedStickerDef[] = [
  {
    id: 'stk-coquette-bow',
    filename: 'coquette-bow.svg',
    name: 'Satin Ribbon Bow',
    categorySlug: 'coquette-bows',
    tags: ['bow', 'pink', 'coquette', 'ribbon', 'cute'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 140"><g fill="none" stroke="#8C3B53" stroke-width="4" stroke-linejoin="round"><path d="M90 68 C62 34, 18 32, 24 68 C28 96, 64 90, 90 72 Z" fill="#F6B8C8"/><path d="M90 68 C118 34, 162 32, 156 68 C152 96, 116 90, 90 72 Z" fill="#F6B8C8"/><path d="M84 74 L52 124 L68 118 L76 130 L90 78 Z" fill="#F9CDD9"/><path d="M96 74 L128 124 L112 118 L104 130 L90 78 Z" fill="#F9CDD9"/><ellipse cx="90" cy="70" rx="11" ry="13" fill="#E889A3"/></g></svg>`,
  },
  {
    id: 'stk-gingham-heart',
    filename: 'gingham-heart.svg',
    name: 'Blush Patchwork Heart',
    categorySlug: 'coquette-bows',
    tags: ['heart', 'love', 'pink', 'cute'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 150"><path d="M80 134 C80 134 18 94 18 48 C18 26 36 12 56 12 C69 12 76 20 80 28 C84 20 91 12 104 12 C124 12 142 26 142 48 C142 94 80 134 80 134 Z" fill="#F49CB4" stroke="#7E3147" stroke-width="5"/><path d="M46 34 C38 38 34 46 34 55" fill="none" stroke="#FFF4F7" stroke-width="5" stroke-linecap="round"/><circle cx="114" cy="40" r="5" fill="#FFF4F7"/></svg>`,
  },
  {
    id: 'stk-cherry-duo',
    filename: 'cherry-duo.svg',
    name: 'Sweet Cherry Duo',
    categorySlug: 'cute-playful',
    tags: ['cherry', 'fruit', 'red', 'retro'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M52 96 Q72 48 106 24 Q94 64 112 98" fill="none" stroke="#4D7C4D" stroke-width="5" stroke-linecap="round"/><path d="M106 24 C122 18 140 28 134 44 C120 48 108 38 106 24 Z" fill="#7DAE6F" stroke="#395B39" stroke-width="3.5"/><circle cx="48" cy="112" r="24" fill="#D9435A" stroke="#7B1D2D" stroke-width="4.5"/><circle cx="112" cy="114" r="24" fill="#E4566D" stroke="#7B1D2D" stroke-width="4.5"/><path d="M38 104 Q42 96 50 96" fill="none" stroke="#FFD9DF" stroke-width="4" stroke-linecap="round"/><path d="M102 106 Q106 98 114 98" fill="none" stroke="#FFD9DF" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-pearl-mirror',
    filename: 'pearl-mirror.svg',
    name: 'Vintage Hand Mirror',
    categorySlug: 'coquette-bows',
    tags: ['mirror', 'vintage', 'coquette', 'princess'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 190"><rect x="61" y="112" width="18" height="62" rx="9" fill="#F2D7B6" stroke="#73533C" stroke-width="4"/><ellipse cx="70" cy="64" rx="46" ry="54" fill="#F7DFC2" stroke="#73533C" stroke-width="4.5"/><ellipse cx="70" cy="64" rx="34" ry="42" fill="#E9F2F7" stroke="#73533C" stroke-width="3"/><path d="M48 44 L62 30 M46 62 L78 30" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-wildflower-daisy',
    filename: 'wildflower-daisy.svg',
    name: 'Sunny Daisy Bloom',
    categorySlug: 'botanicals',
    tags: ['daisy', 'flower', 'floral', 'botanical'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g fill="#FFFDF9" stroke="#5A4A42" stroke-width="3.5"><ellipse cx="80" cy="34" rx="14" ry="26"/><ellipse cx="80" cy="126" rx="14" ry="26"/><ellipse cx="34" cy="80" rx="26" ry="14"/><ellipse cx="126" cy="80" rx="26" ry="14"/><ellipse cx="47" cy="47" rx="14" ry="24" transform="rotate(-45 47 47)"/><ellipse cx="113" cy="113" rx="14" ry="24" transform="rotate(-45 113 113)"/><ellipse cx="113" cy="47" rx="14" ry="24" transform="rotate(45 113 47)"/><ellipse cx="47" cy="113" rx="14" ry="24" transform="rotate(45 47 113)"/></g><circle cx="80" cy="80" r="22" fill="#F6C85F" stroke="#5A4A42" stroke-width="4"/></svg>`,
  },
  {
    id: 'stk-tulip-bouquet',
    filename: 'tulip-bouquet.svg',
    name: 'Blush Tulip Trio',
    categorySlug: 'botanicals',
    tags: ['tulip', 'flowers', 'bouquet', 'spring'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180"><path d="M80 70 L80 158 M52 84 L74 158 M108 84 L86 158" stroke="#5B855B" stroke-width="5" stroke-linecap="round"/><path d="M62 128 C44 114 38 98 48 92 C60 98 66 114 62 128 Z" fill="#82AC7D" stroke="#426342" stroke-width="3"/><path d="M98 128 C116 114 122 98 112 92 C100 98 94 114 98 128 Z" fill="#82AC7D" stroke="#426342" stroke-width="3"/><path d="M64 36 C64 62 96 62 96 36 L88 46 L80 32 L72 46 Z" fill="#F4A5BA" stroke="#853D52" stroke-width="3.5"/><path d="M36 52 C36 78 68 78 68 52 L60 62 L52 48 L44 62 Z" fill="#FAD0DC" stroke="#853D52" stroke-width="3.5"/><path d="M92 52 C92 78 124 78 124 52 L116 62 L108 48 L100 62 Z" fill="#FAD0DC" stroke="#853D52" stroke-width="3.5"/><path d="M64 134 Q80 144 96 134" fill="none" stroke="#D66886" stroke-width="6" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-butterfly-pastel',
    filename: 'butterfly-pastel.svg',
    name: 'Monarch Dream Butterfly',
    categorySlug: 'botanicals',
    tags: ['butterfly', 'nature', 'pastel', 'wings'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 150"><path d="M85 68 C58 22 14 26 22 66 C26 88 54 90 85 78 Z" fill="#F8C8DC" stroke="#533844" stroke-width="4"/><path d="M85 68 C112 22 156 26 148 66 C144 88 116 90 85 78 Z" fill="#F8C8DC" stroke="#533844" stroke-width="4"/><path d="M85 80 C56 84 32 104 42 124 C52 138 78 122 85 88 Z" fill="#FBE0EB" stroke="#533844" stroke-width="4"/><path d="M85 80 C114 84 138 104 128 124 C118 138 92 122 85 88 Z" fill="#FBE0EB" stroke="#533844" stroke-width="4"/><rect x="81" y="48" width="8" height="58" rx="4" fill="#533844"/><path d="M82 48 Q72 30 62 28 M88 48 Q98 30 108 28" fill="none" stroke="#533844" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-lavender-sprig',
    filename: 'lavender-sprig.svg',
    name: 'Pressed Lavender Sprig',
    categorySlug: 'botanicals',
    tags: ['lavender', 'botanical', 'purple', 'herb'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 180"><path d="M70 165 Q72 95 70 30" fill="none" stroke="#5F845A" stroke-width="4.5" stroke-linecap="round"/><g fill="#B39CD0" stroke="#5A4577" stroke-width="3"><ellipse cx="58" cy="48" rx="9" ry="13" transform="rotate(-28 58 48)"/><ellipse cx="82" cy="48" rx="9" ry="13" transform="rotate(28 82 48)"/><ellipse cx="56" cy="74" rx="10" ry="14" transform="rotate(-30 56 74)"/><ellipse cx="84" cy="74" rx="10" ry="14" transform="rotate(30 84 74)"/><ellipse cx="58" cy="100" rx="10" ry="14" transform="rotate(-25 58 100)"/><ellipse cx="82" cy="100" rx="10" ry="14" transform="rotate(25 82 100)"/><ellipse cx="70" cy="28" rx="8" ry="12"/></g></svg>`,
  },
  {
    id: 'stk-iced-matcha',
    filename: 'iced-matcha.svg',
    name: 'Iced Matcha Latte',
    categorySlug: 'coffee-books',
    tags: ['matcha', 'drink', 'cafe', 'green'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 180"><path d="M90 14 L82 48" stroke="#E889A3" stroke-width="7" stroke-linecap="round"/><path d="M44 48 L106 48 L96 154 C95 160 88 164 75 164 C62 164 55 160 54 154 Z" fill="#F8F5EE" stroke="#3D322E" stroke-width="4.5"/><path d="M48 76 L102 76 L95 152 C94 157 87 160 75 160 C63 160 56 157 55 152 Z" fill="#9DC183"/><rect x="58" y="84" width="16" height="16" rx="3" fill="#E3F1D6" opacity="0.85"/><rect x="78" y="96" width="14" height="14" rx="3" fill="#E3F1D6" opacity="0.85"/><ellipse cx="75" cy="48" rx="31" ry="8" fill="#FFFFFF" stroke="#3D322E" stroke-width="4"/></svg>`,
  },
  {
    id: 'stk-stacked-books',
    filename: 'stacked-books.svg',
    name: 'Sunday Book Stack',
    categorySlug: 'coffee-books',
    tags: ['books', 'reading', 'library', 'study'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150"><rect x="26" y="102" width="128" height="28" rx="5" fill="#D8A7B1" stroke="#47332D" stroke-width="4"/><rect x="36" y="72" width="114" height="28" rx="5" fill="#F2DEC4" stroke="#47332D" stroke-width="4"/><rect x="30" y="42" width="106" height="28" rx="5" fill="#B5C9B2" stroke="#47332D" stroke-width="4"/><line x1="48" y1="56" x2="112" y2="56" stroke="#47332D" stroke-width="3" stroke-linecap="round"/><line x1="54" y1="86" x2="128" y2="86" stroke="#47332D" stroke-width="3" stroke-linecap="round"/><line x1="44" y1="116" x2="132" y2="116" stroke="#47332D" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-butter-croissant',
    filename: 'butter-croissant.svg',
    name: 'Parisian Croissant',
    categorySlug: 'coffee-books',
    tags: ['croissant', 'bakery', 'cafe', 'pastry'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 130"><path d="M26 88 C20 56 54 32 90 32 C126 32 160 56 154 88 C142 98 124 94 114 84 C100 88 80 88 66 84 C56 94 38 98 26 88 Z" fill="#E8B068" stroke="#6B4221" stroke-width="4.5"/><path d="M68 35 C62 56 64 74 68 84 M112 35 C118 56 116 74 112 84 M44 48 C46 66 50 78 56 84 M136 48 C134 66 130 78 124 84" fill="none" stroke="#6B4221" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-espresso-cup',
    filename: 'espresso-cup.svg',
    name: 'Latte Heart Cup',
    categorySlug: 'coffee-books',
    tags: ['coffee', 'latte', 'cup', 'cafe'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 150"><ellipse cx="80" cy="122" rx="56" ry="12" fill="#F5EDE3" stroke="#4C3831" stroke-width="4"/><path d="M36 52 L124 52 C124 96 108 118 80 118 C52 118 36 96 36 52 Z" fill="#FFFDF9" stroke="#4C3831" stroke-width="4.5"/><path d="M124 62 C146 62 146 94 122 94" fill="none" stroke="#4C3831" stroke-width="5" stroke-linecap="round"/><ellipse cx="80" cy="52" rx="44" ry="11" fill="#C9966B" stroke="#4C3831" stroke-width="4"/><path d="M80 57 C74 51 67 53 71 58 C75 61 80 63 80 63 C80 63 85 61 89 58 C93 53 86 51 80 57 Z" fill="#FFFDF9"/></svg>`,
  },
  {
    id: 'stk-celestial-sun',
    filename: 'celestial-sun.svg',
    name: 'Golden Aura Sun',
    categorySlug: 'celestial-sparkles',
    tags: ['sun', 'celestial', 'gold', 'boho'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g stroke="#D99B38" stroke-width="5" stroke-linecap="round"><line x1="80" y1="14" x2="80" y2="30"/><line x1="80" y1="130" x2="80" y2="146"/><line x1="14" y1="80" x2="30" y2="80"/><line x1="130" y1="80" x2="146" y2="80"/><line x1="33" y1="33" x2="45" y2="45"/><line x1="115" y1="115" x2="127" y2="127"/><line x1="127" y1="33" x2="115" y2="45"/><line x1="45" y1="115" x2="33" y2="127"/></g><circle cx="80" cy="80" r="36" fill="#F9CE69" stroke="#9B6718" stroke-width="4.5"/><path d="M66 76 Q70 72 74 76 M86 76 Q90 72 94 76 M70 90 Q80 98 90 90" fill="none" stroke="#9B6718" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-crescent-moon',
    filename: 'crescent-moon.svg',
    name: 'Dreamy Crescent Moon',
    categorySlug: 'celestial-sparkles',
    tags: ['moon', 'stars', 'night', 'dream'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M98 22 C60 28 34 62 40 100 C46 132 76 146 112 134 C82 128 68 104 72 74 C76 48 86 34 98 22 Z" fill="#FBE28A" stroke="#6B5222" stroke-width="4.5" stroke-linejoin="round"/><path d="M116 42 L120 52 L130 56 L120 60 L116 70 L112 60 L102 56 L112 52 Z" fill="#F6B8C8" stroke="#6B5222" stroke-width="3"/></svg>`,
  },
  {
    id: 'stk-sparkle-trio',
    filename: 'sparkle-trio.svg',
    name: 'Four-Point Sparkles',
    categorySlug: 'celestial-sparkles',
    tags: ['sparkle', 'star', 'glitter', 'magic'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M72 20 L84 62 L126 74 L84 86 L72 128 L60 86 L18 74 L60 62 Z" fill="#F6C8D6" stroke="#7A364B" stroke-width="4" stroke-linejoin="round"/><path d="M126 20 L131 35 L146 40 L131 45 L126 60 L121 45 L106 40 L121 35 Z" fill="#FBE28A" stroke="#7A364B" stroke-width="3" stroke-linejoin="round"/><path d="M122 104 L126 116 L138 120 L126 124 L122 136 L118 124 L106 120 L118 116 Z" fill="#FBE28A" stroke="#7A364B" stroke-width="3" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'stk-lucky-star',
    filename: 'lucky-star.svg',
    name: 'Pastel Lucky Star',
    categorySlug: 'celestial-sparkles',
    tags: ['star', 'cute', 'y2k', 'pastel'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M80 18 L98 58 L142 64 L110 94 L118 138 L80 116 L42 138 L50 94 L18 64 L62 58 Z" fill="#F9DA78" stroke="#684D1B" stroke-width="4.5" stroke-linejoin="round"/><circle cx="68" cy="78" r="4" fill="#684D1B"/><circle cx="92" cy="78" r="4" fill="#684D1B"/><path d="M73 90 Q80 96 87 90" fill="none" stroke="#684D1B" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'stk-strawberry-sweet',
    filename: 'strawberry-sweet.svg',
    name: 'Sweet Strawberry',
    categorySlug: 'cute-playful',
    tags: ['strawberry', 'berry', 'pink', 'fruit'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 170"><path d="M40 60 C32 96 54 146 75 148 C96 146 118 96 110 60 C102 44 48 44 40 60 Z" fill="#F06A82" stroke="#732131" stroke-width="4.5"/><path d="M46 52 L60 40 L75 56 L90 40 L104 52 L88 64 L75 56 L62 64 Z" fill="#7FB071" stroke="#395B34" stroke-width="3.5" stroke-linejoin="round"/><g fill="#FFE6B3"><circle cx="58" cy="84" r="3"/><circle cx="75" cy="78" r="3"/><circle cx="92" cy="84" r="3"/><circle cx="64" cy="108" r="3"/><circle cx="86" cy="108" r="3"/><circle cx="75" cy="128" r="3"/></g></svg>`,
  },
  {
    id: 'stk-kitty-paw',
    filename: 'kitty-paw.svg',
    name: 'Soft Kitty Paw',
    categorySlug: 'cute-playful',
    tags: ['cat', 'paw', 'pet', 'pink'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><ellipse cx="80" cy="104" rx="40" ry="32" fill="#FFFDF9" stroke="#4D3D3A" stroke-width="4.5"/><ellipse cx="42" cy="64" rx="13" ry="17" transform="rotate(-18 42 64)" fill="#FFFDF9" stroke="#4D3D3A" stroke-width="4"/><ellipse cx="68" cy="44" rx="13" ry="17" transform="rotate(-6 68 44)" fill="#FFFDF9" stroke="#4D3D3A" stroke-width="4"/><ellipse cx="94" cy="44" rx="13" ry="17" transform="rotate(6 94 44)" fill="#FFFDF9" stroke="#4D3D3A" stroke-width="4"/><ellipse cx="118" cy="64" rx="13" ry="17" transform="rotate(18 118 64)" fill="#FFFDF9" stroke="#4D3D3A" stroke-width="4"/><ellipse cx="80" cy="108" rx="22" ry="16" fill="#F6B8C8"/><circle cx="42" cy="65" r="6" fill="#F6B8C8"/><circle cx="68" cy="45" r="6" fill="#F6B8C8"/><circle cx="94" cy="45" r="6" fill="#F6B8C8"/><circle cx="118" cy="65" r="6" fill="#F6B8C8"/></svg>`,
  },
  {
    id: 'stk-retro-camera',
    filename: 'retro-camera.svg',
    name: 'Film Camera',
    categorySlug: 'cute-playful',
    tags: ['camera', 'film', 'vintage', 'photo'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 140"><rect x="34" y="24" width="24" height="12" rx="4" fill="#E397AB" stroke="#3E2D2A" stroke-width="3.5"/><rect x="20" y="34" width="130" height="84" rx="14" fill="#F7EFE7" stroke="#3E2D2A" stroke-width="4.5"/><rect x="20" y="64" width="130" height="36" fill="#F4B7C7" stroke="#3E2D2A" stroke-width="3.5"/><circle cx="85" cy="78" r="26" fill="#FFFFFF" stroke="#3E2D2A" stroke-width="4.5"/><circle cx="85" cy="78" r="16" fill="#463D41"/><circle cx="79" cy="72" r="5" fill="#FFFFFF" opacity="0.8"/><rect x="118" y="44" width="18" height="10" rx="3" fill="#DDE6EB" stroke="#3E2D2A" stroke-width="2.5"/></svg>`,
  },
  {
    id: 'stk-music-headphones',
    filename: 'music-headphones.svg',
    name: 'Pink Studio Headphones',
    categorySlug: 'cute-playful',
    tags: ['music', 'headphones', 'audio', 'pink'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M36 92 C36 46 124 46 124 92" fill="none" stroke="#533844" stroke-width="12" stroke-linecap="round"/><path d="M36 92 C36 46 124 46 124 92" fill="none" stroke="#F6B8C8" stroke-width="6" stroke-linecap="round"/><rect x="22" y="84" width="24" height="46" rx="12" fill="#F49CB4" stroke="#533844" stroke-width="4"/><rect x="114" y="84" width="24" height="46" rx="12" fill="#F49CB4" stroke="#533844" stroke-width="4"/></svg>`,
  },
];

export function seedDatabase(): void {
  const now = new Date().toISOString();

  // 1. Seed default site_settings (only if missing)
  const defaultSettings: Array<[string, unknown]> = [
    [
      'business',
      {
        name: "Tote'Alley Yours",
        tagline: 'Your bag, your rules.',
        email: 'totealleyy1@gmail.com',
        instagram_handle: '@totealleyours1',
        instagram_url: 'https://www.instagram.com/totealleyours1/',
        phone: '+91 98765 43210',
        city: 'India',
      },
    ],
    [
      'pricing',
      {
        base_standard_price: 199,
        base_black_price: 299,
        free_stickers_included: 6,
        extra_sticker_price: 10,
        custom_text_charge: 0,
      },
    ],
    [
      'homepage',
      {
        announcement_text:
          'Handcrafted custom & ready-made cotton canvas totes · Personalised orders confirmed via @totealleyours1',
        hero_kicker: "Tote'Alley Yours · Handcrafted Canvas Studio",
        hero_title: 'Your Bag, Your Rules.',
        hero_subtitle:
          'Carry something unmistakably yours. Design a one-of-a-kind canvas tote in our interactive studio with your favourite stickers and typography, or pick a limited ready-made illustration crafted by our team.',
        hero_image: '/src/assets/images/hero_tote_editorial_1795441353160.jpg',
        about_title: 'Made to carry your stories, books, flowers, and everyday magic.',
        about_body:
          "Tote'Alley Yours started with a simple belief: your everyday carryall should feel personal, expressive, and thoughtfully crafted. Every canvas tote is pressed with care—whether it is built sticker-by-sticker in our Custom Studio or chosen from our original illustrated drops.",
        about_image: '/src/assets/images/atelier_craft_flatlay_1795441355813.jpg',
        instagram_heading: 'Styled by our community on @totealleyours1',
        instagram_caption:
          'Tag us with your custom creations, bookshop hauls, and daily fits. Every custom order is finalised personally with you over Instagram DM.',
      },
    ],
    [
      'payment_qr',
      {
        qr_image_url: '',
        instructions:
          'Once your order request is reviewed on Instagram (@totealleyours1), we will confirm the final price and share our UPI payment details.',
      },
    ],
  ];

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO site_settings (key, value_json, updated_at) VALUES (?, ?, ?)'
  );
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, JSON.stringify(v), now);
  }

  // 2. Seed categories if empty
  const catCount = (db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }).cnt;
  if (catCount === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (id, name, slug, type, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const prodCats = [
      ['cat-prod-botanical', 'Botanical & Floral', 'botanical-floral', 'product', 1],
      ['cat-prod-cozy', 'Café & Literary', 'cafe-literary', 'product', 2],
      ['cat-prod-coquette', 'Coquette & Sweet', 'coquette-sweet', 'product', 3],
      ['cat-prod-noir', 'Editorial Noir', 'editorial-noir', 'product', 4],
    ] as const;
    for (const [id, name, slug, type, order] of prodCats) {
      insertCat.run(id, name, slug, type, order, now);
    }

    const stkCats = [
      ['cat-stk-coquette', 'Coquette & Bows', 'coquette-bows', 'sticker', 1],
      ['cat-stk-botanicals', 'Botanicals', 'botanicals', 'sticker', 2],
      ['cat-stk-coffee', 'Coffee & Books', 'coffee-books', 'sticker', 3],
      ['cat-stk-celestial', 'Celestial & Sparkles', 'celestial-sparkles', 'sticker', 4],
      ['cat-stk-playful', 'Cute & Playful', 'cute-playful', 'sticker', 5],
    ] as const;
    for (const [id, name, slug, type, order] of stkCats) {
      insertCat.run(id, name, slug, type, order, now);
    }
  }

  // 3. Seed ready-made products if empty
  const prodCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;
  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, name, slug, description, price, category_id, colors, images, stock, tags,
        is_featured, is_bestseller, is_new_arrival, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const seedProducts = [
      {
        id: 'prod-wildflower-blush',
        name: 'Wildflower Meadow Blush Tote',
        slug: 'wildflower-meadow-blush-tote',
        description:
          'Our signature structured blush-pink cotton canvas tote printed with pressed meadow wildflowers in warm ivory and sage. Spacious enough for a 14-inch laptop, sketchbook, and daily essentials with reinforced cross-stitched handles.',
        price: 349,
        category_id: 'cat-prod-botanical',
        colors: ['Pastel Pink', 'Cream'],
        images: ['/src/assets/images/tote_botanical_pink_1795441353236.jpg'],
        stock: 18,
        tags: ['floral', 'pastel pink', 'bestseller', 'everyday'],
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 0,
      },
      {
        id: 'prod-slow-living-books',
        name: 'Slow Living Café & Books Tote',
        slug: 'slow-living-cafe-books-tote',
        description:
          'Unbleached heavy cream canvas featuring fine-line cocoa ink illustrations of stacked hardcover reads and a warm espresso saucer. Designed for quiet library mornings, bookshop runs, and weekend coffee dates.',
        price: 299,
        category_id: 'cat-prod-cozy',
        colors: ['Natural Cream', 'Beige'],
        images: ['/src/assets/images/tote_bookish_cream_1795441354539.jpg'],
        stock: 24,
        tags: ['books', 'coffee', 'cream', 'college'],
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 1,
      },
      {
        id: 'prod-papillon-noir',
        name: 'Papillon Noir Editorial Tote',
        slug: 'papillon-noir-editorial-tote',
        description:
          'Deep matte charcoal-black heavyweight cotton canvas contrasted with a crisp ivory botanical butterfly crest. Bold, timeless, and effortlessly structured for campus, studio, or city errands.',
        price: 399,
        category_id: 'cat-prod-noir',
        colors: ['Charcoal Black'],
        images: ['/src/assets/images/tote_noir_classic_1795441355870.jpg'],
        stock: 12,
        tags: ['black', 'butterfly', 'editorial', 'statement'],
        is_featured: 1,
        is_bestseller: 0,
        is_new_arrival: 1,
      },
      {
        id: 'prod-cherry-gingham',
        name: 'Cherry Gingham Ribbon Tote',
        slug: 'cherry-gingham-ribbon-tote',
        description:
          'Warm sand-beige cotton tote adorned with a playful rose gingham bow and bright orchard cherries. Sweet, nostalgic, and light on the shoulder for sunny market strolls.',
        price: 329,
        category_id: 'cat-prod-coquette',
        colors: ['Sand Beige', 'Cream'],
        images: ['/src/assets/images/tote_cherry_beige_1795441356036.jpg'],
        stock: 15,
        tags: ['cherry', 'coquette', 'bow', 'beige'],
        is_featured: 1,
        is_bestseller: 1,
        is_new_arrival: 1,
      },
    ];

    for (const p of seedProducts) {
      insertProd.run(
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.category_id,
        JSON.stringify(p.colors),
        JSON.stringify(p.images),
        p.stock,
        JSON.stringify(p.tags),
        p.is_featured,
        p.is_bestseller,
        p.is_new_arrival,
        now,
        now
      );
    }
  }

  // 4. Seed stickers into ./data/uploads/stickers/ if empty
  const stkCount = (db.prepare('SELECT COUNT(*) as cnt FROM stickers').get() as { cnt: number }).cnt;
  if (stkCount === 0) {
    const catRows = db.prepare("SELECT id, slug FROM categories WHERE type = 'sticker'").all() as Array<{
      id: string;
      slug: string;
    }>;
    const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
    const insertStk = db.prepare(
      'INSERT INTO stickers (id, name, category_id, image_url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const s of STICKER_SVGS) {
      const filePath = path.join(UPLOAD_DIR, 'stickers', s.filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, s.svg, 'utf8');
      }
      insertStk.run(
        s.id,
        s.name,
        catBySlug.get(s.categorySlug) ?? null,
        `/uploads/stickers/${s.filename}`,
        JSON.stringify(s.tags),
        now
      );
    }
  }

  // 5. Seed initial approved customer reviews if empty
  const revCount = (db.prepare('SELECT COUNT(*) as cnt FROM reviews').get() as { cnt: number }).cnt;
  if (revCount === 0) {
    const insertRev = db.prepare(`
      INSERT INTO reviews (id, product_id, user_id, author_name, rating, title, comment, photo_url, status, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, '', 'approved', ?)
    `);

    const seedReviews = [
      {
        id: 'rev-1',
        product_id: 'prod-wildflower-blush',
        author_name: 'Ananya Sharma',
        rating: 5,
        title: 'The softest pastel pink canvas!',
        comment:
          'Fits my MacBook, water bottle, and spiral notebooks comfortably. The wildflower print looks so crisp in person and the Instagram confirmation process was super warm and easy.',
      },
      {
        id: 'rev-2',
        product_id: 'prod-slow-living-books',
        author_name: 'Meera Nair',
        rating: 5,
        title: 'My daily library essential',
        comment:
          'I carry this everywhere for college and weekend café visits. Thick canvas fabric that actually holds its shape instead of feeling flimsy.',
      },
      {
        id: 'rev-3',
        product_id: null,
        author_name: 'Rhea Kapoor',
        rating: 5,
        title: 'Customised a tote for my best friend!',
        comment:
          'Designing my own bag in the custom studio was genuinely fun—I added 7 cute stickers and her name in cursive, and the Tote’Alley Yours team nailed the exact placement.',
      },
      {
        id: 'rev-4',
        product_id: 'prod-cherry-gingham',
        author_name: 'Diya Patel',
        rating: 5,
        title: 'Adorable print & thoughtful packaging',
        comment:
          'Ordered the Cherry Gingham tote and got updates right on Instagram. It arrived wrapped so neatly and gets compliments every time I wear it out.',
      },
    ];

    for (const r of seedReviews) {
      insertRev.run(r.id, r.product_id, r.author_name, r.rating, r.title, r.comment, now);
    }
  }

  // 6. Seed 1 editorial custom section if empty
  const secCount = (db.prepare('SELECT COUNT(*) as cnt FROM site_sections').get() as { cnt: number }).cnt;
  if (secCount === 0) {
    db.prepare(`
      INSERT INTO site_sections (id, title, subtitle, body, image_url, cta_text, cta_link, is_published, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run(
      'sec-gifting',
      'Custom Gifting & Bridesmaid Bundles',
      'Thoughtful keepsakes made to order',
      'Planning birthday favours, college club merch, or aesthetic bridesmaid totes? Build individual custom designs in our studio and message us on @totealleyours1 for bulk love and custom delivery timelines.',
      '/src/assets/images/atelier_craft_flatlay_1795441355813.jpg',
      'Start Designing',
      '/customise',
      now
    );
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
}
