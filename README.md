# MathAudit — audited mathematical equation extraction

**MathAudit is a full-stack, Hebrew/English, human-verified mathematical OCR application.** It accepts scanned page images and PDFs, supports precise question cropping, compares independent OCR engines, renders editable LaTeX, performs conservative algebraic checks, and exports verified equations with source crops and audit metadata.

**Design rule:** OCR is never evidence of correctness by itself. Every question starts as `needs_review`, including when both engines agree. A reviewer must explicitly compare the equation against the original scan, check four items, and enter their name before the application will label it `verified`. This label certifies a human-reviewed **transcription**, not that the source textbook contains correct mathematics.

## Features

- Upload PNG, JPEG, WebP, TIFF or multipage PDF (30 pages / file, 35 MB / file).
- Zoomable original scanned page, draw crop rectangles around whole numbered questions, keep original image unchanged.
- Run independent Mathpix and Pix2Text OCR, separately or together. No API keys in browser code.
- Run batch OCR over **new, blank question crops** on a selected page without overwriting existing transcription work; optionally enhance contrast without changing source images.
- Review OCR results side by side, edit LaTeX and see a MathJax preview.
- Magnify the original crop at 50–300% and zoom the full page for accurate cropping.
- Optional SymPy checks for a deliberately restricted subset of algebra: simple equations, rational expressions, excluded denominators, and low-degree polynomial solutions. No code execution of arbitrary LaTeX.
- Flag likely source textbook errors and add notes without silently changing the printed equation.
- Track expected exercise-number ranges (e.g. `15-36`), identify missing, unexpected and duplicate question numbers before export.
- Require a named reviewer and four visual checks to approve; editing a verified equation automatically reopens review.
- Export verified records by default as ZIP (JSON manifest, original page PNGs, question crops, CSV, LaTeX), or direct JSON/CSV/TEX. Optional explicitly labeled unverified export.
- SQLite data store, authenticated API for public deployments, responsive RTL / LTR bilingual UI.
- Dockerfile, Render blueprint, GitHub Actions tests and optional GitHub Pages frontend deployment.

## Run locally (Windows PowerShell)

Install **Python 3.11–3.13**. You can run `powershell -ExecutionPolicy Bypass -File .\scripts\start_windows.ps1` from the project folder, or use these commands in PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn backend.app:app --env-file .env --reload --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**. This starts with manual transcription and algebraic checking even without an OCR service. Local `.env` defaults to `APP_ENV=development`, no authentication. Do not expose that development instance to the internet.

Linux/macOS equivalent:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn backend.app:app --env-file .env --reload --host 127.0.0.1 --port 8000
```

### Enable Mathpix

Create OCR API credentials at [Mathpix Console](https://console.mathpix.com/). Put `MATHPIX_APP_ID` and `MATHPIX_APP_KEY` **only in `.env` or your hosting provider's secret environment variables**. Restart the server. Mathpix is an external service with its own quotas/pricing and data-processing policies; uploaded image crops are transmitted to Mathpix when you run that engine.

### Enable Pix2Text (optional, independent local OCR)

```bash
pip install -r requirements-ocr.txt
```

The package is optional because its AI dependencies and model downloads are large. The first call can download models and be slow. A capable CPU machine or GPU host is preferable. Deploying it on a resource-constrained free web host may fail; you can run it locally or omit it and manually verify the Mathpix output. Installing Pix2Text does not make Mathpix free or bypass human review.

## Workflow

1. **Upload** scans or a PDF; PDF pages become individual PNG source pages.
2. **Choose a page**, set expected question numbers (if known), zoom as needed, and drag around each complete question. Do not cut off the number, left-hand side, fraction bars, powers or any denominator. Type the printed question number and save the crop.
3. **Run OCR** on that crop or press **OCR all new questions** after creating several crops. The engines' text and any differences remain visible. You can instead type LaTeX manually.
4. **Inspect** the full-resolution original crop, compare all digits/signs/powers/fractions, and correct the editable LaTeX. Save.
5. **Check coverage** against the exercise-number inventory. Fix missing or duplicate crops before final export.
6. **Analyze** supported equations with SymPy to get *advisory* solutions and domain restrictions. Nontrivial systems and uncommon notation must be checked manually.
7. **Approve** only after checking all four visual-verification items and entering a reviewer name. A possible error in the original must be documented in Notes.
8. **Export** as ZIP/CSV/JSON/LaTeX; by default unverified questions are excluded.

Question numbers remain exactly as entered (e.g. `15`, `90a`, `עמוד 165 – 4`). Gaps in textbook numbering are not interpreted as missing questions. The app **does not claim automatic exhaustive equation detection from entire pages**; it intentionally uses explicit crops for source fidelity.

## Push the project to a new GitHub repository

Create an empty private repository on GitHub (without a generated README), then from the extracted project folder:

```bash
git init
git add .
git commit -m "Initial MathAudit project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/math-equation-audit.git
git push -u origin main
```

The `data/`, `.env` and cache directories are excluded by `.gitignore`. Commit only source, test files, and the original **synthetic** demo image. Never commit privately scanned textbook pages or OCR service keys.

## GitHub deployment options

### Option A — one GitHub repository → Render web app (recommended)

GitHub **hosts the code**; Render **runs Python** and serves both the UI and API.

1. Create a new private GitHub repo, e.g. `math-equation-audit`; upload/push this project **without** `.env` or `data/`.
2. On [Render](https://render.com), create a new **Blueprint** or Python web service linked to the repo. `render.yaml` provides the build and start commands.
3. Configure environment variables on Render: `APP_ENV=production`, a long random `APP_ACCESS_TOKEN`, and optional `MATHPIX_APP_ID`/`MATHPIX_APP_KEY`.
4. **Attach persistent storage** and set `DATA_DIR` to its mounted directory (blueprint example `/var/data/math-equation-audit`). **This is necessary.** A service using ephemeral filesystem storage will lose database and uploaded images on restart/redeploy. Confirm pricing and disk availability for your Render plan.
5. Open the Render URL over HTTPS. In Settings, enter the server access token. Do not embed it in any committed file.
6. For a public server, limit access to trusted reviewers, use a strong token and HTTPS, and back up the persistent data directory regularly.

For a service deployed without attached storage, the app may start but **data durability is not guaranteed**. Do not use it for a real review workload until storage is configured.

### Option B — GitHub Pages frontend + Render API

GitHub Pages only hosts **HTML/CSS/JavaScript**; it cannot run FastAPI, SQLite or SymPy. The project includes `.github/workflows/pages.yml` for an optional static Pages deployment. Enable Pages → Source: **GitHub Actions**. The frontend can be publicly visible, but API access is gated by the server token.

1. Deploy the backend as described in Option A.
2. Set `CORS_ORIGINS=https://YOUR_USERNAME.github.io` in the backend environment and redeploy.
3. GitHub Actions publishes the `frontend/` directory. Open your Pages URL.
4. Click **Settings** and enter the Render API base URL and your access token. The API base URL is saved locally in browser storage; the token is kept in `sessionStorage` only.
5. Optionally set a **public backend address** in `frontend/config.js` for your own deployment. **Never set API keys or access tokens in this file.**

**Recommended:** Option A is easier to operate and avoids cross-origin configuration.

### Option C — Docker on a VPS / local server

```bash
docker build -t mathaudit .
docker run --rm -p 8000:8000 \
  -e APP_ENV=production \
  -e APP_ACCESS_TOKEN='REPLACE_WITH_RANDOM_LONG_TOKEN' \
  -e DATA_DIR=/var/data/math-equation-audit \
  -v mathaudit-data:/var/data \
  mathaudit
```

Use HTTPS via a reverse proxy for internet access. To pass Mathpix credentials, use deployment secrets, not command history.

## Tests

```bash
pip install pytest
pytest -q
```

The tests cover the API lifecycle, OCR disagreements (mocked), PDF import, manual verification, re-review upon edits, protected routes, ZIP exports, and symbolic parsing. **Live Mathpix and Pix2Text recognition require credentials/models and are not exercised by CI.**

## Directory structure

```text
math-equation-audit/
├── backend/
│   ├── app.py              # FastAPI API, images, verification, exports
│   ├── storage.py          # SQLite and filesystem storage
│   ├── ocr.py              # Mathpix + optional Pix2Text
│   └── mathcheck.py        # Conservative symbolic expression parser
├── frontend/
│   ├── index.html          # RTL/LTR responsive review application
│   ├── app.css             # Responsive styling
│   ├── app.js              # Crop / review / export interactive workflow
│   ├── config.js           # Public backend address ONLY
│   └── favicon.svg
├── tests/                  # Automated Python tests
├── docs/                   # Quality, security, and API guides
├── .github/workflows/      # CI and optional Pages deployment
├── Dockerfile
├── render.yaml
├── requirements.txt
└── requirements-ocr.txt
```

## Accuracy guarantees and limitations

- **Cannot guarantee zero OCR errors.** Both independent engines can make the same mistake, particularly with noisy scans, exponent digits, decimal points, negatives and denominator boundaries.
- **No auto-verification.** Only explicit image-to-LaTeX review is treated as verified. Reviewer self-attestation is an audit workflow, not an independent objective proof.
- Algebraic equivalence of two transcripts does **not** establish that either matches the image.
- The symbolic engine supports only a controlled subset of algebra; general radicals, trigonometric functions, inequalities, simultaneous systems, multiline environments and textual explanations need manual checking. Unsupported forms are flagged, never silently passed.
- Crop suggestions / complete automatic equation segmentation are intentionally **not implemented**; manually confirm that every numbered exercise was cropped. For large books, reconcile against a manually prepared numbering checklist.
- The original images, OCR predictions and corrected final LaTeX are separate fields; suspect textbook errors should be marked and explained, not silently rewritten.
- The MathJax viewer uses a CDN; the app needs internet access for formatted preview unless you self-host MathJax. Raw LaTeX remains editable if the CDN is unavailable.
- Uploaded scans may be copyrighted; do **not** commit or publicly publish those scans without permission. By default all uploads are stored under ignored `data/`.
- The current security model is **single-user shared-token access**, not multi-account RBAC. For classrooms or untrusted public access, add individual accounts, rate limiting, auditing of every mutation and quotas.

See [docs/QUALITY_PROTOCOL.md](docs/QUALITY_PROTOCOL.md), [docs/SECURITY.md](docs/SECURITY.md), and [docs/API.md](docs/API.md).

## Built-in demonstration image

Upload [`examples/demo_practice_page.png`](examples/demo_practice_page.png) to test cropping and rendering without publishing or relying on copyrighted textbook scans. It contains six original typeset rational equations in two columns. This is a source image **only**, not a pre-verified OCR result.
