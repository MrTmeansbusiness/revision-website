 'use strict';

  // Paste sanitizer: preserves spaces from PDF paste, removes ZW chars/soft hyphens, and joins wrapped lines with a space
  function sanitizePastedText(raw){
    return String(raw||'')
      .replace(/\u00A0/g,' ')
      .replace(/[\u200B\u200C\u200D]/g,'')
      .replace(/\u00AD/g,'')
      .replace(/\r\n?/g,'\n')
      .replace(/([A-Za-z0-9])\n(?=[A-Za-z0-9])/g,'$1 ');
  }
  function insertAtCaret(field, text){
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? field.value.length;
    const before = field.value.slice(0, start);
    const after = field.value.slice(end);
    field.value = before + text + after;
    const pos = before.length + text.length;
    field.setSelectionRange?.(pos, pos);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function firstTextChar(node){
    const s = (node && node.textContent) ? node.textContent : '';
    return s.trimStart().charAt(0) || '';
  }
  function htmlToPlainWithSpaces(html){
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    let out = '';
    const blockRe = /^(P|DIV|BR|LI|UL|OL|TR|TD|TH|H1|H2|H3|H4|H5|H6|SECTION|ARTICLE|HEADER|FOOTER)$/;
    function walk(node){
      if (node.nodeType === Node.TEXT_NODE){ out += node.nodeValue; return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.nodeName;
      if (tag === 'BR'){ out += '\n'; return; }
      const isBlock = blockRe.test(tag);
      if (isBlock && out && !out.endsWith('\n')) out += '\n';
      const children = Array.from(node.childNodes);
      for (let i=0;i<children.length;i++){
        const child = children[i];
        walk(child);
        const next = children[i+1];
        if (next){
          const last = out.slice(-1);
          const nf = firstTextChar(next);
          if (/[A-Za-z0-9)]/.test(last) && /[A-Za-z0-9(]/.test(nf)) out += ' ';
        }
      }
      if (isBlock && !out.endsWith('\n')) out += '\n';
    }
    walk(wrap);
    return out;
  }
  function attachPasteSanitizer(node){
    if (!node) return;
    node.addEventListener('paste', (e) => {
      const data = (e.clipboardData || window.clipboardData);
      if (!data) return;
      const html = data.getData('text/html');
      const plain = data.getData('text/plain');
      if (!html && !plain) return;
      e.preventDefault();
      const converted = html ? htmlToPlainWithSpaces(html) : plain;
      insertAtCaret(node, sanitizePastedText(converted));
    });
  }
 

// Utilities shared with app.js expectations
const CUSTOM_BANK_KEY = 'igcse_econ_custom_bank_v1';
function loadCustomBank(){ try { return JSON.parse(localStorage.getItem(CUSTOM_BANK_KEY)) || {}; } catch { return {}; } }
function saveCustomBank(bank){ localStorage.setItem(CUSTOM_BANK_KEY, JSON.stringify(bank||{})); }
function getDefaultBank(){ return typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK : {}; }
function mergedTopics(sectionId){
  const def = getDefaultBank()[sectionId]?.topics || [];
  const custom = loadCustomBank()[sectionId]?.topics || [];
  const map = new Map();
  [...def, ...custom].forEach(t=>{ if(!map.has(t.id)) map.set(t.id,t); });
  return Array.from(map.values());
}

async function syncBank(bank){
  try {
    await fetch('/save-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bank||{})
    });
  } catch (e) {}
}

// Manual entry wiring (bank.html)
const form = document.getElementById('qForm');
if (form) {
  // Tabs: manual vs pdf
  (function tabs(){
    const btns = Array.from(document.querySelectorAll('[data-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-tabpanel]'));
    function setTab(name){
      panels.forEach(p => { p.hidden = p.getAttribute('data-tabpanel') !== name; });
      btns.forEach(b => {
        const active = b.getAttribute('data-tab')===name;
        b.classList.toggle('bg-emerald-50', active);
        b.classList.toggle('text-emerald-700', active);
      });
      try { localStorage.setItem('bank_tab', name); } catch {}
    }
    btns.forEach(b => b.addEventListener('click', ()=> setTab(b.getAttribute('data-tab'))));
    const initial = localStorage.getItem('bank_tab') || 'manual';
    setTab(initial);
  })();
  const el = id => document.getElementById(id);
  const sectionEl = el('section');
  const topicEl = el('topic');
  const qTextEl = el('qText');
  const optA = el('optA');
  const optB = el('optB');
  const optC = el('optC');
  const optD = el('optD');
  const answerEl = el('answer');
  const imageFile = el('imageFile');
  // Apply sanitizer now that elements exist
  [qTextEl, optA, optB, optC, optD].forEach(attachPasteSanitizer);
  const saveBtn = el('saveBtn');
  const exportBtn = el('exportBtn');
  const clearBtn = el('clearBtn');

  // Sanitize PDF paste artifacts to preserve spaces between words
  function cleanPdfPaste(s){
    return (s||'')
      .replace(/\u00A0/g, ' ')      // non-breaking space -> space
      .replace(/\u200B/g, '')       // zero-width space -> remove
      .replace(/\u200C|\u200D/g, '')// zero-width joiners -> remove
      .replace(/\u00AD/g, '')       // soft hyphen -> remove
      .replace(/(\S)[\r\n]+(\S)/g, '$1 $2') // join wrapped lines with space
      .replace(/[\r\n]+/g, ' ')     // other newlines -> space
      .replace(/[\t ]{2,}/g, ' ')    // collapse repeated spaces/tabs
      .trim();
  }

  function attachPasteSanitizer(input){
    input?.addEventListener('paste', (e) => {
      const cd = e.clipboardData || window.clipboardData;
      if (!cd) return; // fallback to default behavior
      const raw = cd.getData('text');
      if (!raw) return;
      e.preventDefault();
      const cleaned = cleanPdfPaste(raw);
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      input.value = before + cleaned + after;
      const caret = (before + cleaned).length;
      input.setSelectionRange?.(caret, caret);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Apply to question text and all option inputs
  [qTextEl, optA, optB, optC, optD].forEach(attachPasteSanitizer);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const section = sectionEl.value;
    const topic = (topicEl.value || 'general').trim() || 'general';
    const text = (qTextEl.value || '').trim();
    const choices = [optA.value, optB.value, optC.value, optD.value].map(s => (s||'').trim());
    const answer = parseInt(answerEl.value, 10) || 0;
    if (!text) { alert('Please enter the question text.'); return; }
    if (choices.some(c => !c)) { alert('Please fill all four options A–D.'); return; }
    let image = '';
    const f = imageFile.files && imageFile.files[0];
    if (f) image = await fileToDataUrl(f);

    const bank = loadCustomBank();
    if (!bank[section]) bank[section] = { topics: [], questions: [] };
    // ensure topic exists
    const topics = new Map((bank[section].topics||[]).map(t=>[t.id,t]));
    if (!topics.has(topic)) { topics.set(topic, { id: topic, name: topic }); bank[section].topics = Array.from(topics.values()); }
    bank[section].questions.push({ topic, text, choices, answer, image });
    saveCustomBank(bank);
    syncBank(bank);
    alert('Question added to custom bank.');
    form.reset();
    renderList();
  });

  function doExport(){
    const data = JSON.stringify(loadCustomBank(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'igcse_econ_custom_bank.json'; a.click(); URL.revokeObjectURL(url);
  }
  exportBtn.addEventListener('click', doExport);
  document.getElementById('exportBtn2')?.addEventListener('click', doExport);
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all custom questions?')) { saveCustomBank({}); syncBank({}); alert('Cleared.'); renderList(); }
  });

  const listEl = document.getElementById('qList');
  const sectionMeta = [
    { id: 's1', name: 'Section 1: The basic economic problem.' },
    { id: 's2', name: 'Section 2: The allocation of resources.' },
    { id: 's3', name: 'Section 3: Microeconomic decision makers.' },
    { id: 's4', name: 'Section 4: The government and the macroeconomy.' },
    { id: 's5', name: 'Section 5: Economic development.' },
    { id: 's6', name: 'Section 6: International trade and globalisation.' },
  ];
  const sectionName = id => sectionMeta.find(s=>s.id===id)?.name || id;
  const sectionSelectHtml = (current) => `<select class="border rounded px-2 py-1">${sectionMeta.map(o=>`<option value="${o.id}" ${current===o.id?'selected':''}>${o.name}</option>`).join('')}</select>`;

  // Simple stable hash for identifying default questions
  function qHash(q){
    const payload = JSON.stringify({ t: (q.text||'').trim(), c: (q.choices||[]).map(s=>String(s||'').trim()), a: q.answer|0, tp: (q.topic||'general').trim() });
    let h = 0; for (let i=0;i<payload.length;i++){ h = ((h<<5)-h) + payload.charCodeAt(i); h |= 0; }
    return 'h'+(h>>>0).toString(36);
  }

  function ensureSection(custom, sec){ if (!custom[sec]) custom[sec] = { topics: [], questions: [], removed: [], overrides: {} }; return custom[sec]; }

  function mergedForList(){
    const custom = loadCustomBank();
    const out = {};
    sectionMeta.map(s=>s.id).forEach(sec => {
      const base = (typeof QUESTION_BANK !== 'undefined' ? (QUESTION_BANK[sec]||{ topics:[], questions:[] }) : { topics:[], questions:[] });
      const cs = ensureSection(custom, sec);
      const removed = new Set(cs.removed||[]);
      const overrides = cs.overrides||{};

      const items = [];
      // include defaults (minus removed), apply overrides
      (base.questions||[]).forEach((dq) => {
        const h = qHash(dq);
        if (removed.has(h)) return;
        if (overrides[h]) items.push({ ...overrides[h], __src: 'default-override', __origHash: h, __sec: sec });
        else items.push({ ...dq, __src: 'default', __hash: h, __sec: sec });
      });
      // include custom questions
      (cs.questions||[]).forEach((cq, idx) => items.push({ ...cq, __src: 'custom', __idx: idx, __sec: sec }));

      // Attach topics union for select lists if needed (we render topic as free text here)
      out[sec] = { items };
    });
    return out;
  }

  function renderList(){
    if (!listEl) return;
    const merged = mergedForList();
    listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    const orderedSecs = sectionMeta.map(s=>s.id);
    orderedSecs.forEach(sec => {
      const secData = merged[sec];
      if (!secData || !secData.items || secData.items.length === 0) return;
      // section header
      const h = document.createElement('h3');
      h.className = 'text-sm font-semibold text-slate-600 mt-6';
      h.textContent = sectionName(sec);
      frag.appendChild(h);

      secData.items.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-xl p-4 shadow-sm';
        card.innerHTML = `
          <div class="grid gap-3">
            <div class="grid md:grid-cols-2 gap-3">
              <label class="text-sm">Section ${sectionSelectHtml(q.__sec||sec)}</label>
              <label class="text-sm">Topic <input class="topic border rounded px-2 py-1 w-full" value="${escapeHtml(q.topic||'general')}"></label>
            </div>
            <label class="text-sm">Question
              <textarea class="qtext border rounded px-3 py-2 w-full" rows="3">${escapeHtml(q.text||'')}</textarea>
            </label>
            <div>
              <div class="text-sm mb-1">Options (A–D)</div>
              <div class="grid md:grid-cols-2 gap-2">
                <input class="optA border rounded px-3 py-2" value="${escapeHtml(q.choices?.[0]||'')}">
                <input class="optB border rounded px-3 py-2" value="${escapeHtml(q.choices?.[1]||'')}">
                <input class="optC border rounded px-3 py-2" value="${escapeHtml(q.choices?.[2]||'')}">
                <input class="optD border rounded px-3 py-2" value="${escapeHtml(q.choices?.[3]||'')}">
              </div>
            </div>
            <div class="grid md:grid-cols-2 gap-3 items-center">
              <label class="text-sm">Correct answer
                <select class="answer border rounded px-2 py-1">
                  ${['A','B','C','D'].map((l,i)=>`<option value="${i}" ${i===(q.answer||0)?'selected':''}>${l}</option>`).join('')}
                </select>
              </label>
              <div class="flex items-center gap-3">
                ${q.image ? `<img src="${q.image}" alt="img" class="max-h-16 rounded border">` : '<span class="text-xs text-slate-500">No image</span>'}
                <input type="file" accept="image/*" class="imgFile text-sm">
                ${q.image ? '<button type="button" class="rmImg text-xs text-slate-600 underline">Remove image</button>' : ''}
              </div>
            </div>
            <div class="flex gap-3">
              <button type="button" class="save bg-emerald-600 text-white rounded-md px-3 py-1.5 text-sm">Save</button>
              <button type="button" class="del border rounded-md px-3 py-1.5 text-sm">Delete</button>
              <span class="text-xs text-slate-400 ml-auto">${q.__src==='custom' ? 'custom' : q.__src==='default-override' ? 'default (overridden)' : 'default'}</span>
            </div>
          </div>
        `;

        // attach paste sanitizer to text fields
        [
          card.querySelector('.qtext'),
          card.querySelector('.optA'),
          card.querySelector('.optB'),
          card.querySelector('.optC'),
          card.querySelector('.optD')
        ].forEach(attachPasteSanitizer);

        // Remove image
        card.querySelector('.rmImg')?.addEventListener('click', () => {
          const b = loadCustomBank();
          if (q.__src === 'custom'){
            const item = b[q.__sec]?.questions?.[q.__idx]; if (!item) return; item.image = '';
          } else {
            const hq = q.__src==='default-override' ? q.__origHash : q.__hash;
            const secBlock = ensureSection(b, q.__sec);
            const cur = secBlock.overrides?.[hq] || { topic:q.topic, text:q.text, choices:q.choices, answer:q.answer, image:'' };
            cur.image = '';
            secBlock.overrides[hq] = cur;
          }
          saveCustomBank(b);
          syncBank(b);
          renderList();
        });

        // Save edits
        card.querySelector('.save').addEventListener('click', async () => {
          const newSection = card.querySelector('select').value;
          const topic = (card.querySelector('.topic').value||'general').trim()||'general';
          const text = (card.querySelector('.qtext').value||'').trim();
          const choices = ['.optA','.optB','.optC','.optD'].map(sel=>card.querySelector(sel).value.trim());
          const answer = parseInt(card.querySelector('.answer').value,10)||0;
          if (!text || choices.some(c=>!c)) { alert('Please fill question and all four options.'); return; }

          let image = q.image||'';
          const f = card.querySelector('.imgFile').files?.[0];
          if (f) image = await fileToDataUrl(f);

          const b = loadCustomBank();
          if (q.__src === 'custom'){
            // Update/move custom question
            ensureSection(b, q.__sec);
            const fromArr = b[q.__sec].questions;
            const entry = fromArr.splice(q.__idx,1)[0]; // remove from old position
            ensureSection(b, newSection);
            // ensure topic exists in new section topics list
            const tmap = new Map((b[newSection].topics||[]).map(t=>[t.id,t]));
            if (!tmap.has(topic)) { tmap.set(topic, { id: topic, name: topic }); b[newSection].topics = Array.from(tmap.values()); }
            b[newSection].questions.push({ topic, text, choices, answer, image });
          } else {
            // Editing a default question creates/updates an override and optionally removes original if moving section
            const origHash = q.__src==='default-override' ? q.__origHash : q.__hash;
            // mark removed in original section if moving section
            const origSecBlock = ensureSection(b, q.__sec);
            if (!origSecBlock.removed) origSecBlock.removed = [];
            if (!origSecBlock.removed.includes(origHash)) origSecBlock.removed.push(origHash);

            // add override to newSection as a custom question (since section changed) or as override in same section
            if (newSection === q.__sec){
              origSecBlock.overrides = origSecBlock.overrides || {};
              origSecBlock.overrides[origHash] = { topic, text, choices, answer, image };
              // ensure topic in topics list
              const tmap = new Map((origSecBlock.topics||[]).map(t=>[t.id,t]));
              if (!tmap.has(topic)) { tmap.set(topic, { id: topic, name: topic }); origSecBlock.topics = Array.from(tmap.values()); }
            } else {
              const newSecBlock = ensureSection(b, newSection);
              // ensure topic exists in new section topics list
              const tmap = new Map((newSecBlock.topics||[]).map(t=>[t.id,t]));
              if (!tmap.has(topic)) { tmap.set(topic, { id: topic, name: topic }); newSecBlock.topics = Array.from(tmap.values()); }
              newSecBlock.questions.push({ topic, text, choices, answer, image });
            }
          }

          saveCustomBank(b);
          syncBank(b);
          renderList();
        });

        // Delete
        card.querySelector('.del').addEventListener('click', () => {
          if (!confirm('Delete this question?')) return;
          const b = loadCustomBank();
          if (q.__src === 'custom'){
            ensureSection(b, q.__sec);
            b[q.__sec].questions.splice(q.__idx,1);
          } else {
            const hq = q.__src==='default-override' ? q.__origHash : q.__hash;
            const secBlock = ensureSection(b, q.__sec);
            secBlock.removed = secBlock.removed || [];
            if (!secBlock.removed.includes(hq)) secBlock.removed.push(hq);
            // also drop override if existed
            if (secBlock.overrides && secBlock.overrides[hq]) delete secBlock.overrides[hq];
          }
          saveCustomBank(b);
          syncBank(b);
          renderList();
        });

        frag.appendChild(card);
      });
    });
    listEl.appendChild(frag);
  }

  // initial render
  renderList();
}

async function fileToDataUrl(file){
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(s){
  return s.replace(/[&<>"]?/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}

// ---------------- PDF Import (bank.html) ----------------
(() => {
  const pdfInput = document.getElementById('pdfFile');
  const parseBtn = document.getElementById('parseBtn');
  const saveParsedBtn = document.getElementById('saveParsedBtn');
  const tbody = document.getElementById('questionsTbody');
  const selectAll = document.getElementById('selectAllParsed');
  const useOcr = document.getElementById('useOcr');
  const imageOnlyToggle = document.getElementById('imageOnly');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  if (!pdfInput || !parseBtn || !tbody) return; // not on bank import UI

  // Ensure pdf.js worker
  try {
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions){
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
  } catch {}

  let parsed = [];

  pdfInput.addEventListener('change', () => { parseBtn.disabled = !pdfInput.files?.length; });

  parseBtn.addEventListener('click', async () => {
    if (!pdfInput.files?.length) return;
    parseBtn.disabled = true; saveParsedBtn.disabled = true; tbody.innerHTML='';
    try {
      let structured;
      if (useOcr?.checked) {
        showProgress(true, 0, 'Starting OCR…');
        const text = await ocrExtractPdfText(pdfInput.files[0], setProgress);
        showProgress(false);
        // fallback to naive parse when using OCR
        parsed = parseQuestionsFromText(text);
      } else {
        showProgress(true, 5, 'Extracting text positions…');
        structured = await extractPdfItems(pdfInput.files[0]);
        showProgress(true, 60, 'Grouping MCQs…');
        parsed = await parseMcqsFromItems(structured, pdfInput.files[0], { imageOnly: !!imageOnlyToggle?.checked });
        showProgress(false);
        if (!parsed.length) {
          // fallback to plain text if grouping failed
          const text = await extractPdfText(pdfInput.files[0]);
          parsed = parseQuestionsFromText(text);
        }
      }
      renderReviewTable(parsed);
      saveParsedBtn.disabled = parsed.length === 0;
    } catch (e) {
      alert('Failed to parse PDF: ' + (e.message||e));
    } finally {
      parseBtn.disabled = false;
    }
  });

  saveParsedBtn?.addEventListener('click', () => {
    if (!parsed || parsed.length === 0) return;
    const bank = loadCustomBank();
    // read back edited rows
    const rows = Array.from(tbody.querySelectorAll('tr[data-i]'));
    rows.forEach(row => {
      const cb = row.querySelector('input[type="checkbox"][name="pick"]');
      if (cb && !cb.checked) return; // skip unselected
      const i = parseInt(row.getAttribute('data-i'),10);
      const q = parsed[i]; if (!q) return;
      const section = row.querySelector('select[name="section"]').value;
      const topic = (row.querySelector('input[name="topic"]').value||'general').trim()||'general';
      const answer = parseInt(row.querySelector('select[name="answer"]').value,10)||0;
      const a = row.querySelector('input[name="A"]').value.trim();
      const b = row.querySelector('input[name="B"]').value.trim();
      const c = row.querySelector('input[name="C"]').value.trim();
      const d = row.querySelector('input[name="D"]').value.trim();
      const text = row.querySelector('textarea[name="text"]').value.trim();
      const imgEl = row.querySelector('img[name="imgPrev"]');
      const image = imgEl?.getAttribute('src') || '';
      if (!bank[section]) bank[section] = { topics: [], questions: [] };
      const tmap = new Map((bank[section].topics||[]).map(t=>[t.id,t]));
      if (!tmap.has(topic)) { tmap.set(topic, { id: topic, name: topic }); bank[section].topics = Array.from(tmap.values()); }
      const payload = { topic, text, choices:[a,b,c,d], answer };
      if (image) payload.image = image;
      bank[section].questions.push(payload);
    });
    saveCustomBank(bank);
    syncBank(bank);
    alert('Saved parsed questions to custom bank.');
    try { localStorage.setItem('bank_tab','manual'); } catch {}
    location.reload();
  });

  function showProgress(show, pct=0, msg=''){
    if (!progressWrap) return;
    progressWrap.hidden = !show;
    if (show) setProgress(pct, msg);
  }
  function setProgress(pct, msg){
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (progressText) progressText.textContent = msg||'';
  }

  async function extractPdfText(file){
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let out = '';
    for (let i=2;i<=pdf.numPages;i++){ // skip page 1 (cover/instructions)
      const page = await pdf.getPage(i);
      const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const items = content.items.map(it=>it.str).join(' ');
      out += '\n' + items;
    }
    return tidyPdfText(out);
  }

  async function extractPdfItems(file){
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i=2;i<=pdf.numPages;i++){ // skip page 1 (cover/instructions)
      const page = await pdf.getPage(i);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const footerY = 60; // px cutoff from bottom to ignore footer
      const items = content.items.map(it => {
        // transform to get approximate coordinates
        const [a,b,c,d,e,f] = it.transform; // pdf.js text matrix
        const x = e, y = f; // top-left-ish
        return { str: String(it.str||''), x, y, fontHeight: Math.hypot(a,d), dir: it.dir };
      }).filter(it => it.y > footerY); // ignore footer text near bottom
      // sort visually: by y desc (pdf space), then x asc
      items.sort((p,q) => (q.y - p.y) || (p.x - q.x));
      pages.push({ index: i, scale, width: viewport.width, height: viewport.height, items });
    }
    return pages;
  }

  async function ocrExtractPdfText(file, onProgress){
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let out = '';
    for (let i=1;i<=pdf.numPages;i++){
      onProgress && onProgress(Math.round(((i-1)/pdf.numPages)*100), `Rendering page ${i}/${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      onProgress && onProgress(Math.round(((i-1)/pdf.numPages)*100), `OCR page ${i}/${pdf.numPages}…`);
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      out += '\n' + text;
    }
    return tidyPdfText(out);
  }

  function tidyPdfText(s){
    return (s||'')
      .replace(/\u00A0/g,' ')   // NBSP -> space
      .replace(/[\u200B\u200C\u200D]/g,'') // zero width
      .replace(/\u00AD/g,'')    // soft hyphen
      .replace(/([a-z0-9])\n(?=[a-z0-9])/gi, '$1 ') // join wrapped lines
      .replace(/[\t ]{2,}/g,' ')
      .trim();
  }

  function renderReviewTable(items){
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((q,i) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-i', String(i));
      tr.innerHTML = `
        <td class="p-2 align-top text-center w-8"><input type="checkbox" name="pick" class="h-4 w-4"></td>
        <td class="p-2 align-top text-slate-500">${i+1}</td>
        <td class="p-2 w-[28rem]"><textarea name="text" class="w-full border rounded p-2 text-sm" rows="3">${escapeHtml(q.text)}</textarea></td>
        <td class="p-2">
          <select name="section" class="border rounded px-2 py-1">
            <option value="s1">Section 1: The basic economic problem.</option>
            <option value="s2">Section 2: The allocation of resources.</option>
            <option value="s3">Section 3: Microeconomic decision makers.</option>
            <option value="s4">Section 4: The government and the macroeconomy.</option>
            <option value="s5">Section 5: Economic development.</option>
            <option value="s6">Section 6: International trade and globalisation.</option>
          </select>
        </td>
        <td class="p-2"><input name="topic" class="border rounded px-2 py-1 w-36" value="${escapeHtml(q.topic)}"></td>
        <td class="p-2">
          <div class="grid grid-cols-1 gap-1">
            <input name="A" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[0]||'')}">
            <input name="B" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[1]||'')}">
            <input name="C" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[2]||'')}">
            <input name="D" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[3]||'')}">
          </div>
        </td>
        <td class="p-2">
          <select name="answer" class="border rounded px-2 py-1">
            ${['A','B','C','D'].map((l,idx)=>`<option value="${idx}" ${idx===(q.answer||0)?'selected':''}>${l}</option>`).join('')}
          </select>
        </td>
        <td class="p-2">${q.image ? `<img name="imgPrev" src="${q.image}" class="max-h-24 rounded border">` : '<span class="text-xs text-slate-400">—</span>'}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    // Apply paste sanitizers to review table fields
    tbody.querySelectorAll('textarea, input[type="text"]').forEach(attachPasteSanitizer);
    // Select All handler
    if (selectAll){
      selectAll.checked = false;
      selectAll.onchange = () => {
        const boxes = tbody.querySelectorAll('input[type="checkbox"][name="pick"]');
        boxes.forEach(b => { b.checked = !!selectAll.checked; });
      };
    }
  }

  function parseQuestionsFromText(text){
    // Split by number at start of question lines
    const blocks = String(text||'')
      .replace(/\r\n?/g,'\n')
      .split(/(?=\n?\s*\d+\s)/g)
      .map(s=>s.trim())
      .filter(Boolean);
    const out = [];
    blocks.forEach(b => {
      const m = b.match(/^(\d+)\s+([\s\S]+)/);
      if (!m) return;
      const body = m[2].trim();
      // Extract choices first
      let a='',c1='',c2='',c3='',c4='';
      const lineForm = body.split('\n').map(s=>s.trim()).filter(Boolean);
      const qLines = [];
      lineForm.forEach(line => {
        const mm = line.match(/^([A-D])[\).\s]+(.+)/i);
        if (mm){
          const idx = mm[1].toUpperCase().charCodeAt(0)-65;
          if (idx===0) c1 = mm[2].trim();
          if (idx===1) c2 = mm[2].trim();
          if (idx===2) c3 = mm[2].trim();
          if (idx===3) c4 = mm[2].trim();
        } else qLines.push(line);
      });
      if (!(c1&&c2&&c3&&c4)){
        const alt = body.match(/A[\).\s]+(.+?)B[\).\s]+(.+?)C[\).\s]+(.+?)D[\).\s]+(.+)/i);
        if (alt){ c1=alt[1].trim(); c2=alt[2].trim(); c3=alt[3].trim(); c4=alt[4].trim(); }
      }
      const textQ = qLines.join(' ').trim();
      if (!textQ) return;
      out.push({ text: textQ, choices: [c1,c2,c3,c4], answer: 0, section: 's2', topic: 'general' });
    });
    return out;
  }

  async function parseMcqsFromItems(pages, file, opts={}){
    const out = [];
    pages.forEach(pg => {
      const leftBand = Math.min(...pg.items.map(it=>it.x).concat([Infinity]));
      const bandWidth = 40; // px band for question numbers at left
      let current = null;
      let buffer = [];
      const ranges = [];
      const flush = (endY) => {
        if (!current) return;
        const text = buffer.join(' ').replace(/\s{2,}/g,' ').trim();
        ranges.push({ page: pg.index, yTop: current.yStart, yBottom: endY ?? 0, scale: pg.scale });
        out.push({ __page: pg.index, __yTop: current.yStart, __yBottom: endY ?? 0, textRaw: text });
        current = null; buffer = [];
      };
      for (let k=0;k<pg.items.length;k++){
        const it = pg.items[k];
        const s = tidyPdfText(it.str);
        if (!s) continue;
        // detect number token in left band
        if (it.x <= leftBand + bandWidth && /^\d{1,3}$/.test(s)){
          if (current) { flush(it.y); }
          current = { n: s, yStart: it.y };
          continue;
        }
        if (!current) continue;
        buffer.push(s);
      }
      if (current) flush(0); // until footer/bottom
    });

    // Split choices and attach crops
    const enriched = out.map(o => {
      if (opts.imageOnly){
        return { text: '', choices: ['','','',''], answer: 0, section: 's2', topic: 'general', __page:o.__page, __yTop:o.__yTop, __yBottom:o.__yBottom };
      }
      const { stem, choices } = splitChoices(o.textRaw||'');
      return { text: stem||'', choices: (choices&&choices.length===4?choices:['','','','']), answer: 0, section: 's2', topic: 'general', __page:o.__page, __yTop:o.__yTop, __yBottom:o.__yBottom };
    }).filter(q => opts.imageOnly ? true : !!q.text);

    const withImages = await attachCrops(file, pages, enriched);
    return withImages;
  }

  async function attachCrops(file, pages, questions){
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const byPage = new Map(pages.map(p=>[p.index, p]));
    for (const q of questions){
      const meta = byPage.get(q.__page);
      if (!meta) continue;
      const page = await pdf.getPage(q.__page);
      const viewport = page.getViewport({ scale: meta.scale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      // map PDF y to canvas y (top-left origin)
      const topY = (q.__yTop>0) ? (canvas.height - q.__yTop) : 0;
      const bottomY = (q.__yBottom>0) ? (canvas.height - q.__yBottom) : (canvas.height - 70);
      const y1 = Math.max(0, Math.min(topY, bottomY) - 12);
      const y2 = Math.min(canvas.height, Math.max(topY, bottomY) + 12);
      const x1 = 24, x2 = canvas.width - 24;
      const w = Math.max(1, x2 - x1);
      const h = Math.max(1, y2 - y1);
      if (h < 30) continue; // too small
      const crop = document.createElement('canvas');
      crop.width = w; crop.height = h;
      const cctx = crop.getContext('2d');
      cctx.drawImage(canvas, x1, y1, w, h, 0, 0, w, h);
      if (!looksBlank(crop)){
        try { q.image = crop.toDataURL('image/png'); } catch {}
      }
    }
    return questions;
  }

  function looksBlank(cv){
    try{
      const ctx = cv.getContext('2d');
      const { width:w, height:h } = cv;
      const step = 8;
      const data = ctx.getImageData(0,0,w,h).data;
      let colored = 0, total=0;
      for (let y=0;y<h;y+=step){
        for (let x=0;x<w;x+=step){
          const i = (y*w + x)*4;
          const r=data[i], g=data[i+1], b=data[i+2];
          const lum = 0.2126*r + 0.7152*g + 0.0722*b;
          if (lum < 245) colored++;
          total++;
        }
      }
      return colored/total < 0.02;
    } catch { return true; }
  }

  function splitChoices(text){
    // Look for A..B..C..D segments, allowing punctuation/linebreaks between
    const m = text.match(/([\s\S]+?)\sA[\).\s]+([\s\S]+?)\sB[\).\s]+([\s\S]+?)\sC[\).\s]+([\s\S]+?)\sD[\).\s]+([\s\S]+)/i);
    if (m){
      return { stem: m[1].trim(), choices:[m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()] };
    }
    // fallback: try line-based splitting
    const lines = text.split(/\n|\s{2,}/g).map(s=>s.trim()).filter(Boolean);
    const stem = [];
    const choices = [];
    for (const ln of lines){
      const mm = ln.match(/^([A-D])[\).\s]+(.+)/i);
      if (mm){ choices[mm[1].toUpperCase().charCodeAt(0)-65] = mm[2].trim(); }
      else stem.push(ln);
    }
    return { stem: stem.join(' ').trim(), choices: (choices.length===4?choices:[]) };
  }
})();
