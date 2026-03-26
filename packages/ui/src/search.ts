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
  border?: "single" | "double" | "round";
  width?: number;
  maxResults?: number;
}

export type SearchResult =
  | { type: "jump"; match: SearchMatch; query: string }
  | { type: "cancel"; query: string };

const theme = {
  border: [80, 90, 105] as RGB,
  fill: [30, 33, 40] as RGB,
  title: [230, 200, 100] as RGB,
  inputFg: [255, 255, 255] as RGB,
  inputBg: [45, 48, 55] as RGB,
  placeholder: [80, 85, 95] as RGB,
  matchCount: [100, 200, 255] as RGB,
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
    let cursorX = query.length;
    let matches: SearchMatch[] = findMatches(lines, query, opts.maxResults ?? 500);
    let listState = { selectedIndex: 0, scrollOffset: 0 };

    const searchW = opts.width ?? Math.min(60, screen.width - 4);
    const listH = Math.min(15, screen.height - 8);

    let backgroundDrawn = false;

    function renderSearch() {
      if (!backgroundDrawn) {
        renderBackground();
        backgroundDrawn = true;
      }

      const totalH = 3 + listH + 1;
      const x = Math.floor((screen.width - searchW) / 2);
      const y = 1;

      // dialog box
      draw.rect(x, y, searchW, totalH, {
        fg: theme.border,
        border: opts.border ?? "round",
        fill: theme.fill,
      });

      // title + match count
      const titleText = " Search ";
      draw.text(x + Math.floor((searchW - titleText.length) / 2), y, titleText, {
        fg: theme.title,
      });
      if (query.length > 0) {
        const countText = ` ${matches.length} matches `;
        draw.text(x + searchW - countText.length - 1, y, countText, {
          fg: theme.matchCount,
        });
      }

      // input field
      const inputY = y + 1;
      const inputW = searchW - 4;
      for (let i = 0; i < inputW; i++) {
        draw.char(x + 2 + i, inputY, " ", { bg: theme.inputBg });
      }
      if (query.length > 0) {
        draw.text(x + 2, inputY, query.substring(0, inputW), {
          fg: theme.inputFg,
          bg: theme.inputBg,
        });
      } else {
        draw.text(x + 2, inputY, "Type to search...", {
          fg: theme.placeholder,
          bg: theme.inputBg,
        });
      }

      // separator
      const sepY = y + 2;
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

      // hide cursor during flush to prevent flicker
      screen.hideCursor();
      draw.flush();

      // position cursor in input
      screen.moveTo(x + 2 + cursorX, inputY);
      screen.showCursor();
    }

    function updateMatches() {
      matches = findMatches(lines, query, opts.maxResults ?? 500);
      listState = { selectedIndex: 0, scrollOffset: 0 };
    }

    function onData(data: Buffer) {
      // escape
      if (data[0] === 0x1b && data.length === 1) {
        cleanup();
        resolve({ type: "cancel", query });
        return;
      }

      // enter
      if (data[0] === 13) {
        cleanup();
        if (matches.length > 0) {
          resolve({
            type: "jump",
            match: matches[listState.selectedIndex],
            query,
          });
        } else {
          resolve({ type: "cancel", query });
        }
        return;
      }

      // arrow up/down navigate results
      if (data[0] === 0x1b && data[1] === 0x5b) {
        const seq = data.toString("utf8", 2);
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
        // left/right in input
        if (seq === "C") {
          cursorX = Math.min(cursorX + 1, query.length);
          renderSearch();
          return;
        }
        if (seq === "D") {
          cursorX = Math.max(cursorX - 1, 0);
          renderSearch();
          return;
        }
        // home/end
        if (seq === "H") {
          cursorX = 0;
          renderSearch();
          return;
        }
        if (seq === "F") {
          cursorX = query.length;
          renderSearch();
          return;
        }
        return;
      }

      // backspace
      if (data[0] === 127) {
        if (cursorX > 0) {
          query = query.substring(0, cursorX - 1) + query.substring(cursorX);
          cursorX--;
          updateMatches();
          renderSearch();
        }
        return;
      }

      // ctrl+backspace
      if (data[0] === 0x08) {
        query = query.substring(cursorX);
        cursorX = 0;
        updateMatches();
        renderSearch();
        return;
      }

      // regular character
      const ch = data.toString("utf8");
      const code = ch.codePointAt(0) ?? 0;
      if (code >= 32) {
        query = query.substring(0, cursorX) + ch + query.substring(cursorX);
        cursorX += ch.length;
        updateMatches();
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
