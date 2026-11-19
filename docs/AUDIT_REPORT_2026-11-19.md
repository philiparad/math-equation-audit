# MathAudit serverless implementation audit — 2026-11-19

## Audited scope

- Source: `philiparad/math-equation-audit`, `browser-only` branch
- Public deployment: `philiparad/philiparad.github.io/math-equation-audit/`
- Frontend JavaScript, HTML, CSS, browser storage, exports, math-checking worker,
  model references, test scripts and GitHub Actions configuration.

## Confirmed errors corrected

| ID | Severity | Finding | Fix |
|---|---|---|---|
| OCR-001 | Critical | TexTeller-ONNX has no `decoder_model_merged_quantized.onnx`, which Transformers.js v4 requested | Use `onnx-community/TexTeller3-ONNX`, whose quantized encoder and merged decoder were checked in model file listings |
| OCR-002 | High | Generic auto model precision could select unsupported weights and increase download size | Pin `dtype: 'q8'`; retain WASM fallback from optional WebGPU; report missing-file errors with actionable message |
| OCR-003 | High | Input frequently contained Hebrew prose, question numbers, several equations | Add **independent math-only subcrop** with full-resolution original preserved; clear old OCR predictions when it changes |
| OCR-004 | Medium | No output plausibility warning or preprocessing | Add white-margin/preserve-aspect image preparation and non-blocking warnings for prose-like outputs |
| UI-001 | High | OCR candidates were shown only as raw LaTeX | Render **each** OCR result with MathJax, retaining raw source and an explicit approval requirement |
| UI-002 | Medium | Final MathJax preview often stayed unrendered during CDN initialization | Await MathJax startup, render via `tex2svgPromise`, avoid stale concurrent previews, report loading failure |
| UI-003 | Medium | Existing author CSS may override HTML `[hidden]` attributes | Add `[hidden]{display:none!important}` |
| REVIEW-001 | High | Running OCR or creating a crop could discard unsaved LaTeX | Prevent both operations until transcript is saved |
| REVIEW-003 | Medium | Switching interface language could discard unsaved edits | Prompt before switching and clear dirty state only with consent |
| REVIEW-002 | High | Editing a verified transcript or selecting an OCR hypothesis could leave old checked UI boxes visible | Dispatch the same edit event and clear visual-review checkboxes, requiring a fresh review |
| DATA-001 | High | Full backups omitted newly introduced OCR-only crops | Export/restore OCR crop PNGs separately; preserve original crop and don't serialize blobs in JSON manifest |
| QA-001 | Medium | No way to quantify OCR correctness against known-good transcriptions | Add `node tools/ocr-accuracy.mjs <verified-export.json>`; exact normalized transcriptions only, never algebraic equivalence |
| DATA-002 | Medium | Exporting backup records solely by status could include forged or stale verification metadata | Require a valid reviewer and all four source checks before verified-only export |

## Constraints and unresolved validation

1. **Actual recognition quality is unproven.** Model filenames and public model artifacts
   were checked, but the models were not downloaded/inferred end-to-end in this
   sandbox (network is restricted). Do not claim accuracy improvements without a
   ground-truth evaluation on scanned question crops.
2. Formula recognizers are best used on **one tightly cropped equation at a time**;
   multi-line systems, Hebrew prose and badly scanned images may remain inaccurate.
3. MathJax, Pyodide/SymPy, PDF.js, JSZip and Transformers.js are loaded from public CDNs.
   The app requires internet for initial download and is not fully offline.
4. SymPy analysis is limited to a restricted subset of equations and cannot certify
   that OCR matched the source image.
5. IndexedDB data is browser-local and may be cleared. Export backups regularly.
6. Mathpix is optional and needs a short-lived `app_token`; do not store paid API keys
   in source JavaScript or public GitHub.
7. Actual Playwright/Chromium navigation was attempted, but the execution environment
   blocked local browser navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`.

## Practical acceptance protocol

- Test **both** local models on ten manually cropped, human-transcribed equations.
- Check one-line fractions, powers, negative signs, polynomial equations, roots,
  trigonometric equations, and a few intentionally challenging scans.
- Record OCR predictions without changing them; save manually verified LaTeX.
- Export verified JSON; run the accuracy report for per-model exact match rates.
- Compare each MathJax result visually to its source image.
- Verify that changing OCR crops and editing LaTeX invalidates prior approval.
- Export and restore a full backup, checking both the original and math-only crops.
