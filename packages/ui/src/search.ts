import type { Screen } from "./screen.ts";
import type { Draw } from "./draw.ts";
import type { RGB } from "./color.ts";
import type { ListItem } from "./list.ts";
import { drawList, listMoveUp, listMoveDown } from "./list.ts";

export interface SearchMatch {
  line: number;
  col: number;
  length: number;
  context: string;
}

export interface SearchOptions {
  initialQuery?: string;
  initialReplace?: string;
  cursorLine?: number;
  cursorCol?: number;
  lastSelectedIndex?: number;
  border?: "single" | "double" | "round";
  width?: number;
  maxResults?: number;
}

export type SearchResult =
  | { type: "jump"; match: SearchMatch; query: string; selectedIndex: number }
  | {
      type: "replace";
      match: SearchMatch;
      query: string;
      replacement: string;
      selectedIndex: number;
    }
  | {
      type: "replaceAll";
      matches: SearchMatch[];
      query: string;
      replacement: string;
      selectedIndex: number;
    }
  | { type: "cancel"; query: string; replacement: string; selectedIndex: number };

const theme = {
  border: [80, 90, 105] as RGB,
  fill: [30, 33, 40] as RGB,
  title: [230, 200, 100] as RGB,
  inputFg: [255, 255, 255] as RGB,
  inputBg: [45, 48, 55] as RGB,
  inputActiveBorder: [100, 200, 255] as RGB,
  placeholder: [80, 85, 95] as RGB,
  matchCount: [100, 200, 255] as RGB,
  labelFg: [130, 135, 145] as RGB,
  replaceFg: [152, 195, 121] as RGB,
};

function findMatches(lines: readonly string[], query: string, maxResults: number): SearchMatch[] {
  if (!query) return [];
  const matches: SearchMatch[] = [];
  const lowerQuery = query.toLowerCase();

  for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerLine.length && matches.length < maxResults) {
      const col = lowerLine.indexOf(lowerQuery, searchFrom);
      if (col === -1) break;

      const contextStart = Math.max(0, col - 15);
      const contextEnd = Math.min(line.length, col + query.length + 30);
      const prefix = contextStart > 0 ? "…" : "";
      const suffix = contextEnd < line.length ? "…" : "";
      const context = prefix + line.substring(contextStart, contextEnd) + suffix;

      matches.push({ line: i, col, length: query.length, context });
      searchFrom = col + 1;
    }
  }

  return matches;
}

export function showSearch(
  screen: Screen,
  draw: Draw,
  lines: readonly string[],
  opts: SearchOptions,
  renderBackground: () => void,
): Promise<SearchResult> {
  return new Promise((resolve) => {
    let query = opts.initialQuery ?? "";
    let replace = opts.initialReplace ?? "";
    let queryCursorX = query.length;
    let replaceCursorX = replace.length;
    // 0 = search input, 1 = replace input
    let activeField = 0;
    let matches: SearchMatch[] = [];
    let listState = { selectedIndex: 0, scrollOffset: 0 };

    const searchW = opts.width ?? Math.min(60, screen.width - 4);
    const listH = Math.min(15, screen.height - 10);

    // initial match + restore last selection if available
    updateMatches();
    if (opts.lastSelectedIndex != null && opts.lastSelectedIndex < matches.length) {
      listState = {
        selectedIndex: opts.lastSelectedIndex,
        scrollOffset: Math.max(0, opts.lastSelectedIndex - Math.floor(listH / 2)),
      };
    }

    let backgroundDrawn = false;

    function renderSearch() {
      if (!backgroundDrawn) {
        renderBackground();
        backgroundDrawn = true;
      }

      const totalH = 5 + listH + 1; // border + search + replace + sep + list + border
      const x = Math.floor((screen.width - searchW) / 2);
      const y = 1;
      const inputW = searchW - 7; // label (3) + padding

      // dialog box
      draw.rect(x, y, searchW, totalH, {
        fg: theme.border,
        border: opts.border ?? "round",
        fill: theme.fill,
      });

      // title + match count
      const titleText = " Search & Replace ";
      draw.text(x + Math.floor((searchW - titleText.length) / 2), y, titleText, {
        fg: theme.title,
      });
      if (query.length > 0) {
        const countText = ` ${matches.length} `;
        draw.text(x + searchW - countText.length - 1, y, countText, {
          fg: theme.matchCount,
        });
      }

      // search input (row 1)
      const searchY = y + 1;
      draw.text(x + 1, searchY, "  ⌕", { fg: theme.labelFg, bg: theme.fill });
      for (let i = 0; i < inputW; i++) {
        draw.char(x + 5 + i, searchY, " ", { bg: theme.inputBg });
      }
      if (query.length > 0) {
        draw.text(x + 5, searchY, query.substring(0, inputW), {
          fg: theme.inputFg,
          bg: theme.inputBg,
        });
      } else {
        draw.text(x + 5, searchY, "Search...", {
          fg: theme.placeholder,
          bg: theme.inputBg,
        });
      }
      // active indicator
      if (activeField === 0) {
        draw.char(x + 4, searchY, "▎", { fg: theme.inputActiveBorder });
      }

      // replace input (row 2)
      const replaceY = y + 2;
      draw.text(x + 1, replaceY, "  →", { fg: theme.labelFg, bg: theme.fill });
      for (let i = 0; i < inputW; i++) {
        draw.char(x + 5 + i, replaceY, " ", { bg: theme.inputBg });
      }
      if (replace.length > 0) {
        draw.text(x + 5, replaceY, replace.substring(0, inputW), {
          fg: theme.replaceFg,
          bg: theme.inputBg,
        });
      } else {
        draw.text(x + 5, replaceY, "Replace...", {
          fg: theme.placeholder,
          bg: theme.inputBg,
        });
      }
      if (activeField === 1) {
        draw.char(x + 4, replaceY, "▎", { fg: theme.inputActiveBorder });
      }

      // hint row
      const hintY = y + 3;
      const hint =
        replace.length > 0
          ? " Enter=Replace  ^A=All  ↑↓=Nav  Esc=Close"
          : " Enter=Jump  ↑↓=Navigate  Tab=Replace  Esc=Close";
      draw.text(x + 1, hintY, hint.substring(0, searchW - 2), {
        fg: [70, 75, 85],
        bg: theme.fill,
      });

      // separator
      const sepY = y + 4;
      for (let i = 1; i < searchW - 1; i++) {
        draw.char(x + i, sepY, "─", { fg: theme.border });
      }

      // results list
      const listItems: ListItem[] = matches.map((m) => ({
        label: ` ${String(m.line + 1).padStart(4)} │ ${m.context}`,
        value: `${m.line}:${m.col}`,
      }));

      drawList(draw, {
        x: x + 1,
        y: sepY + 1,
        width: searchW - 2,
        height: listH,
        items: listItems,
        selectedIndex: listState.selectedIndex,
        scrollOffset: listState.scrollOffset,
        bg: theme.fill,
      });

      screen.hideCursor();
      draw.flush();

      // position cursor in active input
      if (activeField === 0) {
        screen.moveTo(x + 5 + queryCursorX, searchY);
      } else {
        screen.moveTo(x + 5 + replaceCursorX, replaceY);
      }
      screen.showCursor();
    }

    function updateMatches(preserveSelection = false) {
      matches = findMatches(lines, query, opts.maxResults ?? 500);
      if (preserveSelection && listState.selectedIndex < matches.length) {
        return;
      }
      // select nearest match at or after cursor position
      const cl = opts.cursorLine ?? 0;
      const cc = opts.cursorCol ?? 0;
      let best = 0;
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        if (m.line > cl || (m.line === cl && m.col >= cc)) {
          best = i;
          break;
        }
        best = i;
      }
      listState = { selectedIndex: best, scrollOffset: Math.max(0, best - Math.floor(listH / 2)) };
    }

    // get active field text + cursor
    function getActiveText(): string {
      return activeField === 0 ? query : replace;
    }
    function getActiveCursorX(): number {
      return activeField === 0 ? queryCursorX : replaceCursorX;
    }
    function setActiveText(text: string) {
      if (activeField === 0) {
        query = text;
        updateMatches();
      } else {
        replace = text;
      }
    }
    function setActiveCursorX(x: number) {
      if (activeField === 0) queryCursorX = x;
      else replaceCursorX = x;
    }

    function onData(data: Buffer) {
      // escape
      if (data[0] === 0x1b && data.length === 1) {
        cleanup();
        resolve({
          type: "cancel",
          query,
          replacement: replace,
          selectedIndex: listState.selectedIndex,
        });
        return;
      }

      // tab: switch fields
      if (data[0] === 9) {
        activeField = activeField === 0 ? 1 : 0;
        renderSearch();
        return;
      }

      // enter
      if (data[0] === 13) {
        if (matches.length === 0) return;
        cleanup();

        if (replace.length > 0) {
          resolve({
            type: "replace",
            match: matches[listState.selectedIndex],
            query,
            replacement: replace,
            selectedIndex: listState.selectedIndex,
          });
        } else {
          resolve({
            type: "jump",
            match: matches[listState.selectedIndex],
            query,
            selectedIndex: listState.selectedIndex,
          });
        }
        return;
      }

      // ctrl+a: replace all
      if (data.length === 1 && data[0] === 1 && replace.length > 0 && matches.length > 0) {
        cleanup();
        resolve({
          type: "replaceAll",
          matches: [...matches],
          query,
          replacement: replace,
          selectedIndex: listState.selectedIndex,
        });
        return;
      }

      // escape sequences (arrows, shift+tab)
      if (data[0] === 0x1b && data[1] === 0x5b) {
        const seq = data.toString("utf8", 2);
        // shift+tab: switch fields backwards
        if (seq === "Z") {
          activeField = activeField === 0 ? 1 : 0;
          renderSearch();
          return;
        }
        if (seq === "A" && matches.length > 0) {
          listState = listMoveUp(listState, matches.length);
          renderSearch();
          return;
        }
        if (seq === "B" && matches.length > 0) {
          listState = listMoveDown(listState, matches.length, listH);
          renderSearch();
          return;
        }
        if (seq === "C") {
          setActiveCursorX(Math.min(getActiveCursorX() + 1, getActiveText().length));
          renderSearch();
          return;
        }
        if (seq === "D") {
          setActiveCursorX(Math.max(getActiveCursorX() - 1, 0));
          renderSearch();
          return;
        }
        if (seq === "H") {
          setActiveCursorX(0);
          renderSearch();
          return;
        }
        if (seq === "F") {
          setActiveCursorX(getActiveText().length);
          renderSearch();
          return;
        }
        return;
      }

      // backspace
      if (data[0] === 127) {
        const cx = getActiveCursorX();
        if (cx > 0) {
          const text = getActiveText();
          setActiveText(text.substring(0, cx - 1) + text.substring(cx));
          setActiveCursorX(cx - 1);
          renderSearch();
        }
        return;
      }

      // ctrl+backspace
      if (data[0] === 0x08) {
        const text = getActiveText();
        const cx = getActiveCursorX();
        setActiveText(text.substring(cx));
        setActiveCursorX(0);
        renderSearch();
        return;
      }

      // regular character
      const ch = data.toString("utf8");
      const code = ch.codePointAt(0) ?? 0;
      if (code >= 32) {
        const text = getActiveText();
        const cx = getActiveCursorX();
        setActiveText(text.substring(0, cx) + ch + text.substring(cx));
        setActiveCursorX(cx + ch.length);
        renderSearch();
      }
    }

    function cleanup() {
      process.stdin.removeListener("data", onData);
    }

    process.stdin.on("data", onData);
    renderSearch();
  });
}
