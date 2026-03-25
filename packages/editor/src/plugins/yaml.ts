import type { LanguagePlugin, PluginContext, EditResult } from './types.js';

const TAB_SIZE = 2;

const keywords = ['true', 'false', 'null', 'yes', 'no', 'on', 'off'];

export const yaml: LanguagePlugin = {
  name: 'YAML',
  extensions: ['.yml', '.yaml', 'docker-compose.yml', 'docker-compose.yaml'],
  highlight: {
    keywords,
    patterns: {
      comment: /#.*$/gm,
      string: /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g,
      number: /\b\d+\.?\d*\b/g,
      type: /^[\w.-]+(?=\s*:)/gm,
      variable: /\$\{?\w+\}?/g,
    },
  },

  onNewLine(ctx: PluginContext): EditResult | null {
    const cursor = ctx.cursors[0];
    const curLine = cursor.position.line;

    // the line above is what was just "entered" from
    const prevLine = curLine > 0 ? ctx.lines[curLine - 1] : '';
    const match = prevLine.match(/^(\s*)/);
    let indent = match ? match[1] : '';

    // after "key:" → indent
    if (/:\s*$/.test(prevLine)) {
      indent += ' '.repeat(TAB_SIZE);
    }
    // after "- item" → same indent level (continue list)
    else if (/^\s*-\s/.test(prevLine)) {
      // keep same indent
    }
    // empty line → back to zero
    else if (prevLine.trim() === '') {
      indent = '';
    }

    if (indent.length === 0) return null;

    return {
      edits: [{
        range: { start: { line: curLine, col: 0 }, end: { line: curLine, col: 0 } },
        text: indent,
      }],
      cursors: [{ position: { line: curLine, col: indent.length }, anchor: null }],
    };
  },
};
