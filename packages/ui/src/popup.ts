import type { Draw } from "./draw.ts";
import type { RGB } from "./color.ts";

export interface PopupItem {
  label: string;
  detail?: string;
}

export interface PopupOptions {
  // anchor position (cursor screen coords)
  x: number;
  y: number;
  // viewport bounds for repositioning
  screenW: number;
  screenH: number;
  // content
  items: PopupItem[];
  selectedIndex: number;
  scrollOffset: number;
  // limits
  maxVisible?: number;
  maxWidth?: number;
  // colors
  bg?: RGB;
  fg?: RGB;
  selectedBg?: RGB;
  selectedFg?: RGB;
  detailFg?: RGB;
  borderFg?: RGB;
}

export function drawPopup(draw: Draw, opts: PopupOptions): void {
  const {
    items,
    selectedIndex,
    scrollOffset,
    screenW,
    screenH,
    maxVisible = 8,
    maxWidth = 40,
    bg = [40, 44, 52],
    fg = [171, 178, 191],
    selectedBg = [60, 100, 180],
    selectedFg = [255, 255, 255],
    detailFg = [100, 105, 115],
    borderFg = [80, 90, 105],
  } = opts;

  if (items.length === 0) return;

  const visibleCount = Math.min(items.length, maxVisible);

  // compute width from content
  let contentW = 0;
  for (const item of items) {
    const w = item.label.length + (item.detail ? item.detail.length + 2 : 0);
    if (w > contentW) contentW = w;
  }
  contentW = Math.min(contentW + 2, maxWidth);

  // popup dimensions (including border)
  const popupW = contentW + 2;
  const popupH = visibleCount + 2;

  // position: prefer below cursor, flip above if no space
  let px = opts.x;
  let py = opts.y + 1;

  if (py + popupH > screenH) {
    // flip above cursor
    py = opts.y - popupH;
  }
  if (py < 0) py = 0;

  if (px + popupW > screenW) {
    px = screenW - popupW;
  }
  if (px < 0) px = 0;

  // border
  draw.rect(px, py, popupW, popupH, {
    fg: borderFg,
    border: "round",
    fill: bg,
  });

  // items
  for (let i = 0; i < visibleCount; i++) {
    const itemIdx = i + scrollOffset;
    if (itemIdx >= items.length) break;

    const item = items[itemIdx];
    const isSelected = itemIdx === selectedIndex;
    const rowBg = isSelected ? selectedBg : bg;
    const rowFg = isSelected ? selectedFg : fg;
    const rowY = py + 1 + i;

    // fill row
    for (let col = 0; col < contentW; col++) {
      draw.char(px + 1 + col, rowY, " ", { bg: rowBg });
    }

    // label
    const label = item.label.substring(0, contentW - 1);
    draw.text(px + 2, rowY, label, { fg: rowFg, bg: rowBg });

    // detail right-aligned
    if (item.detail) {
      const maxDetailW = contentW - label.length - 3;
      if (maxDetailW > 1) {
        const detail = item.detail.substring(0, maxDetailW);
        draw.text(px + popupW - 1 - detail.length, rowY, detail, {
          fg: isSelected ? selectedFg : detailFg,
          bg: rowBg,
        });
      }
    }
  }

  // scrollbar if needed
  if (items.length > visibleCount) {
    const thumbSize = Math.max(1, Math.round(visibleCount * (visibleCount / items.length)));
    const scrollRatio = scrollOffset / Math.max(1, items.length - visibleCount);
    const thumbPos = Math.round(scrollRatio * (visibleCount - thumbSize));

    for (let i = 0; i < visibleCount; i++) {
      if (i >= thumbPos && i < thumbPos + thumbSize) {
        draw.char(px + popupW - 1, py + 1 + i, "┃", { fg: [100, 100, 100] });
      }
    }
  }
}

export function popupMoveUp(
  selectedIndex: number,
  scrollOffset: number,
  _itemCount: number,
): { selectedIndex: number; scrollOffset: number } {
  selectedIndex = Math.max(0, selectedIndex - 1);
  if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
  return { selectedIndex, scrollOffset };
}

export function popupMoveDown(
  selectedIndex: number,
  scrollOffset: number,
  itemCount: number,
  maxVisible = 8,
): { selectedIndex: number; scrollOffset: number } {
  selectedIndex = Math.min(itemCount - 1, selectedIndex + 1);
  if (selectedIndex >= scrollOffset + maxVisible) scrollOffset = selectedIndex - maxVisible + 1;
  return { selectedIndex, scrollOffset };
}
