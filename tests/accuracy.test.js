import test from 'node:test';
import assert from 'node:assert/strict';
import {accuracyReport} from '../tools/ocr-accuracy.mjs';
test('benchmark uses human-verified LaTeX, never machine agreement',()=>{
    const rows=[
        {id:'1',label:'1',status:'verified',latex:'x^{2}+1=0',ocr:{texify2:{latex:'x^{2}+1=0'},texteller:{latex:'x^{2}-1=0'}}},
        {id:'2',label:'2',status:'verified',latex:'\\frac{1}{x}=2',ocr:{texify2:{latex:'\\dfrac{1}{x}=2'},texteller:{latex:'\\frac{1}{x}=3'}}},
        {id:'3',label:'3',status:'needs_review',latex:'x=5',ocr:{texify2:{latex:'x=5'}}},
    ];
    const r=accuracyReport(rows);
    assert.equal(r.verifiedEquations,2);
    assert.equal(r.engines.texify2.exactMatchRate,1);
    assert.equal(r.engines.texteller.exactMatchRate,0);
    assert.equal(r.engines.texteller.mismatches[0].reference,'x^{2}+1=0');
});
