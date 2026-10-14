/* ==========================================================
   小王的工作台 — DOM 冒烟测试（jsdom）
   目的：任何重构（拆模块/改版）后，跑一遍全板块渲染 + 关键交互，
        确保没有 JS 报错、每个页面都有内容输出。
   运行：node tests/smoke.js
   依赖：jsdom（装在 WorkBuddy node workspace，NODE_PATH 指过去即可）
   ========================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---------- 全部页面（与 app.js PAGE_INFO 保持一致） ---------- */
const PAGES = [
  'home', 'fitness', 'dance', 'create', 'glam', 'english', 'cantonese',
  'reading', 'learn', 'ledger', 'remind', 'food', 'news', 'weather',
  'menstrual', 'habits', 'mood', 'cosmetics', 'dashboard', 'insights',
  'skincare', 'badge', 'about'
];

/* ---------- 错误收集 ---------- */
const errors = [];
function pushErr(tag, e) {
  errors.push(`[${tag}] ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
}

/* ---------- 构建 DOM 环境 ---------- */
const dom = new JSDOM(html, {
  url: 'http://localhost/xiaowang-workbench/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const win = dom.window;

win.addEventListener('error', e => pushErr('window.error', e.message));
win.addEventListener('unhandledrejection', e => pushErr('unhandledrejection', e.reason));
// 离线模拟：所有 fetch 失败（页面须自己兜底）
win.fetch = () => Promise.reject(new Error('smoke-offline'));
// 捕获页面 console.error
win.console.error = (...a) => pushErr('console.error', a.map(String).join(' '));

/* ---------- 按 index.html 顺序加载脚本 ---------- */
const srcs = [...html.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
for (const src of srcs) {
  const file = path.join(ROOT, src);
  try {
    win.eval(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    pushErr('LOAD ' + src, e);
  }
}

/* boot.js 已执行 App.init()（渲染 home）。以下逐板块渲染。 */
let pass = 0, fail = 0;
const check = (name, ok, ex) => {
  ok ? pass++ : fail++;
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name + (ex !== undefined ? '  [' + ex + ']' : ''));
};

check('脚本全部加载', errors.filter(e => e.startsWith('[LOAD')).length === 0,
  errors.filter(e => e.startsWith('[LOAD')).length + ' 个失败');
check('App.init 已渲染 home', win.document.getElementById('panel').children.length > 0,
  win.document.getElementById('panel').children.length + ' 个节点');
check('导出 App.go', typeof win.App === 'object' && typeof win.App.go === 'function');

/* ---------- 逐板块渲染两轮（第二轮覆盖重入/刷新路径） ---------- */
for (let round = 1; round <= 2; round++) {
  for (const p of PAGES) {
    const before = errors.length;
    let content = -1, threw = null;
    try {
      win.App.go(p);
      content = win.document.getElementById('panel').children.length;
    } catch (e) { threw = e; }
    const newErrs = errors.length - before;
    const ok = !threw && newErrs === 0 && content > 0;
    // 第一轮全部打印，第二轮只打印失败项
    if (round === 1 || !ok) check(`渲染 ${p}（第${round}轮）`, ok,
      threw ? String(threw.message).slice(0, 80) : newErrs ? newErrs + ' 个错误' : content + ' 节点');
  }
}

/* ---------- 关键交互：深度洞察 · 一键生成报告 ---------- */
{
  const before = errors.length;
  win.App.go('insights');
  const panel = win.document.getElementById('panel');
  const btns = [...panel.querySelectorAll('button')];
  const bWeek = btns.find(b => b.textContent.includes('生成本周周报'));
  const bMonth = btns.find(b => b.textContent.includes('生成本月月报'));
  const bCopy = btns.find(b => b.textContent.includes('复制'));
  check('洞察页有 3 个报告按钮', !!(bWeek && bMonth && bCopy));
  const out = panel.querySelector('pre');
  if (bWeek) bWeek.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  check('点击生成周报不报错且有输出', errors.length === before && out && out.textContent.includes('周报'),
    out ? out.textContent.split('\n')[0] : '无输出');
  if (bMonth) bMonth.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  check('点击生成月报不报错', errors.length === before && out.textContent.includes('月报'));
  if (bCopy) bCopy.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); // 无剪贴板环境，允许 Toast 报错路径
}

/* ---------- 总览页入口 ---------- */
{
  win.App.go('dashboard');
  const panel = win.document.getElementById('panel');
  const entry = [...panel.querySelectorAll('button')].find(b => b.textContent.includes('进入洞察'));
  check('总览页有洞察入口', !!entry);
}

/* ---------- v40 快速见效：全局搜索 / 番茄钟 / 首页新卡片 ---------- */
{
  const btnS = win.document.getElementById('btnSearch');
  const btnF = win.document.getElementById('btnFocus');
  check('顶栏有搜索/番茄按钮', !!(btnS && btnF));

  /* 点击 🔍 打开搜索 → 关键词出结果 → Enter 跳转关闭 */
  const b1 = errors.length;
  if (btnS) btnS.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const ov = win.document.querySelector('.search-ov');
  check('点击 🔍 打开搜索浮层', !!ov);
  if (ov) {
    const inp = ov.querySelector('.search-input');
    inp.value = '记账';
    inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    const items = ov.querySelectorAll('.sr-item');
    check('搜索「记账」有结果', items.length > 0, items.length + ' 条');
    inp.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    check('Enter 跳转后浮层关闭', !win.document.querySelector('.search-ov'));
  }
  check('搜索流程无报错', errors.length === b1, b1 + '→' + errors.length);

  /* Ctrl+K 唤起 / Esc 关闭 */
  const b2 = errors.length;
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  check('Ctrl+K 唤起搜索', !!win.document.querySelector('.search-ov'));
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc 关闭搜索', !win.document.querySelector('.search-ov'));
  check('快捷键流程无报错', errors.length === b2, b2 + '→' + errors.length);

  /* 番茄面板开关 */
  const b3 = errors.length;
  if (btnF) btnF.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const pp = win.document.querySelector('.pomo-panel');
  check('点击 🍅 打开番茄面板', !!pp);
  check('番茄初始显示 25:00', !!(pp && pp.querySelector('.pomo-time').textContent === '25:00'),
    pp ? pp.querySelector('.pomo-time').textContent : '无面板');
  if (pp) pp.querySelector('.pomo-close').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  check('番茄面板可关闭', !win.document.querySelector('.pomo-panel'));
  check('番茄流程无报错', errors.length === b3, b3 + '→' + errors.length);

  /* 首页倒数日 + 随手笔记 */
  const b4 = errors.length;
  win.App.go('home');
  const panel = win.document.getElementById('panel');
  const cdCard = panel.querySelector('.cd-list');
  const noteCard = panel.querySelector('.note-wrap');
  check('首页有倒数日卡片', !!cdCard);
  check('首页有随手笔记卡片', !!noteCard);
  if (noteCard) {
    const nInp = noteCard.querySelector('.t-add input');
    nInp.value = '冒烟测试笔记';
    nInp.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const txt = [...win.document.querySelectorAll('#panel .note-tx')].map(n => n.textContent);
    check('回车保存笔记并即时显示', txt.includes('冒烟测试笔记'));
  }
  const cdAdd = panel.querySelector('.cd-add');
  if (cdAdd) cdAdd.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  check('倒数日添加弹窗打开', !!win.document.querySelector('.modal-mask #cdTitle'));
  const mask = win.document.querySelector('.modal-mask');
  if (mask) mask.remove();
  check('首页新功能无报错', errors.length === b4, b4 + '→' + errors.length);
}

console.log('\n汇总: ' + pass + ' 通过 / ' + fail + ' 失败');
if (errors.length) {
  console.log('\n捕获到的错误（' + errors.length + '）:');
  [...new Set(errors)].slice(0, 15).forEach(e => console.log('  ' + e));
}
process.exit(fail || errors.length ? 1 : 0);
