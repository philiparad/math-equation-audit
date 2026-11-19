# API reference (v1)

All `/api/*` data endpoints, except `/api/health`, require `X-Access-Token` when `APP_ACCESS_TOKEN` is set in the server. `/docs` is FastAPI's automatically generated OpenAPI page; requests made there still require the access header.

| Method | Route | Action |
| --- | --- | --- |
| GET | `/api/health` | Unauthenticated liveness check |
| GET | `/api/status` | Counts, provider readiness, auth configuration |
| POST | `/api/pages` | Multipart `files` (one or more PNG/JPG/WebP/TIFF/PDF) and optional `label` |
| GET | `/api/pages` | Page listing |
| PATCH | `/api/pages/{id}/inventory` | `expected_numbers`: comma-separated numbers and/or ranges such as `15-36, 42` |
| GET | `/api/pages/{id}/coverage` | Missing, duplicate and unexpected numbered questions |
| GET | `/api/pages/{id}/image` | Full original page PNG |
| DELETE | `/api/pages/{id}` | Delete page and all questions |
| GET | `/api/questions` | All questions, optional `page_id`, `status` filters |
| POST | `/api/questions` | Create original-image crop: `page_id`, `number`, `x0`,`y0`,`x1`,`y1` |
| GET | `/api/questions/{id}/image` | Original PNG crop |
| PATCH | `/api/questions/{id}` | Edit `latex`, `number`, `notes`, `source_error`, OCR fields |
| POST | `/api/questions/{id}/ocr` | `engines: [mathpix, pix2text]`, `enhance: true` |
| POST | `/api/questions/{id}/analyze` | Advisory symbolic check of saved LaTeX |
| POST | `/api/questions/{id}/verify` | `reviewer` and four true `checks` keys: `source`, `symbols`, `fractions`, `domain` |
| POST | `/api/questions/{id}/unverify` | Reopen manual review |
| DELETE | `/api/questions/{id}` | Delete one question and crop |
| GET | `/api/export` | `format=zip|json|csv|tex`, `verified_only=true|false` |

**Status meaning:** `needs_review` (default including OCR-complete) or `verified` (explicit human checklist). No confidence score creates a `verified` status. SymPy results are advisory.

### Example (development server)

```bash
curl -X PATCH http://127.0.0.1:8000/api/questions/YOUR_ID \
  -H 'Content-Type: application/json' \
  -d '{"latex":"\\\\frac{9}{x^2}+\\\\frac{3}{x}=2"}'
```

In production, add `-H 'X-Access-Token: YOUR_SECRET'` and use HTTPS.
