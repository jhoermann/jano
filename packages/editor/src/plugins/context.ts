import { basename, extname } from 'node:path';
import type { PluginContext, Cursor } from './types.ts';
import type { EditorState } from '../editor.ts';
import type { CursorState } from '../cursor.ts';
import type { SelectionState } from '../selection.ts';

export function buildContext(
  editor: EditorState,
  cursorState: CursorState,
  selection: SelectionState,
  eventType: PluginContext['event']['type'],
  viewport: { firstLine: number; lastLine: number; width: number; height: number },
  extra?: { char?: string; pastedText?: string; deletedText?: string },
): PluginContext {
  const cursor: Cursor = {
    position: { line: cursorState.y, col: cursorState.x },
    anchor: selection.anchor
      ? { line: selection.anchor.y, col: selection.anchor.x }
      : null,
  };

  return {
    filePath: editor.filePath,
    fileName: basename(editor.filePath),
    extension: extname(editor.filePath),
    lines: editor.lines,
    lineCount: editor.lines.length,
    cursors: [cursor],
    event: {
      type: eventType,
      char: extra?.char,
      pastedText: extra?.pastedText,
      deletedText: extra?.deletedText,
    },
    viewport: {
      firstVisibleLine: viewport.firstLine,
      lastVisibleLine: viewport.lastLine,
      width: viewport.width,
      height: viewport.height,
    },
    dirty: editor.dirty,
    language: '',
  };
}
