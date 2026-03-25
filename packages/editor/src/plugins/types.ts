import type { RGB } from '@jano/ui';

// ----- Highlighting -----

export interface HighlightPatterns {
  comment?: RegExp;
  string?: RegExp;
  number?: RegExp;
  keyword?: RegExp;
  type?: RegExp;
  function?: RegExp;
  operator?: RegExp;
  variable?: RegExp;
  property?: RegExp;
  tag?: RegExp;
  attribute?: RegExp;
  constant?: RegExp;
  builtin?: RegExp;
  punctuation?: RegExp;
}

export interface HighlightToken {
  start: number;
  end: number;
  type: string;
}

export const tokenColors: Record<string, RGB> = {
  keyword:     [198, 120, 221],
  string:      [152, 195, 121],
  comment:     [92, 99, 112],
  number:      [209, 154, 102],
  type:        [229, 192, 123],
  function:    [97, 175, 239],
  operator:    [86, 182, 194],
  variable:    [224, 108, 117],
  property:    [224, 108, 117],
  tag:         [224, 108, 117],
  attribute:   [209, 154, 102],
  constant:    [209, 154, 102],
  builtin:     [198, 120, 221],
  punctuation: [171, 178, 191],
};

// ----- Raw Data Types -----

// a position in the document
export interface Position {
  line: number;
  col: number;
}

// a cursor with optional selection
// - position: where the cursor blinks
// - anchor: where selection started (null = no selection)
// - anchor and position can be on different lines, in any direction
// - if anchor.line > position.line: selected upwards
// - if anchor.line < position.line: selected downwards
// - if anchor.line === position.line: selected within same line
export interface Cursor {
  position: Position;
  anchor: Position | null;
}

// a range in the document (start is always before end)
export interface Range {
  start: Position;
  end: Position;
}

// ----- Plugin Context -----

export interface PluginContext {
  // file
  filePath: string;
  fileName: string;
  extension: string;

  // full document — readonly raw access, plugin must not mutate
  lines: readonly string[];
  lineCount: number;

  // all cursors — [0] is primary, rest are secondary (multi-cursor)
  // each cursor carries its own selection state
  cursors: readonly Cursor[];

  // the event that triggered this hook
  event: {
    type: 'newline' | 'char' | 'format' | 'save' | 'open' | 'delete' | 'paste';
    char?: string;
    pastedText?: string;
    deletedText?: string;
  };

  // viewport
  viewport: {
    firstVisibleLine: number;
    lastVisibleLine: number;
    width: number;
    height: number;
  };

  // editor state
  dirty: boolean;
  language: string;
}

// ----- Plugin Responses -----

// a text edit: replace the range start→end with text
// to insert: start === end, text = what to insert
// to delete: text = '', range = what to delete
export interface TextEdit {
  range: Range;
  text: string;
}

export interface EditResult {
  // granular edits — applied in reverse order (bottom-up) so positions stay valid
  edits?: TextEdit[];

  // or full document replacement (for formatters)
  replaceAll?: string[];

  // cursor positions after edit — one per cursor
  cursors?: Cursor[];
}

// ----- Plugin Interface -----

export interface LanguagePlugin {
  name: string;
  extensions: string[];

  // syntax highlighting
  highlight?: {
    keywords?: string[];
    patterns?: HighlightPatterns;
  };

  // hooks — all optional, all receive full context, all return edits or null
  onNewLine?(context: PluginContext): EditResult | null;
  onCharTyped?(context: PluginContext): EditResult | null;
  onFormat?(context: PluginContext): EditResult | null;
  onSave?(context: PluginContext): EditResult | null;
  onOpen?(context: PluginContext): void;
  onDelete?(context: PluginContext): EditResult | null;
  onPaste?(context: PluginContext): EditResult | null;
}
