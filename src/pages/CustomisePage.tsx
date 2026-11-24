import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Copy,
  FlipHorizontal2,
  Italic,
  Layers,
  Palette,
  Redo2,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Sticker as StickerIcon,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import {
  BAG_COLOR_PALETTE,
  CUSTOMISER_FONTS,
  TEXT_COLOR_SWATCHES,
} from '../lib/customiserFonts';
import { renderTotePreviewDataUrl } from '../lib/toteRenderer';
import { computePriceBreakdown, usePageMeta, useStore } from '../context/StoreContext';
import type {
  BagColorId,
  CanvasElement,
  Category,
  CustomDesign,
  Sticker,
} from '../types/store';

type ToolTab = 'stickers' | 'text' | 'bag';

interface DragSession {
  mode: 'move' | 'resize' | 'rotate';
  elementId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origWidth: number;
  origFontSize: number;
  origRotation: number;
  centerPxX: number;
  centerPxY: number;
}

export function CustomisePage() {
  usePageMeta(
    "Customise Your Tote – Tote'Alley Yours Studio",
    'Design your personalised canvas tote bag with transparent stickers, 40+ fonts, and instant price preview.'
  );

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { site, draftDesign, setDraftDesign } = useStore();

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [stickerCategories, setStickerCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stickerSearch, setStickerSearch] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(true);

  const [bagColor, setBagColor] = useState<BagColorId>(draftDesign.bagColor);
  const [elements, setElements] = useState<CanvasElement[]>(draftDesign.elements);
  const [designTitle, setDesignTitle] = useState<string>(draftDesign.title || 'My Custom Tote');
  const [savedDesignId, setSavedDesignId] = useState<string | null>(draftDesign.id);

  const [history, setHistory] = useState<Array<{ bagColor: BagColorId; elements: CanvasElement[] }>>([]);
  const [future, setFuture] = useState<Array<{ bagColor: BagColorId; elements: CanvasElement[] }>>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ToolTab>('stickers');
  const [zoom, setZoom] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fontFilterCat, setFontFilterCat] = useState<'All' | 'Serif' | 'Handwritten' | 'Display' | 'Sans'>('All');

  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);

  // Sync local edits back into global StoreContext so design is never lost on page navigation
  useEffect(() => {
    setDraftDesign((prev) => ({
      ...prev,
      id: savedDesignId,
      title: designTitle,
      bagColor,
      elements,
    }));
  }, [bagColor, elements, designTitle, savedDesignId, setDraftDesign]);

  // Load stickers & categories from backend
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [stkRes, catRes] = await Promise.all([
          apiFetch<{ stickers: Sticker[] }>('/api/stickers'),
          apiFetch<{ categories: Category[] }>('/api/categories?type=sticker'),
        ]);
        if (!active) return;
        setStickers(stkRes.stickers || []);
        setStickerCategories(catRes.categories || []);
      } catch {
        // ignore
      } finally {
        if (active) setLoadingAssets(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  // Load saved design if ?designId=... is passed
  useEffect(() => {
    const qId = searchParams.get('designId');
    if (!qId || qId === savedDesignId) return;
    apiFetch<{ design: CustomDesign }>(`/api/designs/${encodeURIComponent(qId)}`)
      .then((res) => {
        if (res.design) {
          setSavedDesignId(res.design.id);
          setBagColor(res.design.bag_color);
          setElements(res.design.elements || []);
          setDesignTitle(res.design.title || 'My Custom Tote');
          setSelectedId(null);
        }
      })
      .catch(() => {
        // ignore if missing
      });
  }, [searchParams, savedDesignId]);

  const pushHistory = useCallback(
    (nextColor: BagColorId, nextElements: CanvasElement[]) => {
      setHistory((prev) => [...prev.slice(-29), { bagColor, elements }]);
      setFuture([]);
      setBagColor(nextColor);
      setElements(nextElements);
    },
    [bagColor, elements]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setFuture((prev) => [{ bagColor, elements }, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setBagColor(last.bagColor);
    setElements(last.elements);
    setSelectedId(null);
  }, [history, bagColor, elements]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, { bagColor, elements }]);
    setFuture((prev) => prev.slice(1));
    setBagColor(next.bagColor);
    setElements(next.elements);
    setSelectedId(null);
  }, [future, bagColor, elements]);

  const handleReset = useCallback(() => {
    pushHistory('beige', []);
    setSelectedId(null);
    setSavedDesignId(null);
  }, [pushHistory]);

  const addSticker = (stk: Sticker) => {
    const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const jitter = (elements.length % 5) * 4 - 8;
    const newEl: CanvasElement = {
      id,
      type: 'sticker',
      x: 50 + jitter,
      y: 48 + jitter,
      width: 28,
      height: 28,
      rotation: 0,
      opacity: 1,
      flipX: false,
      stickerId: stk.id,
      stickerName: stk.name,
      stickerUrl: stk.image_url,
    };
    pushHistory(bagColor, [...elements, newEl]);
    setSelectedId(id);
  };

  const addTextElement = (initialText = 'Your Text Here', fontFamily = 'Cormorant Garamond') => {
    const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultInk = bagColor === 'black' ? '#FAF7F2' : '#2A211F';
    const newEl: CanvasElement = {
      id,
      type: 'text',
      x: 50,
      y: 52 + (elements.length % 4) * 5,
      width: 68,
      height: 16,
      rotation: 0,
      opacity: 1,
      text: initialText,
      fontFamily,
      fontSize: 24,
      color: defaultInk,
      bold: false,
      italic: false,
      align: 'center',
    };
    pushHistory(bagColor, [...elements, newEl]);
    setSelectedId(id);
    setActiveTab('text');
  };

  const updateSelectedElement = (patch: Partial<CanvasElement>, recordHistory = false) => {
    if (!selectedId) return;
    const next = elements.map((el) => (el.id === selectedId ? { ...el, ...patch } : el));
    if (recordHistory) {
      pushHistory(bagColor, next);
    } else {
      setElements(next);
    }
  };

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory(
      bagColor,
      elements.filter((e) => e.id !== selectedId)
    );
    setSelectedId(null);
  }, [selectedId, bagColor, elements, pushHistory]);

  const duplicateSelected = () => {
    const target = elements.find((e) => e.id === selectedId);
    if (!target) return;
    const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const copy: CanvasElement = {
      ...target,
      id,
      x: Math.min(88, target.x + 6),
      y: Math.min(88, target.y + 6),
    };
    pushHistory(bagColor, [...elements, copy]);
    setSelectedId(id);
  };

  const bringForward = () => {
    if (!selectedId) return;
    const idx = elements.findIndex((e) => e.id === selectedId);
    if (idx === -1 || idx === elements.length - 1) return;
    const next = [...elements];
    const [item] = next.splice(idx, 1);
    next.splice(idx + 1, 0, item);
    pushHistory(bagColor, next);
  };

  // Pointer drag / resize / rotate inside printable box
  useEffect(() => {
    const handlePointerMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      const box = printAreaRef.current;
      if (!drag || !box) return;
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      if (drag.mode === 'move') {
        const dxPct = ((ev.clientX - drag.startX) / rect.width) * 100;
        const dyPct = ((ev.clientY - drag.startY) / rect.height) * 100;
        const nextX = Math.max(5, Math.min(95, drag.origX + dxPct));
        const nextY = Math.max(5, Math.min(95, drag.origY + dyPct));
        setElements((prev) =>
          prev.map((el) => (el.id === drag.elementId ? { ...el, x: nextX, y: nextY } : el))
        );
      } else if (drag.mode === 'resize') {
        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;
        const deltaPct = ((dx + dy) * 0.5 / rect.width) * 180;
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== drag.elementId) return el;
            if (el.type === 'text') {
              const nextWidth = Math.max(24, Math.min(98, drag.origWidth + deltaPct));
              const nextFont = Math.max(10, Math.min(72, Math.round(drag.origFontSize + deltaPct * 0.55)));
              return { ...el, width: nextWidth, fontSize: nextFont };
            }
            const nextWidth = Math.max(10, Math.min(85, drag.origWidth + deltaPct));
            return { ...el, width: nextWidth, height: nextWidth };
          })
        );
      } else if (drag.mode === 'rotate') {
        const angleRad = Math.atan2(ev.clientY - drag.centerPxY, ev.clientX - drag.centerPxX);
        const angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
        setElements((prev) =>
          prev.map((el) => (el.id === drag.elementId ? { ...el, rotation: angleDeg } : el))
        );
      }
    };

    const handlePointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const startPointerAction = (
    e: React.PointerEvent,
    mode: 'move' | 'resize' | 'rotate',
    el: CanvasElement
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(el.id);
    setHistory((prev) => [...prev.slice(-29), { bagColor, elements }]);
    setFuture([]);

    const rect = printAreaRef.current?.getBoundingClientRect();
    const centerPxX = rect ? rect.left + (el.x / 100) * rect.width : e.clientX;
    const centerPxY = rect ? rect.top + (el.y / 100) * rect.height : e.clientY;

    dragRef.current = {
      mode,
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origWidth: el.width,
      origFontSize: el.fontSize || 24,
      origRotation: el.rotation || 0,
      centerPxX,
      centerPxY,
    };
  };

  // Keyboard Delete shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteSelected]);

  const filteredStickers = useMemo(() => {
    const q = stickerSearch.trim().toLowerCase();
    return stickers.filter((s) => {
      const catMatch = selectedCategory === 'all' || s.category_id === selectedCategory;
      const textMatch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      return catMatch && textMatch;
    });
  }, [stickers, selectedCategory, stickerSearch]);

  const filteredFonts = useMemo(() => {
    if (fontFilterCat === 'All') return CUSTOMISER_FONTS;
    return CUSTOMISER_FONTS.filter((f) => f.category === fontFilterCat);
  }, [fontFilterCat]);

  const priceBreakdown = useMemo(
    () => computePriceBreakdown(bagColor, elements, site.pricing),
    [bagColor, elements, site.pricing]
  );

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedId) || null,
    [elements, selectedId]
  );

  const bagPalette = BAG_COLOR_PALETTE[bagColor];

  const handleFinishDesign = async () => {
    setErrorMsg('');
    setSaving(true);
    try {
      const previewDataUrl = await renderTotePreviewDataUrl(bagColor, elements);
      const res = await apiFetch<{ design: CustomDesign }>('/api/designs', {
        method: 'POST',
        body: JSON.stringify({
          id: savedDesignId,
          title: designTitle.trim() || 'My Custom Tote',
          bag_color: bagColor,
          elements,
          preview_data_url: previewDataUrl,
        }),
      });
      setSavedDesignId(res.design.id);
      setDraftDesign({
        id: res.design.id,
        title: res.design.title,
        bagColor: res.design.bag_color,
        elements: res.design.elements,
        previewUrl: res.design.preview_url,
      });
      navigate(`/order?type=custom&designId=${encodeURIComponent(res.design.id)}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save your design. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      {/* Studio Top Bar */}
      <div className="bg-white border-b border-[#E8DFD5] px-4 sm:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#2A211F] whitespace-nowrap">
              Custom Tote Studio
            </h1>
            <input
              type="text"
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              aria-label="Design title"
              placeholder="Name your tote..."
              className="hidden sm:block text-xs font-medium text-[#4D3F3B] bg-[#FAF7F2] border border-[#E8DFD5] rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-[#D66886]"
            />
          </div>

          {/* Design Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo"
              className="inline-flex items-center gap-1 rounded-lg border border-[#E8DFD5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2A211F] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Redo"
              className="inline-flex items-center gap-1 rounded-lg border border-[#E8DFD5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2A211F] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Redo</span>
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
              className="inline-flex items-center justify-center rounded-lg border border-[#E8DFD5] bg-white p-1.5 text-[#2A211F] hover:bg-[#FAF7F2]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs tabular-nums text-[#6D5D58] px-1 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
              className="inline-flex items-center justify-center rounded-lg border border-[#E8DFD5] bg-white p-1.5 text-[#2A211F] hover:bg-[#FAF7F2]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Design"
              className="inline-flex items-center gap-1 rounded-lg border border-[#E8DFD5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#6D5D58] hover:text-[#2A211F] hover:bg-[#FAF7F2]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            {selectedElement && (
              <button
                type="button"
                onClick={deleteSelected}
                className="inline-flex items-center gap-1 rounded-lg border border-[#F2C7D2] bg-[#FDF2F4] px-2.5 py-1.5 text-xs font-medium text-[#A93855] hover:bg-[#F9E3E8]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 lg:p-6">
        {/* LEFT PANEL: Stickers, Text, Bag Color */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-white lg:rounded-2xl border-b lg:border border-[#E8DFD5] flex flex-col max-h-[540px] lg:max-h-[calc(100vh-11rem)] order-2 lg:order-1">
          {/* Segmented Studio Tool Tabs */}
          <div className="grid grid-cols-3 gap-1 p-2 border-b border-[#EFE7DF] bg-[#FAF7F2] lg:rounded-t-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('stickers')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'stickers'
                  ? 'bg-white text-[#2A211F] shadow-sm'
                  : 'text-[#6D5D58] hover:text-[#2A211F]'
              }`}
            >
              <StickerIcon className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'text'
                  ? 'bg-white text-[#2A211F] shadow-sm'
                  : 'text-[#6D5D58] hover:text-[#2A211F]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bag')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'bag'
                  ? 'bg-white text-[#2A211F] shadow-sm'
                  : 'text-[#6D5D58] hover:text-[#2A211F]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Bag Colour</span>
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {activeTab === 'stickers' && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8A756F] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={stickerSearch}
                    onChange={(e) => setStickerSearch(e.target.value)}
                    placeholder="Search stickers (bow, flower, matcha...)"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] focus:outline-none focus:border-[#D66886]"
                  />
                </div>

                {/* Category Filter Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-[#2A211F] text-white'
                        : 'bg-[#F3ECE4] text-[#5C4D49] hover:bg-[#EAE0D5]'
                    }`}
                  >
                    All ({stickers.length})
                  </button>
                  {stickerCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-[#2A211F] text-white'
                          : 'bg-[#F3ECE4] text-[#5C4D49] hover:bg-[#EAE0D5]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {loadingAssets ? (
                  <div className="py-8 text-center text-xs text-[#7D6661]">Loading sticker collection...</div>
                ) : filteredStickers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#7D6661]">No matching stickers found.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {filteredStickers.map((stk) => (
                      <button
                        key={stk.id}
                        type="button"
                        onClick={() => addSticker(stk)}
                        title={`Add ${stk.name}`}
                        className="group aspect-square rounded-xl border border-[#EFE7DF] bg-[#FAF7F2] hover:bg-[#FDF2F4] hover:border-[#E5B8C6] p-2 flex flex-col items-center justify-center transition-all"
                      >
                        <img
                          src={stk.image_url}
                          alt={stk.name}
                          className="w-14 h-14 object-contain transition-transform group-hover:scale-110"
                        />
                        <span className="mt-1 text-[10px] text-[#6D5D58] truncate w-full text-center">
                          {stk.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'text' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => addTextElement('Your Bag, Your Rules', 'Cormorant Garamond')}
                  className="w-full rounded-xl bg-[#D66886] text-white py-3 px-4 text-sm font-semibold hover:bg-[#C05270] transition-colors flex items-center justify-center gap-2"
                >
                  <Type className="w-4 h-4" />
                  <span>Add Custom Text</span>
                </button>

                <div>
                  <p className="text-xs font-semibold text-[#6D5D58] mb-2">Quick Text Starters</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Main Character', font: 'Playfair Display' },
                      { label: 'Book Club', font: 'Lora' },
                      { label: 'sweet & simple', font: 'Dancing Script' },
                      { label: 'MATCHA RUN', font: 'Bebas Neue' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => addTextElement(preset.label, preset.font)}
                        style={{ fontFamily: `"${preset.font}", sans-serif` }}
                        className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] hover:bg-[#FDF2F4] px-3 py-2 text-sm text-[#2A211F] truncate"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EFE7DF]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#6D5D58]">
                      Font Library ({CUSTOMISER_FONTS.length} Fonts)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(['All', 'Serif', 'Handwritten', 'Display', 'Sans'] as const).map((fc) => (
                      <button
                        key={fc}
                        type="button"
                        onClick={() => setFontFilterCat(fc)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                          fontFilterCat === fc
                            ? 'bg-[#2A211F] text-white'
                            : 'bg-[#F3ECE4] text-[#5C4D49]'
                        }`}
                      >
                        {fc}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {filteredFonts.map((f) => {
                      const isCurrent = selectedElement?.type === 'text' && selectedElement.fontFamily === f.name;
                      return (
                        <button
                          key={f.name}
                          type="button"
                          onClick={() => {
                            if (selectedElement?.type === 'text') {
                              updateSelectedElement({ fontFamily: f.name }, true);
                            } else {
                              addTextElement('Tote’Alley Yours', f.name);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-between ${
                            isCurrent
                              ? 'border-[#D66886] bg-[#FDF2F4] text-[#2A211F]'
                              : 'border-[#EFE7DF] bg-white hover:bg-[#FAF7F2] text-[#2A211F]'
                          }`}
                        >
                          <span style={{ fontFamily: `"${f.name}", sans-serif` }} className="text-base truncate">
                            {f.name}
                          </span>
                          <span className="text-[10px] text-[#8A756F] ml-2 shrink-0">{f.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bag' && (
              <div className="space-y-4">
                <p className="text-xs text-[#6D5D58]">
                  Select your heavyweight 100% cotton canvas tote base colour:
                </p>
                <div className="space-y-2.5">
                  {(Object.keys(BAG_COLOR_PALETTE) as BagColorId[]).map((cId) => {
                    const c = BAG_COLOR_PALETTE[cId];
                    const price =
                      cId === 'black'
                        ? site.pricing.base_black_price
                        : site.pricing.base_standard_price;
                    const active = bagColor === cId;
                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => pushHistory(cId, elements)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          active
                            ? 'border-[#D66886] bg-[#FDF2F4]'
                            : 'border-[#E8DFD5] bg-[#FAF7F2] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-full border border-[#C9BCB0] shrink-0"
                            style={{ backgroundColor: c.fill }}
                          />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-[#2A211F]">{c.label}</p>
                            <p className="text-xs text-[#7D6661] tabular-nums">Base bag: ₹{price}</p>
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-[#D66886]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Realistic Interactive Tote Bag Canvas */}
        <section className="lg:col-span-5 xl:col-span-6 flex flex-col items-center justify-center py-6 px-4 bg-[#F4ECE3]/60 lg:rounded-2xl border-b lg:border border-[#E8DFD5] order-1 lg:order-2 overflow-hidden">
          {/* Quick Color Bar right above canvas for instant switching */}
          <div className="flex items-center gap-2.5 mb-4 bg-white px-4 py-2 rounded-full border border-[#E8DFD5]">
            <span className="text-xs font-medium text-[#6D5D58]">Bag Colour:</span>
            {(Object.keys(BAG_COLOR_PALETTE) as BagColorId[]).map((cId) => {
              const c = BAG_COLOR_PALETTE[cId];
              return (
                <button
                  key={cId}
                  type="button"
                  onClick={() => pushHistory(cId, elements)}
                  title={`${c.label} (₹${cId === 'black' ? site.pricing.base_black_price : site.pricing.base_standard_price})`}
                  aria-label={`Select ${c.label} tote`}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    bagColor === cId
                      ? 'ring-2 ring-[#D66886] ring-offset-2 scale-110 border-[#2A211F]'
                      : 'border-[#B8A899] hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.fill }}
                />
              );
            })}
          </div>

          {/* Zoomable Tote Canvas Stage */}
          <div
            className="relative flex items-center justify-center w-full py-2"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="relative select-none transition-transform duration-150 origin-center"
              style={{
                width: '360px',
                maxWidth: '92vw',
                aspectRatio: '5 / 6',
                transform: `scale(${zoom})`,
              }}
            >
              {/* Realistic SVG Tote Silhouette */}
              <svg
                viewBox="0 0 500 600"
                className="w-full h-full drop-shadow-[0_18px_32px_rgba(42,33,31,0.14)] pointer-events-none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="toteBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={bagPalette.fill} />
                    <stop offset="72%" stopColor={bagPalette.fill} />
                    <stop offset="100%" stopColor={bagPalette.shade} />
                  </linearGradient>
                  <pattern id="canvasWeave" width="6" height="6" patternUnits="userSpaceOnUse">
                    <path
                      d="M 6 0 L 0 0 0 6"
                      fill="none"
                      stroke={bagColor === 'black' ? 'rgba(255,255,255,0.04)' : 'rgba(42,33,31,0.035)'}
                      strokeWidth="0.7"
                    />
                  </pattern>
                </defs>

                {/* Handles */}
                <path
                  d="M172 184 C172 56, 328 56, 328 184"
                  fill="none"
                  stroke={bagPalette.shade}
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                <path
                  d="M172 184 C172 60, 328 60, 328 184"
                  fill="none"
                  stroke={bagPalette.fill}
                  strokeWidth="17"
                  strokeLinecap="round"
                />

                {/* Tote Bag Body */}
                <path
                  d="M96 181 L404 181 L396 516 Q395 540 370 540 L130 540 Q105 540 104 516 Z"
                  fill="url(#toteBodyGrad)"
                  stroke={bagPalette.stroke}
                  strokeWidth="2"
                />
                <path
                  d="M96 181 L404 181 L396 516 Q395 540 370 540 L130 540 Q105 540 104 516 Z"
                  fill="url(#canvasWeave)"
                />

                {/* Top cuff stitch line & handle reinforcement boxes */}
                <line
                  x1="100"
                  y1="204"
                  x2="400"
                  y2="204"
                  stroke={bagPalette.stitch}
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <rect
                  x="160"
                  y="182"
                  width="24"
                  height="20"
                  fill="none"
                  stroke={bagPalette.stitch}
                  strokeWidth="1.2"
                />
                <rect
                  x="316"
                  y="182"
                  width="24"
                  height="20"
                  fill="none"
                  stroke={bagPalette.stitch}
                  strokeWidth="1.2"
                />
              </svg>

              {/* Interactive Printable Surface Overlay (matches export coordinates) */}
              <div
                ref={printAreaRef}
                className="absolute border border-dashed transition-colors"
                style={{
                  left: '24.5%',
                  top: '38%',
                  width: '51%',
                  height: '46.8%',
                  borderColor:
                    bagColor === 'black' ? 'rgba(255,255,255,0.22)' : 'rgba(42,33,31,0.16)',
                }}
              >
                {elements.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                    <Sparkles
                      className="w-5 h-5 mb-1.5 opacity-50"
                      style={{ color: bagPalette.textContrast }}
                    />
                    <p
                      className="text-[11px] font-medium opacity-60 leading-snug"
                      style={{ color: bagPalette.textContrast }}
                    >
                      Add stickers or custom text here. Drag, resize &amp; rotate freely.
                    </p>
                  </div>
                )}

                {elements.map((el) => {
                  const isSelected = el.id === selectedId;
                  return (
                    <div
                      key={el.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(el.id);
                      }}
                      onPointerDown={(e) => startPointerAction(e, 'move', el)}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width}%`,
                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                        opacity: el.opacity ?? 1,
                        touchAction: 'none',
                      }}
                      className={`absolute cursor-move select-none ${
                        isSelected
                          ? 'ring-2 ring-[#D66886] ring-offset-1 z-20'
                          : 'hover:ring-1 hover:ring-[#D66886]/50 z-10'
                      }`}
                    >
                      {el.type === 'sticker' && el.stickerUrl && (
                        <img
                          src={el.stickerUrl}
                          alt={el.stickerName || 'Sticker'}
                          draggable={false}
                          className="w-full h-auto pointer-events-none select-none"
                          style={{ transform: el.flipX ? 'scaleX(-1)' : undefined }}
                        />
                      )}

                      {el.type === 'text' && (
                        <div
                          className="w-full whitespace-pre-wrap break-words leading-[1.2] px-1 py-0.5 pointer-events-none"
                          style={{
                            fontFamily: `"${el.fontFamily || 'Plus Jakarta Sans'}", sans-serif`,
                            fontSize: `${((el.fontSize || 24) / 320) * (printAreaRef.current?.clientWidth || 184)}px`,
                            color: el.color || '#2A211F',
                            fontWeight: el.bold ? 700 : 500,
                            fontStyle: el.italic ? 'italic' : 'normal',
                            textAlign: el.align || 'center',
                          }}
                        >
                          {el.text || 'Text'}
                        </div>
                      )}

                      {/* Selection Handles */}
                      {isSelected && (
                        <>
                          {/* Top Rotate Handle */}
                          <button
                            type="button"
                            onPointerDown={(e) => startPointerAction(e, 'rotate', el)}
                            aria-label="Rotate element"
                            title="Drag to rotate"
                            className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#D66886] shadow flex items-center justify-center cursor-grab"
                          >
                            <RotateCw className="w-2.5 h-2.5 text-[#D66886]" />
                          </button>

                          {/* Bottom-Right Resize Handle */}
                          <button
                            type="button"
                            onPointerDown={(e) => startPointerAction(e, 'resize', el)}
                            aria-label="Resize element"
                            title="Drag to resize"
                            className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-[#D66886] border-2 border-white shadow cursor-nwse-resize"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#7D6661] mt-2 text-center">
            Tip: Click any element on the bag to drag, resize from the pink corner dot, or rotate from the top handle.
          </p>
        </section>

        {/* RIGHT PANEL: Element Inspector + Live Price Breakdown + Done CTA */}
        <aside className="lg:col-span-3 bg-white lg:rounded-2xl border border-[#E8DFD5] p-5 flex flex-col justify-between gap-6 order-3">
          <div className="space-y-5">
            {/* Element Inspector */}
            {selectedElement ? (
              <div className="space-y-4 pb-5 border-b border-[#EFE7DF]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#2A211F]">
                    {selectedElement.type === 'sticker' ? 'Edit Sticker' : 'Edit Text'}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={duplicateSelected}
                      title="Duplicate"
                      className="p-1.5 rounded-lg border border-[#E8DFD5] hover:bg-[#FAF7F2]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={bringForward}
                      title="Bring Forward"
                      className="p-1.5 rounded-lg border border-[#E8DFD5] hover:bg-[#FAF7F2]"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelected}
                      title="Delete"
                      className="p-1.5 rounded-lg border border-[#F2C7D2] text-[#A93855] hover:bg-[#FDF2F4]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                        Text Content
                      </label>
                      <textarea
                        rows={2}
                        value={selectedElement.text || ''}
                        onChange={(e) => updateSelectedElement({ text: e.target.value })}
                        className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm focus:outline-none focus:border-[#D66886]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                        Font ({CUSTOMISER_FONTS.length} choices)
                      </label>
                      <select
                        value={selectedElement.fontFamily || 'Cormorant Garamond'}
                        onChange={(e) => updateSelectedElement({ fontFamily: e.target.value }, true)}
                        className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-sm focus:outline-none focus:border-[#D66886]"
                      >
                        {CUSTOMISER_FONTS.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.name} ({f.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Formatting & Alignment */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ bold: !selectedElement.bold }, true)}
                          className={`p-2 rounded-lg border ${
                            selectedElement.bold
                              ? 'bg-[#2A211F] text-white border-[#2A211F]'
                              : 'bg-white text-[#2A211F] border-[#E8DFD5]'
                          }`}
                          aria-label="Toggle bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ italic: !selectedElement.italic }, true)}
                          className={`p-2 rounded-lg border ${
                            selectedElement.italic
                              ? 'bg-[#2A211F] text-white border-[#2A211F]'
                              : 'bg-white text-[#2A211F] border-[#E8DFD5]'
                          }`}
                          aria-label="Toggle italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {(['left', 'center', 'right'] as const).map((al) => (
                          <button
                            key={al}
                            type="button"
                            onClick={() => updateSelectedElement({ align: al }, true)}
                            className={`p-2 rounded-lg border ${
                              (selectedElement.align || 'center') === al
                                ? 'bg-[#2A211F] text-white border-[#2A211F]'
                                : 'bg-white text-[#2A211F] border-[#E8DFD5]'
                            }`}
                            aria-label={`Align ${al}`}
                          >
                            {al === 'left' ? (
                              <AlignLeft className="w-3.5 h-3.5" />
                            ) : al === 'center' ? (
                              <AlignCenter className="w-3.5 h-3.5" />
                            ) : (
                              <AlignRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Colour */}
                    <div>
                      <label className="block text-xs font-medium text-[#6D5D58] mb-1.5">
                        Text Colour
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {TEXT_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            onClick={() => updateSelectedElement({ color: swatch }, true)}
                            className={`w-6 h-6 rounded-full border ${
                              selectedElement.color === swatch
                                ? 'ring-2 ring-[#D66886] ring-offset-1 border-[#2A211F]'
                                : 'border-[#D5C9BD]'
                            }`}
                            style={{ backgroundColor: swatch }}
                            aria-label={`Text color ${swatch}`}
                          />
                        ))}
                        <input
                          type="color"
                          value={selectedElement.color || '#2A211F'}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          aria-label="Custom text color"
                          className="w-7 h-7 rounded cursor-pointer border border-[#E8DFD5]"
                        />
                      </div>
                    </div>

                    {/* Independent Text Size */}
                    <div>
                      <div className="flex justify-between text-xs text-[#6D5D58] mb-1">
                        <span>Text Size</span>
                        <span className="tabular-nums">{selectedElement.fontSize || 24}px</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={72}
                        value={selectedElement.fontSize || 24}
                        onChange={(e) => updateSelectedElement({ fontSize: Number(e.target.value) })}
                        className="w-full accent-[#D66886]"
                      />
                    </div>
                  </>
                )}

                {selectedElement.type === 'sticker' && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs text-[#6D5D58] mb-1">
                        <span>Sticker Size</span>
                        <span className="tabular-nums">{Math.round(selectedElement.width)}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={85}
                        value={Math.round(selectedElement.width)}
                        onChange={(e) =>
                          updateSelectedElement({
                            width: Number(e.target.value),
                            height: Number(e.target.value),
                          })
                        }
                        className="w-full accent-[#D66886]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ flipX: !selectedElement.flipX }, true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] py-2 text-xs font-medium text-[#2A211F] hover:bg-[#F3ECE4]"
                    >
                      <FlipHorizontal2 className="w-3.5 h-3.5" />
                      <span>Flip Horizontally</span>
                    </button>
                  </>
                )}

                {/* Shared Rotation */}
                <div>
                  <div className="flex justify-between text-xs text-[#6D5D58] mb-1">
                    <span>Rotation</span>
                    <span className="tabular-nums">{Math.round(selectedElement.rotation || 0)}&deg;</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={Math.round(selectedElement.rotation || 0)}
                    onChange={(e) => updateSelectedElement({ rotation: Number(e.target.value) })}
                    className="w-full accent-[#D66886]"
                  />
                </div>
              </div>
            ) : (
              <div className="pb-4 border-b border-[#EFE7DF]">
                <h2 className="text-sm font-semibold text-[#2A211F] mb-1">Design Summary</h2>
                <p className="text-xs text-[#6D5D58] leading-relaxed">
                  Select stickers or add custom text from the left panel. Click any item on the bag to fine-tune its size, font, colour, or rotation.
                </p>
              </div>
            )}

            {/* Automatic Live Price Breakdown */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7D6661]">
                Estimated Price Breakdown
              </h3>
              <div className="space-y-2 text-sm text-[#4D3F3B]">
                <div className="flex items-center justify-between">
                  <span>Base Bag ({bagPalette.label})</span>
                  <span className="tabular-nums font-medium">₹{priceBreakdown.basePrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    Included Stickers ({Math.min(priceBreakdown.stickerCount, priceBreakdown.freeStickersIncluded)}/
                    {priceBreakdown.freeStickersIncluded})
                  </span>
                  <span className="text-xs font-medium text-[#4F6F52]">Free</span>
                </div>
                {priceBreakdown.extraStickerCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span>
                      Extra Stickers ({priceBreakdown.extraStickerCount} &times; ₹{priceBreakdown.extraStickerUnitPrice})
                    </span>
                    <span className="tabular-nums font-medium">+₹{priceBreakdown.extraStickerCharge}</span>
                  </div>
                )}
                {priceBreakdown.customTextCharge > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Custom Text Print</span>
                    <span className="tabular-nums font-medium">+₹{priceBreakdown.customTextCharge}</span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-[#EFE7DF] flex items-center justify-between text-base font-semibold text-[#2A211F]">
                  <span>Estimated Total</span>
                  <span className="tabular-nums text-lg text-[#B55470]">
                    ₹{priceBreakdown.totalEstimatedPrice}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {errorMsg && (
              <p className="text-xs text-[#A93855] bg-[#FDF2F4] border border-[#F2C7D2] rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={handleFinishDesign}
              disabled={saving}
              className="w-full rounded-full bg-[#2A211F] text-white py-3.5 px-5 text-sm font-semibold tracking-wide hover:bg-[#433532] transition-colors disabled:opacity-60"
            >
              {saving ? 'Generating Bag Preview...' : 'DONE – CREATE MY BAG'}
            </button>
            <p className="text-[11px] text-center text-[#7D6661]">
              Saves your high-res preview &amp; continues to order request form.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
