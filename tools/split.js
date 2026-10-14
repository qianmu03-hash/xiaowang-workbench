/* ==========================================================
   tools/split.js — 把 js/app.js 机械拆分为 core + js/pages/*.js
   用法：node tools/split.js          干跑，只输出报告（不写文件）
        node tools/split.js --write  校验通过后写入 core 与页面文件
   原则：
   1. 按顶层声明（function/async function/const/let/var，2 空格缩进）切块
   2. 块尾的纯注释/空行上移归属下一个声明（注释跟随其描述的代码）
   3. round-trip 校验：所有块重拼必须 === 原文件
   4. 映射表决定符号归属；未映射的符号默认留 core（最安全）
   5. 写文件前静态检查跨文件引用：页面引用 core 符号必须在 App.ctx 中，
      页面之间不允许互相引用（core 引用页面符号只允许 RENDER 查表）
   ========================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'js', 'app.js');
const OUT_DIR = path.join(ROOT, 'js', 'pages');
const WRITE = process.argv.includes('--write');

/* ---------- 拆分映射（10 个页面组 + 未列出者留 core） ---------- */
const GROUPS = [
  { file: 'home', regs: { home: 'renderHome' },
    defs: ['TASKS_DEF', 'QUICK_DEF', 'MOTIV', 'tasksToday', 'saveTasks', 'quickActs',
           'saveQuicks', 'waterCount', 'renderHome', 'quickAction', 'quickManager',
           'openTaskModal', 'openLedgerModal', 'ledgerToday', 'suggestToday'] },
  { file: 'fitness', regs: { fitness: 'renderFitness', dance: 'renderDance' },
    defs: ['renderFitness', 'renderDance'] },
  { file: 'create', regs: { create: 'renderCreate', glam: 'renderGlam', cosmetics: 'renderCosmetics' },
    defs: ['renderCreate', 'showScript', 'openPlatform', 'viralMeta', 'viralAnalysis',
           'makePrompt', 'showManjuModal', 'scriptCard', 'renderCreateIdeas',
           'showIdeaModal', 'renderGlam', 'cosData', 'renderCosmetics'] },
  { file: 'language', regs: { english: 'renderEnglish', cantonese: 'renderCantonese' },
    defs: ['renderEnglish', 'renderWords', 'streakCount', 'renderTalk', 'renderNC',
           'renderCantonese', 'renderYuePhrase', 'renderYueTalk', 'renderYueTone',
           'renderYueFollow', 'renderStudyPanel'] },
  { file: 'reading', regs: { reading: 'renderReading', learn: 'renderLearn' },
    defs: ['renderReading', 'renderBooks', 'migrateReadPct', 'adjustBookPct', 'openReader',
           'numCn', 'parseWikisource', 'cleanWikitext', 'parseWikiPage', 'fetchWikiSubpages',
           'autoFetchChapters', 'openAddBook', 'renderPod', 'renderQuote', 'renderLearn',
           'learnItem'] },
  { file: 'ledger', regs: { ledger: 'renderLedger' },
    defs: ['renderLedger', 'openNoteModal', 'prevMonth', 'nextMonth', 'drawTrend'] },
  { file: 'food', regs: { food: 'renderFood', remind: 'renderRemind' },
    defs: ['renderFood', 'recipeCardHtml', 'renderRemind'] },
  { file: 'daily', regs: { menstrual: 'renderMenstrual', habits: 'renderHabits', mood: 'renderMood' },
    defs: ['renderMenstrual', 'renderHabits', 'renderMood'] },
  { file: 'media', regs: { news: 'renderNews', weather: 'renderWeather' },
    defs: ['renderNews', 'fmtNewsTime', 'loadLiveNews', 'renderWeather', 'weatherTip',
           'renderWeatherData', 'WCODE'] },
  { file: 'mine', regs: { dashboard: 'renderDashboard', insights: 'renderInsights',
                          skincare: 'renderSkincare', badge: 'renderBadge', about: 'renderAbout' },
    defs: ['renderDashboard', 'renderInsights', 'renderSkincare', 'renderBadge', 'renderAbout'] },
];
const ALL_PAGE_NAMES = Object.assign({}, ...GROUPS.map(g => g.regs));
const defToGroup = {};
GROUPS.forEach(g => g.defs.forEach(d => { defToGroup[d] = g.file; }));

const errors = [];
const notes = [];

/* ---------- 1. 切块 ---------- */
const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split('\n');
const declRe = /^  (?:async\s+function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/;

const decls = [];
lines.forEach((ln, i) => {
  const m = ln.match(declRe);
  if (m) {
    const extra = [];
    let e;
    const re = /,\s*([A-Za-z_$][\w$]*)\s*=/g;
    while ((e = re.exec(ln))) extra.push(e[1]);
    decls.push({ idx: i, primary: m[1], names: [m[1], ...extra] });
  }
});
if (!decls.length) { console.error('未找到任何顶层声明'); process.exit(1); }

/* 块 = [decl_i.idx, decl_{i+1}.idx)；prelude = [0, decl_0.idx) */
let chunks = [];
for (let i = 0; i < decls.length; i++) {
  const start = decls[i].idx;
  const end = i + 1 < decls.length ? decls[i + 1].idx : lines.length;
  chunks.push({ decl: decls[i], lines: lines.slice(start, end) });
}
const prelude = lines.slice(0, decls[0].idx);

/* 块尾纯注释/空行上移归属下一个声明 */
for (let i = 0; i < chunks.length - 1; i++) {
  const c = chunks[i];
  let cut = c.lines.length;
  while (cut > 0) {
    const t = c.lines[cut - 1].trim();
    if (t === '' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) cut--;
    else break;
  }
  if (cut < c.lines.length) {
    const moved = c.lines.splice(cut);
    chunks[i + 1].lines = moved.concat(chunks[i + 1].lines);
  }
}

/* ---------- round-trip 校验 ---------- */
const rebuilt = [...prelude, ...chunks.flatMap(c => c.lines)].join('\n');
if (rebuilt !== src) { errors.push('ROUND-TRIP 失败：块重拼与原文件不一致'); }

/* ---------- 2. 归属分配 ---------- */
const coreChunks = [];
const pageChunks = {}; GROUPS.forEach(g => { pageChunks[g.file] = []; });
const coreDefs = [];
const pageDefs = {}; GROUPS.forEach(g => { pageDefs[g.file] = []; });

chunks.forEach(c => {
  const g = defToGroup[c.decl.primary];
  if (g) {
    pageChunks[g] = pageChunks[g].concat(c.lines);
    pageDefs[g] = pageDefs[g].concat(c.decl.names);
  } else {
    coreChunks.push(c.lines);
    coreDefs.push(...c.decl.names);
  }
  /* 映射表拼写校验：extra 名若被映射到别的组 → 冲突 */
  c.decl.names.forEach(n => {
    if (n !== c.decl.primary && defToGroup[n] && defToGroup[n] !== defToGroup[c.decl.primary]) {
      errors.push(`符号 ${n} 被映射到 ${defToGroup[n]}，但与其声明所在的块归属不一致`);
    }
  });
});
/* 映射表中的名字必须真实存在 */
const allDeclNames = new Set(decls.flatMap(d => d.names));
Object.keys(defToGroup).forEach(n => {
  if (!allDeclNames.has(n)) errors.push(`映射表中的符号 ${n} 在 app.js 中不存在（拼写错误？）`);
});

/* ---------- 3. 解析 App.ctx 键 ---------- */
const ctxMatch = src.match(/ctx:\s*\{([\s\S]*?)\}/);
if (!ctxMatch) { errors.push('未能从 app.js 解析出 App.ctx'); }
const ctxKeys = ctxMatch
  ? [...ctxMatch[1].matchAll(/[A-Za-z_$][\w$]*/g)].map(m => m[0])
  : [];

/* ---------- 4. 引用提取（去注释/单引号串/双引号串，保留模板串；跳过 a.b 的 b） ---------- */
function stripCode(text) {
  /* 顺序关键：先处理反引号模板（模板里的 // 与 ' 不能被误判为注释/字符串） */
  return text
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    /* 模板字符串：正文置空，但保留 ${} 内的表达式（其中可能有跨文件调用） */
    .replace(/`(?:[^`\\]|\\[\s\S])*`/g, s => {
      const inners = [];
      const noInn = s.replace(/\$\{([\s\S]*?)\}/g, (m, i) => { inners.push(i); return '\x01'; });
      const segs = noInn.split('\x01');
      let out = '';
      segs.forEach((seg, i) => {
        out += seg.replace(/[^\n]/g, ' ');
        if (i < inners.length) out += inners[i] + ' ';
      });
      return out;
    })
    .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length))
    .replace(/'[^'\n]*'/g, m => ' '.repeat(m.length))
    .replace(/"[^"\n]*"/g, m => ' '.repeat(m.length));
}
function refsOf(text, ownDefs) {
  const code = stripCode(text);
  const own = new Set(ownDefs);
  const out = new Set();
  const re = /[A-Za-z_$][\w$]*/g;
  let m;
  while ((m = re.exec(code))) {
    const name = m[0];
    if (own.has(name)) continue;
    const before = code.slice(Math.max(0, m.index - 1), m.index);
    if (before === '.') continue; // 属性访问跳过
    out.add(name);
  }
  return out;
}

const coreText = [...prelude, ...coreChunks.flat()].join('\n');
const pageTexts = {};
GROUPS.forEach(g => { pageTexts[g.file] = pageChunks[g.file].join('\n'); });

/* 4a. 页面引用 core 符号必须在 ctx 中 */
const ctxSet = new Set(ctxKeys);
GROUPS.forEach(g => {
  const refs = refsOf(pageTexts[g.file], [...pageDefs[g.file], 'switchPage']);
  refs.forEach(r => {
    if (coreDefs.includes(r) && !ctxSet.has(r)) {
      errors.push(`[pages/${g.file}.js] 引用 core 符号 ${r}，但它不在 App.ctx 中`);
    }
  });
});
/* 4b. 页面之间不允许互相引用 */
GROUPS.forEach(a => {
  const refs = refsOf(pageTexts[a.file], [...pageDefs[a.file], 'switchPage']);
  GROUPS.forEach(b => {
    if (a.file === b.file) return;
    refs.forEach(r => {
      if (pageDefs[b.file].includes(r)) {
        errors.push(`[pages/${a.file}.js] 跨页面引用 ${b.file} 的符号 ${r}（需改归属或走 RENDER）`);
      }
    });
  });
});
/* 4c. core 不允许直接引用页面符号（RENDER 查表除外，已被 '.' 规则跳过） */
{
  const pageAll = [];
  GROUPS.forEach(g => pageAll.push(...pageDefs[g.file]));
  const refs = refsOf(coreText, coreDefs);
  refs.forEach(r => {
    if (pageAll.includes(r)) errors.push(`[app.js] core 直接引用页面符号 ${r}`);
  });
}
/* 4d. 注册覆盖 23 个板块 */
const pagesInHtml = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .matchAll(/data-page="([a-z]+)"/g)].map(m => m[1]);
const registered = new Set(Object.keys(ALL_PAGE_NAMES));
pagesInHtml.forEach(p => { if (!registered.has(p)) errors.push(`板块 ${p} 没有对应的 App.page 注册`); });

/* ---------- 5. 输出 ---------- */
const coreText2 = [...prelude, ...coreChunks.flat()].join('\n');
console.log(`app.js: ${lines.length} 行, ${decls.length} 个顶层声明`);
console.log(`core  : ${coreText2.split('\n').length} 行, ${coreDefs.length} 个符号`);
GROUPS.forEach(g => {
  const n = pageChunks[g.file].filter(l => l.trim() !== '').length;
  console.log(`pages/${g.file}.js: ${n} 行, ${pageDefs[g.file].length} 个符号, 注册 ${Object.keys(g.regs).join(',')}`);
});
console.log(`App.ctx: ${ctxKeys.length} 个键`);
if (notes.length) { console.log('\n提示:'); notes.forEach(n => console.log('  ' + n)); }
if (errors.length) { console.log('\n发现问题:'); errors.forEach(e => console.log('  ✗ ' + e)); }
else console.log('\n静态检查全部通过 ✓');

if (!WRITE) { process.exit(errors.length ? 1 : 0); }
if (errors.length) { console.error('有错误，拒绝写入'); process.exit(1); }

/* ---------- 6. 写文件 ---------- */
fs.writeFileSync(SRC, coreText2);
fs.mkdirSync(OUT_DIR, { recursive: true });
const ctxDestructure = '  const { ' + ctxKeys.join(', ') + ' } = App.ctx;';
GROUPS.forEach(g => {
  const body = [
    '/* ==========================================================',
    `   小王的工作台 — 页面模块：${g.file}.js`,
    '   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）',
    '   通过 App.page() 向 core 注册渲染函数',
    '   ========================================================== */',
    '(function (global) {',
    "  'use strict';",
    ctxDestructure,
    '  const switchPage = App.go;',
    '',
    pageChunks[g.file].join('\n').replace(/\n+$/, ''),
    '',
    Object.entries(g.regs).map(([p, fn]) => `  App.page('${p}', ${fn});`).join('\n'),
    '})(window);',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, g.file + '.js'), body);
});
console.log('\n已写入 js/app.js（core）与 js/pages/*.js（10 个页面模块）');
