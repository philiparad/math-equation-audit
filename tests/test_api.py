import io
import json
import zipfile
from PIL import Image, ImageDraw


def image_data():
    im=Image.new('RGB',(800,450),'white')
    ImageDraw.Draw(im).text((90,70),'x + 2 = 5',fill='black')
    b=io.BytesIO();im.save(b,'PNG');return b.getvalue()


def test_audit_lifecycle(client):
    health=client.get('/api/health')
    assert health.status_code==200
    status=client.get('/api/status').json()
    assert status['questions']==0
    upload=client.post('/api/pages',files=[('files',('synthetic.png',image_data(),'image/png'))])
    assert upload.status_code==200,upload.text
    page=upload.json()['pages'][0]
    assert client.get('/api/pages/'+page['id']+'/image').status_code==200
    create=client.post('/api/questions',json={
        'page_id':page['id'],'number':'15','x0':50,'y0':50,'x1':700,'y1':150})
    assert create.status_code==200,create.text
    q=create.json()
    assert q['status']=='needs_review'
    assert client.get('/api/questions/'+q['id']+'/image').status_code==200
    assert client.post('/api/questions/'+q['id']+'/verify',json={'reviewer':'QA','checks':{
        'source':True,'symbols':True,'fractions':True,'domain':True}}).status_code==400
    update=client.patch('/api/questions/'+q['id'],json={'latex':'x+2=5','notes':'Matched source exactly'})
    assert update.status_code==200
    analysis=client.post('/api/questions/'+q['id']+'/analyze').json()
    assert analysis['solutions']==['3']
    assert client.post('/api/questions/'+q['id']+'/verify',json={'reviewer':'QA','checks':{
        'source':True,'symbols':True,'fractions':False,'domain':True}}).status_code==400
    verify=client.post('/api/questions/'+q['id']+'/verify',json={'reviewer':'QA','checks':{
        'source':True,'symbols':True,'fractions':True,'domain':True}})
    assert verify.status_code==200,verify.text
    assert verify.json()['status']=='verified'
    zipped=client.get('/api/export?format=zip')
    assert zipped.status_code==200
    with zipfile.ZipFile(io.BytesIO(zipped.content)) as z:
        files=z.namelist()
        assert 'manifest.json' in files and 'questions.tex' in files
        assert any(n.startswith('original_pages/') for n in files)
        manifest=json.loads(z.read('manifest.json'))
        assert manifest['count']==1
        assert 'image_path' not in manifest['questions'][0]
        assert q['id']+'.png' in ''.join(files)
    edited=client.patch('/api/questions/'+q['id'],json={'latex':'x+2=6'})
    assert edited.json()['status']=='needs_review'
    assert json.loads(client.get('/api/export?format=json').text)==[]
    all_json=client.get('/api/export?format=json&verified_only=false').json()
    assert len(all_json)==1 and all_json[0]['status']=='needs_review'
    assert client.delete('/api/pages/'+page['id']).json()['deleted']
    assert not client.get('/api/questions').json()


def test_invalid_upload_and_crop(client):
    invalid=client.post('/api/pages',files=[('files',('broken.jpg',b'not an image','image/jpeg'))])
    assert invalid.status_code==400
    p=client.post('/api/pages',files=[('files',('valid.png',image_data(),'image/png'))]).json()['pages'][0]
    bad=client.post('/api/questions',json={'page_id':p['id'],'number':'1','x0':10,'x1':12,'y0':3,'y1':5})
    assert bad.status_code==400
    client.delete('/api/pages/'+p['id'])


def test_ocr_disagreement_is_never_automatically_verified(client, monkeypatch):
    from backend import ocr
    p=client.post('/api/pages',files=[('files',('ocr.png',image_data(),'image/png'))]).json()['pages'][0]
    q=client.post('/api/questions',json={'page_id':p['id'],'number':'88','x0':0,'y0':0,'x1':650,'y1':200}).json()
    async def fake_a(image):
        assert len(image)>100
        return {'latex':r'\frac{2}{x+3}=7','confidence':0.99,'provider':'mathpix'}
    def fake_b(image):
        return {'latex':r'\frac{2}{x-3}=7','confidence':0.98,'provider':'pix2text'}
    monkeypatch.setattr(ocr,'mathpix',fake_a)
    monkeypatch.setattr(ocr,'pix2text',fake_b)
    response=client.post('/api/questions/'+q['id']+'/ocr',json={
        'engines':['mathpix','pix2text'],'enhance':True})
    assert response.status_code==200,response.text
    actual=response.json()['question']
    assert actual['status']=='needs_review'
    assert 'disagree' in '\n'.join(actual['ocr_warnings'])
    assert actual['engine_a'] and actual['engine_b']
    assert actual['latex']==actual['engine_a']
    client.delete('/api/pages/'+p['id'])


def test_password_gate_on_api(client,monkeypatch):
    monkeypatch.setenv('APP_ACCESS_TOKEN','unit-test-secret')
    assert client.get('/api/pages').status_code==401
    assert client.get('/api/health').status_code==200
    assert client.get('/api/pages',headers={'X-Access-Token':'unit-test-secret'}).status_code==200
    monkeypatch.delenv('APP_ACCESS_TOKEN',raising=False)


def test_pdf_upload(client):
    import fitz
    pdf=fitz.open()
    p=pdf.new_page(width=500,height=300)
    p.insert_text((30,70),'x + 3 = 9',fontsize=22)
    content=pdf.tobytes();pdf.close()
    response=client.post('/api/pages',files=[('files',('demo.pdf',content,'application/pdf'))])
    assert response.status_code==200,response.text
    page=response.json()['pages'][0]
    assert page['width']>=500
    assert client.get('/api/pages/'+page['id']+'/image').headers['content-type']=='image/png'
    client.delete('/api/pages/'+page['id'])


def test_source_error_requires_note(client):
    p=client.post('/api/pages',files=[('files',('error.png',image_data(),'image/png'))]).json()['pages'][0]
    q=client.post('/api/questions',json={'page_id':p['id'],'number':'90','x0':0,'y0':0,'x1':600,'y1':200}).json()
    client.patch('/api/questions/'+q['id'],json={'latex':'x=2','source_error':True})
    checks={'source':True,'symbols':True,'fractions':True,'domain':True}
    assert client.post('/api/questions/'+q['id']+'/verify',json={'reviewer':'QA','checks':checks}).status_code==400
    client.patch('/api/questions/'+q['id'],json={'notes':'Original printed answer is inconsistent with substitution.'})
    assert client.post('/api/questions/'+q['id']+'/verify',json={'reviewer':'QA','checks':checks}).status_code==200
    assert client.patch('/api/questions/'+q['id'],json={'source_error':False}).json()['status']=='needs_review'
    client.delete('/api/pages/'+p['id'])


def test_number_inventory_detects_omissions_and_duplicates(client):
    p=client.post('/api/pages',files=[('files',('ranges.png',image_data(),'image/png'))]).json()['pages'][0]
    pid=p['id']
    saved=client.patch('/api/pages/'+pid+'/inventory',json={'expected_numbers':'15-17, 20'})
    assert saved.status_code==200
    def add(n):
        return client.post('/api/questions',json={'page_id':pid,'number':str(n),'x0':0,'y0':0,'x1':600,'y1':100}).json()
    add(15);add(16);add(17)
    coverage=client.get('/api/pages/'+pid+'/coverage').json()
    assert coverage['missing']==['20']
    assert not coverage['ready']
    add(20)
    assert client.get('/api/pages/'+pid+'/coverage').json()['ready']
    add(20)
    assert client.get('/api/pages/'+pid+'/coverage').json()['duplicates']==['20']
    assert client.patch('/api/pages/'+pid+'/inventory',json={'expected_numbers':'20-15'}).status_code==400
    client.delete('/api/pages/'+pid)
