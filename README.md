# MathAudit — 100% browser application (GitHub Pages)

This branch is the **serverless** replacement for the original FastAPI + SQLite application. The original server-based implementation remains on the `main` branch; **no web server, Render service, API proxy, database or paid hosting is required for core operations**.

## Features implemented

- Read images (PNG, JPEG, WebP) and multi-page PDFs (PDF.js) in the browser, max 35 MB and 30 pages per PDF.
- Crop questions at full source image resolution using mouse or touch; original imported scan is never overwritten.
- Save pages, cropped questions, OCR outputs, checks, notes and reviewer status in **IndexedDB**.
- Run **Texify2** ONNX on-device using Transformers.js as the default OCR engine; **TexTeller** ONNX is an optional independent local recognition engine. Requires downloading large model weights over HTTPS on first use. Neither provider receives your input images through an inference API; weights are downloaded and processing executes locally. WebGPU opt-in, with CPU/WASM fallback. First downloads and inference can be slow and memory intensive; choose a recent Chrome/Edge machine.
- Optionally submit a cropped question to **Mathpix** using a **short-lived `app_token`**, pasted into Settings. Do NOT paste or commit `app_key`/`app_id` secrets. Short-lived tokens must be minted by a trusted issuer. Without one, the application remains fully usable with local OCR.
- Compare OCR results without conflating mathematical equivalence with exact transcription.
- Edit final LaTeX and render with MathJax; evaluate a deliberately narrow algebra subset using **SymPy running inside Pyodide in a Web Worker** (downloads from jsDelivr). No arbitrary `eval` / user-supplied Python execution.
- Human visual verification requires 4 affirmative checks, reviewer name and nonempty LaTeX; editing final LaTeX, or rerunning OCR, revokes the verified status.
- Expected exercise inventory identifies missing/duplicate/unexpected labels.
- Export verified-only by default as CSV/JSON/TEX or ZIP including original scans and crops; export a full backup ZIP of **all** work (including pending) and restore it atomically after user confirmation.
- Hebrew / English controls, responsive layouts, high-resolution original viewer, quota indication, request for persistent browser storage.

## Deployment

The branch `browser-only` contains `.github/workflows/pages.yml`. On pushes to that branch it tests the browser files and deploys `frontend/` to GitHub Pages.

1. Open **Settings → Pages** on the GitHub repository and set **Source: GitHub Actions**.
2. Check **Actions** for the `Test and deploy serverless MathAudit to GitHub Pages` run and resolve any repository-side permissions or Pages activation requirement.
3. Published address, once successful: `https://philiparad.github.io/math-equation-audit/`.

This site is a static, public interface; user scans are not in the Git repository. Do not commit scanned copyrighted textbook pages.

### Run locally without any application backend

Browsers require HTTP(S) for ES Modules, workers, and IndexedDB. In the repo root:

```bash
python -m http.server 8000 --directory frontend
# Open http://localhost:8000
```

This local command only serves static files for development. It is **not** an application server, and is unnecessary with GitHub Pages. For tests, `npm test` and `npm run check` require Node.js 22+, but deployed runtime is plain HTML/CSS/JavaScript (no Node.js server).

### External assets (CDN)

- `@huggingface/transformers@4.3.2` ESM loaded on first local OCR request, and ONNX model weights downloaded from Hugging Face.
- `pdfjs-dist@6.5.438` ESM loaded for PDF imports.
- `pyodide/v0.28.3/full/` and SymPy package loaded for algebraic checks.
- `mathjax@3.2.2` loaded for equation display.
- `jszip@3.10.1` dynamically loaded for ZIP export and backup restoration.

These libraries and model weights need an internet connection **for initial downloads**. After downloads, cache behavior is controlled by the browser; offline operation is not guaranteed. Browser policy/CORS/CDN outages can prevent first loads. No OCR recognition is claimed until the models actually load and return output. Using hosted CDN files does not mean hosting an application backend.

## Privacy and security

- Input scans stay in IndexedDB and are not transmitted during local OCR, image/PDF processing, verification or export.
- When you **explicitly** click Mathpix, only that cropped image goes to Mathpix. An account may be charged; review Mathpix's pricing and data policy.
- Never put a long-lived Mathpix `app_key` in public code, localStorage, GitHub secrets exposed to browser JS, or the Settings token field. The Settings field accepts a short-lived `app_token` only; it is held in memory and expires automatically server-side.
- No user authentication: all reviews on the device share one local data store. Browser profile clearing/incognito/quota eviction can lose the entire local dataset. Back up regularly. For multiple teachers or synchronized work, use a different architecture.
- Browser storage is per origin, so the GitHub Pages site and localhost have **different datasets**.
- `verified` means reviewer-attested matching to the scan, **not proof that the original textbook is mathematically correct**.

## Limitations and quality gates

- Entire-page automatic equation segmentation and OCR accuracy benchmarking are **not provided**; question crops and source-image comparison are manual by design.
- Large models need memory and may fail on lower-end laptops, phones or browsers. Texify2 and TexTeller have not been benchmarked against the supplied four textbook scans in an online browser environment. OCR accuracy is unverified until hands-on testing.
- SymPy covers single-variable algebra only (simple equations, factors, low-degree polynomials and excluded denominator values); systems, trig, inequalities, some roots and narrative math need manual review.
- This is a standalone browser application, not a synchronized cloud database.

## Verify locally

```bash
npm run check
npm test
```

A browser smoke test can be executed via Chromium with a static HTTP server. For the actual ONNX models and Mathpix, use real browser network access and an actual short-lived token respectively, then compare their output to each scanned crop.

## OCR correction and equation display update (2026-11-19)

- `TexTeller-ONNX` was replaced by `TexTeller3-ONNX` because the previous model lacked
  the quantized *merged* decoder requested by Transformers.js v4. Both local models
  now use an explicit `q8` ONNX variant and preserve WASM fallback.
- For higher accuracy, select **math-only OCR region** from the original question
  (one equation at a time). This extra image is saved separately; original full
  question and original page remain unchanged.
- Each OCR candidate and the final edited LaTeX have a rendered MathJax preview,
  in addition to the raw LaTeX text. MathJax loading failure is visible to reviewers.
- Editing an approved transcript requires re-review. OCR changes cannot silently
  discard unsaved LaTeX. A full ZIP backup now also preserves math-only subcrops.
- Measure actual recognition accuracy using `node tools/ocr-accuracy.mjs VERIFIED_EXPORT.json`
  after manually verifying a representative test set. **Live model inference has not
  been verified here**, and no OCR model can guarantee correct transcription.

See `docs/AUDIT_REPORT_2026-11-19.md` for identified issues, fixes, and remaining risks.
