import type { BagColorId, CanvasElement } from '../types/store';
import { BAG_COLOR_PALETTE } from './customiserFonts';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function renderTotePreviewDataUrl(
  bagColor: BagColorId,
  elements: CanvasElement[]
): Promise<string> {
  const width = 800;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const palette = BAG_COLOR_PALETTE[bagColor] || BAG_COLOR_PALETTE.beige;

  // Soft studio backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FAF7F2');
  bgGrad.addColorStop(1, '#F1EAE1');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle floor shadow
  ctx.save();
  ctx.fillStyle = 'rgba(42, 33, 31, 0.12)';
  ctx.beginPath();
  ctx.ellipse(width / 2, 875, 210, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tote handles (behind & front)
  ctx.save();
  ctx.strokeStyle = palette.shade;
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(275, 295);
  ctx.bezierCurveTo(275, 95, 525, 95, 525, 295);
  ctx.stroke();

  ctx.strokeStyle = palette.fill;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(275, 295);
  ctx.bezierCurveTo(275, 100, 525, 100, 525, 295);
  ctx.stroke();
  ctx.restore();

  // Tote body path
  const drawBodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(155, 290);
    ctx.lineTo(645, 290);
    ctx.lineTo(632, 825);
    ctx.quadraticCurveTo(630, 862, 592, 862);
    ctx.lineTo(208, 862);
    ctx.quadraticCurveTo(170, 862, 168, 825);
    ctx.closePath();
  };

  ctx.save();
  drawBodyPath();
  const bodyGrad = ctx.createLinearGradient(155, 290, 645, 862);
  bodyGrad.addColorStop(0, palette.fill);
  bodyGrad.addColorStop(0.7, palette.fill);
  bodyGrad.addColorStop(1, palette.shade);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = palette.stroke;
  ctx.stroke();
  ctx.restore();

  // Top cuff stitch line & handle X-box stitching
  ctx.save();
  ctx.strokeStyle = palette.stitch;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(160, 326);
  ctx.lineTo(640, 326);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Printable area coordinates matching editor's printable box:
  // Editor bag body has printable zone centered vertically in body: x=[196..604] (w=408), y=[365..815] (h=450)
  const printX = 196;
  const printY = 365;
  const printW = 408;
  const printH = 450;

  // Clip elements inside bag printable surface
  ctx.save();
  drawBodyPath();
  ctx.clip();

  for (const el of elements) {
    const cx = printX + (el.x / 100) * printW;
    const cy = printY + (el.y / 100) * printH;

    if (el.type === 'sticker' && el.stickerUrl) {
      try {
        const img = await loadImage(el.stickerUrl);
        const targetW = (el.width / 100) * printW;
        const aspect = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
        const targetH = targetW * aspect;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
        if (el.flipX) ctx.scale(-1, 1);
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();
      } catch {
        // skip unreadable sticker gracefully
      }
    } else if (el.type === 'text' && el.text) {
      const baseFontSize = el.fontSize || 24;
      const scaledFontSize = (baseFontSize / 320) * printW;
      const fontStyle = `${el.italic ? 'italic ' : ''}${el.bold ? '700 ' : '500 '}${scaledFontSize}px "${el.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
      ctx.globalAlpha = el.opacity ?? 1;
      ctx.font = fontStyle;
      ctx.fillStyle = el.color || '#2A211F';
      ctx.textBaseline = 'middle';
      const align = el.align || 'center';
      ctx.textAlign = align;

      const lines = el.text.split('\n');
      const lineHeight = scaledFontSize * 1.2;
      const totalH = lines.length * lineHeight;
      const boxW = (el.width / 100) * printW;

      lines.forEach((line, idx) => {
        const yOffset = -totalH / 2 + lineHeight * (idx + 0.5);
        const xOffset = align === 'left' ? -boxW / 2 : align === 'right' ? boxW / 2 : 0;
        ctx.fillText(line, xOffset, yOffset);
      });
      ctx.restore();
    }
  }

  ctx.restore();

  return canvas.toDataURL('image/png');
}
