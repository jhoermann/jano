import type { LanguagePlugin, PluginContext, EditResult } from './types.js';

const TAB_SIZE = 2;

const keywords = [
  'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done',
  'case', 'esac', 'in', 'function', 'return', 'exit', 'local', 'export',
  'source', 'alias', 'unalias', 'set', 'unset', 'shift', 'break',
  'continue', 'echo', 'printf', 'read', 'cd', 'pwd', 'test',
];

export const shell: LanguagePlugin = {
  name: 'Shell',
  extensions: ['.sh', '.bash', '.zsh'],
  highlight: {
    keywords,
    patterns: {
      comment: /#.*$/gm,
      string: /'[^']*'|"(?:[^"\\]|\\.)*"/g,
      number: /\b\d+\b/g,
      variable: /\$\{?\w+\}?|\$[0-9@#?!$*-]/g,
      function: /\b\w+(?=\s*\(\))/g,
      operator: /[|&;><]+|&&|\|\|/g,
    },
  },

  onNewLine(ctx: PluginContext): EditResult | null {
    const cursor = ctx.cursors[0];
    const line = ctx.lines[cursor.position.line];
    const match = line.match(/^(\s*)/);
    let indent = match ? match[1] : '';

    if (/(?:then|do|else|\{)\s*$/.test(line)) {
      indent += ' '.repeat(TAB_SIZE);
    }

    const newLine = cursor.position.line + 1;
    return {
      edits: [{
        range: { start: { line: newLine, col: 0 }, end: { line: newLine, col: 0 } },
        text: indent,
      }],
      cursors: [{ position: { line: newLine, col: indent.length }, anchor: null }],
    };
  },

  onCharTyped(ctx: PluginContext): EditResult | null {
    const cursor = ctx.cursors[0];
    const line = ctx.lines[cursor.position.line];
    const trimmed = line.trimStart();

    // auto-dedent closing keywords
    if (/^(?:fi|done|esac|\})$/.test(trimmed)) {
      const currentIndent = line.length - trimmed.length;
      const newIndent = Math.max(0, currentIndent - TAB_SIZE);
      const newLine = ' '.repeat(newIndent) + trimmed;
      return {
        edits: [{
          range: {
            start: { line: cursor.position.line, col: 0 },
            end: { line: cursor.position.line, col: line.length },
          },
          text: newLine,
        }],
        cursors: [{ position: { line: cursor.position.line, col: newLine.length }, anchor: null }],
      };
    }
    return null;
  },
};
