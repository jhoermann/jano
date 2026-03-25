import type { EditResult } from './types.js';
import type { EditorState } from '../editor.js';
import type { CursorState } from '../cursor.js';
import type { SelectionState } from '../selection.js';

export function applyEditResult(
  result: EditResult,
  editor: EditorState,
  cursor: CursorState,
  selection: SelectionState,
) {
  if (result.replaceAll) {
    editor.lines = result.replaceAll;
    editor.dirty = true;
  }

  if (result.edits) {
    // apply edits in reverse order so positions stay valid
    const sorted = [...result.edits].sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) {
        return b.range.start.line - a.range.start.line;
      }
      return b.range.start.col - a.range.start.col;
    });

    for (const edit of sorted) {
      const { start, end } = edit.range;

      if (start.line === end.line) {
        // single line edit
        const line = editor.lines[start.line];
        editor.lines[start.line] =
          line.substring(0, start.col) + edit.text + line.substring(end.col);
      } else {
        // multi-line edit
        const firstPart = editor.lines[start.line].substring(0, start.col);
        const lastPart = editor.lines[end.line].substring(end.col);
        const newLines = edit.text.split('\n');
        newLines[0] = firstPart + newLines[0];
        newLines[newLines.length - 1] = newLines[newLines.length - 1] + lastPart;
        editor.lines.splice(start.line, end.line - start.line + 1, ...newLines);
      }

      editor.dirty = true;
    }
  }

  // apply cursor positions
  if (result.cursors && result.cursors.length > 0) {
    const primary = result.cursors[0];
    cursor.x = primary.position.col;
    cursor.y = primary.position.line;

    if (primary.anchor) {
      selection.anchor = { x: primary.anchor.col, y: primary.anchor.line };
    } else {
      selection.anchor = null;
    }
  }
}
