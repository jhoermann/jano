#!/usr/bin/env node
import { createScreen, createDraw, showDialog } from '@jano/ui';
import { createEditor, save } from './editor.js';
import { createCursor, ensureVisible } from './cursor.js';
import { createSelection } from './selection.js';
import { parseKey } from './keypress.js';
import { handleKey } from './input.js';
import { render, getViewDimensions } from './render.js';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: jano <file>');
  process.exit(1);
}

const screen = createScreen();
const draw = createDraw(screen);
const editor = createEditor(filePath);
const cursor = createCursor();
const selection = createSelection();

let dialogOpen = false;

function update() {
  const { viewW, viewH } = getViewDimensions(screen, editor.lines.length);
  ensureVisible(cursor, viewW, viewH);
  render(screen, draw, editor, cursor, selection);
}

async function confirmExit() {
  if (!editor.dirty) {
    screen.leave();
    process.exit(0);
  }

  dialogOpen = true;

  const result = await showDialog(screen, draw, {
    title: 'Unsaved Changes',
    message: `Save changes to "${editor.filePath}" before closing?`,
    buttons: [
      { label: 'Save', value: 'save' },
      { label: 'Discard', value: 'discard' },
      { label: 'Cancel', value: 'cancel' },
    ],
    border: 'round',
  }, update);

  dialogOpen = false;

  if (result.type === 'button') {
    if (result.value === 'save') {
      save(editor);
      screen.leave();
      process.exit(0);
    }
    if (result.value === 'discard') {
      screen.leave();
      process.exit(0);
    }
  }

  // cancel or escape: back to editor
  update();
}

screen.enter();
process.stdin.setRawMode(true);

process.stdin.on('data', (data) => {
  if (dialogOpen) return; // dialog handles its own input

  const key = parseKey(data);
  const shouldExit = handleKey(key, editor, cursor, selection, screen);

  if (shouldExit) {
    confirmExit();
    return;
  }

  update();
});

process.stdout.on('resize', update);

update();
