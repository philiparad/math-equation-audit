#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -d .venv ]; then python3 -m venv .venv; fi
. .venv/bin/activate
pip install -r requirements.txt
if [ ! -e .env ]; then cp .env.example .env; fi
exec python -m uvicorn backend.app:app --env-file .env --host 127.0.0.1 --port 8000
