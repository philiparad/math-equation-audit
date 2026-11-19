"""Optional Playwright smoke test; mocks remote libraries, not model accuracy.
Run: python tests/browser-smoke-local.py (requires Playwright and Chromium).
"""
from pathlib import Path
from threading import Thread
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import time
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent/'frontend'
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):pass
server=ThreadingHTTPServer(('127.0.0.1',0), partial(Handler,directory=str(root)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1440,'height':1000})
    page=ctx.new_page()
    def mathjax(route):
        route.fulfill(status=200,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'},body='''
        window.MathJax={...window.MathJax, startup:{promise:Promise.resolve()},
          tex2svgPromise:async function(input){const el=document.createElement('mjx-container');el.textContent=input;return el;}};
        ''')
    def transformers(route):
        route.fulfill(status=200,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'},body='''
        export async function pipeline(task,model,options){
          if(task!=='image-to-text')throw new Error('unexpected task');
          return async () => [{generated_text:'x^{2}-5x+6=0'}];
        }
        ''')
    page.route('**/mathjax@*/es5/tex-svg.js',mathjax)
    page.route('**/transformers@4.3.2*',transformers)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='load')
    page.wait_for_timeout(300)
    page.locator('#sampleBtn').click()
    page.wait_for_function('document.querySelector("#pageImage").naturalWidth > 0')
    img=page.locator('#pageImage').bounding_box()
    assert img and img['width']>100 and img['height']>100, f'Image not visible: {img}'
    page.mouse.move(img['x']+img['width']*.08,img['y']+img['height']*.1)
    page.mouse.down()
    page.mouse.move(img['x']+img['width']*.91,img['y']+img['height']*.8,steps=8)
    page.mouse.up()
    page.locator('#labelInput').fill('15')
    page.locator('#cropBtn').click()
    page.wait_for_function('!document.querySelector("#reviewContent").hidden')
    page.locator('#ocrCropBtn').click()
    stage=page.locator('#ocrFullImage')
    bb=stage.bounding_box()
    assert bb and bb['width']>60
    page.mouse.move(bb['x']+bb['width']*.12,bb['y']+bb['height']*.2)
    page.mouse.down()
    page.mouse.move(bb['x']+bb['width']*.78,bb['y']+bb['height']*.75,steps=6)
    page.mouse.up()
    page.wait_for_function('!document.querySelector("#ocrSelected").hidden')
    assert page.locator('#ocrSelectedImage').evaluate('(e)=>e.naturalWidth')>10
    page.locator('#texifyBtn').click()
    page.wait_for_function('document.querySelectorAll(".ocr-math-output mjx-container").length > 0',timeout=8000)
    # Candidate should still require manual inspection and remain unapproved.
    assert 'pending' in page.locator('#reviewBadge').get_attribute('class')
    page.locator('.ocr-result .head button').first.click()
    page.wait_for_function('document.querySelector("#mathPreview mjx-container")')
    assert page.locator('#latexInput').input_value()=='x^{2}-5x+6=0'
    page.locator('#saveBtn').click()
    page.locator('#reviewerInput').fill('Teacher')
    for key in ['Source','Symbols','Fractions','Domain']:
        page.locator('#check'+key).check()
    page.locator('#verifyBtn').click()
    page.wait_for_function('document.querySelector("#reviewBadge").classList.contains("verified")')
    page.locator('#latexInput').fill('x^{2}-5x+7=0')
    assert 'pending' in page.locator('#reviewBadge').get_attribute('class')
    assert not page.locator('#checkSource').is_checked()
    page.screenshot(path='/mnt/data/mathaudit_browser_smoke.png',full_page=True)
    assert not errors, errors
    print('Browser smoke passed: image upload, original crop, math-only crop, mocked OCR, rendered previews, review invalidation')
    browser.close()
server.shutdown()
