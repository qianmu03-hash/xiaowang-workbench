/* ==========================================================
   小王的工作台 — 页面模块：home.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

  const TASKS_DEF = [
    { id: 'sleep', t: '早睡（23:00前）', ic: '🌙' },
    { id: 'wake', t: '早起（9:00前）', ic: '🌅' },
    { id: 'fit', t: '健身运动1小时', ic: '💪' },
    { id: 'en', t: '英语口语练习30分钟', ic: '🗣️' },
    { id: 'data', t: '数据分析学习1小时', ic: '📊' },
    { id: 'read', t: '阅读书籍（提升）', ic: '📚' },
    { id: 'cook', t: '学做一道菜', ic: '🍳' }
  ];
  const QUICK_DEF = [
    { id: 'water', t: '喝水+1', ic: '💧' },
    { id: 'fit', t: '运动打卡', ic: '🏃' },
    { id: 'wake', t: '早起打卡', ic: '🌅' },
    { id: 'sleep', t: '早睡打卡', ic: '🌙' }
  ];

  function tasksToday() {
    return S.dayGet('tasks', TASKS_DEF.map(x => ({ ...x, done: false })));
  }
  function saveTasks(list) { S.daySet('tasks', list); }
  function quickActs() { return S.get('quicks', QUICK_DEF); }
  function saveQuicks(list) { S.set('quicks', list); }
  function waterCount() { return S.dayGet('water', 0); }

  const MOTIV = [
    '把今天过成你想要的样子。',
    '每一个不辜负的清晨，都在为未来蓄力。',
    '坚持，比天赋更可靠。',
    '今天也要温柔而坚定地推进。',
    '小步快跑，日拱一卒。',
    '你努力的样子，就是最好的样子。',
    '专注当下，未来自然会来。'
  ];

  /* ---------- v40：倒数日 / 随手笔记 ---------- */
  let notesExpanded = false;

  function openCountdownModal() {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `
      <h3>⏳ 添加倒数日</h3>
      <div class="modal-field"><label>名称</label><input id="cdTitle" maxlength="16" placeholder="如：生日 / 考试 / 纪念日"></div>
      <div class="modal-field"><label>日期</label><input id="cdDate" type="date"></div>
      <div class="modal-actions"><button class="m-btn cancel">取消</button><button class="m-btn ok">保存</button></div>`;
    const close = () => mask.remove();
    mask.onclick = e => { if (e.target === mask) close(); };
    m.querySelector('.cancel').onclick = close;
    m.querySelector('#cdDate').value = C.todayStr();
    m.querySelector('.ok').onclick = () => {
      const t = m.querySelector('#cdTitle').value.trim();
      const d = m.querySelector('#cdDate').value;
      if (!t) return C.Toast('请输入名称');
      if (!d) return C.Toast('请选择日期');
      const list = S.get('sunpad_countdowns', []);
      list.push({ id: C.uid(), title: t, date: d });
      S.set('sunpad_countdowns', list);
      close(); C.Toast('倒数日已添加 ⏳'); renderHome();
    };
    mask.appendChild(m);
    document.body.appendChild(mask);
  }

  function renderHome() {
    const box = $('#panel');
    box.innerHTML = '';
    const now = new Date();
    const h = now.getHours();
    const greet = h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    const mot = C.pickOne(MOTIV, 'motiv');

    const g = el('div', 'greet');
    g.innerHTML = `
      <div class="g-time">${greet}，小王 ☀️</div>
      <div class="g-motiv">${mot} · 今天是 ${C.todayStr().replace(/-/g, '.')}</div>`;
    box.appendChild(g);

    /* 今日三件事（智能决策器） */
    const sug = suggestToday();
    const sg = el('div', 'card');
    sg.appendChild(el('div', 'card-title', '✨ 今日三件事'));
    sug.forEach(s => {
      const row = el('div', 'suggest-item');
      row.innerHTML = `<span class="sg-ic">${s.icon}</span><span class="sg-tx">${C.esc(s.text)}</span><span class="sg-arrow">›</span>`;
      row.onclick = () => switchPage(s.page);
      sg.appendChild(row);
    });
    box.appendChild(sg);

    /* 状态卡（经期 / 习惯 / 心情） */
    const pd = predictPeriod();
    const hd = habitsData(), hlog = hd.log[ymd(new Date())] || {};
    const hDone = hd.habits.filter(h => h.type === 'toggle' ? hlog[h.id] === true : (hlog[h.id] || 0) >= h.target).length;
    const mRec = S.get('sunpad_mood', {})[ymd(new Date())];
    const chips = [
      { ic: '🌸', t: isPeriodActive() ? '经期进行中' : (pd.daysUntil != null ? `距经期 ${Math.max(0, pd.daysUntil)} 天` : '经期未设置') },
      { ic: '✅', t: `习惯 ${hDone}/${hd.habits.length}` },
      { ic: '💗', t: mRec && mRec.level ? '心情已记' : '记心情' }
    ];
    const sr = el('div', 'status-row');
    chips.forEach(c => sr.appendChild(el('div', 'status-chip', `<span>${c.ic}</span>${c.t}`)));
    box.appendChild(sr);

    /* 倒数日（v40）：未来的最近在前，过去的最近在前，最多 4 条 */
    const cds = S.get('sunpad_countdowns', []);
    const cdWrap = el('div', 'cd-list');
    if (!cds.length) {
      cdWrap.appendChild(el('div', 'cd-empty', '还没有倒数日 · 记录生日 / 纪念日 / 考试'));
    } else {
      const today = C.todayStr();
      const fut = cds.filter(d => d.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
      const past = cds.filter(d => d.date < today).sort((a, b) => (a.date > b.date ? -1 : 1));
      fut.concat(past).slice(0, 4).forEach(d => {
        const days = diffDays(today, d.date);
        const near = days >= 0 && days <= 7;
        const row = el('div', 'cd-item');
        row.innerHTML = `<span class="cd-title">${C.esc(d.title)}</span>
          <span class="cd-date">${d.date}</span>
          <span class="cd-days${near ? ' near' : ''}">${days > 0 ? '还有 ' + days + ' 天' : days === 0 ? '就是今天' : '已过 ' + (-days) + ' 天'}</span>
          <button class="cd-del" title="删除">✕</button>`;
        row.querySelector('.cd-del').onclick = () => {
          S.set('sunpad_countdowns', cds.filter(x => x.id !== d.id));
          renderHome();
        };
        cdWrap.appendChild(row);
      });
    }
    const cdAdd = el('button', 'cd-add', '＋ 添加倒数日');
    cdAdd.onclick = openCountdownModal;
    cdWrap.appendChild(cdAdd);
    box.appendChild(card('倒数日', '⏳', cdWrap));

    /* 统计卡 */
    const tasks = tasksToday();
    const done = tasks.filter(t => t.done).length;
    const water = waterCount();
    const fitDone = S.dayGet('fitDone', false);
    const spent = ledgerToday();
    const stats = [
      { ic: '✅', icbg: '#E8F5E9', label: '今日任务', num: `${done}<small>/${tasks.length}</small>`, prog: tasks.length ? done / tasks.length : 0, act: 'add-task' },
      { ic: '💧', icbg: '#E3F2FD', label: '喝水', num: `${water}<small>/8杯</small>`, prog: water / 8, act: 'water' },
      { ic: '🏃', icbg: '#FFF3E0', label: '运动打卡', num: fitDone ? '<small>已</small>✓' : '未打卡', prog: fitDone ? 1 : 0, act: 'fit' },
      { ic: '💸', icbg: '#FCE4EC', label: '今日花费', num: `${C.fmtMoney(spent)}`, prog: 0, act: 'add-cost' }
    ];
    const grid = el('div', 'stat-grid');
    stats.forEach(st => {
      const c = el('div', 'stat-card');
      c.innerHTML = `
        <div class="sc-top">
          <span class="sc-ic" style="background:${st.icbg}">${st.ic}</span>
          <button class="sc-add" data-act="${st.act}">＋</button>
        </div>
        <div class="sc-num">${st.num}</div>
        <div class="sc-label">${st.label}</div>
        <div class="sc-progress"><i style="width:${Math.round(Math.min(1, st.prog) * 100)}%"></i></div>`;
      c.querySelector('.sc-add').onclick = () => quickAction(st.act);
      grid.appendChild(c);
    });
    box.appendChild(grid);

    /* 快捷动作 */
    const qa = quickActs();
    const qWrap = el('div', 'quick-acts');
    qWrap.appendChild(el('span', '', '').innerHTML || el('span', 'card-title', ''));
    qa.forEach(q => {
      const b = el('button', 'qa' + (q.on ? ' on' : ''), `<span class="qa-ic">${q.ic}</span>${C.esc(q.t)}`);
      b.onclick = () => {
        q.on = !q.on; saveQuicks(qa); switchPage('home');
        if (q.on) {
          if (q.id === 'water') { S.daySet('water', waterCount() + 1); C.Toast('已记录喝水 +1 💧'); }
          else if (q.id === 'fit') { S.daySet('fitDone', true); C.Toast('运动打卡成功 🏃'); }
          else if (q.id === 'wake') { C.Toast('早起打卡成功 🌅'); }
          else if (q.id === 'sleep') { C.Toast('早睡打卡成功 🌙'); }
          switchPage('home');
        }
      };
      qWrap.appendChild(b);
    });
    qWrap.appendChild(el('button', 'qa', '✚ 管理').onclick ? null : (() => { const m = el('button', 'qa', '✚ 管理'); m.onclick = () => quickManager(qa); return m; })());
    box.appendChild(card('快捷动作', '⚡', qWrap));

    /* 今日任务 */
    const tWrap = el('div', '');
    const tl = el('div', '');
    tasks.forEach(t => {
      const row = el('div', 'task-item');
      row.innerHTML = `
        <button class="t-check ${t.done ? 'on' : ''}">${t.done ? '✓' : ''}</button>
        <div class="t-name ${t.done ? 'done' : ''}">${t.ic ? t.ic + ' ' : ''}${C.esc(t.t)}</div>
        <button class="t-del">✕</button>`;
      row.querySelector('.t-check').onclick = () => { t.done = !t.done; saveTasks(tasks); renderHome(); };
      row.querySelector('.t-del').onclick = () => {
        tasks.splice(tasks.indexOf(t), 1); saveTasks(tasks); renderHome();
      };
      tl.appendChild(row);
    });
    tWrap.appendChild(tl);
    const addRow = el('div', 't-add');
    const inp = el('input'); inp.placeholder = '新增任务…'; inp.maxLength = 24;
    const btn = el('button', '', '添加');
    btn.onclick = () => {
      const v = inp.value.trim();
      if (!v) return C.Toast('请输入任务内容');
      tasks.push({ id: C.uid(), t: v, ic: '📌', done: false });
      saveTasks(tasks); renderHome();
    };
    inp.onkeydown = e => { if (e.key === 'Enter') btn.click(); };
    addRow.append(inp, btn);
    tWrap.appendChild(addRow);
    box.appendChild(card('今日任务', '📝', tWrap));

    /* 喝水快捷 */
    const wBtn = el('button', 'wc-btn speak', '💧 喝水 +1');
    wBtn.onclick = () => { S.daySet('water', waterCount() + 1); renderHome(); };
    box.appendChild(card('健康饮水', '💧', `<div class="t-add">${'目标 8 杯 · 已喝 ' + water + ' 杯'}</div>`).firstChild && (() => {
      const c = card('健康饮水', '💧', '');
      const row = el('div', 't-add');
      row.appendChild(wBtn);
      c.appendChild(row);
      return c;
    })());

    /* 随手笔记（v40）：回车即存，最新 5 条，可展开 */
    const notes = S.get('sunpad_notes', []);
    const nWrap = el('div', 'note-wrap');
    const nAdd = el('div', 't-add');
    const nInp = el('input');
    nInp.placeholder = '随手记点什么…（回车保存）';
    nInp.maxLength = 120;
    const nBtn = el('button', '', '记下');
    const saveNote = () => {
      const v = nInp.value.trim();
      if (!v) return;
      const list = S.get('sunpad_notes', []);
      list.unshift({ id: C.uid(), text: v, ts: Date.now() });
      if (list.length > 200) list.length = 200;
      S.set('sunpad_notes', list);
      C.Toast('已记下 ✏️');
      renderHome();
    };
    nBtn.onclick = saveNote;
    nInp.onkeydown = e => { if (e.key === 'Enter') saveNote(); };
    nAdd.append(nInp, nBtn);
    nWrap.appendChild(nAdd);
    if (!notes.length) {
      nWrap.appendChild(el('div', 'cd-empty', '还没有笔记 · 写点什么吧'));
    } else {
      (notesExpanded ? notes.slice(0, 50) : notes.slice(0, 5)).forEach(n => {
        const row = el('div', 'note-item');
        const d = new Date(n.ts);
        const time = (d.getMonth() + 1) + '-' + d.getDate() + ' ' +
          String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        row.innerHTML = `<span class="note-tx">${C.esc(n.text)}</span><span class="note-time">${time}</span><button class="note-del" title="删除">✕</button>`;
        row.querySelector('.note-del').onclick = () => {
          S.set('sunpad_notes', notes.filter(x => x.id !== n.id));
          renderHome();
        };
        nWrap.appendChild(row);
      });
      if (notes.length > 5) {
        const more = el('button', 'note-more', notesExpanded ? '收起' : '展开全部（' + notes.length + ' 条）');
        more.onclick = () => { notesExpanded = !notesExpanded; renderHome(); };
        nWrap.appendChild(more);
      }
    }
    box.appendChild(card('随手笔记', '✏️', nWrap));
  }

  function quickAction(act) {
    if (act === 'water') { S.daySet('water', waterCount() + 1); C.Toast('喝水 +1 💧'); renderHome(); }
    else if (act === 'fit') {
      const f = S.dayGet('fitDone', false);
      S.daySet('fitDone', !f);
      C.Toast(f ? '已取消打卡' : '运动打卡成功 🏃'); renderHome();
    }
    else if (act === 'add-task') openTaskModal();
    else if (act === 'add-cost') openLedgerModal();
  }

  function quickManager(list) {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `<h3>⚡ 快捷动作管理</h3>`;
    const listBox = el('div', '');
    list.forEach(q => {
      const row = el('div', 'task-item');
      row.innerHTML = `<span>${q.ic} ${C.esc(q.t)}</span><button class="t-del" style="margin-left:auto">删除</button>`;
      row.querySelector('.t-del').onclick = () => { list.splice(list.indexOf(q), 1); saveQuicks(list); renderHome(); close(); };
      listBox.appendChild(row);
    });
    const addRow = el('div', 't-add');
    const inp = el('input'); inp.placeholder = '名称，如：喝水+1';
    const icSel = el('select');
    ['💧','🏃','🌅','🌙','📚','🧘','🎯','🕐'].forEach(i => icSel.appendChild(new Option(i, i)));
    const btn = el('button', '', '添加');
    btn.onclick = () => {
      const v = inp.value.trim();
      if (!v) return C.Toast('请输入名称');
      list.push({ id: C.uid(), t: v, ic: icSel.value, on: false });
      saveQuicks(list); renderHome(); close();
    };
    addRow.append(inp, icSel, btn);
    m.appendChild(listBox);
    m.appendChild(addRow);
    m.appendChild(el('div', 'modal-actions',
      `<button class="m-btn cancel">完成</button>`));
    m.querySelector('.m-btn').onclick = () => close();
    mask.appendChild(m);
    const close = () => mask.remove();
    mask.onclick = e => { if (e.target === mask) close(); };
    document.body.appendChild(mask);
  }

  function openTaskModal() {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `<h3>📝 新增任务</h3>
      <div class="modal-field"><label>任务名称</label><input id="mTask" maxlength="24" placeholder="如：学习1小时"></div>
      <div class="modal-field"><label>图标</label><select id="mTaskIc">
        ${['📌','📚','💪','🗣️','📊','🍳','🌙','🌅','🧘','🎯'].map(i => `<option>${i}</option>`).join('')}</select></div>
      <div class="modal-actions"><button class="m-btn cancel">取消</button><button class="m-btn ok">添加</button></div>`;
    mask.appendChild(m);
    const close = () => mask.remove();
    mask.onclick = e => { if (e.target === mask) close(); };
    m.querySelector('.cancel').onclick = close;
    m.querySelector('.ok').onclick = () => {
      const v = $('#mTask').value.trim();
      if (!v) return C.Toast('请输入任务名称');
      const tasks = tasksToday();
      tasks.push({ id: C.uid(), t: v, ic: $('#mTaskIc').value, done: false });
      saveTasks(tasks); close(); renderHome();
    };
    document.body.appendChild(mask);
    setTimeout(() => { const t = $('#mTask'); if (t) t.focus(); }, 100);
  }

  /* ==========================================================
     二、健身
     ========================================================== */
  function ledgerToday() {
    return ledgerAll().filter(x => x.date === C.todayStr() && x.type === 'out')
      .reduce((s, x) => s + x.amt, 0);
  }

  function openLedgerModal() {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `
      <h3>💸 记一笔今日支出</h3>
      <div class="modal-field"><label>金额</label><input type="number" id="qAmt" inputmode="decimal" placeholder="0.00"></div>
      <div class="modal-field"><label>分类</label><select id="qCat">
        ${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.i}${v.n}</option>`).join('')}</select></div>
      <div class="modal-field"><label>备注（可选）</label><input id="qNote" maxlength="20" placeholder="备注"></div>
      <div class="modal-actions"><button class="m-btn cancel">取消</button><button class="m-btn ok">保存</button></div>`;
    mask.appendChild(m);
    const close = () => mask.remove();
    mask.onclick = e => { if (e.target === mask) close(); };
    m.querySelector('.cancel').onclick = close;
    m.querySelector('.ok').onclick = () => {
      const a = parseFloat($('#qAmt').value);
      if (!a || a <= 0) return C.Toast('请输入有效金额');
      const all = ledgerAll();
      all.push({ ts: Date.now(), date: C.todayStr(), type: 'out', cat: $('#qCat').value, amt: Math.round(a * 100) / 100, note: $('#qNote').value.trim() });
      S.set('ledger', all); C.Toast('已记录 ✓'); close(); renderHome();
    };
    document.body.appendChild(mask);
    setTimeout(() => { const t = $('#qAmt'); if (t) t.focus(); }, 100);
  }

  /* ==========================================================
     八、菜谱
     ========================================================== */

  /* 今日三件事（首页智能决策器，经期期间追加暖宫建议） */
  function suggestToday() {
    let pool = SUGGEST_POOL.slice();
    if (isPeriodActive()) pool = pool.concat([{ page: 'food', text: '来碗红糖姜茶', icon: '🍵' }, { page: 'fitness', text: '做组经期舒缓拉伸', icon: '🧘' }]);
    const seed = C.todayStr(); let arr = pool.slice(), h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    for (let i = arr.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.slice(0, 3);
  }

  App.page('home', renderHome);
})(window);
