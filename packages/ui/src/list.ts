import type { Draw } from "./draw.ts";
import type { RGB } from "./color.ts";

export interface ListItem {
  label: string;
  value: string;
  description?: string;
}

export interface ListOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  items: ListItem[];
  selectedIndex: number;
  scrollOffset: number;
  fg?: RGB;
  bg?: RGB;
  selectedFg?: RGB;
  selectedBg?: RGB;
  descriptionFg?: RGB;
}

export interface ListState {
  selectedIndex: number;
  scrollOffset: number;
}

export function drawList(draw: Draw, opts: ListOptions): void {
  const {
    x,
    y,
    width,
    height,
    items,
    selectedIndex,
    scrollOffset,
    fg = [171, 178, 191],
    bg = [30, 30, 30],
    selectedFg = [255, 255, 255],
    selectedBg = [60, 100, 180],
    descriptionFg = [100, 105, 115],
  } = opts;

  for (let i = 0; i < height; i++) {
    const itemIdx = i + scrollOffset;
    const screenY = y + i;

    if (itemIdx >= items.length) {
      // empty row
      for (let col = 0; col < width; col++) {
        draw.char(x + col, screenY, " ", { bg });
      }
      continue;
    }

    const item = items[itemIdx];
    const isSelected = itemIdx === selectedIndex;
    const rowFg = isSelected ? selectedFg : fg;
    const rowBg = isSelected ? selectedBg : bg;

    // fill row background
    for (let col = 0; col < width; col++) {
      draw.char(x + col, screenY, " ", { bg: rowBg });
    }

    // draw label
    const label = item.label.substring(0, width);
    draw.text(x, screenY, label, { fg: rowFg, bg: rowBg });

    // draw description on the right if space
    if (item.description) {
      const descMaxW = width - label.length - 2;
      if (descMaxW > 3) {
        const desc = item.description.substring(0, descMaxW);
        draw.text(x + width - desc.length, screenY, desc, {
          fg: isSelected ? selectedFg : descriptionFg,
          bg: rowBg,
        });
      }
    }
  }

  // scrollbar if needed
  if (items.length > height) {
    const thumbSize = Math.max(1, Math.round(height * (height / items.length)));
    const scrollRatio = scrollOffset / Math.max(1, items.length - height);
    const thumbPos = Math.round(scrollRatio * (height - thumbSize));

    for (let i = 0; i < height; i++) {
      if (i >= thumbPos && i < thumbPos + thumbSize) {
        draw.char(x + width - 1, y + i, "┃", { fg: [100, 100, 100] });
      }
    }
  }
}

export function listMoveUp(state: ListState, _itemCount: number): ListState {
  const selectedIndex = Math.max(0, state.selectedIndex - 1);
  let scrollOffset = state.scrollOffset;
  if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
  return { selectedIndex, scrollOffset };
}

export function listMoveDown(
  state: ListState,
  itemCount: number,
  visibleHeight: number,
): ListState {
  const selectedIndex = Math.min(itemCount - 1, state.selectedIndex + 1);
  let scrollOffset = state.scrollOffset;
  if (selectedIndex >= scrollOffset + visibleHeight)
    scrollOffset = selectedIndex - visibleHeight + 1;
  return { selectedIndex, scrollOffset };
}
