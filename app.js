'use strict';

// Sections config
const SECTIONS = [
  { id: 's1', label: 'Section 1: The basic economic problem.' },
  { id: 's2', label: 'Section 2: The allocation of resources.' },
  { id: 's3', label: 'Section 3: Microeconomic decision makers.' },
  { id: 's4', label: 'Section 4: The government and the macroeconomy.' },
  { id: 's5', label: 'Section 5: Economic development.' },
  { id: 's6', label: 'Section 6: International trade and globalisation.' },
];

// Storage helpers (per code)
const STORAGE_KEY = 'igcse_econ_revision_v1';
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

// Compute overall average across sections
function computeOverallAverage(profile){
  try {
    const perSection = SECTIONS.map(s => average(profile.scores[s.id]));
    const vals = perSection.filter(v => Number.isFinite(v));
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
  } catch { return 0; }
}

// Map overall % to grade and color
function gradeFromPct(pct){
  const p = Number(pct)||0;
  if (p >= 90) return { label: 'A*', color: '#16a34a' };
  if (p >= 80) return { label: 'A',  color: '#22c55e' };
  if (p >= 70) return { label: 'B',  color: '#84cc16' };
  if (p >= 60) return { label: 'C',  color: '#eab308' };
  if (p >= 50) return { label: 'D',  color: '#f59e0b' };
  if (p >= 40) return { label: 'E',  color: '#f97316' };
  if (p >= 30) return { label: 'F',  color: '#ef4444' };
  if (p >= 20) return { label: 'G',  color: '#dc2626' };
  return { label: 'U', color: '#7f1d1d' };
}

function nextGradeInfo(pct){
  const p = Number(pct)||0;
  const thresholds = [
    { cut: 90, label: 'A*' },
    { cut: 80, label: 'A' },
    { cut: 70, label: 'B' },
    { cut: 60, label: 'C' },
    { cut: 50, label: 'D' },
    { cut: 40, label: 'E' },
    { cut: 30, label: 'F' },
    { cut: 20, label: 'G' },
  ];
  const target = thresholds.find(t => p < t.cut);
  if (!target) return null;
  return { label: target.label, delta: Math.max(0, target.cut - Math.round(p)) };
}

// --------- 3D Avatar (Three.js) ---------
let AV;
function ensureThree(){
  return new Promise((res, rej) => {
    if (typeof THREE !== 'undefined') return res();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js';
    s.onload = () => (typeof THREE !== 'undefined' ? res() : rej());
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
function initAvatar3D(container, pct, gender, animateIn){
  if (typeof THREE === 'undefined') return;
  // Clear previous
  container.innerHTML = '';
  const width = container.clientWidth || 300;
  const height = container.clientHeight || width;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);

  const camera = new THREE.PerspectiveCamera(35, width/height, 0.1, 100);
  camera.position.set(0, 1.4, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  container.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xeeeeee, 1.0);
  scene.add(light);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2,3,2);
  scene.add(dir);

  const group = buildAvatarForPct(pct, gender||'man');
  scene.add(group);

  function animate(){
    group.rotation.y += 0.01;
    // fade-in materials
    if (AV && AV.fade && AV.fade.length){
      let done = true;
      AV.fade.forEach(m => {
        if (m.material.opacity < 1){ m.material.opacity = Math.min(1, m.material.opacity + 0.05); done = false; }
      });
      if (done) AV.fade = [];
    }
    renderer.render(scene, camera);
    AV && AV.req && cancelAnimationFrame(AV.req);
    AV = { req: requestAnimationFrame(animate), renderer, scene, camera, group, container, fade: AV?.fade||[], level: AV?.level };
  }
  // setup fade list
  if (animateIn){
    const mats = [];
    group.traverse(obj => {
      if (obj.isMesh && obj.material){ obj.material = obj.material.clone(); obj.material.transparent = true; obj.material.opacity = 0.0; mats.push({ material: obj.material }); }
    });
    AV = { fade: mats, level: null };
  }
  animate();

  function onResize(){
    const w = container.clientWidth || width;
    const h = container.clientHeight || w;
    renderer.setSize(w, h);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
}

function buildAvatarForPct(pct, gender){
  const level = pct >= 100 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
  const g = new THREE.Group();
  g.position.y = -0.4;

  const skin = new THREE.MeshStandardMaterial({ color: 0xffd7b5, roughness: 0.6, metalness: 0.0 });
  const makeLimb = (r, h, color) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));

  // Base body
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), skin);
  head.position.y = 1.3;
  g.add(head);

  const baseTopColor = level===0 ? 0x2dd4bf : level===1 ? 0x60a5fa : 0x334155; // hawaiian -> shirt -> suit
  const torsoMat = new THREE.MeshStandardMaterial({ color: baseTopColor, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.6, 2, 16), torsoMat);
  torso.position.y = 0.6;
  g.add(torso);

  const legL = makeLimb(0.12, 0.9, level>=1?0x1f2937:0x94a3b8); legL.position.set(-0.18, 0.0, 0); g.add(legL);
  const legR = makeLimb(0.12, 0.9, level>=1?0x1f2937:0x94a3b8); legR.position.set(0.18, 0.0, 0); g.add(legR);

  const armSkin = (gender==='woman' ? 0xffcdb0 : 0xffd7b5);
  const armJacket = 0x334155;
  const armL = makeLimb(0.10, 0.8, level>=2?armJacket:armSkin); armL.position.set(-0.7, 0.8, 0); armL.rotation.z = 1.2; g.add(armL);
  const armR = makeLimb(0.10, 0.8, level>=2?armJacket:armSkin); armR.position.set(0.7, 0.8, 0); armR.rotation.z = -1.2; g.add(armR);

  // Footwear
  if (level===0){
    const flopMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
    const flopL = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.05,0.5), flopMat); flopL.position.set(-0.18,-0.45,0.05); g.add(flopL);
    const flopR = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.05,0.5), flopMat); flopR.position.set(0.18,-0.45,0.05); g.add(flopR);
  }

  // Shorts vs trousers
  if (level===0){
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.4,0.6), new THREE.MeshStandardMaterial({ color: 0x047857 }));
    shorts.position.y = 0.2; g.add(shorts);
  }

  // Tie (level >=2)
  if (level>=2){
    const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshStandardMaterial({ color: 0xb91c1c }));
    knot.position.set(0,1.0,0.38); g.add(knot);
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    tie.rotation.x = Math.PI/2; tie.position.set(0,0.8,0.42); g.add(tie);
  }

  // Suit jacket feel (darker torso already). Add shoulders
  if (level>=2){
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const shL = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,0.5), padMat); shL.position.set(-0.55,1.0,0); g.add(shL);
    const shR = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,0.5), padMat); shR.position.set(0.55,1.0,0); g.add(shR);
  }

  // Crown and gown (level 3)
  if (level===3){
    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 12, 24), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 }));
    crownBand.position.y = 1.7; crownBand.rotation.x = Math.PI/2; g.add(crownBand);
    for (let i=0;i<6;i++){
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 }));
      const a = (i/6)*Math.PI*2; spike.position.set(Math.cos(a)*0.22, 1.8, Math.sin(a)*0.22); spike.lookAt(0,2.2,0); g.add(spike);
    }
    const gown = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), new THREE.MeshStandardMaterial({ color: 0x111827, side: THREE.DoubleSide }));
    gown.position.set(0,0.5,-0.35); gown.rotation.y = Math.PI; g.add(gown);
  }

  // Simple face (eyes)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), eyeMat); eyeL.position.set(-0.12,1.35,0.31); g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), eyeMat); eyeR.position.set(0.12,1.35,0.31); g.add(eyeR);

  // Hair variant for woman
  if (gender==='woman'){
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.9 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 16, 0, Math.PI*2, 0, Math.PI/2), hairMat);
    hair.position.y = 1.35; hair.position.z = -0.05; g.add(hair);
  }

  return g;
}
// OCR fallback: render each PDF page to canvas and run Tesseract
async function ocrExtractPdfText(file, onProgress){
  const update = (p, msg) => { try { onProgress && onProgress(p, msg); } catch {} };
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i=1;i<=pdf.numPages;i++){
      update(Math.round(((i-1)/pdf.numPages)*100), `Rendering page ${i}/${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      update(Math.round(((i-1)/pdf.numPages)*100), `OCR page ${i}/${pdf.numPages}…`);
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
        logger: m => { if (m.status === 'recognizing text' && m.progress!=null){ const base = ((i-1)/pdf.numPages)*100; update(Math.min(99, Math.round(base + m.progress*(100/pdf.numPages))), `OCR page ${i}/${pdf.numPages}…`); } }
      });
    importFileBtn.addEventListener('click', async ()=>{
      if (!jsonFile.files?.length) { alert('Choose a JSON file first.'); return; }
      try {
        const txt = await jsonFile.files[0].text();
        const data = JSON.parse(txt);
        const bankToMerge = normalizeImportedBank(data);
        mergeIntoCustomBank(bankToMerge);
        alert('Imported JSON into custom bank.');
      } catch (e) {
        alert('Invalid JSON file. ' + (e.message||''));
      }
    });
    importTextBtn.addEventListener('click', ()=>{
      try {
        const data = JSON.parse(jsonText.value);
        const bankToMerge = normalizeImportedBank(data);
        mergeIntoCustomBank(bankToMerge);
        alert('Imported JSON into custom bank.');
      } catch (e) {
        alert('Invalid pasted JSON. ' + (e.message||''));
      }
    });
    schemaBtn.addEventListener('click', ()=>{
      const example = {
        s1: { topics: [{ id: 'opportunity', name: 'Opportunity cost' }], questions: [ { topic: 'opportunity', text: 'The opportunity cost is...', choices: ['A','B','C','D'], answer: 1 } ] },
        s2: { topics: [], questions: [] }, s3: { topics: [], questions: [] }, s4: { topics: [], questions: [] }, s5: { topics: [], questions: [] }, s6: { topics: [], questions: [] }
      };
      alert('Schema A (bank keyed by sections) or Schema B (flat array):\n\nA) ' + JSON.stringify(example, null, 2).slice(0, 600) + '\n\nB) ' + JSON.stringify([{ section:'s1', topic:'opportunity', text:'...', choices:['A','B','C','D'], answer:1 }], null, 2));
    });
      fullText += '\n' + text;
    }
    return fullText;
  } catch (err) {
    console.error('OCR error', err);
    throw new Error('OCR failed. Try a clearer PDF or smaller file.');
  }
}
function setProgress(percent, msg){
  const bar = document.getElementById('progressBar');
  const txt = document.getElementById('progressText');
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (txt) txt.textContent = msg || '';
}
function saveStore(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function getProfile(code) {
  const db = loadStore();
  if (!db[code]) {
    db[code] = {
      createdAt: Date.now(),
      scores: { s1: [], s2: [], s3: [], s4: [], s5: [], s6: [] },
      lastSectionSetup: {},
      topicStats: {}, // key: `${section}|${topic}` -> { section, topic, total, correct }
    };
    saveStore(db);
  }
  return db[code];
}
function updateProfile(code, fn) {
  const db = loadStore();
  const profile = getProfile(code);
  fn(profile);
  db[code] = profile;
  saveStore(db);
  return profile;
}

// Simple router
const routes = {};
function route(path, render) { routes[path] = render; }
function navigate(path) { window.location.hash = path; }
function currentPath() { return window.location.hash.replace(/^#/, '') || '/'; }

function mount(html) { document.getElementById('app').innerHTML = html; }

// UI helpers
function pageShell(content) {
  return `
  <div class="min-h-screen" style="
    background-image: ${econBg()};
    background-attachment: fixed;
  ">
    <div class="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 grid place-items-center rounded-md bg-emerald-600 text-white text-lg">E</div>
          <div>
            <h1 class="text-xl md:text-2xl font-bold leading-tight">IGCSE Economics Revision</h1>
            <p class="text-xs md:text-sm text-slate-600">Past papers-style topic quizzes with progress tracking</p>
          </div>
        </div>
        <nav class="text-sm"></nav>
      </div>
    </div>
    <div class="max-w-6xl mx-auto px-4 py-8">
      ${content}
      <footer class="mt-12 text-xs text-slate-500">Built for quick revision. Data saved locally per code.</footer>
    </div>
  </div>`;
}

// Quick check: does the current merged bank have any questions?
function isBankEmpty(){
  try {
    const bank = getBank();
    return !Object.values(bank||{}).some(sec => Array.isArray(sec?.questions) && sec.questions.length > 0);
  } catch { return true; }
}

// Subtle green economic-themed SVG background (encoded)
function econBg(){
  const custom = getSiteBg();
  if (custom) {
    // Apply a soft green gradient overlay for readability
    return `linear-gradient(to bottom, rgba(236,253,245,0.85), rgba(220,252,231,0.85)), url("${custom}")`;
  }
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>
    <defs>
      <pattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'>
        <path d='M 20 0 L 0 0 0 20' fill='none' stroke='%2364d6a3' stroke-width='0.5' opacity='0.35'/>
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='%23ecfdf5'/>
    <rect width='100%' height='100%' fill='url(%23grid)'/>
    <path d='M5 65 C15 55, 25 45, 35 50 S55 60, 65 40' fill='none' stroke='%231a9b6b' stroke-width='1.2' opacity='0.25'/>
    <polyline points='8,62 20,50 28,52 40,48 55,57 66,42' fill='none' stroke='%2334d399' stroke-width='1.2' opacity='0.22'/>
    <g opacity='0.18' fill='%231a9b6b'>
      <polygon points='20,50 20,46 24,50'/>
      <polygon points='55,57 55,53 59,57'/>
    </g>
  </svg>`;
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
  return `linear-gradient(to bottom, rgba(236,253,245,1), rgba(220,252,231,1)), url("data:image/svg+xml;charset=UTF-8,${encoded}")`;
}

// Okabe–Ito color-blind friendly palette
const PALETTE = {
  blue: '#0072B2',
  vermillion: '#D55E00',
  orange: '#E69F00',
  sky: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  black: '#000000',
  purple: '#CC79A7',
};

// Inline icons (simple SVGs)
function iconSvg(name){
  const base = 'class="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    problem: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    allocate: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h7v7h-7z"/>',
    micro: '<path d="M3 12h18"/><path d="M7 12a5 5 0 0 1 10 0"/>',
    macro: '<path d="M3 20h18"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-6h6v6"/>',
    develop: '<path d="M12 2v6"/><path d="M5 8h14"/><path d="M6 12h12"/><path d="M8 16h8"/>',
    trade: '<path d="M3 7h7l-2 3 2 3H3z"/><path d="M21 17h-7l2-3-2-3h7z"/>',
  };
  return `<svg ${base}>${paths[name]||paths.problem}</svg>`;
}

// Convert hex to rgba string with alpha 0..1
function hexWithAlpha(hex, alpha){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Map section id -> icon svg
function iconForSection(id){
  switch(id){
    case 's1': return iconSvg('problem');
    case 's2': return iconSvg('allocate');
    case 's3': return iconSvg('micro');
    case 's4': return iconSvg('macro');
    case 's5': return iconSvg('develop');
    case 's6': return iconSvg('trade');
    default: return iconSvg('problem');
  }
}

function sectionButtons(code) {
  const encCode = encodeURIComponent(code||'');
  return SECTIONS.map((s, i) => {
    const href = `#/section?code=${encCode}&section=${encodeURIComponent(s.id)}`;
    return `
    <a
      href="${href}"
      class="w-full inline-flex items-center gap-3 justify-center rounded-md bg-blue-600 text-white py-3 px-4 font-semibold hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
      data-section="${s.id}"
      role="button"
    >
      <span class="shrink-0">${iconForSection(s.id)}</span>
      <span>Take Section ${i+1} Quiz</span>
    </a>`;
  }).join('\n');
}

function average(arr){ if(!arr || arr.length===0) return 0; return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); }

// Radar
let radarChart;
function wrapLabel(label, maxLen){
  const words = String(label||'').split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > maxLen){
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur ? cur + ' ' : '') + w;
    }
  });
  if (cur) lines.push(cur.trim());
  return lines.length ? lines : [String(label||'')];
}
function renderRadar(canvas, profile) {
  const data = SECTIONS.map(s => average(profile.scores[s.id]));
  const labels = SECTIONS.map((s) => s.label);
  const w = (typeof window !== 'undefined') ? window.innerWidth : 0;
  const pointLabelSize = w >= 1024 ? 14 : w >= 768 ? 12 : 10;
  const ds = {
    label: 'Average %',
    data,
    fill: true,
    backgroundColor: hexWithAlpha(PALETTE.sky, 0.25),
    borderColor: PALETTE.blue,
    pointBackgroundColor: PALETTE.vermillion,
  };
  const cfg = {
    type: 'radar',
    data: { labels, datasets: [ds] },
    options: {
      responsive: true,
      scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { stepSize: 20 }, grid: { color: 'rgba(2,6,23,0.08)' }, angleLines: { color: 'rgba(2,6,23,0.1)' }, pointLabels: { font: { size: pointLabelSize }, color: '#0f172a', padding: 12, callback: (val)=> wrapLabel(val, w>=1024?26:18) } } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return labels[idx] || '';
            },
            label: (context) => `${context.parsed.r}% average`,
          }
        }
      }
    }
  };
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(canvas, cfg);
}

// Landing page
route('/', () => {
  mount(pageShell(`
    <div class="min-h-[70vh] grid place-items-center relative">
      <div class="w-full max-w-md mx-auto">
        <form id="codeForm" class="bg-white/95 backdrop-blur p-6 rounded-xl shadow-sm border space-y-4">
          <label class="block text-sm font-medium">Enter your code</label>
          <input type="text" id="codeInput" class="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. ECON123" required minlength="3" />
          <button class="w-full bg-emerald-600 text-white rounded-md py-2 font-semibold hover:bg-emerald-700 active:bg-emerald-800">Continue</button>
          <p class="text-xs text-slate-500 text-center">Use the same code next time to resume your progress.</p>
        </form>
        
      </div>
    </div>
  `));
  document.getElementById('codeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('codeInput').value.trim();
    if (!code) return;
    getProfile(code); // ensure exists
    navigate(`/dashboard?code=${encodeURIComponent(code)}`);
  });
});

// Dashboard
route('/dashboard', () => {
  const params = new URLSearchParams(window.location.hash.split('?')[1]||'');
  const code = params.get('code') || '';
  if (!code) return navigate('/');
  const profile = getProfile(code);
  const initialOverall = computeOverallAverage(profile);
  const initialGrade = gradeFromPct(initialOverall);
  const initialHint = (function(){
    const n = nextGradeInfo(initialOverall);
    return n ? `+${n.delta}% to reach ${n.label}` : 'Top grade achieved';
  })();

  // compute focus topics (lowest accuracy top 3)
  function computeFocusTopics(p){
    const list = Object.values(p.topicStats||{}).map(st => {
      const acc = st.total > 0 ? Math.round((st.correct/st.total)*100) : 0;
      return { ...st, acc };
    });
    // sort by accuracy asc, then by total desc
    list.sort((a,b)=> (a.acc - b.acc) || (b.total - a.total));
    return list.slice(0,3);
  }
  const focus = computeFocusTopics(profile);

  mount(pageShell(`
    <div class="grid md:grid-cols-2 gap-8">
      <div class="bg-white p-4 md:p-6 rounded-xl border shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Your Progress</h2>
          <span class="text-xs text-slate-500">Code: <code>${code}</code></span>
        </div>
        <canvas id="radar" height="260"></canvas>
        <div class="mt-3 text-sm text-slate-600">Averages per section across all completed quizzes.</div>
      </div>
      <div class="space-y-3">
        <div class="bg-white p-4 rounded-xl border shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold">Your Grade</h2>
            <span id="avgPct" class="text-sm text-slate-600">${initialOverall}% overall</span>
          </div>
          <div class="grid place-items-center py-6">
            <div id="gradeBadge" class="inline-flex items-center gap-3 rounded-full px-8 py-5 text-white text-4xl font-extrabold shadow-sm" style="background-color: ${initialGrade.color}">🎖 ${initialGrade.label} • ${initialOverall}%</div>
          </div>
          <div id="gradeHint" class="text-sm text-slate-600 text-center -mt-2 pb-2">${initialHint}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold">Need to revise...</h2>
            <span class="text-xs text-slate-500">Top 3</span>
          </div>
          <div id="focusList" class="flex flex-wrap gap-2">
            ${focus.length===0 ? '<div class="text-sm text-slate-500">Start a quiz to see your focus topics.</div>' : focus.map(st=>{
              const tLabel = topicName(st.section, st.topic);
              return `<span class=\"inline-flex items-center rounded-full px-3 py-1 text-sm bg-amber-100 text-amber-900 border border-amber-200\">${tLabel}</span>`;
            }).join('')}
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold">Question bank</h2>
          </div>
          <p class="text-xs text-slate-500 mt-2">Questions are stored locally in your browser.</p>
        </div>
        ${sectionButtons(code)}
      </div>
    </div>
  `));

  const ctx = document.getElementById('radar');
  renderRadar(ctx, profile);
  const overall = computeOverallAverage(profile);
  const avgPctEl = document.getElementById('avgPct');
  if (avgPctEl) avgPctEl.textContent = `${overall}% overall`;
  const badge = document.getElementById('gradeBadge');
  if (badge){
    const g = gradeFromPct(overall);
    console.log('[Dashboard] Overall average:', overall, '=> grade', g.label);
    badge.textContent = `${g.label} • ${overall}%`;
    badge.style.backgroundColor = g.color;
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '0.5rem';
    // add medal emoji prefix for visibility
    badge.prepend(document.createTextNode('🎖 '));
    badge.setAttribute('title', `Overall ${overall}%`);
  }
  const hint = document.getElementById('gradeHint');
  if (hint){
    const n = nextGradeInfo(overall);
    hint.textContent = n ? `+${n.delta}% to reach ${n.label}` : 'Top grade achieved';
  }
  // No JS needed for section links; anchors route directly

  // (Export removed by request)
});

// Import page removed (student import disabled)

// Section setup
route('/section', () => {
  const params = new URLSearchParams(window.location.hash.split('?')[1]||'');
  const code = params.get('code') || '';
  let section = (params.get('section')||'').toLowerCase();
  section = section.replace(/[^a-z0-9]/g,''); // e.g. 's1\\' -> 's1'
  if (!code || !section || !/^s[1-6]$/.test(section)) return navigate('/');
  const sMeta = SECTIONS.find(s=>s.id===section);
  if (!sMeta) return navigate(`/dashboard?code=${encodeURIComponent(code)}`);
  const rawTopics = getBank()[section]?.topics || [];
  const topics = rawTopics.filter(t => t && t.id && t.id.toLowerCase() !== 'general' && !(section === 's1' && /multinational/i.test(t.id)));

  const last = getProfile(code).lastSectionSetup[section] || { count: 10, topics: topics.map(t=>t.id) };

  mount(pageShell(`
    <div class="max-w-3xl">
      <button id="backDash" class="text-sm text-blue-700 hover:underline">← Back to Dashboard</button>
      <h2 class="text-xl font-semibold mt-2 mb-1">${sMeta.label}</h2>
      <p class="text-slate-600 mb-4">Choose topics and number of questions, then start.</p>

      <form id="setupForm" class="bg-white p-5 rounded-xl border shadow-sm space-y-5">
        <div>
          <label class="block text-sm font-medium mb-1">Number of questions (1–30)</label>
          <input type="range" min="1" max="30" value="${last.count}" id="qRange" class="w-full accent-blue-600">
          <div class="text-sm text-slate-700">Selected: <span id="qCount">${last.count}</span> • Available: <span id="availCount">0</span></div>
        </div>
        <div>
          <div class="text-sm font-medium mb-2">Topics</div>
          <div class="grid md:grid-cols-2 gap-2" id="topicsList">
            ${topics.map(t=>`
              <label class="flex items-center gap-2 p-2 rounded border bg-slate-50 hover:bg-slate-100">
                <input type="checkbox" value="${t.id}" ${last.topics.includes(t.id)?'checked':''}>
                <span>${t.name}</span>
              </label>
            `).join('')}
          </div>
          <p class="text-xs text-slate-500 mt-1">Pick at least one topic.</p>
        </div>
        <div class="flex gap-3">
          <button class="bg-blue-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-blue-700 active:bg-blue-800">Start quiz</button>
          <button type="button" id="cancelBtn" class="px-4 py-2 rounded-md border hover:bg-slate-50">Cancel</button>
        </div>
      </form>
    </div>
  `));

  document.getElementById('backDash').onclick = () => navigate(`/dashboard?code=${encodeURIComponent(code)}`);
  document.getElementById('cancelBtn').onclick = () => navigate(`/dashboard?code=${encodeURIComponent(code)}`);
  const range = document.getElementById('qRange');
  const countEl = document.getElementById('qCount');
  const availEl = document.getElementById('availCount');
  range.addEventListener('input', ()=> countEl.textContent = range.value);
  function updateAvailable(){
    const selected = Array.from(document.querySelectorAll('#topicsList input:checked')).map(i=>i.value);
    const bank = getBank()[section]?.questions.filter(q => selected.includes(q.topic)) || [];
    availEl.textContent = bank.length;
  }
  document.querySelectorAll('#topicsList input[type="checkbox"]').forEach(cb=>cb.addEventListener('change', updateAvailable));
  updateAvailable();

  document.getElementById('setupForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const selected = Array.from(document.querySelectorAll('#topicsList input:checked')).map(i=>i.value);
    const count = parseInt(range.value,10);
    if (selected.length===0) { alert('Select at least one topic.'); return; }

    updateProfile(code, p => {
      p.lastSectionSetup[section] = { count, topics: selected };
    });

    navigate(`/quiz?code=${encodeURIComponent(code)}&section=${encodeURIComponent(section)}&count=${count}&topics=${encodeURIComponent(selected.join(','))}`);
  });
});

// Quiz page
route('/quiz', () => {
  const params = new URLSearchParams(window.location.hash.split('?')[1]||'');
  const code = params.get('code') || '';
  const section = params.get('section') || '';
  const count = Math.max(1, Math.min(30, parseInt(params.get('count')||'10',10)));
  const topics = (params.get('topics')||'').split(',').filter(Boolean);
  if (!code || !section || topics.length===0) return navigate('/');

  const bank = getBank()[section]?.questions.filter(q => topics.includes(q.topic)) || [];
  const pool = shuffle(bank).slice(0, Math.min(count, bank.length));

  let index = 0;
  let correct = 0;
  const answers = [];

  function render() {
    if (pool.length === 0) {
      mount(pageShell(`
        <div class="max-w-xl">
          <h2 class="text-xl font-semibold mb-2">Not enough questions</h2>
          <p class="mb-4">This combination has 0 available questions. Try selecting more topics or fewer questions.</p>
          <button class="px-4 py-2 rounded-md border" id="goBack">Back</button>
        </div>`));
      document.getElementById('goBack').onclick = () => navigate(`/section?code=${encodeURIComponent(code)}&section=${encodeURIComponent(section)}`);
      return;
    }
    const q = pool[index];
    mount(pageShell(`
      <div class="max-w-3xl">
        <div class="flex items-center justify-between mb-3">
          <button id="quit" class="text-sm text-blue-700 hover:underline">← Quit</button>
          <div class="text-sm text-slate-600">Question ${index+1} of ${pool.length}</div>
        </div>
        <div class="bg-white p-6 rounded-xl border shadow-sm">
          <div class="font-medium mb-3">${q.text}</div>
          ${q.image ? `<div class="mb-3"><img src="${q.image}" alt="Question image" class="max-h-64 rounded border"></div>` : ''}
          <div class="space-y-2" id="choices">
            ${q.choices.map((c, i)=>`
              <label class="flex items-center gap-3 p-2 rounded border hover:bg-slate-50 cursor-pointer">
                <input type="radio" name="choice" value="${i}" class="peer">
                <span>${c}</span>
              </label>
            `).join('')}
          </div>
          <div class="mt-4 flex justify-between items-center">
            <div class="text-sm text-slate-600">Topic: ${topicName(section, q.topic)}</div>
            <button id="nextBtn" class="bg-blue-600/60 text-white rounded-md px-4 py-2 font-semibold cursor-not-allowed" disabled>${index===pool.length-1?'Finish':'Next'}</button>
          </div>
        </div>
      </div>
    `));

    document.getElementById('quit').onclick = () => navigate(`/section?code=${encodeURIComponent(code)}&section=${encodeURIComponent(section)}`);
    const nextBtn = document.getElementById('nextBtn');
    document.querySelectorAll('#choices label').forEach(lbl => {
      const input = lbl.querySelector('input');
      input.addEventListener('change', () => {
        document.querySelectorAll('#choices label').forEach(l => l.classList.remove('ring-2','ring-blue-500','bg-blue-50','border-blue-300'));
        lbl.classList.add('ring-2');
        lbl.style.setProperty('box-shadow','0 0 0 0');
        lbl.style.setProperty('border-color', PALETTE.orange);
        lbl.style.setProperty('background-color', hexWithAlpha(PALETTE.orange, 0.15));
        lbl.style.setProperty('outline-color', PALETTE.orange);
        nextBtn.disabled = false;
        nextBtn.className = 'bg-blue-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-blue-700';
      });
    });
    nextBtn.onclick = () => {
      const picked = document.querySelector('input[name="choice"]:checked');
      if (!picked) { alert('Please select an answer.'); return; }
      const ansIndex = parseInt(picked.value,10);
      const isCorrect = ansIndex === q.answer;
      answers.push({ idx:index, correct:isCorrect });
      if (isCorrect) correct += 1;
      index += 1;
      if (index < pool.length) render();
      else showResult();
    };
  }

  function showResult() {
    const pct = Math.round((correct / pool.length) * 100);
    updateProfile(code, p => {
      p.scores[section].push(pct);
      // update per-topic stats
      p.topicStats = p.topicStats || {};
      const picked = new Map(answers.map(a => [a.idx, a.correct]));
      pool.forEach((q, i) => {
        const key = `${section}|${q.topic}`;
        const st = p.topicStats[key] || { section, topic: q.topic, total: 0, correct: 0 };
        st.total += 1;
        if (picked.get(i)) st.correct += 1;
        p.topicStats[key] = st;
      });
    });
    mount(pageShell(`
      <div class="max-w-xl text-center">
        <h2 class="text-2xl font-bold mb-2">Quiz complete</h2>
        <p class="text-slate-700 mb-6">You scored <span class="font-semibold">${pct}%</span></p>
        <div class="grid sm:grid-cols-2 gap-3">
          <button id="again" class="bg-blue-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-blue-700">Try again</button>
          <button id="dash" class="rounded-md px-4 py-2 border">Back to dashboard</button>
        </div>
      </div>
    `));
    document.getElementById('again').onclick = () => navigate(`/section?code=${encodeURIComponent(code)}&section=${encodeURIComponent(section)}`);
    document.getElementById('dash').onclick = () => navigate(`/dashboard?code=${encodeURIComponent(code)}`);
  }

  render();
});

function topicName(sectionId, topicId){
  const topics = getBank()[sectionId]?.topics || [];
  return topics.find(t=>t.id===topicId)?.name || topicId;
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Router bootstrap
function handleRoute(){
  const path = currentPath().split('?')[0];
  const handler = routes[path] || routes['/'];
  handler();
}
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', async () => { try { await prefetchPublishedBank(); } catch {} handleRoute(); });

// ------- Custom Question Bank support -------
const CUSTOM_BANK_KEY = 'igcse_econ_custom_bank_v1';
const PUBLISHED_BANK_KEY = 'igcse_econ_published_bank_v1';
const ADMIN_CODE_KEY = 'igcse_econ_admin_code_v1';
const ADMIN_AUTH_KEY = 'igcse_econ_admin_authed_v1';
const DEFAULT_ADMIN_CODE = 'ADMIN123'; // change this to your own secret
const SITE_BG_KEY = 'igcse_econ_site_bg_v1';
function loadCustomBank(){
  try { return JSON.parse(localStorage.getItem(CUSTOM_BANK_KEY)) || {}; } catch { return {}; }
}
function saveCustomBank(bank){
  localStorage.setItem(CUSTOM_BANK_KEY, JSON.stringify(bank||{}));
}
function loadPublishedBank(){
  try { return JSON.parse(localStorage.getItem(PUBLISHED_BANK_KEY)) || {}; } catch { return {}; }
}
function savePublishedBank(bank){
  localStorage.setItem(PUBLISHED_BANK_KEY, JSON.stringify(bank||{}));
}
function setAdminCode(code){ localStorage.setItem(ADMIN_CODE_KEY, code); }
function getAdminCode(){ return localStorage.getItem(ADMIN_CODE_KEY) || DEFAULT_ADMIN_CODE; }
function setAdminAuthed(v){ localStorage.setItem(ADMIN_AUTH_KEY, v ? '1':'0'); }
function isAdminAuthed(){ return localStorage.getItem(ADMIN_AUTH_KEY) === '1'; }
function setSiteBg(url){ localStorage.setItem(SITE_BG_KEY, url||''); }
function getSiteBg(){ return localStorage.getItem(SITE_BG_KEY) || ''; }
// Merge published (from repo) with custom (local). Custom overrides via de-dup.
function getBank(){
  const published = loadPublishedBank() || {};
  const custom = loadCustomBank() || {};
  const allSections = new Set(['s1','s2','s3','s4','s5','s6', ...Object.keys(published), ...Object.keys(custom)]);
  const out = {};
  allSections.forEach(sec => {
    const p = published[sec] || { topics: [], questions: [] };
    const c = custom[sec] || { topics: [], questions: [] };
    // merge topics (by id)
    const tmap = new Map((p.topics||[]).map(t=>[t.id,t]));
    (c.topics||[]).forEach(t=>{ if (!tmap.has(t.id)) tmap.set(t.id, t); });
    const topics = Array.from(tmap.values());
    // merge questions with simple de-dup preferring custom additions
    const seen = new Set();
    const res = [];
    function h(q){ return `${(q.text||'').trim()}|${(q.choices||[]).join('||')}`.toLowerCase(); }
    (p.questions||[]).filter(q=>!q.draft).forEach(q=>{ const k=h(q); if (!seen.has(k)){ seen.add(k); res.push(q); } });
    (c.questions||[]).filter(q=>!q.draft).forEach(q=>{ const k=h(q); if (!seen.has(k)){ seen.add(k); res.push(q); } });
    out[sec] = { topics, questions: res };
  });
  return out;
}

// Prefetch published bank from GitHub Pages (if available) and cache in localStorage
async function prefetchPublishedBank(){
  try {
    const res = await fetch('./bank_template.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json().catch(()=>null);
    if (data && typeof data === 'object') savePublishedBank(data);
  } catch {}
}

// ------- Bank Builder Route (/bank) -------
route('/bank', () => {
  function renderGate(){
    mount(pageShell(`
      <div class="max-w-lg mx-auto">
        <h2 class="text-xl font-semibold mb-2">Question Bank Manager</h2>
        <p class="text-slate-600 mb-4">Enter admin code to continue.</p>
        <form id="adminForm" class="bg-white p-5 rounded-xl border shadow-sm space-y-3">
          <label class="block text-sm font-medium">Admin code</label>
          <input id="adminInput" type="password" class="w-full rounded-md border px-3 py-2" placeholder="Enter code" required>
          <div class="flex gap-3">
            <button class="bg-emerald-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-emerald-700">Unlock</button>
            <button type="button" id="setCode" class="px-4 py-2 rounded-md border">Set new code</button>
          </div>
          <p class="text-xs text-slate-500">Tip: Change the default code after first use.</p>
        </form>
      </div>
    `));
    document.getElementById('adminForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const val = document.getElementById('adminInput').value;
      if (val === getAdminCode()) { setAdminAuthed(true); renderBuilder(); }
      else alert('Incorrect code');
    });
    document.getElementById('setCode').addEventListener('click', ()=>{
      const current = prompt('Enter current admin code to set a new code:');
      if (current !== getAdminCode()) { alert('Incorrect current code.'); return; }
      const next = prompt('Enter new admin code:');
      if (next && next.length >= 4){ setAdminCode(next); alert('Admin code updated.'); }
    });
  }

  function renderBuilder(){
    mount(pageShell(`
      <section class="bg-white border rounded-xl p-4 md:p-6 shadow-sm">
        <h2 class="font-semibold mb-3">1) Upload PDF</h2>
        <div class="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <input id="pdfFile" type="file" accept="application/pdf" class="block">
          <button id="parseBtn" class="bg-emerald-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-emerald-700 disabled:opacity-60" disabled>Parse PDF</button>
          <button id="sampleBtn" class="rounded-md px-3 py-2 border">Load sample text</button>
          <button id="exportBtn" class="rounded-md px-3 py-2 border" disabled>Export JSON</button>
          <button id="clearBtn" class="rounded-md px-3 py-2 border">Clear custom bank</button>
        </div>
        <div class="mt-3 flex items-center gap-2 text-sm">
          <input id="useOcr" type="checkbox" class="h-4 w-4">
          <label for="useOcr" class="select-none">Use OCR fallback (for scanned PDFs)</label>
        </div>
        <div class="mt-3" id="progressWrap" hidden>
          <div class="h-2 w-full bg-slate-200 rounded">
            <div id="progressBar" class="h-2 bg-emerald-600 rounded" style="width:0%"></div>
          </div>
          <div id="progressText" class="text-xs text-slate-600 mt-1">Preparing…</div>
        </div>
        <p class="text-xs text-slate-500 mt-2">Heuristic parser looks for numbered questions and A–D options.</p>
      </section>
      <section class="mt-6 bg-white border rounded-xl p-4 md:p-6 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Your custom questions (per‑item publish)</h2>
          <button id="publishAllMissing" class="rounded-md px-3 py-2 border text-sm">Publish all not‑published</button>
        </div>
        <div id="perItemList" class="space-y-3"></div>
        <p class="text-xs text-slate-500 mt-2">Status compares your local custom bank to the currently published bank_template.json. Use the GitHub fields above so we can publish.</p>
      </section>
      <section class="mt-6 bg-white border rounded-xl p-4 md:p-6 shadow-sm">
        <h2 class="font-semibold mb-3">2) Import JSON (optional)</h2>
        <div class="flex flex-col md:flex-row gap-3 items-start md:items-center mb-3">
          <input id="jsonFile" type="file" accept="application/json" class="block">
          <button id="importFileBtn" class="rounded-md px-3 py-2 border">Import file</button>
        </div>
        <div class="space-y-2">
          <textarea id="jsonText" class="w-full border rounded p-2 text-sm" rows="6" placeholder='Paste JSON here'></textarea>
          <div class="flex gap-2">
            <button id="importTextBtn" class="rounded-md px-3 py-2 border">Import pasted JSON</button>
            <button id="schemaBtn" class="rounded-md px-3 py-2 border">Show schema</button>
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-2">Supports either a bank object keyed by sections (s1..s6) or a flat questions array with section/topic fields.</p>
      </section>
      <section class="mt-6 bg-white border rounded-xl p-4 md:p-6 shadow-sm">
        <h2 class="font-semibold mb-3">Site settings</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium mb-1">Landing background URL</label>
            <div class="flex gap-2">
              <input id="bgUrl" class="flex-1 border rounded px-2 py-1" placeholder="https://...">
              <button id="saveBgUrl" class="rounded-md px-3 py-2 border">Save</button>
            </div>
            <p class="text-xs text-slate-500 mt-1">A large economics-themed image works best. We apply a soft green overlay for readability.</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Or upload image</label>
            <input id="bgFile" type="file" accept="image/*">
            <p class="text-xs text-slate-500 mt-1">We store it locally in your browser as a data URL.</p>
          </div>
        </div>
      </section>
      <section class="mt-6 bg-white border rounded-xl p-4 md:p-6 shadow-sm">
        <h2 class="font-semibold mb-3">Publish to site (GitHub)</h2>
        <div class="grid md:grid-cols-2 gap-3">
          <label class="text-sm">GitHub owner
            <input id="ghOwner" class="border rounded px-2 py-1 w-full" placeholder="e.g. your-username">
          </label>
          <label class="text-sm">Repository name
            <input id="ghRepo" class="border rounded px-2 py-1 w-full" placeholder="e.g. revision-website">
          </label>
          <label class="text-sm">Branch
            <input id="ghBranch" class="border rounded px-2 py-1 w-full" placeholder="e.g. main">
          </label>
          <label class="text-sm">Path to JSON
            <input id="ghPath" class="border rounded px-2 py-1 w-full" placeholder="e.g. bank_template.json or docs/bank_template.json">
          </label>
          <label class="text-sm md:col-span-2">GitHub token
            <input id="ghToken" type="password" class="border rounded px-2 py-1 w-full" placeholder="github_pat_...">
          </label>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button id="publishBtn" class="bg-emerald-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-emerald-700">Publish to site</button>
          <span class="text-xs text-slate-500">Publishes your local bank to the JSON file in the repo used by the live site.</span>
        </div>
      </section>
      <section class="mt-6 bg-white border rounded-xl p-4 md:p-6 shadow-sm">
        <h2 class="font-semibold mb-3">3) Review & classify</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-slate-600">
                <th class="p-2">#</th>
                <th class="p-2">Question</th>
                <th class="p-2">Section</th>
                <th class="p-2">Topic</th>
                <th class="p-2">Choices</th>
                <th class="p-2">Answer</th>
              </tr>
            </thead>
            <tbody id="questionsTbody" class="align-top"></tbody>
          </table>
        </div>
        <div class="mt-4 flex gap-3">
          <button id="saveBtn" class="bg-emerald-600 text-white rounded-md px-4 py-2 font-semibold hover:bg-emerald-700 disabled:opacity-60" disabled>Save to custom bank</button>
        </div>
      </section>
    `));

    // Wire up logic
    const pdfInput = document.getElementById('pdfFile');
    const parseBtn = document.getElementById('parseBtn');
    const sampleBtn = document.getElementById('sampleBtn');
    const tbody = document.getElementById('questionsTbody');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');
    const useOcr = document.getElementById('useOcr');
    const progressWrap = document.getElementById('progressWrap');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const jsonFile = document.getElementById('jsonFile');
    const importFileBtn = document.getElementById('importFileBtn');
    const jsonText = document.getElementById('jsonText');
    const importTextBtn = document.getElementById('importTextBtn');
    const schemaBtn = document.getElementById('schemaBtn');
    const bgUrl = document.getElementById('bgUrl');
    const saveBgUrl = document.getElementById('saveBgUrl');
    const bgFile = document.getElementById('bgFile');
    const ghOwnerEl = document.getElementById('ghOwner');
    const ghRepoEl = document.getElementById('ghRepo');
    const ghBranchEl = document.getElementById('ghBranch');
    const ghPathEl = document.getElementById('ghPath');
    const ghTokenEl = document.getElementById('ghToken');
    const publishBtn = document.getElementById('publishBtn');

    // Prefill current background URL
    if (bgUrl) bgUrl.value = getSiteBg();
    saveBgUrl?.addEventListener('click', ()=>{ setSiteBg(bgUrl.value.trim()); alert('Background updated. Refresh to view.'); });
    bgFile?.addEventListener('change', async ()=>{
      const f = bgFile.files?.[0]; if (!f) return;
      const dataUrl = await fileToDataUrl(f);
      setSiteBg(dataUrl);
      alert('Background updated from uploaded image. Refresh to view.');
    });

    const GH_CFG_KEY = 'igcse_econ_github_cfg_v1';
    function loadGhCfg(){ try { return JSON.parse(localStorage.getItem(GH_CFG_KEY)) || {}; } catch { return {}; } }
    function saveGhCfg(cfg){ try { localStorage.setItem(GH_CFG_KEY, JSON.stringify(cfg||{})); } catch {} }
    (function prefillGh(){
      const cfg = loadGhCfg();
      if (ghOwnerEl) ghOwnerEl.value = cfg.owner || ghOwnerEl.value || '';
      if (ghRepoEl) ghRepoEl.value = cfg.repo || ghRepoEl.value || '';
      if (ghBranchEl) ghBranchEl.value = cfg.branch || ghBranchEl.value || 'main';
      if (ghPathEl) ghPathEl.value = cfg.path || ghPathEl.value || 'bank_template.json';
    })();

    async function githubGetFileSha(owner, repo, path, branch, token){
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub get file failed: ${res.status}`);
      const data = await res.json();
      return data.sha || null;
    }
    async function githubPutFile(owner, repo, path, branch, token, contentBase64, sha){
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      const body = { message: 'Update bank_template.json via /#/bank', content: contentBase64, branch, sha: sha || undefined };
      const res = await fetch(url, { method: 'PUT', headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const t = await res.text().catch(()=> ''); throw new Error(`GitHub commit failed: ${res.status} ${t}`); }
      return res.json();
    }
    function toBase64Utf8(str){ return btoa(unescape(encodeURIComponent(str))); }

    publishBtn?.addEventListener('click', async ()=>{
      try {
        const owner = (ghOwnerEl?.value||'').trim();
        const repo = (ghRepoEl?.value||'').trim();
        const branch = (ghBranchEl?.value||'main').trim()||'main';
        const path = (ghPathEl?.value||'bank_template.json').trim();
        const token = (ghTokenEl?.value||'').trim();
        if (!owner || !repo || !path || !token) { alert('Fill owner, repo, path, and token.'); return; }
        const cfg = loadGhCfg(); cfg.owner = owner; cfg.repo = repo; cfg.branch = branch; cfg.path = path; cfg.token = token; saveGhCfg(cfg);
        const bank = loadCustomBank();
        const json = JSON.stringify(bank, null, 2);
        const base64 = toBase64Utf8(json);
        publishBtn.disabled = true; publishBtn.textContent = 'Publishing…';
        const sha = await githubGetFileSha(owner, repo, path, branch, token).catch(()=>null);
        await githubPutFile(owner, repo, path, branch, token, base64, sha||undefined);
        publishBtn.textContent = 'Published';
        alert('Published to GitHub. It may take up to a minute for GitHub Pages to reflect the change.');
        setTimeout(()=>{ publishBtn.textContent = 'Publish to site'; publishBtn.disabled = false; }, 1500);
      } catch (e) {
        publishBtn.disabled = false; publishBtn.textContent = 'Publish to site';
        alert('Publish failed: ' + (e.message||e));
      }
    });

    let parsedQuestions = [];
    pdfInput.addEventListener('change', ()=>{ parseBtn.disabled = !pdfInput.files?.length; });
    parseBtn.addEventListener('click', async ()=>{
      if (!pdfInput.files?.length) return;
      try {
        let text = '';
        if (useOcr.checked) {
          progressWrap.hidden = false; setProgress(0, 'Starting OCR…');
          text = await ocrExtractPdfText(pdfInput.files[0], setProgress);
          setProgress(100, 'OCR complete');
          setTimeout(()=>{ progressWrap.hidden = true; }, 800);
        } else {
          text = await extractPdfText(pdfInput.files[0]);
          if (!text || text.trim().length < 50) {
            if (confirm('The PDF appears to contain little extractable text. Try OCR fallback?')){
              progressWrap.hidden = false; setProgress(0, 'Starting OCR…');
              text = await ocrExtractPdfText(pdfInput.files[0], setProgress);
              setProgress(100, 'OCR complete');
              setTimeout(()=>{ progressWrap.hidden = true; }, 800);
            }
          }
        }
        parsedQuestions = parseQuestionsFromText(text);
        autoClassify(parsedQuestions);
        renderTable(parsedQuestions, tbody);
        saveBtn.disabled = parsedQuestions.length===0;
        exportBtn.disabled = Object.keys(loadCustomBank()).length===0;
      } catch (e) {
        alert(e.message || 'Unable to parse PDF.');
      }
    });
    sampleBtn.addEventListener('click', ()=>{
      const sample = `1 What is meant by opportunity cost?\nA the monetary cost of a good\nB the next best alternative forgone\nC the total satisfaction from consumption\nD the cost of production\n\n2 Which factor would most likely shift the demand curve to the right?\nA a rise in price\nB a fall in income for a normal good\nC a rise in population\nD a fall in the price of a substitute`;
      parsedQuestions = parseQuestionsFromText(sample);
      autoClassify(parsedQuestions);
      renderTable(parsedQuestions, tbody);
      saveBtn.disabled = parsedQuestions.length===0;
      exportBtn.disabled = Object.keys(loadCustomBank()).length===0;
    });
    saveBtn.addEventListener('click', ()=>{
      const bank = loadCustomBank();
      const rows = Array.from(tbody.querySelectorAll('tr[data-index]'));
      rows.forEach(row => {
        const idx = parseInt(row.getAttribute('data-index'), 10);
        const q = parsedQuestions[idx];
        const section = row.querySelector('select[name="section"]').value;
        const topic = row.querySelector('select[name="topic"]').value;
        const answer = parseInt(row.querySelector('select[name="answer"]').value, 10);
        const a = row.querySelector('input[name="choiceA"]').value.trim();
        const b = row.querySelector('input[name="choiceB"]').value.trim();
        const c = row.querySelector('input[name="choiceC"]').value.trim();
        const d = row.querySelector('input[name="choiceD"]').value.trim();
        const text = row.querySelector('textarea[name="qtext"]').value.trim();
        if (!bank[section]) bank[section] = { topics: [], questions: [] };
        const topics = new Map((bank[section].topics||[]).map(t=>[t.id,t]));
        if (!topics.has(topic)) { topics.set(topic, { id: topic, name: topic }); bank[section].topics = Array.from(topics.values()); }
        bank[section].questions.push({ topic, text, choices: [a,b,c,d], answer });
      });
      saveCustomBank(bank);
      alert('Saved to custom bank. These questions are now available in the app.');
    });
    exportBtn.addEventListener('click', ()=>{
      const data = JSON.stringify(loadCustomBank(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'igcse_econ_custom_bank.json'; a.click(); URL.revokeObjectURL(url);
    });
    clearBtn.addEventListener('click', ()=>{ if (confirm('Clear all custom questions?')){ saveCustomBank({}); alert('Cleared.'); renderPerItemList(); }});

    // Initial per-item status render
    renderPerItemList();
  }

  if (isAdminAuthed()) renderBuilder(); else renderGate();
});

// ------- Helpers used by builder -------
// Ensure pdf.js worker is configured when loaded via CDN
if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

async function extractPdfText(file){
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent({ normalizeWhitespace: true });
      // Join strings with spaces to preserve basic reading order
      const pageText = content.items.map(it => (it.str || '').trim()).filter(Boolean).join(' ');
      text += pageText + '\n';
    }
    return text;
  } catch (err) {
    console.error('PDF parse error', err);
    throw new Error('Failed to parse PDF. Ensure the file is a standard PDF and try again.');
  }
}
function parseQuestionsFromText(text){
  const blocks = text.split(/(?=\n?\s*\d+\s[\s\S])/g).map(s=>s.trim()).filter(Boolean);
  const out = [];
  blocks.forEach(b => {
    const m = b.match(/^(\d+)\s+([\s\S]+)/);
    if (!m) return;
    const body = m[2].trim();
    const parts = body.split(/\n|\r/).join('\n');
    const lines = parts.split('\n').map(s=>s.trim()).filter(Boolean);
    const choices = [];
    const qLines = [];
    lines.forEach(line => {
      const cm = line.match(/^([A-D])[\).\s]+(.+)/i);
      if (cm){ choices[cm[1].toUpperCase().charCodeAt(0)-65] = cm[2].trim(); }
      else qLines.push(line);
    });
    if (choices.filter(Boolean).length < 4){
      const alt = body.match(/A[\).\s]+(.+?)B[\).\s]+(.+?)C[\).\s]+(.+?)D[\).\s]+(.+)/i);
      if (alt){ choices[0]=alt[1].trim(); choices[1]=alt[2].trim(); choices[2]=alt[3].trim(); choices[3]=alt[4].trim(); }
    }
    out.push({ text: qLines.join(' '), choices: choices.map(c=>c||''), answer: 0, section: guessSection(body), topic: 'general' });
  });
  return out;
}
function guessSection(text){
  const t = text.toLowerCase();
  const rules = [
    { sec: 's1', kws: ['scarcity','opportunity cost','ppf','choice','basic economic problem'] },
    { sec: 's2', kws: ['demand','supply','elasticity','market','equilibrium','price'] },
    { sec: 's3', kws: ['household','firm','bank','wage','revenue','profit','costs'] },
    { sec: 's4', kws: ['gdp','inflation','unemployment','fiscal','monetary','interest','aggregate'] },
    { sec: 's5', kws: ['poverty','development','hdi','sustain','aid','inequality'] },
    { sec: 's6', kws: ['trade','tariff','quota','exchange rate','global','imports','exports'] },
  ];
  for (const r of rules){ if (r.kws.some(k=>t.includes(k))) return r.sec; }
  return 's2';
}
function sectionSelect(current){
  const opts = [
    { id: 's1', name: 'Section 1: The basic economic problem' },
    { id: 's2', name: 'Section 2: The allocation of resources' },
    { id: 's3', name: 'Section 3: Microeconomic decision makers.' },
    { id: 's4', name: 'Section 4: The government and the macroeconomy.' },
    { id: 's5', name: 'Section 5: Economic development.' },
    { id: 's6', name: 'Section 6: International trade and globalisation.' },
  ];
  return `<select name="section" class="border rounded px-2 py-1">${opts.map(o=>`<option value="${o.id}" ${current===o.id?'selected':''}>${o.name}</option>`).join('')}</select>`;
}
function topicOptions(sectionId, current){
  const topics = getBank()[sectionId]?.topics || [];
  if (topics.length === 0) return `<option value="general" ${current==='general'?'selected':''}>general</option>`;
  return topics.map(t=>`<option value="${t.id}" ${current===t.id?'selected':''}>${t.name}</option>`).join('');
}
function topicSelect(sectionId, current){
  return `<select name="topic" class="border rounded px-2 py-1">${topicOptions(sectionId, current)}</select>`;
}
function answerSelect(current){
  const labels = ['A','B','C','D']; const idx = Number.isInteger(current)? current : 0;
  return `<select name="answer" class="border rounded px-2 py-1">${labels.map((l,i)=>`<option value="${i}" ${i===idx?'selected':''}>${l}</option>`).join('')}</select>`;
}
function renderTable(items, tbody){
  tbody.innerHTML='';
  const frag = document.createDocumentFragment();
  items.forEach((q,i)=>{
    const tr = document.createElement('tr'); tr.setAttribute('data-index', String(i));
    tr.innerHTML = `
      <td class="p-2 align-top text-slate-500">${i+1}</td>
      <td class="p-2 w-[30rem]"><textarea name="qtext" class="w-full border rounded p-2 text-sm" rows="3">${escapeHtml(q.text)}</textarea></td>
      <td class="p-2">${sectionSelect(q.section)}</td>
      <td class="p-2">${topicSelect(q.section, q.topic)}</td>
      <td class="p-2">
        <div class="grid grid-cols-1 gap-1">
          <input name="choiceA" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[0]||'')}">
          <input name="choiceB" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[1]||'')}">
          <input name="choiceC" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[2]||'')}">
          <input name="choiceD" class="border rounded px-2 py-1" value="${escapeHtml(q.choices[3]||'')}">
        </div>
      </td>
      <td class="p-2">${answerSelect(q.answer)}</td>`;
    const selSection = tr.querySelector('select[name="section"]');
    const selTopic = tr.querySelector('select[name="topic"]');
    selSection.addEventListener('change', ()=>{ selTopic.innerHTML = topicOptions(selSection.value, null); });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}
function escapeHtml(s){ return s.replace(/[&<>"']?/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c)); }

// ---------- Import helpers ----------
function normalizeImportedBank(data){
  // Accept either { s1: {topics, questions}, ... } or [{section, topic, text, choices, answer}, ...]
  const out = {};
  if (Array.isArray(data)){
    data.forEach(q => {
      const sec = q.section || 's2';
      if (!out[sec]) out[sec] = { topics: [], questions: [] };
      out[sec].questions.push({ topic: q.topic || 'general', text: q.text || '', choices: (q.choices||[]).slice(0,4), answer: Number.isInteger(q.answer)? q.answer : 0 });
      if (q.topic) {
        if (!out[sec].topics.find(t=>t.id===q.topic)) out[sec].topics.push({ id: q.topic, name: q.topic });
      }
    });
    return out;
  }
  // object form
  for (const sec of Object.keys(data||{})){
    const val = data[sec] || {};
    const topics = Array.isArray(val.topics) ? val.topics.map(t=>({ id: t.id||t, name: t.name||t.id||String(t) })) : [];
    const qs = Array.isArray(val.questions) ? val.questions.map(q=>({ topic: q.topic || 'general', text: q.text || '', choices: (q.choices||[]).slice(0,4), answer: Number.isInteger(q.answer)? q.answer : 0 })) : [];
    out[sec] = { topics, questions: qs };
  }
  return out;
}
function mergeIntoCustomBank(bankToMerge){
  const current = loadCustomBank();
  for (const sec of Object.keys(bankToMerge)){
    const incoming = bankToMerge[sec];
    if (!current[sec]) current[sec] = { topics: [], questions: [] };
    // merge topics
    const topicMap = new Map((current[sec].topics||[]).map(t=>[t.id,t]));
    (incoming.topics||[]).forEach(t=>{ if (!topicMap.has(t.id)) topicMap.set(t.id, t); });
    current[sec].topics = Array.from(topicMap.values());
    // merge questions with simple de-dup (by text+choices)
    const seen = new Set((current[sec].questions||[]).map(q=>hashQ(q)));
    (incoming.questions||[]).forEach(q=>{ const h = hashQ(q); if (!seen.has(h)){ current[sec].questions.push(q); seen.add(h); } });
  }
  saveCustomBank(current);
}
function hashQ(q){ return `${(q.text||'').trim()}|${(q.choices||[]).join('||')}`.toLowerCase(); }
