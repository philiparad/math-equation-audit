# Mathematical OCR quality-control protocol

## Acceptance policy

**Verified** means a named person has checked that the stored LaTeX faithfully transcribes the specific original crop. It does **not** certify the truth of an equation, a textbook solution or a mathematical explanation.

Always record the page label, printed exercise number, crop coordinates (source-image pixel coordinates), original-image crop, both independent OCR results when available, the corrected LaTeX, reviewer, notes, and source-error flag.

### Visual review checklist

1. Compare the entire equation with the full-resolution original crop. Confirm neither side is cut off.
2. Check every digit, coefficient, variable, equality/inequality, negative/positive sign, exponent, radical sign and decimal point.
3. Check numerator/denominator boundaries, signs in denominators, factorization, grouping, nested fractions and parentheses.
4. For rational equations, check every zero denominator and invalid domain value. SymPy suggestions are advisory.

Only approve after all four steps. Any change to the mathematical LaTeX or engine output reopens review.

### Distinguish three error categories

- **Cropping/source visibility error:** missing part of a printed question; recrop rather than guess.
- **OCR/transcription error:** a correctly printed equation was read incorrectly; correct final LaTeX, preserve OCR output.
- **Mathematical error in the textbook:** transcription matches the scan but the statement or worked solution is wrong. Preserve the printed equation, flag source error, and document a separate proposed mathematical correction in notes.

### Recommended audit for a whole chapter

1. Inventory expected printed question numbers and pages before cropping. Enter expected ranges (e.g. `15-36`) into the page coverage field and reconcile its missing/duplicate/extra numbers. A complete number inventory still does not establish correct equation content.
2. Create one crop per entire numbered question (or one crop per equation only if the assignment explicitly needs separated equations).
3. Batch-run independent OCR on new crops. Stop and fix cropped-out symbols immediately.
4. Compare every result visually; prioritize engine disagreements, very small powers, fraction bars, decimals, exponents and text bleed-through.
5. Independently re-review all flagged source errors and a sample of normal entries. For extremely high-assurance uses, require a second human reviewer **outside this application's current single-reviewer workflow**.
6. Export verified-only and cross-check expected exercise number inventory against exported manifest.
7. Reconcile and explicitly account for missing expected numbers; do not assume gaps between textbook pages are mistakes.

### Algebraic checking limitations

- Parser accepts one-variable polynomial/rational equations with `+`, `-`, `*`, `/`, `^`, parentheses, decimal numerals, `\\frac` and implicit multiplication; supports variable names x, y, a, b, k, and pi as a constant. It does not execute arbitrary expressions.
- When an equation contains multiple symbolic variables, it may identify domain conditions but does not solve the system.
- No automatic checking of explanatory Hebrew prose, coordinate pairs, answer keys or the correctness of worked solution steps.
- A polynomial of degree >4 or unsupported syntax is marked for manual analysis.
- **Never** infer transcription correctness from symbolic solvability or from two OCR engines agreeing.

## Metadata fields

`id`, `page_id`, `page_label`, `number`, `bbox`, `image_path`, `engine_a` (Mathpix), `engine_b` (Pix2Text), `ocr_warnings`, `latex`, `analysis`, `reviewer`, `checks`, `notes`, `source_error`, `status`, `revision`, `created_at`, `updated_at`.
