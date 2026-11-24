import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setAuthToken } from '../lib/api';
import type {
  BagColorId,
  CanvasElement,
  PriceBreakdown,
  PricingSettings,
  PublicSiteData,
  UserProfile,
} from '../types/store';

export interface ActiveCustomDraft {
  id: string | null;
  title: string;
  bagColor: BagColorId;
  elements: CanvasElement[];
  previewUrl: string;
}

const DEFAULT_PRICING: PricingSettings = {
  base_standard_price: 199,
  base_black_price: 299,
  free_stickers_included: 6,
  extra_sticker_price: 10,
  custom_text_charge: 0,
};

const DEFAULT_SITE: PublicSiteData = {
  business: {
    name: "Tote'Alley Yours",
    tagline: 'Your bag, your rules.',
    email: 'totealleyy1@gmail.com',
    instagram_handle: '@totealleyours1',
    instagram_url: 'https://www.instagram.com/totealleyours1/',
    phone: '+91 98765 43210',
    city: 'India',
  },
  pricing: DEFAULT_PRICING,
  homepage: {
    announcement_text:
      'Handcrafted custom & ready-made cotton canvas totes · Orders finalised via @totealleyours1',
    hero_kicker: "Tote'Alley Yours · Handcrafted Canvas Studio",
    hero_title: 'Your Bag, Your Rules.',
    hero_subtitle:
      'Carry something unmistakably yours. Design a one-of-a-kind canvas tote in our interactive studio with your favourite stickers and typography, or pick an original ready-made illustration crafted by our team.',
    hero_image: '/src/assets/images/hero_tote_editorial_1795441353160.jpg',
    about_title: 'Made to carry your stories, books, flowers, and everyday magic.',
    about_body:
      "Tote'Alley Yours started with a simple belief: your everyday carryall should feel personal, expressive, and thoughtfully crafted.",
    about_image: '/src/assets/images/atelier_craft_flatlay_1795441355813.jpg',
    instagram_heading: 'Styled by our community on @totealleyours1',
    instagram_caption:
      'Tag us with your custom creations, bookshop hauls, and daily fits. Every custom order is finalised personally with you over Instagram DM.',
  },
  payment_qr: {
    qr_image_url: '',
    instructions: '',
  },
  sections: [],
};

export function computePriceBreakdown(
  bagColor: BagColorId,
  elements: CanvasElement[],
  pricing: PricingSettings
): PriceBreakdown {
  const basePrice =
    bagColor === 'black'
      ? Number(pricing.base_black_price) || 299
      : Number(pricing.base_standard_price) || 199;

  const stickerCount = elements.filter((e) => e.type === 'sticker').length;
  const textElementCount = elements.filter((e) => e.type === 'text').length;
  const freeStickersIncluded = Number(pricing.free_stickers_included) || 6;
  const extraStickerCount = Math.max(0, stickerCount - freeStickersIncluded);
  const extraStickerUnitPrice = Number(pricing.extra_sticker_price) || 10;
  const extraStickerCharge = extraStickerCount * extraStickerUnitPrice;
  const customTextCharge = textElementCount > 0 ? Number(pricing.custom_text_charge) || 0 : 0;

  return {
    basePrice,
    bagColor,
    stickerCount,
    freeStickersIncluded,
    extraStickerCount,
    extraStickerUnitPrice,
    extraStickerCharge,
    textElementCount,
    customTextCharge,
    totalEstimatedPrice: basePrice + extraStickerCharge + customTextCharge,
  };
}

interface StoreContextValue {
  site: PublicSiteData;
  siteLoading: boolean;
  refreshSite: () => Promise<void>;
  user: UserProfile | null;
  authReady: boolean;
  refreshUser: () => Promise<void>;
  setSession: (user: UserProfile | null, token?: string | null) => void;
  logout: () => Promise<void>;
  draftDesign: ActiveCustomDraft;
  setDraftDesign: React.Dispatch<React.SetStateAction<ActiveCustomDraft>>;
  resetDraftDesign: () => void;
}

const INITIAL_DRAFT: ActiveCustomDraft = {
  id: null,
  title: 'My Custom Tote',
  bagColor: 'beige',
  elements: [],
  previewUrl: '',
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<PublicSiteData>(DEFAULT_SITE);
  const [siteLoading, setSiteLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [draftDesign, setDraftDesign] = useState<ActiveCustomDraft>(INITIAL_DRAFT);

  const refreshSite = useCallback(async () => {
    try {
      const data = await apiFetch<PublicSiteData>('/api/site');
      setSite({
        ...DEFAULT_SITE,
        ...data,
        business: { ...DEFAULT_SITE.business, ...(data.business || {}) },
        pricing: { ...DEFAULT_PRICING, ...(data.pricing || {}) },
        homepage: { ...DEFAULT_SITE.homepage, ...(data.homepage || {}) },
        payment_qr: { ...DEFAULT_SITE.payment_qr, ...(data.payment_qr || {}) },
        sections: Array.isArray(data.sections) ? data.sections : [],
      });
    } catch {
      // Keep defaults on transient load error
    } finally {
      setSiteLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshSite();
    void refreshUser();
  }, [refreshSite, refreshUser]);

  const setSession = useCallback((nextUser: UserProfile | null, token?: string | null) => {
    if (token !== undefined) {
      setAuthToken(token);
    }
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  const resetDraftDesign = useCallback(() => {
    setDraftDesign(INITIAL_DRAFT);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        site,
        siteLoading,
        refreshSite,
        user,
        authReady,
        refreshUser,
        setSession,
        logout,
        draftDesign,
        setDraftDesign,
        resetDraftDesign,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', description);
    }
  }, [title, description]);
}
