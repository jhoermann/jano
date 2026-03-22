#!/usr/bin/env node
import { createScreen, createDraw } from '@jano/ui';
import { createEditor } from './editor.js';
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

function update() {
  const { viewW, viewH } = getViewDimensions(screen, editor.lines.length);
  ensureVisible(cursor, viewW, viewH);
  render(screen, draw, editor, cursor, selection);
}

screen.enter();
process.stdin.setRawMode(true);

process.stdin.on('data', (data) => {
  const key = parseKey(data);
  const shouldExit = handleKey(key, editor, cursor, selection, screen);

  if (shouldExit) {
    screen.leave();
    process.exit(0);
  }

  update();
});

process.stdout.on('resize', update);

update();
