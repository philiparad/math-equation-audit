# Security and privacy

## Production requirements

- Set `APP_ENV=production`. Startup refuses to proceed if `APP_ACCESS_TOKEN` is blank.
- Use a cryptographically random token (at least 32 bytes of entropy) and always use HTTPS. Do not put tokens into GitHub commits, frontend `config.js`, URLs, documentation screenshots or logs.
- Store scans on private persistent storage (`DATA_DIR`) and back them up.
- CORS is disabled unless `CORS_ORIGINS` explicitly lists specific trusted frontend origins; **never** use `*` when authentication is enabled.
- GitHub Pages exposes only the UI; source crops are retrieved via token-protected backend requests, not a public image directory.
- Uploaded PDF files and images are bounded by size/page/pixel limits, but document processing is resource-intensive. Use host-level request rate limits, CPU/memory quotas and upload limits when opening it to the internet.

## Trust and external services

Mathpix receives selected equation image crops whenever that provider is used. Consult its data/privacy policy, verify consent and avoid sending confidential or student-identifiable information. Pix2Text runs locally when installed, but may initially download pretrained models from the internet. Do not assume API calls are free or unlimited.

## Authentication model

This project has **single-reviewer or trusted-team shared-token** security, not user accounts. The server requires `X-Access-Token` for all data API routes. The token stays in browser `sessionStorage` (tab-scoped) and a Python process environment variable. Accessing `/api/health` and downloading public frontend assets does not require it. The SQLite database retains reviewer-entered names but not an authoritative logged-in identity.

Before multi-user use, implement individual accounts, distinct reviewer identities, complete immutable action history, rate limits, write conflict controls, file quotas, and stronger browser content security policy.

## Copyright

Uploads are ignored by Git in `data/` and never bundled with project source. When sharing outputs or making a repository public, check that you have the right to reproduce textbook scans and derived crops. For the four user-supplied textbook images, upload them to a private running instance rather than committing them to GitHub.
