"""Math Equation Audit API + static interface.

Single-reviewer by design. In production, APP_ACCESS_TOKEN is mandatory.
Uploaded pages and SQLite DB persist only if DATA_DIR points at persistent storage.
"""
import csv
import io
import json
import os
import re
import secrets
import uuid
import zipfile
from pathlib import Path
from contextlib import asynccontextmanager

import fitz
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from . import ocr
from .mathcheck import check_equation
from .storage import (
    CROPS_DIR, IMAGES_DIR, ROOT, connection, get_page, get_question,
    init_storage, list_questions, utcnow,
)

MAX_FILE_BYTES = 35 * 1024 * 1024
MAX_IMAGE_PIXELS = 38_000_000
MAX_PDF_PAGES = 30
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

@asynccontextmanager
async def lifespan(application):
    if os.getenv('APP_ENV', 'development').lower() == 'production' and not os.getenv('APP_ACCESS_TOKEN'):
        raise RuntimeError('APP_ACCESS_TOKEN must be set in production')
    init_storage()
    yield


app = FastAPI(title='Math Equation Audit', version='1.0.0',
              description='Image-grounded mathematical OCR and human verification', lifespan=lifespan)
origins = [v.strip() for v in os.getenv('CORS_ORIGINS', '').split(',') if v.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET','POST','PATCH','DELETE'],
                       allow_headers=['Content-Type','X-Access-Token'])

FRONTEND = ROOT / 'frontend'
app.mount('/assets', StaticFiles(directory=str(FRONTEND)), name='assets')



def require_token(x_access_token: str | None = Header(default=None)):
    expected = os.getenv('APP_ACCESS_TOKEN', '')
    if expected and not secrets.compare_digest(x_access_token or '', expected):
        raise HTTPException(401, 'Access token required or invalid')
    if os.getenv('APP_ENV','development').lower() == 'production' and not expected:
        raise HTTPException(503, 'Server authentication is not configured')


@app.get('/')
def home():
    return FileResponse(FRONTEND / 'index.html')


@app.get('/api/health')
def health():
    return {'ok': True, 'version': app.version}


@app.get('/api/status', dependencies=[Depends(require_token)])
def status():
    with connection() as con:
        total_pages = con.execute('SELECT COUNT(*) FROM pages').fetchone()[0]
        stats = {r[0]: r[1] for r in con.execute('SELECT status, COUNT(*) FROM questions GROUP BY status')}
    return {'pages': total_pages, 'questions': sum(stats.values()), 'by_status': stats,
            'providers': ocr.configured(),
            'secured': bool(os.getenv('APP_ACCESS_TOKEN')),
            'production': os.getenv('APP_ENV', 'development') == 'production'}


@app.get('/api/pages', dependencies=[Depends(require_token)])
def pages_list():
    with connection() as con:
        return [dict(row) for row in con.execute('SELECT * FROM pages ORDER BY created_at DESC, id DESC')]


def _save_image(img, original_filename, label):
    if img.width < 20 or img.height < 20 or img.width * img.height > MAX_IMAGE_PIXELS:
        raise HTTPException(413, 'Image dimensions outside supported limits')
    pid = uuid.uuid4().hex
    target = IMAGES_DIR / (pid + '.png')
    img.convert('RGB').save(target, format='PNG', optimize=True)
    with connection() as con:
        con.execute('INSERT INTO pages (id,filename,label,image_path,width,height,created_at) VALUES (?,?,?,?,?,?,?)',
                    (pid, original_filename[:220], label[:110], str(target), img.width, img.height, utcnow()))
        return get_page(con, pid)


@app.post('/api/pages', dependencies=[Depends(require_token)])
async def upload_pages(files: list[UploadFile] = File(...), label: str = Form(default='')):
    if len(files) > 20:
        raise HTTPException(400, 'Upload at most 20 files at a time')
    created = []
    for upload in files:
        raw = await upload.read(MAX_FILE_BYTES + 1)
        if len(raw) > MAX_FILE_BYTES:
            raise HTTPException(413, 'File exceeds 35 MB')
        if not raw:
            raise HTTPException(400, 'Empty file')
        filename = Path(upload.filename or 'scan').name
        is_pdf = raw[:5] == b'%PDF-'
        try:
            if is_pdf:
                doc = fitz.open(stream=raw, filetype='pdf')
                try:
                    if len(doc) > MAX_PDF_PAGES:
                        raise HTTPException(413, 'PDF exceeds 30 pages; split it')
                    for i in range(len(doc)):
                        p = doc[i]
                        scale = min(2.5, 2900 / max(p.rect.width, p.rect.height))
                        pix = p.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                        img = Image.open(io.BytesIO(pix.tobytes('png')))
                        created.append(_save_image(img, filename, (label or Path(filename).stem) + f' / {i + 1}'))
                finally:
                    doc.close()
            else:
                with Image.open(io.BytesIO(raw)) as im:
                    im.load()
                    created.append(_save_image(im, filename, label or Path(filename).stem))
        except HTTPException:
            raise
        except (fitz.FileDataError, UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError) as exc:
            raise HTTPException(400, f'Unsupported or corrupt file: {filename}') from exc
    return {'pages': created}


class PageInventory(BaseModel):
    expected_numbers: str = Field(default='', max_length=1500)


def parse_inventory(raw: str):
    raw = raw.replace('–', '-').replace('—', '-').replace('؛', ',')
    if not raw.strip():
        return []
    if not re.fullmatch(r'[0-9,;\s-]+', raw):
        raise HTTPException(400, 'Use numeric ranges or comma-separated numbers, e.g. 15-36, 40, 42')
    out = []
    for entry in re.split(r'[,;]', raw):
        entry = entry.strip()
        if not entry:
            continue
        m = re.fullmatch(r'(\d+)\s*-\s*(\d+)', entry)
        if m:
            start,end = map(int,m.groups())
            if end<start or end-start>500:
                raise HTTPException(400, 'Range must be increasing and <= 500 values')
            out += [str(i) for i in range(start,end+1)]
        elif re.fullmatch(r'\d+',entry):
            out.append(str(int(entry)))
        else:
            raise HTTPException(400, 'Invalid inventory entry: '+entry[:40])
    if len(out)>500:
        raise HTTPException(400, 'Inventory limited to 500 exercise numbers per page')
    return list(dict.fromkeys(out))


@app.patch('/api/pages/{pid}/inventory', dependencies=[Depends(require_token)])
def save_inventory(pid: str, item: PageInventory):
    parse_inventory(item.expected_numbers)
    with connection() as con:
        if not get_page(con,pid): raise HTTPException(404,'Page not found')
        con.execute('UPDATE pages SET expected_numbers=? WHERE id=?',(item.expected_numbers,pid))
        return get_page(con,pid)


@app.get('/api/pages/{pid}/coverage', dependencies=[Depends(require_token)])
def get_coverage(pid: str):
    with connection() as con:
        p = get_page(con,pid)
        if not p: raise HTTPException(404,'Page not found')
        found = [r['number'].strip() for r in con.execute('SELECT number FROM questions WHERE page_id=?',(pid,))]
    expected = parse_inventory(p['expected_numbers'])
    from collections import Counter
    counts = Counter(found)
    return {'expected_numbers':p['expected_numbers'], 'expected_count':len(expected),
            'cropped_count':len(found),'missing':[n for n in expected if n not in counts],
            'extra':[n for n in counts if expected and n not in expected],
            'duplicates':[n for n,num in counts.items() if num>1],
            'ready':bool(expected) and all(n in counts for n in expected) and not any(num>1 for num in counts.values())}


@app.get('/api/pages/{pid}/image', dependencies=[Depends(require_token)])
def page_image(pid: str):
    with connection() as con:
        p = get_page(con, pid)
    if not p:
        raise HTTPException(404, 'Page not found')
    return FileResponse(p['image_path'], media_type='image/png', headers={'Cache-Control': 'no-store'})


@app.delete('/api/pages/{pid}', dependencies=[Depends(require_token)])
def page_delete(pid: str):
    with connection() as con:
        p = get_page(con, pid)
        if not p:
            raise HTTPException(404, 'Page not found')
        qs = [dict(row) for row in con.execute('SELECT image_path FROM questions WHERE page_id=?', (pid,))]
        con.execute('DELETE FROM pages WHERE id=?', (pid,))
    Path(p['image_path']).unlink(missing_ok=True)
    for q in qs: Path(q['image_path']).unlink(missing_ok=True)
    return {'deleted': True}


class NewQuestion(BaseModel):
    page_id: str
    number: str = Field(min_length=1, max_length=80)
    x0: float
    y0: float
    x1: float
    y1: float


@app.get('/api/questions', dependencies=[Depends(require_token)])
def questions_list(page_id: str | None = None, status: str | None = None):
    with connection() as con:
        qs = list_questions(con)
    if page_id: qs = [q for q in qs if q['page_id'] == page_id]
    if status: qs = [q for q in qs if q['status'] == status]
    return qs


@app.post('/api/questions', dependencies=[Depends(require_token)])
def question_create(item: NewQuestion):
    with connection() as con:
        page = get_page(con, item.page_id)
        if not page: raise HTTPException(404, 'Page not found')
        x0,x1 = sorted((round(item.x0), round(item.x1)))
        y0,y1 = sorted((round(item.y0), round(item.y1)))
        x0 = max(0,min(page['width'],x0)); x1 = max(0,min(page['width'],x1))
        y0 = max(0,min(page['height'],y0)); y1 = max(0,min(page['height'],y1))
        if x1-x0 < 15 or y1-y0 < 15:
            raise HTTPException(400, 'Crop must be at least 15 × 15 pixels')
        qid = uuid.uuid4().hex
        target = CROPS_DIR / (qid + '.png')
        with Image.open(page['image_path']) as im:
            im.crop((x0,y0,x1,y1)).save(target, format='PNG', optimize=True)
        now = utcnow()
        con.execute('''INSERT INTO questions
            (id,page_id,number,bbox,image_path,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?)''',
            (qid,item.page_id,item.number,json.dumps([x0,y0,x1,y1]),str(target),now,now))
        return get_question(con,qid)


@app.get('/api/questions/{qid}/image', dependencies=[Depends(require_token)])
def question_image(qid: str):
    with connection() as con:
        q = get_question(con, qid)
    if not q: raise HTTPException(404, 'Question not found')
    return FileResponse(q['image_path'], media_type='image/png', headers={'Cache-Control': 'no-store'})


class UpdateQuestion(BaseModel):
    latex: str | None = Field(default=None, max_length=5000)
    number: str | None = Field(default=None, min_length=1, max_length=80)
    notes: str | None = Field(default=None, max_length=6000)
    source_error: bool | None = None
    engine_a: str | None = Field(default=None, max_length=5000)
    engine_b: str | None = Field(default=None, max_length=5000)


@app.patch('/api/questions/{qid}', dependencies=[Depends(require_token)])
def question_update(qid: str, item: UpdateQuestion):
    values = item.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(400, 'No update fields')
    with connection() as con:
        old = get_question(con, qid)
        if not old: raise HTTPException(404, 'Question not found')
        fields = list(values)
        vals = list(values.values())
        if 'source_error' in values: vals[fields.index('source_error')] = int(values['source_error'])
        if 'latex' in values and values['latex'] != old['latex']:
            fields.append('analysis')
            vals.append('{}')
        if old['status'] == 'verified' and any(k in values and values[k] != old[k] for k in ('latex', 'engine_a', 'engine_b', 'number', 'source_error')):
            fields.extend(['status','reviewer','checks'])
            vals.extend(['needs_review','', '{}'])
        fields.extend(['updated_at','revision'])
        vals.extend([utcnow(), old['revision'] + 1])
        con.execute('UPDATE questions SET ' + ','.join(k + '=?' for k in fields) + ' WHERE id=?', (*vals, qid))
        return get_question(con, qid)


class OCRRequest(BaseModel):
    engines: list[str] = Field(default_factory=lambda: ['mathpix', 'pix2text'])
    enhance: bool = True


@app.post('/api/questions/{qid}/ocr', dependencies=[Depends(require_token)])
async def question_ocr(qid: str, options: OCRRequest):
    if len(options.engines) > 2 or set(options.engines) - {'mathpix','pix2text'}:
        raise HTTPException(400, 'Unknown OCR engine')
    with connection() as con:
        q = get_question(con,qid)
    if not q: raise HTTPException(404, 'Question not found')
    data = await run_in_threadpool(ocr.process_crop, q['image_path'], options.enhance)
    warnings = []
    outcomes = {}
    for eng in options.engines:
        try:
            outcomes[eng] = (await ocr.mathpix(data) if eng=='mathpix'
                             else await run_in_threadpool(ocr.pix2text,data))
        except ocr.OCRUnavailable as exc:
            warnings.append(str(exc))
    a = outcomes.get('mathpix', {}).get('latex', q['engine_a'])
    b = outcomes.get('pix2text', {}).get('latex', q['engine_b'])
    if a and b and ocr.normalize_for_comparison(a) != ocr.normalize_for_comparison(b):
        warnings.append('Independent OCR engines disagree; compare against original scan.')
    if not outcomes:
        warnings.append('No OCR result. Enter or paste LaTeX manually.')
    latex = a or b or q['latex']
    with connection() as con:
        con.execute('''UPDATE questions SET engine_a=?, engine_b=?, latex=?, ocr_warnings=?,
                      status='needs_review', checks='{}', reviewer='', analysis='{}',
                      updated_at=?, revision=revision+1 WHERE id=?''',
                    (a,b,latex,json.dumps(warnings),utcnow(),qid))
        updated = get_question(con,qid)
    return {'question': updated, 'providers': outcomes}


@app.post('/api/questions/{qid}/analyze', dependencies=[Depends(require_token)])
def question_analyze(qid: str):
    with connection() as con:
        q = get_question(con,qid)
        if not q: raise HTTPException(404, 'Question not found')
        analysis = check_equation(q['latex'])
        con.execute('UPDATE questions SET analysis=?,updated_at=? WHERE id=?',
                    (json.dumps(analysis),utcnow(),qid))
    return analysis


class Verification(BaseModel):
    reviewer: str = Field(min_length=2, max_length=120)
    checks: dict[str, bool]


REQUIRED_CHECKS = {'source','symbols','fractions','domain'}


@app.post('/api/questions/{qid}/verify', dependencies=[Depends(require_token)])
def question_verify(qid: str, item: Verification):
    with connection() as con:
        q = get_question(con,qid)
        if not q: raise HTTPException(404, 'Question not found')
        if not q['latex'].strip():
            raise HTTPException(400, 'LaTeX is required before verification')
        if not all(item.checks.get(k) is True for k in REQUIRED_CHECKS):
            raise HTTPException(400, 'All visual verification checks must be completed')
        if q['source_error'] and not q['notes'].strip():
            raise HTTPException(400, 'Document suspected source errors in notes')
        con.execute("UPDATE questions SET status='verified',reviewer=?,checks=?,updated_at=? WHERE id=?",
                    (item.reviewer.strip(),json.dumps(item.checks),utcnow(),qid))
        return get_question(con,qid)


@app.post('/api/questions/{qid}/unverify', dependencies=[Depends(require_token)])
def question_unverify(qid: str):
    with connection() as con:
        if not get_question(con,qid): raise HTTPException(404, 'Question not found')
        con.execute("UPDATE questions SET status='needs_review', reviewer='',checks='{}', updated_at=? WHERE id=?",(utcnow(),qid))
        return get_question(con,qid)


@app.delete('/api/questions/{qid}', dependencies=[Depends(require_token)])
def question_delete(qid: str):
    with connection() as con:
        q = get_question(con,qid)
        if not q: raise HTTPException(404, 'Question not found')
        con.execute('DELETE FROM questions WHERE id=?',(qid,))
    Path(q['image_path']).unlink(missing_ok=True)
    return {'deleted': True}


def _export_rows(verified_only):
    with connection() as con:
        records = list_questions(con)
        pages = {r['id']: dict(r) for r in con.execute('SELECT * FROM pages')}
    if verified_only:
        records = [q for q in records if q['status'] == 'verified']
    for r in records:
        r.pop('image_path', None)  # Avoid leaking server filesystem paths in exports.
        r['page_label'] = pages[r['page_id']]['label'] if r['page_id'] in pages else ''
        r['crop_filename'] = 'crops/' + r['id'] + '.png'
        r['source_page_filename'] = 'original_pages/' + r['page_id'] + '.png'
    return records


def _csv_bytes(rows):
    buf = io.StringIO()
    columns = ['page_label','number','status','latex','engine_a','engine_b','reviewer','notes','source_error','bbox','id']
    writer = csv.DictWriter(buf,fieldnames=columns,extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        r = dict(row); r['bbox'] = json.dumps(r['bbox']); writer.writerow(r)
    return ('\ufeff' + buf.getvalue()).encode('utf-8')


def _tex_content(rows):
    lines = ['% Math Equation Audit — do not treat extracted math as automatically validated.',
             '% UTF-8 LaTeX export; verified denotes image-transcription review only.','']
    for r in rows:
        lines += [f"% Page: {r['page_label']}  Question: {r['number']}  Status: {r['status']}",
                  r'\[',r['latex'],r'\]','']
    return '\n'.join(lines).encode('utf-8')


@app.get('/api/export', dependencies=[Depends(require_token)])
def export_data(format: str = Query('zip', pattern='^(zip|json|csv|tex)$'), verified_only: bool=True):
    records = _export_rows(verified_only)
    name = f'equations-{"verified" if verified_only else "all"}'
    if format == 'json':
        return Response(json.dumps(records,indent=2,ensure_ascii=False), media_type='application/json',
                        headers={'Content-Disposition': f'attachment; filename="{name}.json"'})
    if format == 'csv':
        return Response(_csv_bytes(records), media_type='text/csv; charset=utf-8',
                        headers={'Content-Disposition': f'attachment; filename="{name}.csv"'})
    if format == 'tex':
        return Response(_tex_content(records),media_type='text/plain; charset=utf-8',
                        headers={'Content-Disposition': f'attachment; filename="{name}.tex"'})
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        z.writestr('manifest.json',json.dumps({'policy': 'verified means human image review, not mathematical truth',
            'verified_only':verified_only,'exported_at':utcnow(),'count':len(records),'questions':records},ensure_ascii=False,indent=2))
        z.writestr('questions.csv',_csv_bytes(records))
        z.writestr('questions.tex',_tex_content(records))
        included_pages = set()
        for r in records:
            p = CROPS_DIR / (r['id'] + '.png')
            if p.exists(): z.write(p,r['crop_filename'])
            if r['page_id'] not in included_pages:
                source = IMAGES_DIR / (r['page_id'] + '.png')
                if source.exists(): z.write(source,r['source_page_filename'])
                included_pages.add(r['page_id'])
    buffer.seek(0)
    return StreamingResponse(buffer,media_type='application/zip',
        headers={'Content-Disposition':f'attachment; filename="{name}.zip"'})

# Mount after API routes so the same frontend runs locally / on the backend host.
# GitHub Pages can publish the exact frontend directory as a separate static site.
app.mount('/', StaticFiles(directory=str(FRONTEND), html=True), name='frontend')
