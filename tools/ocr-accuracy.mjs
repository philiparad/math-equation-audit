/** Compare OCR hypotheses to HUMAN-VERIFIED transcriptions from MathAudit JSON export.
 * Usage: node tools/ocr-accuracy.mjs mathaudit-verified.json
 * Nonsemantic LaTeX formatting may be normalized, but NEVER algebraically simplify.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {normalizeForComparison} from '../frontend/core.js';

export function accuracyReport(rows){
    if(!Array.isArray(rows))throw new Error('Expected an array of rows');
    const totals=new Map();let verified=0;
    for(const row of rows){
        if(row.status!=='verified'||!String(row.latex||'').trim())continue;
        verified++;
        for(const [engine,prediction] of Object.entries(row.ocr||{})){
            if(!prediction?.latex)continue;
            const stats=totals.get(engine)||{attempted:0,exact:0,mismatches:[]};
            stats.attempted++;
            const a=normalizeForComparison(row.latex),b=normalizeForComparison(prediction.latex);
            if(a===b)stats.exact++;
            else stats.mismatches.push({id:row.id,label:row.label,reference:row.latex,predicted:prediction.latex});
            totals.set(engine,stats);
        }
    }
    return {verifiedEquations:verified,engines:Object.fromEntries([...totals].map(([name,v])=>[name,{
        ...v,exactMatchRate:v.attempted? v.exact/v.attempted:null,
    }]))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
    try{
        if(!process.argv[2])throw new Error('Usage: node tools/ocr-accuracy.mjs VERIFIED_EXPORT.json');
        const file=JSON.parse(readFileSync(process.argv[2],'utf-8'));
        console.log(JSON.stringify(accuracyReport(file.rows||file),null,2));
    }catch(e){console.error('OCR accuracy reporting failed: '+e.message);process.exitCode=1;}
}
