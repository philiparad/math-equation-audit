"""Independent optional OCR providers. No fabricated OCR responses."""
import base64
import io
import os
from functools import lru_cache

import httpx
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


class OCRUnavailable(Exception):
    pass


def configured():
    try:
        import importlib.util
        pix = importlib.util.find_spec('pix2text') is not None
    except Exception:
        pix = False
    return {
        'mathpix': bool(os.getenv('MATHPIX_APP_ID') and os.getenv('MATHPIX_APP_KEY')),
        'pix2text': pix,
    }


def process_crop(path, enhance=False):
    with Image.open(path) as im:
        im = im.convert('RGB')
        if enhance:
            if im.width < 1200:
                factor = min(3, 1200 / im.width)
                im = im.resize((round(im.width * factor), round(im.height * factor)), Image.Resampling.LANCZOS)
            im = ImageOps.autocontrast(im, cutoff=0.35)
            im = ImageEnhance.Contrast(im).enhance(1.18)
            im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=100, threshold=2))
        buf = io.BytesIO()
        im.save(buf, format='PNG', optimize=True)
        return buf.getvalue()


async def mathpix(image_bytes):
    app_id = os.getenv('MATHPIX_APP_ID')
    app_key = os.getenv('MATHPIX_APP_KEY')
    if not app_id or not app_key:
        raise OCRUnavailable('Mathpix credentials are not configured')
    src = 'data:image/png;base64,' + base64.b64encode(image_bytes).decode('ascii')
    payload = {
        'src': src,
        'formats': ['text'],
        'ocr': ['math', 'text'],
        'math_inline_delimiters': ['$', '$'],
        'rm_spaces': False,
    }
    try:
        async with httpx.AsyncClient(timeout=55) as client:
            response = await client.post('https://api.mathpix.com/v3/text', json=payload,
                headers={'app_id': app_id, 'app_key': app_key, 'Content-Type': 'application/json'})
        response.raise_for_status()
        data = response.json()
        if 'error' in data:
            raise OCRUnavailable('Mathpix: ' + str(data['error'])[:240])
        raw = (data.get('text') or data.get('latex_styled') or '').strip()
        if not raw:
            raise OCRUnavailable('Mathpix returned no recognized content')
        return {'latex': raw, 'confidence': data.get('confidence'), 'provider': 'mathpix'}
    except (httpx.HTTPError, ValueError) as exc:
        raise OCRUnavailable('Mathpix request failed: ' + str(exc)[:180]) from exc


@lru_cache(maxsize=1)
def _pix2text_engine():
    from pix2text import Pix2Text
    return Pix2Text.from_config()


def pix2text(image_bytes):
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        result = _pix2text_engine().recognize(im, file_type='text_formula')
        if isinstance(result, str):
            text = result.strip()
        elif isinstance(result, list):
            text = ' '.join(str(r.get('text', '')) for r in result if isinstance(r, dict)).strip()
        else:
            text = str(result).strip()
        if not text:
            raise OCRUnavailable('Pix2Text returned no recognized content')
        return {'latex': text, 'confidence': None, 'provider': 'pix2text'}
    except ImportError as exc:
        raise OCRUnavailable('Pix2Text is not installed. pip install -r requirements-ocr.txt') from exc
    except OCRUnavailable:
        raise
    except Exception as exc:
        raise OCRUnavailable('Pix2Text error: ' + str(exc)[:180]) from exc


def normalize_for_comparison(value):
    # Intentionally conservative: never treat algebraically equivalent layouts as identical.
    value = value.strip()
    for cmd in ('\\left', '\\right', '\\displaystyle', '\\,', '\\;', '\\!'):
        value = value.replace(cmd, '')
    value = value.replace('\\dfrac', '\\frac').replace('\\tfrac', '\\frac')
    value = value.replace('−', '-').replace('\\(', '').replace('\\)', '')
    return ''.join(value.split()).strip('$')
