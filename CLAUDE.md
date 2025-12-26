# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CSV to Markdown converter for LLM/RAG/Chatbot systems. Converts CSV rows into structured key-value Markdown format with configurable title columns.

## Development

No build process required. Open `csv-to-markdown-key-value.html` directly in a browser.

**Live demo:** https://fazcodefr.github.io/csv-to-markdown-key-value-llm/

## Architecture

Single-page vanilla JavaScript application:

- **csv-to-markdown-key-value.html** - Entry point with UI markup, loads TailwindCSS and PapaParse from CDN
- **app.js** - All application logic: file handling, CSV parsing, Markdown conversion, modal management
- **styles.css** - Custom animations and component styles (Inter font, gradients, drag-drop effects)

### Key Data Structures

```javascript
fileSettings[] = {
  columns: [{ name, included, isTitle }],  // Column config per file
  originalColumns: []                       // Original CSV headers
}
```

### Core Functions

- `readFileAsUtf8()` / `detectEncoding()` - Handle UTF-8, UTF-8 BOM, UTF-16, Windows-1252 encodings
- `parseFileColumns()` - Extract CSV headers using PapaParse with auto-delimiter detection
- `convertToMarkdown()` - Transform rows to `# Title\n**Key:** Value` format
- `openColumnModal()` / `saveColumnConfig()` - Column reordering and selection UI

### Output Format

```markdown
# Column1Value - Column2Value
**Column3 :** Value
**Column4 :** Value

---
```

## External Dependencies (CDN)

- TailwindCSS - Utility-first styling
- PapaParse - CSV parsing with delimiter auto-detection (`;`, `,`, `\t`, `|`)
