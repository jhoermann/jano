import type { Pos } from './types.ts';

export interface CursorState {
  x: number;
  y: number;
  scrollX: number;
  scrollY: number;
}

export function createCursor(): CursorState {
  return { x: 0, y: 0, scrollX: 0, scrollY: 0 };
}

export function clamp(cursor: CursorState, lines: string[]) {
  if (cursor.y < 0) cursor.y = 0;
  if (cursor.y >= lines.length) cursor.y = lines.length - 1;
  const lineLen = lines[cursor.y].length;
  if (cursor.x < 0) cursor.x = 0;
  if (cursor.x > lineLen) cursor.x = lineLen;
}

export function ensureVisible(cursor: CursorState, viewW: number, viewH: number) {
  if (cursor.y < cursor.scrollY) cursor.scrollY = cursor.y;
  if (cursor.y >= cursor.scrollY + viewH) cursor.scrollY = cursor.y - viewH + 1;
  if (cursor.x < cursor.scrollX) cursor.scrollX = cursor.x;
  if (cursor.x >= cursor.scrollX + viewW) cursor.scrollX = cursor.x - viewW + 1;
}

export function moveLeft(cursor: CursorState, lines: string[]) {
  if (cursor.x > 0) {
    cursor.x--;
  } else if (cursor.y > 0) {
    cursor.y--;
    cursor.x = lines[cursor.y].length;
  }
}

export function moveRight(cursor: CursorState, lines: string[]) {
  if (cursor.x < lines[cursor.y].length) {
    cursor.x++;
  } else if (cursor.y < lines.length - 1) {
    cursor.y++;
    cursor.x = 0;
  }
}

// find previous word boundary (like VS Code ctrl+left)
export function wordBoundaryLeft(line: string, col: number): number {
  if (col <= 0) return 0;
  let i = col - 1;
  // skip whitespace
  while (i > 0 && /\s/.test(line[i])) i--;
  // if on punctuation, skip punctuation
  if (i >= 0 && /[^\w\s]/.test(line[i])) {
    while (i > 0 && /[^\w\s]/.test(line[i - 1])) i--;
    return i;
  }
  // skip word chars
  while (i > 0 && /\w/.test(line[i - 1])) i--;
  return i;
}

// find next word boundary (like VS Code ctrl+right)
export function wordBoundaryRight(line: string, col: number): number {
  const len = line.length;
  if (col >= len) return len;
  let i = col;
  // if on word char, skip word
  if (/\w/.test(line[i])) {
    while (i < len && /\w/.test(line[i])) i++;
  }
  // if on punctuation, skip punctuation
  else if (/[^\w\s]/.test(line[i])) {
    while (i < len && /[^\w\s]/.test(line[i])) i++;
  }
  // skip trailing whitespace
  while (i < len && /\s/.test(line[i])) i++;
  return i;
}

export function moveWordLeft(cursor: CursorState, lines: string[]) {
  if (cursor.x > 0) {
    cursor.x = wordBoundaryLeft(lines[cursor.y], cursor.x);
  } else if (cursor.y > 0) {
    cursor.y--;
    cursor.x = lines[cursor.y].length;
  }
}

export function moveWordRight(cursor: CursorState, lines: string[]) {
  if (cursor.x < lines[cursor.y].length) {
    cursor.x = wordBoundaryRight(lines[cursor.y], cursor.x);
  } else if (cursor.y < lines.length - 1) {
    cursor.y++;
    cursor.x = 0;
  }
}

export function pos(cursor: CursorState): Pos {
  return { x: cursor.x, y: cursor.y };
}
