import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeForComparison,disagreement,reviewIsValid,verifiedRecord,updateTranscript,
    coverageReport,parseExpectedNumbers,clampCrop,toCSV,toTeX,latexRows,validateBackupManifest
} from '../frontend/core.js';
const checks={source:true,symbols:true,fractions:true,domain:true};
const q=()=>({id:'q1',pageId:'p1',label:'15',finalLatex:'x^{2}-5x+6=0',ocr:{},status:'needs_review',review:null});

test('equivalent presentation commands are ignored but sign and exponent changes are not',()=>{
    assert.equal(normalizeForComparison('\\dfrac{x+1}{x-2}'),normalizeForComparison('\\frac{x + 1}{x - 2}'));
    assert.notEqual(normalizeForComparison('x^2+1'),normalizeForComparison('x^2-1'));
    assert.notEqual(normalizeForComparison('x^2+1'),normalizeForComparison('x+1'));
});
test('one model is not independent agreement',()=>{
    assert.equal(disagreement({texify2:{latex:'x=1'}}),null);
    assert.equal(disagreement({texify2:{latex:'x=1'},texteller:{latex:'x = 1'}}),false);
    assert.equal(disagreement({texify2:{latex:'x=1'},mathpix:{latex:'x=-1'}}),true);
});
test('approval requires four checks, named reviewer, and nonempty math',()=>{
    assert.throws(()=>verifiedRecord(q(),'Teacher',{...checks,domain:false}));
    assert.throws(()=>verifiedRecord(q(),'',checks));
    assert.throws(()=>verifiedRecord({...q(),finalLatex:''},'Teacher',checks));
    const approved=verifiedRecord(q(),'Teacher',checks);
    assert.equal(approved.status,'verified');assert.ok(reviewIsValid(approved));
});
test('any change to an approved equation invalidates review',()=>{
    const approved=verifiedRecord(q(),'Teacher',checks);
    const changed=updateTranscript(approved,'x^{2}-5x+7=0');
    assert.equal(changed.status,'needs_review');assert.equal(changed.review,null);assert.equal(changed.analysis,null);
    const unchanged=updateTranscript(approved,approved.finalLatex);
    assert.equal(unchanged.status,'verified');
});
test('expected exercise numbering finds missing and duplicates',()=>{
    assert.deepEqual(parseExpectedNumbers('15-18, 20, 21a'),['15','16','17','18','20','21a']);
    const r=coverageReport('15-18', [{label:'15'},{label:'15'},{label:'16'},{label:'20'}]);
    assert.deepEqual(r.missing,['17','18']);assert.deepEqual(r.duplicate,['15']);assert.deepEqual(r.unexpected,['20']);
});
test('invalid or huge exercise ranges rejected',()=>{
    assert.throws(()=>parseExpectedNumbers('20-10'));assert.throws(()=>parseExpectedNumbers('1-20000'));
    assert.throws(()=>parseExpectedNumbers('x<script>'));
});
test('crop is clipped within original pixel rectangle',()=>{
    assert.deepEqual(clampCrop({x0:-20,y0:15,x1:203,y1:180},200,100),{x:0,y:15,width:200,height:85});
    assert.throws(()=>clampCrop({x0:1,y0:2,x1:5,y1:8},100,100));
});
test('exports include only verified by default',()=>{
    const verified=verifiedRecord(q(),'Teacher',checks);
    const pending={...q(),id:'q2',label:'16'};
    const rows=latexRows([verified,pending]);assert.equal(rows.length,1);
    assert.equal(latexRows([verified,pending],false).length,2);
    assert.match(toTeX(rows),/x\^\{2\}/);
});
test('CSV escapes quotation and neutralizes spreadsheet formula injection',()=>{
    const rows=[{id:'1',pageId:'p',label:'5',latex:'=IMPORTXML("http://example.com")',status:'verified',reviewer:'t',reviewedAt:'',sourceError:false,notes:'A, "B"'}];
    const s=toCSV(rows);assert.match(s,/"'=IMPORTXML/);assert.match(s,/"A, ""B"""/);
});
test('backup validates references and duplicate IDs',()=>{
    const p={schema:1,pages:[{id:'a'}],questions:[{id:'q',pageId:'a'}]};
    assert.equal(validateBackupManifest(p),true);
    assert.throws(()=>validateBackupManifest({...p,questions:[{id:'q',pageId:'missing'}]}));
    assert.throws(()=>validateBackupManifest({...p,pages:[{id:'../path'}]}));
});

test('verified export ignores invalid approval metadata even if status is verified',()=>{
    const fake={...q(),status:'verified',review:{reviewer:'Teacher',checks:{source:true}}};
    assert.equal(latexRows([fake],true).length,0);
});
