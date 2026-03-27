# jano - Terminal Editor

## Tech Stack

- TypeScript, Node.js
- pnpm workspace (monorepo)
- Vite+ (vp) for build, lint, format
- Custom terminal UI lib (@jano-editor/ui)
- Plugin system with external plugins (~/.local/share/jano/plugins/)

## Packages

- `packages/ui` - Terminal drawing lib (screen, draw, color, dialog)
- `packages/editor` - The editor itself
- `packages/plugin-types` - Shared plugin interface (@jano-editor/plugin-types)
- `packages/plugin-yaml` - YAML plugin (highlight + format)

## Commands

- `pnpm tsx packages/editor/src/index.ts <file>` - Run in dev
- `vp build && node dist/index.js <file>` - Run production build
- `vp check` - Lint + format + typecheck
- `pnpm --filter @jano-editor/plugin-yaml install-plugin` - Build + install YAML plugin

## TODO v0.1

### Critical (must have)

- [x] Search (Ctrl+F) with live results + list component
- [x] Search & Replace (Ctrl+F, Tab to replace field)
- [x] Go to line (Ctrl+G) with start/end/line number
- [x] New file (jano without argument, Save As dialog, overwrite warning, error handling)

### Important

- [ ] Own cursor rendering (all cursors blink)
- [ ] Mouse support (click = set cursor)
- [ ] Soft-wrapping long lines
- [ ] Read-only mode

### Nice to have

- [ ] Multiple files / buffers
- [ ] Split view
- [ ] Regex search
- [ ] Macros
- [ ] Plugin manager dialog (enable/disable with checkboxes)
- [ ] `jano plugin install <name>` (needs registry server)
- [ ] Plugin update check (needs endpoint)

### Done

- [x] File open, edit, save (Ctrl+S)
- [x] Cursor navigation (arrows, Home/End, Page Up/Down)
- [x] Syntax highlighting (plugin-based)
- [x] Auto-formatting (F3, plugin-based)
- [x] Auto-indent on Enter (plugin-based)
- [x] Selection (Shift+Arrow, Shift+Ctrl+Arrow for words)
- [x] Cut/Copy/Paste (Ctrl+X/C/V)
- [x] Multi-cursor (Ctrl+Shift+Up/Down)
- [x] Multi-cursor aware cut/copy/paste
- [x] Undo/Redo with cursor state restore (Ctrl+Z/Y)
- [x] History browser (F2)
- [x] Word navigation (Ctrl+Left/Right)
- [x] Word delete (Ctrl+Backspace/Delete)
- [x] Move lines (Alt+Up/Down)
- [x] Exit dialog with unsaved changes
- [x] Plugin system (external, XDG paths, API versioning)
- [x] Scrollbar (vertical + horizontal)
- [x] Terminal resize handling
- [x] 60k+ lines performance
- [x] Vite+ build (21ms, 59KB)

## Code Conventions

- Comments in English
- Communication in German
- All imports use .ts extensions
- No external UI libs - custom terminal rendering
- Plugins must not know about editor internals
- Editor must not know about formatting rules
