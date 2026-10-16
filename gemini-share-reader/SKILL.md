---
name: gemini-share-reader
description: Fetches, renders, extracts, and analyzes shared Google Gemini chat sessions from public links (share.gemini.google or gemini.google.com/share). Solves client-side SPA rendering via headless Chrome/Edge DevTools Protocol (CDP) and exports parsed conversations or Q&A banks into Markdown, JSON, or Google Docs (.docx).
---

# Gemini Share Reader & Exporter

Extracts, reads, and exports the full conversation content from public **Google Gemini shared links** (`https://share.gemini.google/<id>` or `https://gemini.google.com/share/<id>`).

---

## Overview

Gemini share links are **Single Page Applications (SPAs)** that load conversation data dynamically via client-side JavaScript and RPCs. Standard HTTP fetch tools (such as `curl`, `urllib`, or static scrapers) only retrieve the empty application HTML shell and OpenGraph metadata, completely missing the actual conversation turns.

This skill provides an automated, headless browser automation workflow using the **Chrome DevTools Protocol (CDP)** over WebSockets with Google Chrome or Microsoft Edge to:
1. Resolve cross-origin redirects (e.g., from `share.gemini.google/<short_id>` to `gemini.google.com/share/<full_id>`).
2. Headlessly render the complete DOM and wait for dynamic conversation turns to fully load.
3. Extract clean conversation text, HTML, and structured JSON metadata.
4. Parse questions, options, analyses, and answers (e.g., test prep, study guides, technical discussions).
5. Export the extracted content into a styled `.docx` file formatted for **Google Docs** and **Microsoft Word**.

---

## Quick Start

### 1. Extract a Shared Gemini Conversation
To fetch and extract a conversation to text, HTML, and JSON:
```bash
node ~/.gemini/config/skills/gemini-share-reader/scripts/fetch_gemini_share.js "https://share.gemini.google/<ID>" --output "extracted_chat.txt"
```

### 2. Export Extracted Content to Google Docs / Word
To convert extracted content or study materials into a styled `.docx` file:
```bash
python ~/.gemini/config/skills/gemini-share-reader/scripts/export_to_docx.py --input "extracted_chat.txt" --output "study_guide.docx" --title "TOEFL ITP Structure & Written Expression"
```

---

## Utility Scripts

### `fetch_gemini_share.js`
Node.js automation script using built-in WebSockets and Chrome DevTools Protocol (CDP). Requires **Node.js 22+** and either **Google Chrome** or **Microsoft Edge** installed.

* **Arguments:**
  * `<url>` *(required)*: The Gemini share URL (`https://share.gemini.google/...` or `https://gemini.google.com/share/...`).
  * `--output, -o` *(optional)*: Destination file path (defaults to `./gemini_chat_extracted.txt`).
  * `--format, -f` *(optional)*: Output format (`text`, `json`, `html`, or `all` - defaults to `all`).

* **Features:**
  * Auto-resolves HTTP 301/302 redirects before browser launch to prevent cross-origin target dissociation.
  * Discovers free local TCP ports for CDP.
  * Creates an isolated temporary browser user-data-dir and cleans up automatically upon exit.
  * Dynamically waits for chat message nodes to finish rendering before snapshotting.

### `export_to_docx.py`
Python utility using `python-docx` to format extracted questions, notes, and analyses into a publication-ready document.

* **Arguments:**
  * `--input, -i` *(required)*: Path to the input markdown or text file.
  * `--output, -o` *(required)*: Path to the target `.docx` file.
  * `--title, -t` *(optional)*: Custom title rendered as a primary document header.

---

## Workflow Guide

When asked to load, read, or process a Gemini shared chat:

1. **URL Verification:**
   Verify if the URL is in short form (`share.gemini.google/<id>`) or full form (`gemini.google.com/share/<id>`).

2. **Run Headless Extraction:**
   Execute `fetch_gemini_share.js` pointing to a workspace or scratch destination:
   ```bash
   node ~/.gemini/config/skills/gemini-share-reader/scripts/fetch_gemini_share.js "<url>" --output "./chat_dump.txt"
   ```

3. **Read and Parse Extracted Content:**
   Use standard file reading tools to inspect the extracted `.txt` or `.json` file. Break down the conversation into:
   * System / Prompt overview
   * Question numbers
   * Options (A, B, C, D)
   * Grammatical rules / rationale
   * Correct answers and corrections

4. **Compile & Export:**
   * If the user requests a Google Docs or Word version, run `export_to_docx.py` or use `python-docx` to build a `.docx` file with headings, bullet lists, and colored callout boxes.
   * Provide the local clickable link to the user and outline instructions for opening in [Google Drive](https://drive.google.com) via "Open with Google Docs".

---

## Common Mistakes & Troubleshooting

* **Static HTTP Fetch Failures:**
  * *Mistake:* Using `curl` or `read_url_content` directly on `share.gemini.google/...`.
  * *Issue:* Returns 0 conversation turns because the content is rendered entirely client-side via JavaScript.
  * *Fix:* Always use `fetch_gemini_share.js` to render via headless Chrome/Edge.

* **Cross-Origin Target Loss in CDP:**
  * *Mistake:* Passing `share.gemini.google` directly into Chrome's remote debugging `/json/new` endpoint without pre-resolving.
  * *Issue:* Chromium triggers a process swap on cross-origin redirects from `share.gemini.google` to `gemini.google.com`, causing early CDP disconnection.
  * *Fix:* The script pre-resolves HTTP 301/302 locations before attaching CDP.

* **Chrome Process Lock:**
  * *Mistake:* Launching headless Chrome without `--user-data-dir`.
  * *Issue:* Chrome attempts to attach to existing running user instances and hangs indefinitely.
  * *Fix:* Always supply a fresh temporary user data directory (`--user-data-dir`).
