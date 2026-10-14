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

console.log('\n汇总: ' + pass + ' 通过 / ' + fail + ' 失败');
if (errors.length) {
  console.log('\n捕获到的错误（' + errors.length + '）:');
  [...new Set(errors)].slice(0, 15).forEach(e => console.log('  ' + e));
}
process.exit(fail || errors.length ? 1 : 0);
