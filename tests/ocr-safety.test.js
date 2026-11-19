import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OCR_MODELS,imagePreparationDimensions,assessOCRResult} from '../frontend/ocr.js';
import {latexForMathJax} from '../frontend/math-render.js';

const html=readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../frontend/styles.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../frontend/app.js',import.meta.url),'utf8');
const exportsJS=readFileSync(new URL('../frontend/export.js',import.meta.url),'utf8');

test('every selected model declares compatible quantized merged decoder assets',()=>{
    assert.deepEqual(Object.keys(OCR_MODELS).sort(),['texify2','texteller']);
    assert.equal(OCR_MODELS.texteller.id,'onnx-community/TexTeller3-ONNX');
    for(const model of Object.values(OCR_MODELS)){
        assert.equal(model.dtype,'q8');
        assert.ok(model.expectedFiles.includes('onnx/encoder_model_quantized.onnx'));
        assert.ok(model.expectedFiles.includes('onnx/decoder_model_merged_quantized.onnx'));
    }
});

test('formula image preparation preserves aspect ratio, pads, and caps huge input',()=>{
    for(const [width,height] of [[1200,80],[100,30],[6000,1000],[900,900]]){
        const d=imagePreparationDimensions(width,height);
        assert.ok(d.pad>=8);assert.ok(d.width<=2100);assert.ok(d.height<=2100);
        assert.ok(Math.abs(d.innerWidth/d.innerHeight-width/height)<0.6);
        assert.equal(d.width,d.innerWidth+2*d.pad);assert.equal(d.height,d.innerHeight+2*d.pad);
    }
    assert.throws(()=>imagePreparationDimensions(0,100));
});

test('OCR suspicion checks do not silently correct mathematical symbols',()=>{
    const latex='\\frac{x^{2}-1}{x-1}=0';
    assert.equal(assessOCRResult(latex).usable,true);
    assert.equal(assessOCRResult('hello world from page').warning?.includes('prose'),true);
    assert.equal(assessOCRResult(' ').usable,false);
});

test('MathJax display normalizes only matching outer delimiters',()=>{
    const x='\\frac{x+1}{x-2}=0';
    for(const source of [`$${x}$`,`$$${x}$$`,`\\[${x}\\]`,`\\(${x}\\)`,x]) {
        assert.equal(latexForMathJax(source),x);
    }
    assert.equal(latexForMathJax('x$+y$=2'),'x$+y$=2');
});

test('HTML gives each OCR a math-only crop and MathJax panel',()=>{
    for(const id of ['ocrCropBtn','ocrCropStage','ocrFullImage','ocrSelection','ocrSelected','ocrSelectedImage','mathPreview','mathjax-script']){
        assert.match(html,new RegExp(`id="${id}"`));
    }
    assert.match(app,/renderMath\(math,obj\.latex\)/);
    assert.match(app,/renderMath\(target,latex\)/);
    assert.match(app,/original\.ocrBlob\|\|original\.blob/);
    assert.match(css,/\[hidden\]\{display:none!important\}/);
});

test('math-only crop is backed up independently of original and restored correctly',()=>{
    assert.match(exportsJS,/ocr-crops\/\$\{q\.id\}\.png/);
    assert.match(exportsJS,/ocrBlob:await mathImage\.async\('blob'\)/);
    assert.match(exportsJS,/const \{blob,ocrBlob, \.\.\.rest\}=entry/);
});
