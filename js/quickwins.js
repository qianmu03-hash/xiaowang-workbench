/* ==========================================================
   小王的工作台 — 快速见效功能（v40）
   ① 全局搜索：Ctrl+K / 顶栏 🔍 唤起，搜板块/菜谱/单词/书籍/记账
   ② 番茄专注钟：顶栏 🍅 唤起，25 分钟倒计时，完成弹系统通知并计数
   非页面模块：不占板块，仅给顶栏加两个按钮 + 两个浮层
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, CATS, PAGE_INFO } = App.ctx;
  const switchPage = App.go;

  /* ================= 系统通知（与 core fire 同策略：SW 通道优先） ================= */
  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const opt = { body: body, tag: 'sunpad-quickwin', icon: './icons/icon-192.png' };
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then(r => r.showNotification(title, opt))
            .catch(() => { try { new Notification(title, opt); } catch (e) {} });
        } else {
          new Notification(title, opt);
        }
      }
    } catch (e) {}
    try { C.Toast(title + ' · ' + body, 5000); } catch (e) {}
  }

  /* ================= ① 全局搜索 ================= */
  let ov = null;          // 搜索浮层
  let idxCache = null;    // 打开时构建一次索引
  let sel = 0;            // 当前高亮
  let results = [];

  function buildIndex() {
    const idx = [];
    /* 板块 */
    Object.keys(PAGE_INFO).forEach(k => {
      idx.push({ g: '板块', ic: PAGE_INFO[k].i, title: PAGE_INFO[k].n, sub: '打开板块',
        key: (PAGE_INFO[k].n + ' ' + k).toLowerCase(), run: () => switchPage(k) });
    });
    /* 菜谱 */
    (global.DATA_FOOD || []).forEach(f => {
      idx.push({ g: '菜谱', ic: '🍲', title: f.n, sub: (f.cat || '') + (f.t ? ' · ' + f.t : ''),
        key: (f.n + ' ' + (f.tag || '') + ' ' + (f.kw || '') + ' ' + (f.cat || '')).toLowerCase(),
        run: () => switchPage('food') });
    });
    /* 单词 */
    const W = global.DATA_WORDS || {};
    Object.keys(W).forEach(level => (W[level] || []).forEach(w => {
      idx.push({ g: '单词', ic: '🔤', title: w[0], sub: (w[2] || '') + (w[1] ? ' · ' + w[1] : ''),
        key: (w[0] + ' ' + (w[2] || '') + ' ' + (w[4] || '')).toLowerCase(),
        run: () => switchPage('english') });
    }));
    /* 书籍 */
    (global.DATA_BOOKS || []).forEach(b => {
      idx.push({ g: '书籍', ic: b.cover || '📚', title: b.title, sub: b.author || '',
        key: ((b.title || '') + ' ' + (b.author || '')).toLowerCase(), run: () => switchPage('reading') });
    });
    /* 记账（最近 200 条） */
    (S.get('ledger', []) || []).slice(-200).forEach(r => {
      if (!r) return;
      const catName = (CATS[r.cat] && CATS[r.cat].n) || r.cat || '';
      const show = r.note || catName || (r.type === 'in' ? '收入' : '支出');
      idx.push({ g: '记账', ic: '💰', title: show,
        sub: r.date + ' · ' + (r.type === 'in' ? '+' : '-') + r.amt + '（' + catName + '）',
        key: (show + ' ' + catName + ' ' + (r.date || '')).toLowerCase(), run: () => switchPage('ledger') });
    });
    return idx;
  }

  function renderResults(q) {
    const box = ov.querySelector('.search-results');
    if (!q) {
      results = idxCache.slice(0, 8);
      box.innerHTML = '<div class="search-empty">输入关键词开始搜索 · 支持板块 / 菜谱 / 单词 / 书籍 / 记账</div>';
    } else {
      results = idxCache.filter(it => it.key.includes(q)).slice(0, 30);
      if (!results.length) {
        box.innerHTML = '<div class="search-empty">没有找到「' + C.esc(q) + '」相关内容</div>';
      } else {
        box.innerHTML = results.map((it, i) =>
          `<div class="sr-item${i === sel ? ' on' : ''}" data-i="${i}">
             <span class="sr-ic">${it.ic}</span>
             <span class="sr-tx"><b>${C.esc(it.title)}</b><small>${C.esc(it.sub || '')}</small></span>
             <span class="sr-g">${it.g}</span>
           </div>`).join('');
        box.querySelectorAll('.sr-item').forEach(node => {
          node.onmousedown = () => pick(+node.dataset.i);
        });
      }
    }
    if (sel >= results.length) sel = 0;
  }

  function pick(i) {
    const it = results[i];
    closeSearch();
    if (it) it.run();
  }

  function openSearch() {
    if (ov) return;
    idxCache = buildIndex();
    sel = 0;
    ov = el('div', 'search-ov');
    ov.innerHTML = `
      <div class="search-box">
        <input class="search-input" placeholder="搜板块 / 菜谱 / 单词 / 书籍 / 记账…" autocomplete="off">
        <div class="search-results"></div>
        <div class="search-hint">↑↓ 选择 · Enter 打开 · Esc 关闭</div>
      </div>`;
    const inp = ov.querySelector('.search-input');
    inp.oninput = () => { sel = 0; renderResults(inp.value.trim().toLowerCase()); };
    inp.onkeydown = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); renderResults(inp.value.trim().toLowerCase()); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); renderResults(inp.value.trim().toLowerCase()); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
      else if (e.key === 'Escape') { closeSearch(); }
    };
    ov.onmousedown = e => { if (e.target === ov) closeSearch(); };
    document.body.appendChild(ov);
    renderResults('');
    inp.focus();
  }

  function closeSearch() {
    if (ov) { ov.remove(); ov = null; }
  }

  /* ================= ② 番茄专注钟 ================= */
  const POMO_MIN = 25;
  const pomo = { endAt: 0, leftSec: POMO_MIN * 60, timer: null, running: false };
  let pomoPanel = null;

  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  function pomoLeft() {
    if (!pomo.running) return pomo.leftSec;
    return Math.max(0, Math.ceil((pomo.endAt - Date.now()) / 1000));
  }

  function pomoPaint() {
    if (!pomoPanel) return;
    const t = pomoPanel.querySelector('.pomo-time');
    if (t) t.textContent = fmt(pomoLeft());
    const b = pomoPanel.querySelector('.pomo-toggle');
    if (b) b.textContent = pomo.running ? '⏸ 暂停' : '▶ 开始';
    const cnt = pomoPanel.querySelector('.pomo-count');
    if (cnt) cnt.textContent = '今日已完成 ' + S.dayGet('focus', 0) + ' 个番茄';
  }

  function pomoComplete() {
    pomo.running = false;
    pomo.leftSec = POMO_MIN * 60;
    if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = null; }
    const n = S.dayGet('focus', 0) + 1;
    S.daySet('focus', n);
    notify('🍅 专注完成', '一个番茄时间到，今日已完成 ' + n + ' 个');
    pomoPaint();
  }

  function pomoToggle() {
    if (pomo.running) {           /* 暂停 */
      pomo.leftSec = pomoLeft();
      pomo.running = false;
      clearInterval(pomo.timer); pomo.timer = null;
    } else {                       /* 开始/继续 */
      pomo.endAt = Date.now() + pomo.leftSec * 1000;
      pomo.running = true;
      pomo.timer = setInterval(() => {
        if (pomoLeft() <= 0) pomoComplete();
        else pomoPaint();
      }, 500);
    }
    pomoPaint();
  }

  function pomoReset() {
    pomo.running = false;
    pomo.leftSec = POMO_MIN * 60;
    if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = null; }
    pomoPaint();
  }

  function openPomo() {
    if (pomoPanel) { pomoPanel.remove(); pomoPanel = null; return; } /* 再点一次收起 */
    pomoPanel = el('div', 'pomo-panel');
    pomoPanel.innerHTML = `
      <div class="pomo-head"><span>🍅 番茄专注</span><button class="pomo-close">✕</button></div>
      <div class="pomo-time">${fmt(pomoLeft())}</div>
      <div class="pomo-btns">
        <button class="btn-pill pomo-toggle">${pomo.running ? '⏸ 暂停' : '▶ 开始'}</button>
        <button class="btn-pill pomo-reset">↺ 重置</button>
      </div>
      <div class="pomo-count">今日已完成 ${S.dayGet('focus', 0)} 个番茄</div>`;
    pomoPanel.querySelector('.pomo-toggle').onclick = pomoToggle;
    pomoPanel.querySelector('.pomo-reset').onclick = pomoReset;
    pomoPanel.querySelector('.pomo-close').onclick = () => { pomoPanel.remove(); pomoPanel = null; };
    document.body.appendChild(pomoPanel);
  }

  /* ================= 接线 ================= */
  function wiring() {
    const bs = document.getElementById('btnSearch');
    if (bs) bs.onclick = openSearch;
    const bf = document.getElementById('btnFocus');
    if (bf) bf.onclick = openPomo;
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        ov ? closeSearch() : openSearch();
      } else if (e.key === 'Escape' && ov) {
        closeSearch();
      }
    });
  }
  /* 接线：本脚本以 defer 方式加载，执行时 DOM 已解析完毕，直接绑定即可 */
  wiring();
})(window);
