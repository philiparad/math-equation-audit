(() => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const state = {
        pages: [], questions: [], page: null, question: null, image: null,
        crop: null, dragging: false, origin: null, filter: 'all',
        api: localStorage.getItem('mathAuditAPI') || window.MATH_AUDIT_API || '',
        token: sessionStorage.getItem('mathAuditToken') || '',
        lang: localStorage.getItem('mathAuditLang') || 'he',
        providers: {}, dirty: false, toastTimer: null, previewTimer: null,
        pageObjectUrl: null, cropObjectUrl: null, zoomLevel: 1, pageZoom: 1,
    };

    const i18n = {
        he: {
            subtitle:'חילוץ משוואות עם אימות אנושי',connecting:'מתחבר…',settings:'הגדרות',upload:'ייבוא סריקות',pages:'עמודים',questions:'שאלות',reviewNeeded:'ממתינות לבדיקה',verified:'אומתו חזותית',export:'ייצוא תוצאות',sourcePages:'עמודי מקור',selectPage:'בחרו עמוד לצפייה ולחיתוך',questionList:'רשימת שאלות',selectQuestion:'בחרו שאלה לעריכה ולאימות',all:'הכול',pending:'לבדיקה',verifiedShort:'אומתו',noPages:'לא הועלו עמודים עדיין',noQuestions:'אין שאלות בעמוד זה',stepOne:'שלב 1 · בחירת המקור',scanArea:'העמוד הסרוק',cropGuide:'גררו מלבן סביב משוואה או שאלה מלאה. שמרו גם את המספר ואת כל המכנים.',clearSelection:'נקה בחירה',deletePage:'מחק עמוד',startTitle:'מתחילים עם סריקה',startBody:'העלו תמונות או PDF של ספר הלימוד. לאחר מכן סמנו בעכבר את המשוואות שתרצו לחלץ.',chooseFiles:'בחירת קבצים',cropReady:'נבחר אזור לחיתוך',questionNumber:'מספר שאלה',saveCrop:'צור שאלה מהבחירה',privacyHint:'התמונות נשמרות בשרת הפרטי שלך, ולא מתווספות אוטומטית למאגר GitHub.',stepTwo:'שלבים 2–4 · חילוץ, בדיקה ואישור',reviewTitle:'בקרת המשוואה',noSelection:'לא נבחרה שאלה',chooseQuestion:'בחרו שאלה מהרשימה',chooseQuestionDesc:'או סמנו אזור בעמוד המקור כדי ליצור שאלה חדשה לבדיקה.',originalCrop:'המקור הסרוק (ללא שינוי)',ocrEngines:'מנועי זיהוי עצמאיים',recognize:'זהה משוואה',useResult:'העתק לעריכה',finalLatex:'תמלול LaTeX מאושר לעריכה',manualRequired:'נדרשת השוואה למקור',preview:'תצוגה מתמטית',saveEdits:'שמור שינויים',analyze:'בדיקה אלגברית',manualReview:'רשימת בקרת איכות',checkSource:'השוויתי את המשוואה כולה לתמונה המקורית',checkSymbols:'בדקתי את כל הספרות, הסימנים והחזקות',checkFractions:'בדקתי שברים, סוגריים, מונים ומכנים',checkDomain:'בדקתי תחום הצבה וערכים אסורים במידת הצורך',reviewerName:'שם הבודק/ת',notes:'הערות ובדיקות נוספות',sourceError:'זוהתה שגיאה אפשרית בספר המקורי',confirmVerify:'אמת לאחר השוואה לתמונה',reopen:'פתח לבדיקה חוזרת',deleteQuestion:'מחק שאלה',footer:'MathAudit · זיהוי אוטומטי אינו תחליף לאימות מול המקור',backendURL:'כתובת שרת ה-API (ל-GitHub Pages)',accessToken:'סיסמת גישה לשרת (לא נשמרת ב-GitHub)',securityNote:'בפריסה ציבורית יש להגדיר APP_ACCESS_TOKEN בשרת. הסיסמה נשמרת רק בזמן פעולת הלשונית.',connect:'שמור והתחבר',exportTitle:'ייצוא תוצאות',exportDesc:'ברירת המחדל מייצאת רק משוואות שהושלמה עבורן בדיקה חזותית.',includePending:'כלול גם שאלות שטרם אומתו (מסומנות ככאלה)',connected:'מחובר',disconnected:'אין חיבור',needsReview:'לבדיקה',verifiedStatus:'אומת חזותית',noMathpix:'Mathpix לא מוגדר',noPix:'Pix2Text לא מותקן',ready:'מוכן',uploading:'מעלה קבצים…',saved:'השינויים נשמרו',created:'השאלה נוצרה',checkAll:'יש לסמן את כל בדיקות האיכות',reviewNameRequired:'יש להזין שם בודק/ת',verifySuccess:'המשוואה סומנה כמאומתת חזותית',ocrDone:'הזיהוי הושלם. חובה להשוות למקור.',analyzeReady:'בדיקה אלגברית הסתיימה (לא מחליפה בדיקת מקור)',failed:'הפעולה נכשלה',confirmDelete:'למחוק לצמיתות?',unsaved:'קיימים שינויים שלא נשמרו. לעבור בכל זאת?',enginesDisagree:'שני המנועים אינם מסכימים — נדרש אימות ידני',analysisUnsupported:'לא ניתן לנתח אוטומטית את התבנית הזו',solutions:'פתרונות אפשריים',excluded:'ערכים אסורים',conditions:'תנאי תחום',notesAnalysis:'הערות',analysisDisclaimer:'ניתוח אלגברי בלבד, אינו מוכיח שהסריקה תומללה נכון',noProviders:'אין מנוע OCR מוגדר; אפשר להדביק LaTeX ידנית.',alreadyVerified:'השאלה מאומתת — שינוי התמלול יפתח אותה לבדיקה חוזרת.',unexpected:'הזינו כתובת שרת API תקינה בהגדרות.',batchOCR:'זיהוי כל השאלות החדשות',zoomSource:'הצג בגודל מלא',zoomTitle:'בחינה מדויקת של תמונת המקור',zoomHelp:'בדקו כל ספרה וסימן. התמונה מוצגת ללא עיבוד OCR.',batchDone:'בוצע זיהוי אוטומטי לשאלות החדשות; כל תוצאה מחייבת בדיקה ידנית.',noBatch:'אין שאלות חדשות שממתינות לזיהוי.',inventoryLabel:'מספרי שאלות צפויים בעמוד',inventoryFormat:'למשל: 15-36 או 1,2,3,7',checkCoverage:'בדוק שלמות',coverageReady:'כל המספרים הצפויים נמצאים; נדרש עדיין לאמת את התוכן.',coverageNotSet:'הזינו טווח מספרים כדי לבדוק שלא חסרות שאלות.',missingNums:'חסרים',duplicateNums:'כפולים',extraNums:'לא ברשימה',coverageSaved:'רשימת המספרים נשמרה',enhanceOption:'שיפור ניגודיות לפני OCR (לא משנה את המקור)'
        },
        en: {
            subtitle:'Equation extraction with human verification',connecting:'Connecting…',settings:'Settings',upload:'Import scans',pages:'Pages',questions:'Questions',reviewNeeded:'Needs review',verified:'Visually verified',export:'Export results',sourcePages:'Source pages',selectPage:'Select a page to inspect and crop',questionList:'Questions',selectQuestion:'Choose a question to review',all:'All',pending:'To review',verifiedShort:'Verified',noPages:'No pages uploaded yet',noQuestions:'No questions on this page',stepOne:'Step 1 · Select source',scanArea:'Scanned page',cropGuide:'Drag a box around a complete equation or question, including all denominators and the question number.',clearSelection:'Clear selection',deletePage:'Delete page',startTitle:'Start with a scan',startBody:'Upload images or a textbook PDF, then drag to select the equations to extract.',chooseFiles:'Choose files',cropReady:'Region selected',questionNumber:'Question #',saveCrop:'Create question from crop',privacyHint:'Source scans remain on your server and are not automatically uploaded to GitHub.',stepTwo:'Steps 2–4 · OCR, review, approve',reviewTitle:'Equation verification',noSelection:'No selection',chooseQuestion:'Select a question',chooseQuestionDesc:'Or select a region on the scanned page to add a question.',originalCrop:'Original scan (unchanged)',ocrEngines:'Independent OCR engines',recognize:'Run OCR',useResult:'Use result',finalLatex:'Editable final LaTeX',manualRequired:'Original-image comparison required',preview:'Rendered math preview',saveEdits:'Save edits',analyze:'Algebraic check',manualReview:'Quality checklist',checkSource:'I compared the entire equation with the source image',checkSymbols:'I checked every digit, sign and exponent',checkFractions:'I checked fractions, brackets, numerators and denominators',checkDomain:'I checked valid domain and excluded values where needed',reviewerName:'Reviewer name',notes:'Notes and follow-up findings',sourceError:'Possible error in the original textbook',confirmVerify:'Confirm visual verification',reopen:'Reopen review',deleteQuestion:'Delete question',footer:'MathAudit · Automated OCR never replaces human image verification',backendURL:'API backend URL (for GitHub Pages)',accessToken:'Backend access token (not saved on GitHub)',securityNote:'For public deployments, set APP_ACCESS_TOKEN on the server. The token is held only during this browser tab session.',connect:'Save and connect',exportTitle:'Export results',exportDesc:'By default, export only questions that passed explicit visual review.',includePending:'Include questions that are still unverified (clearly labeled)',connected:'Connected',disconnected:'Disconnected',needsReview:'Needs review',verifiedStatus:'Visually verified',noMathpix:'Mathpix not configured',noPix:'Pix2Text not installed',ready:'Ready',uploading:'Uploading…',saved:'Changes saved',created:'Question created',checkAll:'Complete every review checkbox',reviewNameRequired:'Enter the reviewer name',verifySuccess:'Equation marked visually verified',ocrDone:'OCR completed. Source-image comparison is still required.',analyzeReady:'Algebraic check completed (not transcription proof)',failed:'Operation failed',confirmDelete:'Delete permanently?',unsaved:'Unsaved edits. Continue without saving?',enginesDisagree:'OCR engines disagree — manual verification required',analysisUnsupported:'Automatic analysis cannot handle this notation',solutions:'Possible solutions',excluded:'Excluded values',conditions:'Domain conditions',notesAnalysis:'Notes',analysisDisclaimer:'Algebraic analysis only; does not prove OCR matches the scan',noProviders:'No OCR engines configured; you can paste LaTeX manually.',alreadyVerified:'Changing a verified equation will reopen its review.',unexpected:'Set a valid API backend URL under Settings.',batchOCR:'OCR all new questions',zoomSource:'View at full resolution',zoomTitle:'Inspect the original image at full resolution',zoomHelp:'Inspect every digit and sign. This is the original crop, without OCR enhancements.',batchDone:'OCR finished for new questions; every output requires manual review.',noBatch:'No new blank questions are awaiting OCR.',inventoryLabel:'Expected exercise numbers on this page',inventoryFormat:'e.g. 15-36 or 1,2,3,7',checkCoverage:'Check coverage',coverageReady:'Every expected number is present; mathematical content still requires review.',coverageNotSet:'Enter an expected range to detect missing questions.',missingNums:'Missing',duplicateNums:'Duplicates',extraNums:'Not expected',coverageSaved:'Exercise inventory saved',enhanceOption:'Enhance contrast for OCR (source remains unchanged)'
        }
    };
    const t = (key) => i18n[state.lang][key] || key;

    function localize() {
        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
        $('langBtn').textContent = state.lang === 'he' ? 'EN' : 'עב';
        renderPages(); renderQuestions(); renderReviewStatus(); renderProviders();
    }

    function toast(message, error=false) {
        const el = $('toast');
        el.textContent = message; el.classList.toggle('error', error); el.classList.add('show');
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => el.classList.remove('show'), 4400);
    }
    function base() { return String(state.api).trim().replace(/\/+$/, ''); }
    async function request(path, {method='GET', body, isForm=false} = {}) {
        const options = {method, headers:{'X-Access-Token': state.token}, cache:'no-store'};
        if (body !== undefined) {
            if (isForm) options.body = body;
            else { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
        }
        let response;
        try { response = await fetch(base() + path, options); }
        catch (err) { throw new Error(t('unexpected') + ' (' + err.message + ')'); }
        if (!response.ok) {
            let detail = response.statusText;
            try { const o = await response.json(); detail = typeof o.detail === 'string' ? o.detail : JSON.stringify(o.detail); } catch {}
            if (response.status === 401) $('settingsDialog').showModal();
            throw new Error(detail || `HTTP ${response.status}`);
        }
        return response;
    }
    async function json(path, opts) { return (await request(path, opts)).json(); }
    async function blobUrl(path) { return URL.createObjectURL(await (await request(path)).blob()); }
    async function download(format) {
        const all = $('exportAll').checked;
        const response = await request(`/api/export?format=${encodeURIComponent(format)}&verified_only=${!all}`);
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement('a'); a.href=url; a.download=`mathaudit-${all?'all':'verified'}.${format}`;
        document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
    function setConnection(ok) {
        const el=$('connection');el.className='connection-status '+(ok?'connected':'error');
        el.querySelector('span:last-child').textContent = t(ok?'connected':'disconnected');
    }
    async function refresh({preserve=true}={}) {
        try {
            const [status, pages, questions] = await Promise.all([json('/api/status'),json('/api/pages'),json('/api/questions')]);
            state.providers = status.providers;state.pages = pages;state.questions = questions;
            $('pagesCount').textContent = status.pages;
            $('questionsCount').textContent = status.questions;
            $('pendingCount').textContent = status.questions - (status.by_status.verified || 0);
            $('verifiedCount').textContent = status.by_status.verified || 0;
            setConnection(true);
            if (preserve && state.page && pages.some(p=>p.id===state.page.id)) {
                state.page=pages.find(p=>p.id===state.page.id);
            } else if (!state.page && pages.length) {
                state.page=pages[0];
            } else if (state.page && !pages.some(p=>p.id===state.page.id)) {
                state.page=pages[0]||null;state.question=null;
            }
            if (state.question) state.question=questions.find(q=>q.id===state.question.id)||null;
            renderPages();renderQuestions();renderProviders();renderReviewStatus();
            $('deletePage').disabled = !state.page;
            $('inventoryPanel').hidden=!state.page;
            if(state.page){$('inventoryInput').value=state.page.expected_numbers||'';await loadCoverage();}else $('inventoryReport').textContent='';
            $('batchOCR').disabled = !state.page;
            if (state.page && (!state.image || state.image.pageId !== state.page.id)) await loadPageImage(state.page);
            else if (!state.page) resetPageImage();
            await renderReview();
        } catch (err) {setConnection(false);toast(err.message,true);}
    }
    function renderPages() {
        const holder=$('pageList');holder.replaceChildren();
        if (!state.pages.length) {const div=document.createElement('div');div.className='empty-side';div.textContent=t('noPages');holder.append(div);return;}
        for (const p of state.pages) {
            const btn=document.createElement('button');btn.className='page-item '+(state.page?.id===p.id?'active':'');
            const icon=document.createElement('span');icon.className='page-thumb';icon.style.display='grid';icon.style.placeItems='center';icon.textContent='▤';icon.style.fontSize='20px';
            const text=document.createElement('span');
            const name=document.createElement('span');name.className='page-item-label';name.textContent=p.label;
            const dims=document.createElement('span');dims.className='page-item-sub';dims.textContent=`${p.width} × ${p.height}`;
            text.append(name,dims);btn.append(icon,text);
            btn.addEventListener('click',()=>selectPage(p.id));holder.append(btn);
        }
    }
    function renderQuestions() {
        const holder=$('questionList');holder.replaceChildren();
        const all=state.questions.filter(q=>q.page_id===state.page?.id);
        $('listSub').textContent=`${all.length} ${t('questions')}`;
        const qs=all.filter(q=>state.filter==='all'||q.status===state.filter);
        if (!qs.length){const div=document.createElement('div');div.className='empty-side';div.textContent=t('noQuestions');holder.append(div);return;}
        for (const q of qs) {
            const btn=document.createElement('button');btn.className='question-item '+(state.question?.id===q.id?'active':'');
            const label=document.createElement('span');label.textContent='# '+q.number;
            const status=document.createElement('small');status.className=q.status==='verified'?'good':'';
            status.textContent=q.status==='verified'?'✓ '+t('verifiedShort'):'◷ '+t('pending');
            btn.append(label,status);btn.addEventListener('click',()=>selectQuestion(q.id));holder.append(btn);
        }
    }
    async function selectPage(id) {
        if (state.page?.id===id)return;
        if (state.dirty && !confirm(t('unsaved')))return;
        state.page=state.pages.find(p=>p.id===id)||null;state.question=null;state.crop=null;state.dirty=false;state.pageZoom=1;
        $('cropAction').hidden=true;
        renderPages();renderQuestions();await loadPageImage(state.page);await renderReview();
    }
    async function loadPageImage(page) {
        resetPageImage(false);
        if (!page)return;
        $('scanTitle').textContent=page.label;
        $('scanEmpty').hidden=true;
        $('pageCanvas').hidden=false;
        try {
            const url=await blobUrl(`/api/pages/${page.id}/image`);
            state.pageObjectUrl=url;
            const im=new Image();
            await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=url;});
            state.image={image:im,pageId:page.id};
            fitCanvas();
        } catch(err) {toast(err.message,true);resetPageImage();}
    }
    function resetPageImage(revealEmpty=true) {
        if(state.pageObjectUrl){URL.revokeObjectURL(state.pageObjectUrl);state.pageObjectUrl=null;}
        state.image=null;state.crop=null;$('pageCanvas').hidden=true;$('cropAction').hidden=true;
        $('scanEmpty').hidden=!revealEmpty;
    }
    function fitCanvas() {
        if(!state.image)return;
        const {image}=state.image,canvas=$('pageCanvas'),stage=$('scanStage');
        canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
        const scale=Math.min((stage.clientWidth-30)/image.naturalWidth, 690/image.naturalHeight, 1.8)*state.pageZoom;
        canvas.style.width=Math.round(image.naturalWidth*scale)+'px';
        canvas.style.height=Math.round(image.naturalHeight*scale)+'px';
        drawCanvas();
    }
    function drawCanvas() {
        if(!state.image)return;
        const canvas=$('pageCanvas'),ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(state.image.image,0,0,canvas.width,canvas.height);
        if (state.crop) {
            const [x0,y0,x1,y1]=[Math.min(state.crop[0],state.crop[2]),Math.min(state.crop[1],state.crop[3]),Math.max(state.crop[0],state.crop[2]),Math.max(state.crop[1],state.crop[3])];
            ctx.fillStyle='rgba(33,139,113,0.13)';ctx.fillRect(x0,y0,x1-x0,y1-y0);
            ctx.strokeStyle='#218b71';ctx.lineWidth=Math.max(2,canvas.width/550);ctx.setLineDash([12,7]);ctx.strokeRect(x0,y0,x1-x0,y1-y0);ctx.setLineDash([]);
        }
    }
    function canvasPoint(event) {
        const rect=$('pageCanvas').getBoundingClientRect();
        return [Math.max(0,Math.min($('pageCanvas').width, (event.clientX-rect.left)*$('pageCanvas').width/rect.width)),
                Math.max(0,Math.min($('pageCanvas').height,(event.clientY-rect.top)*$('pageCanvas').height/rect.height))];
    }
    function updateCropUI() {
        const crop=state.crop;if(!crop)return;
        const w=Math.abs(crop[2]-crop[0]),h=Math.abs(crop[3]-crop[1]);
        $('cropAction').hidden= w<15||h<15;
        $('cropDimensions').textContent=`${Math.round(w)} × ${Math.round(h)} px`;
    }
    async function loadCoverage() {
        if(!state.page)return;
        try {
            const c=await json(`/api/pages/${state.page.id}/coverage`);
            const out=$('inventoryReport');
            out.className='inventory-report '+(c.ready?'good':c.expected_count?'warn':'');
            if(!c.expected_count){out.textContent=t('coverageNotSet');return;}
            const parts=[`${c.cropped_count} / ${c.expected_count}`];
            if(c.missing.length)parts.push(`${t('missingNums')}: ${c.missing.join(', ')}`);
            if(c.duplicates.length)parts.push(`${t('duplicateNums')}: ${c.duplicates.join(', ')}`);
            if(c.extra.length)parts.push(`${t('extraNums')}: ${c.extra.join(', ')}`);
            if(c.ready)parts.push(t('coverageReady'));
            out.textContent=parts.join(' · ');
        } catch(err) { $('inventoryReport').textContent=err.message; }
    }
    async function selectQuestion(id) {
        if (state.question?.id===id)return;
        if (state.dirty && !confirm(t('unsaved')))return;
        state.question=state.questions.find(q=>q.id===id)||null;
        state.dirty=false;renderQuestions();await renderReview();
    }
    function renderReviewStatus() {
        const status=$('reviewStatus'),q=state.question;
        status.className='pill '+(q?.status==='verified'?'good':q?'warn':'neutral');
        status.textContent=!q?t('noSelection'):q.status==='verified'?t('verifiedStatus'):t('needsReview');
    }
    function renderProviders() {
        const el=$('providerStatus');el.replaceChildren();
        for (const [key,label] of [['mathpix','Mathpix'],['pix2text','Pix2Text']]) {
            const flag=document.createElement('span');flag.className=state.providers[key]?'available':'';
            flag.textContent=label+': '+(state.providers[key]?t('ready'):t(key==='mathpix'?'noMathpix':'noPix'));
            el.append(flag);
        }
    }
    function showWarnings(q) {
        const warnings=[...(q?.ocr_warnings||[])];
        if(q?.engine_a && q?.engine_b && compact(q.engine_a)!==compact(q.engine_b))warnings.push(t('enginesDisagree'));
        $('ocrWarnings').hidden=!warnings.length;
        $('ocrWarnings').textContent=warnings.join('\n');
    }
    function compact(s){return(s||'').replace(/\s+/g,'').replaceAll('\\left','').replaceAll('\\right','').replaceAll('\\dfrac','\\frac');}
    async function renderReview() {
        const q=state.question;
        $('reviewEmpty').hidden=!!q;$('reviewContent').hidden=!q;renderReviewStatus();
        if(!q)return;
        $('questionHeading').textContent='# '+q.number;
        $('engineA').value=q.engine_a;$('engineB').value=q.engine_b;
        $('latexEditor').value=q.latex;$('notesEditor').value=q.notes;
        $('sourceError').checked=q.source_error;
        $('reviewerInput').value=q.reviewer||localStorage.getItem('mathAuditReviewer')||'';
        document.querySelectorAll('[data-check]').forEach(el=>el.checked=!!q.checks[el.dataset.check]);
        $('unverifyQuestion').disabled=q.status!=='verified';
        if(state.cropObjectUrl)URL.revokeObjectURL(state.cropObjectUrl);
        try {state.cropObjectUrl=await blobUrl(`/api/questions/${q.id}/image`);$('cropPreview').src=state.cropObjectUrl;}
        catch(err){toast(err.message,true);}
        showWarnings(q);renderAnalysis(q.analysis);schedulePreview();state.dirty=false;
    }
    function schedulePreview() {
        clearTimeout(state.previewTimer);state.previewTimer=setTimeout(renderMath,180);
    }
    async function renderMath() {
        const latex=$('latexEditor').value.trim(),el=$('mathPreview');
        el.replaceChildren();if(!latex)return;
        el.textContent='\\['+latex.replace(/^\$+|\$+$/g,'')+'\\]';
        if(!window.MathJax?.typesetPromise){$('renderNotice').textContent='MathJax CDN unavailable — LaTeX shown as text';return;}
        $('renderNotice').textContent='';
        try {await window.MathJax.typesetPromise([el]);}
        catch(err) {$('renderNotice').textContent='LaTeX render warning';}
    }
    function renderAnalysis(analysis) {
        const el=$('analysisBox');el.replaceChildren();
        if(!analysis || !Object.keys(analysis).length){el.hidden=true;return;}
        el.hidden=false;
        const add=(heading,parts)=>{
            const p=document.createElement('p'),b=document.createElement('b');b.textContent=heading+': ';
            p.append(b,document.createTextNode(Array.isArray(parts)?(parts.join(' · ')||'—'):(parts||'—')));el.append(p);
        };
        const note=document.createElement('p');note.textContent=t('analysisDisclaimer');el.append(note);
        if(!analysis.supported)add(t('analysisUnsupported'),analysis.notes);
        else {add(t('solutions'),analysis.solutions);add(t('excluded'),analysis.excluded);add(t('conditions'),analysis.domain_conditions);if(analysis.notes?.length)add(t('notesAnalysis'),analysis.notes);}
    }
    async function saveEdits({silent=false}={}) {
        if(!state.question)return;
        const q=state.question;
        const body={latex:$('latexEditor').value,engine_a:$('engineA').value,engine_b:$('engineB').value,notes:$('notesEditor').value,source_error:$('sourceError').checked};
        const newq=await json(`/api/questions/${q.id}`,{method:'PATCH',body});
        state.question=newq;state.questions=state.questions.map(r=>r.id===newq.id?newq:r);
        state.dirty=false;renderQuestions();renderReviewStatus();
        if(!silent)toast(t('saved'));
        return newq;
    }
    async function withBusy(btn,callback) {
        if(btn.disabled)return;
        btn.disabled=true;const old=btn.style.opacity;btn.style.opacity='.6';
        try {await callback();}
        catch(err) {toast(err.message||t('failed'),true);}
        finally {btn.disabled=false;btn.style.opacity=old;}
    }
    function zoomImage() {
        const img=$('largeCrop');
        img.style.width=`${Math.round((img.naturalWidth||500)*state.zoomLevel)}px`;
        $('imageZoomLevel').textContent=Math.round(state.zoomLevel*100)+'%';
    }
    function wire() {
        $('langBtn').addEventListener('click',()=>{state.lang=state.lang==='he'?'en':'he';localStorage.setItem('mathAuditLang',state.lang);localize();});
        $('settingsBtn').addEventListener('click',openSettings);
        $('connectBtn').addEventListener('click',async()=>{
            const value=$('apiBaseInput').value.trim();
            if(value && !/^https?:\/\//i.test(value)){toast(t('unexpected'),true);return;}
            state.api=value;state.token=$('tokenInput').value;
            localStorage.setItem('mathAuditAPI',state.api);sessionStorage.setItem('mathAuditToken',state.token);
            $('settingsDialog').close();await refresh();
        });
        for (const id of ['uploadBtn','startUpload']) $(id).addEventListener('click',()=>$('fileInput').click());
        $('fileInput').addEventListener('change',async e=>{
            const files=[...e.target.files];if(!files.length)return;
            toast(t('uploading'));
            const form=new FormData();files.forEach(file=>form.append('files',file));
            try {
                const created=await json('/api/pages',{method:'POST',body:form,isForm:true});
                state.page=created.pages[0]||null;state.question=null;state.dirty=false;
                await refresh();
            } catch(err){toast(err.message,true);}finally{e.target.value='';}
        });
        $('refreshBtn').addEventListener('click',()=>refresh());
        $('pageZoomIn').addEventListener('click',()=>{state.pageZoom=Math.min(4,state.pageZoom*1.25);fitCanvas();});
        $('pageZoomOut').addEventListener('click',()=>{state.pageZoom=Math.max(.6,state.pageZoom/1.25);fitCanvas();});
        $('clearSelection').addEventListener('click',()=>{state.crop=null;$('cropAction').hidden=true;drawCanvas();});
        $('pageCanvas').addEventListener('pointerdown',e=>{
            if(!state.image)return;state.dragging=true;
            state.origin=canvasPoint(e);state.crop=[...state.origin,...state.origin];
            e.currentTarget.setPointerCapture(e.pointerId);drawCanvas();
        });
        $('pageCanvas').addEventListener('pointermove',e=>{
            if(!state.dragging)return;const p=canvasPoint(e);state.crop=[...state.origin,...p];drawCanvas();
        });
        $('pageCanvas').addEventListener('pointerup',e=>{
            if(!state.dragging)return;state.dragging=false;
            state.crop=[...state.origin,...canvasPoint(e)];drawCanvas();updateCropUI();
        });
        $('pageCanvas').addEventListener('pointercancel',()=>{state.dragging=false;state.crop=null;drawCanvas();});
        $('createCrop').addEventListener('click',()=>withBusy($('createCrop'),async()=>{
            if(!state.page || !state.crop)return;
            const [x0,y0,x1,y1]=state.crop;
            const body={page_id:state.page.id,number:$('newQuestionNumber').value.trim()||'?',x0,y0,x1,y1};
            const q=await json('/api/questions',{method:'POST',body});
            state.crop=null;state.question=q;state.dirty=false;await refresh();drawCanvas();$('cropAction').hidden=true;toast(t('created'));
            const next=parseInt(body.number,10);if(Number.isFinite(next))$('newQuestionNumber').value=String(next+1);
        }));
        $('batchOCR').addEventListener('click',()=>withBusy($('batchOCR'),async()=>{
            if(!state.page)return;
            const pending=state.questions.filter(q=>q.page_id===state.page.id&&q.status!=='verified'&&!q.latex&&!q.engine_a&&!q.engine_b);
            if(!pending.length){toast(t('noBatch'));return;}
            if(!state.providers.mathpix&&!state.providers.pix2text){toast(t('noProviders'),true);return;}
            for(let i=0;i<pending.length;i++){
                toast(`${i+1} / ${pending.length} · OCR`);
                await json(`/api/questions/${pending[i].id}/ocr`,{method:'POST',body:{engines:['mathpix','pix2text'],enhance:$('ocrEnhance').checked}});
            }
            await refresh();toast(t('batchDone'));
        }));
        $('inventorySave').addEventListener('click',()=>withBusy($('inventorySave'),async()=>{
            if(!state.page)return;
            const updated=await json(`/api/pages/${state.page.id}/inventory`,{method:'PATCH',body:{expected_numbers:$('inventoryInput').value}});
            state.page=updated;state.pages=state.pages.map(p=>p.id===updated.id?updated:p);
            await loadCoverage();toast(t('coverageSaved'));
        }));
        $('deletePage').addEventListener('click',()=>withBusy($('deletePage'),async()=>{
            if(!state.page||!confirm(t('confirmDelete')))return;
            await json(`/api/pages/${state.page.id}`,{method:'DELETE'});state.page=null;state.question=null;await refresh();
        }));
        document.querySelectorAll('.filter-chip').forEach(b=>b.addEventListener('click',()=>{
            state.filter=b.dataset.filter;document.querySelectorAll('.filter-chip').forEach(el=>el.classList.toggle('active',el===b));renderQuestions();
        }));
        $('zoomCrop').addEventListener('click',()=>{
            if(!state.cropObjectUrl)return;
            state.zoomLevel=1;
            $('largeCrop').src=state.cropObjectUrl;
            zoomImage();$('imageDialog').showModal();
        });
        $('imageClose').addEventListener('click',()=>$('imageDialog').close());
        $('largeCrop').addEventListener('load', zoomImage);
        $('zoomIn').addEventListener('click',()=>{state.zoomLevel=Math.min(3,state.zoomLevel+0.25);zoomImage();});
        $('zoomOut').addEventListener('click',()=>{state.zoomLevel=Math.max(0.5,state.zoomLevel-0.25);zoomImage();});
        $('useA').addEventListener('click',()=>{$('latexEditor').value=$('engineA').value;state.dirty=true;schedulePreview();});
        $('useB').addEventListener('click',()=>{$('latexEditor').value=$('engineB').value;state.dirty=true;schedulePreview();});
        for (const id of ['latexEditor','engineA','engineB','notesEditor']) $(id).addEventListener('input',()=>{state.dirty=true;if(id==='latexEditor')schedulePreview();});
        $('sourceError').addEventListener('change',()=>state.dirty=true);
        $('saveQuestion').addEventListener('click',()=>withBusy($('saveQuestion'),()=>saveEdits()));
        $('runOcr').addEventListener('click',()=>withBusy($('runOcr'),async()=>{
            if(state.dirty && !confirm(t('unsaved')))return;
            const data=await json(`/api/questions/${state.question.id}/ocr`,{method:'POST',body:{engines:['mathpix','pix2text'],enhance:$('ocrEnhance').checked}});
            state.question=data.question;state.questions=state.questions.map(q=>q.id===state.question.id?state.question:q);
            await renderReview();renderQuestions();toast(t('ocrDone'));
        }));
        $('analyzeQuestion').addEventListener('click',()=>withBusy($('analyzeQuestion'),async()=>{
            if(state.dirty)await saveEdits({silent:true});
            const result=await json(`/api/questions/${state.question.id}/analyze`,{method:'POST',body:{}});
            state.question.analysis=result;renderAnalysis(result);toast(t('analyzeReady'));
        }));
        $('verifyQuestion').addEventListener('click',()=>withBusy($('verifyQuestion'),async()=>{
            if(state.dirty)await saveEdits({silent:true});
            const checks=Object.fromEntries([...document.querySelectorAll('[data-check]')].map(el=>[el.dataset.check,el.checked]));
            if(Object.values(checks).some(v=>!v)){toast(t('checkAll'),true);return;}
            const reviewer=$('reviewerInput').value.trim();if(reviewer.length<2){toast(t('reviewNameRequired'),true);return;}
            localStorage.setItem('mathAuditReviewer',reviewer);
            state.question=await json(`/api/questions/${state.question.id}/verify`,{method:'POST',body:{reviewer,checks}});
            await refresh();toast(t('verifySuccess'));
        }));
        $('unverifyQuestion').addEventListener('click',()=>withBusy($('unverifyQuestion'),async()=>{
            state.question=await json(`/api/questions/${state.question.id}/unverify`,{method:'POST',body:{}});
            await refresh();
        }));
        $('deleteQuestion').addEventListener('click',()=>withBusy($('deleteQuestion'),async()=>{
            if(!state.question||!confirm(t('confirmDelete')))return;
            await json(`/api/questions/${state.question.id}`,{method:'DELETE'});
            state.question=null;await refresh();
        }));
        $('exportBtn').addEventListener('click',()=>$('exportDialog').showModal());
        $('exportClose').addEventListener('click',()=>$('exportDialog').close());
        document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>withBusy(button,async()=>{
            await download(button.dataset.export);$('exportDialog').close();
        })));
        window.addEventListener('resize',()=>{if(state.image)fitCanvas();});
        window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
    }
    function openSettings() {
        $('apiBaseInput').value=state.api;$('tokenInput').value=state.token;$('settingsDialog').showModal();
    }
    async function init() {
        localize();wire();
        // GitHub Pages cannot host the Python API. Let the user set its URL.
        if(location.hostname.endsWith('github.io') && !state.api) {
            openSettings();toast(t('unexpected'),true);return;
        }
        await refresh();
    }
    document.addEventListener('DOMContentLoaded',init);
})();
