import type { Screen } from '@jano/ui';
import type { EditorState } from './editor.js';
import type { CursorState } from './cursor.js';
import type { SelectionState } from './selection.js';
import type { KeyEvent } from './keypress.js';
import { clamp, moveLeft, moveRight } from './cursor.js';
import * as sel from './selection.js';
import * as ed from './editor.js';

export function handleKey(
  key: KeyEvent,
  editor: EditorState,
  cursor: CursorState,
  selection: SelectionState,
  screen: Screen,
): boolean {
  // shift+arrow: start or extend selection
  if (key.shift && ['up', 'down', 'left', 'right', 'home', 'end'].includes(key.name)) {
    sel.startOrExtend(selection, cursor);

    switch (key.name) {
      case 'up': cursor.y--; break;
      case 'down': cursor.y++; break;
      case 'left': cursor.x--; break;
      case 'right': cursor.x++; break;
      case 'home': cursor.x = 0; break;
      case 'end': cursor.x = editor.lines[cursor.y].length; break;
    }

    clamp(cursor, editor.lines);
    sel.collapseIfEmpty(selection, cursor);
    return false;
  }

  // ctrl shortcuts
  if (key.ctrl) {
    switch (key.name) {
      case 'q':
        return true; // signal exit

      case 'o':
        ed.save(editor);
        break;

      case 'c': {
        const range = sel.getRange(selection, cursor);
        if (range) {
          editor.clipboardText = sel.getText(range, editor.lines);
          sel.clear(selection);
        }
        break;
      }

      case 'x': {
        const range = sel.getRange(selection, cursor);
        if (range) {
          editor.clipboardText = sel.getText(range, editor.lines);
          sel.deleteRange(range, editor, cursor, selection);
        } else {
          const result = ed.cutLine(editor, cursor.y);
          editor.clipboardText = result.clipText;
          cursor.y = result.newY;
          cursor.x = Math.min(cursor.x, editor.lines[cursor.y].length);
        }
        break;
      }

      case 'v': {
        if (editor.clipboardText.length > 0) {
          const range = sel.getRange(selection, cursor);
          if (range) sel.deleteRange(range, editor, cursor, selection);
          const pos = ed.pasteText(editor, cursor.x, cursor.y, editor.clipboardText);
          cursor.x = pos.x;
          cursor.y = pos.y;
        }
        break;
      }
    }

    clamp(cursor, editor.lines);
    return false;
  }

  // grab selection before clearing it
  const selRange = sel.getRange(selection, cursor);

  switch (key.name) {
    // navigation
    case 'up': cursor.y--; break;
    case 'down': cursor.y++; break;
    case 'left': moveLeft(cursor, editor.lines); break;
    case 'right': moveRight(cursor, editor.lines); break;
    case 'home': cursor.x = 0; break;
    case 'end': cursor.x = editor.lines[cursor.y].length; break;
    case 'pageup': cursor.y -= screen.height - 2; break;
    case 'pagedown': cursor.y += screen.height - 2; break;

    // editing
    case 'enter': {
      if (selRange) sel.deleteRange(selRange, editor, cursor, selection);
      const pos = ed.insertNewline(editor, cursor.x, cursor.y);
      cursor.x = pos.x;
      cursor.y = pos.y;
      break;
    }
    case 'backspace': {
      if (selRange) {
        sel.deleteRange(selRange, editor, cursor, selection);
        break;
      }
      const pos = ed.deleteCharBack(editor, cursor.x, cursor.y);
      cursor.x = pos.x;
      cursor.y = pos.y;
      break;
    }
    case 'delete': {
      if (selRange) {
        sel.deleteRange(selRange, editor, cursor, selection);
        break;
      }
      ed.deleteCharForward(editor, cursor.x, cursor.y);
      break;
    }
    case 'tab': {
      cursor.x = ed.insertTab(editor, cursor.x, cursor.y);
      break;
    }

    // regular character
    default: {
      const ch = key.name;
      if (ch === 'unknown') break;
      const code = ch.codePointAt(0) ?? 0;
      if (code >= 32) {
        if (selRange) sel.deleteRange(selRange, editor, cursor, selection);
        cursor.x = ed.insertChar(editor, cursor.x, cursor.y, ch);
      }
      break;
    }
  }

  sel.clear(selection);
  clamp(cursor, editor.lines);
  return false;
}
