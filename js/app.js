/* ==========================================================
   小王的工作台 — 应用主逻辑
   全部数据离线存储于 localStorage，每日内容由 core.js 种子算法自动轮换
   ========================================================== */
(function (global) {
  'use strict';
  const C = global.Core;
  const S = C.Store;

  /* ---------- 分类图标 ---------- */
  const CATS = {
    food:{n:'餐饮', i:'🍜'}, shop:{n:'购物', i:'🛒'}, travel:{n:'交通', i:'🚌'},
    home:{n:'居家', i:'🏠'}, fun:{n:'娱乐', i:'🎮'}, study:{n:'学习', i:'📖'},
    health:{n:'健康', i:'💊'}, salary:{n:'工资', i:'💵'},
    beauty:{n:'美妆护肤', i:'💄'}, outfit:{n:'服饰穿搭', i:'👗'}, nail:{n:'美甲美睫', i:'💅'},
    med:{n:'医美', i:'💉'}, flower:{n:'鲜花', i:'🌸'}, tea:{n:'下午茶', i:'☕'},
    social:{n:'闺蜜社交', i:'👭'}, extra:{n:'其他', i:'📦'}
  };

  /* ========== 通用 ========== */
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  /* 页面元信息（图标+名称），同时决定底部 Tab 分组 */
  const PAGE_INFO = {
    home:{n:'首页',i:'🏠'}, fitness:{n:'健身',i:'💪'}, dance:{n:'舞蹈',i:'💃'},
    create:{n:'创作',i:'🎬'}, glam:{n:'妆容',i:'💄'}, english:{n:'英语',i:'🇬🇧'},
    cantonese:{n:'粤语',i:'💬'}, reading:{n:'阅读',i:'📚'}, learn:{n:'数据',i:'📊'},
    ledger:{n:'记账',i:'💰'}, remind:{n:'提醒',i:'⏰'}, food:{n:'菜谱',i:'🍲'},
    news:{n:'新闻',i:'📰'}, weather:{n:'天气',i:'🌤️'}, menstrual:{n:'经期',i:'🌸'},
    habits:{n:'习惯',i:'✅'}, mood:{n:'心情',i:'💗'}, cosmetics:{n:'美妆台账',i:'🧴'}, dashboard:{n:'数据总览',i:'📈'}, skincare:{n:'成分库',i:'🔬'}, badge:{n:'徽章',i:'🏅'}, about:{n:'关于',i:'ℹ️'}
  };
  const TABS = [
    { id:'home',   ic:'🏠', name:'首页', pages:['home'] },
    { id:'study',  ic:'📚', name:'学习', pages:['english','cantonese','reading','learn'] },
    { id:'create', ic:'🎨', name:'创作', pages:['create','glam','cosmetics'] },
    { id:'life',   ic:'🏃', name:'生活', pages:['fitness','dance','food','ledger','remind','menstrual','habits','mood','news','weather'] },
    { id:'mine',   ic:'⚙️', name:'我的', pages:['dashboard','skincare','badge','about'] }
  ];
  const PAGES = Object.keys(PAGE_INFO);
  const TAB_OF = p => (TABS.find(t => t.pages.includes(p)) || TABS[0]).id;
  let current = 'home';
  let currentFab = null;

  /* ---------- 顶部日期 ---------- */
  function renderTopDate() {
    const d = new Date();
    const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    $('#tbDate').textContent = `${d.getMonth() + 1}月${d.getDate()}日 周${wk}`;
  }

  /* ---------- 导航 ---------- */
  function switchPage(page) {
    stopRecognition(); // 切页时强制停止麦克风，避免单例跨页冲突
    if (!PAGES.includes(page)) page = 'home';
    current = page;
    document.querySelectorAll('.nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.page === page));
    $('#panel').innerHTML = '';
    $('#panel').scrollTop = 0;
    if (currentFab) { currentFab.remove(); currentFab = null; }
    RENDER[page]();
  }

  /* ---------- 卡片辅助 ---------- */
  function card(title, ic, inner) {
    const c = el('div', 'card');
    if (title) {
      c.appendChild(el('div', 'card-title',
        `<span class="ct-ic">${ic}</span>${title}`));
    }
    if (typeof inner === 'string') c.insertAdjacentHTML('beforeend', inner);
    else if (inner) c.appendChild(inner);
    return c;
  }
  function dyCard(t, d, kw, cls, icon) {
    const row = el('div', 'dy-card');
    row.innerHTML = `
      <div class="dy-ic">${icon || '🎬'}</div>
      <div class="dy-body">
        <div class="dy-t">${C.esc(t)}</div>
        <div class="dy-d">${C.esc(d)} · 关键词「${C.esc(kw)}」</div>
      </div>
      <button class="dy-btn ${cls || ''}" data-kw="${C.esc(kw)}">▶ 抖音</button>`;
    row.querySelector('.dy-btn').onclick = () => C.openDouyin(kw);
    return row;
  }

  /* ==========================================================
     一、首页
     ========================================================== */
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
    setTimeout(() => $('#mTask').focus(), 100);
  }

  /* ==========================================================
     二、健身
     ========================================================== */
  function bodyLog() { return S.get('bodylog', []); }

  function renderFitness() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">💪</div><div><h2>健身</h2><p>记录体态 · 专注训练 · 每日新视频</p></div>`;
    box.appendChild(ph);

    /* 经期联动：舒缓提示 */
    if (isPeriodActive()) {
      box.appendChild(el('div', 'notice', '🌸 经期中 · 建议以舒缓拉伸为主，避免高强度有氧'));
    }

    /* 身高体重 */
    const log = bodyLog();
    const today = log.find(x => x.date === C.todayStr());
    const prev = log[log.length - 2];
    const wWrap = el('div', '');
    const row = el('div', 'f-body-row');
    row.innerHTML = `
      <div class="f-stat"><div class="fs-label">身高 (cm)</div><input id="fH" type="number" inputmode="decimal" placeholder="175" value="${today ? today.h : ''}"></div>
      <div class="f-stat"><div class="fs-label">体重 (kg)</div><input id="fW" type="number" inputmode="decimal" placeholder="65" value="${today ? today.w : ''}"></div>
      <button class="dy-btn" id="fSave">保存</button>`;
    const cmp = el('div', 'f-cmp');
    if (today && prev && prev.w && today.w) {
      const diff = today.w - prev.w;
      cmp.innerHTML = diff === 0 ? '与上次记录持平' :
        `较上次 <b class="${diff > 0 ? 'worse' : ''}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg</b>${diff > 0 ? ' ↑ 需要注意' : ' ↓ 继续保持'}`;
    } else if (today) {
      cmp.textContent = '今日已记录 ✓ 持续记录可看趋势';
    }
    row.querySelector('#fSave').onclick = () => {
      const h = parseFloat($('#fH').value), w = parseFloat($('#fW').value);
      if (!h || !w || h < 100 || h > 250 || w < 30 || w > 300) return C.Toast('请输入有效的身高体重');
      const arr = log.filter(x => x.date !== C.todayStr());
      arr.push({ date: C.todayStr(), h, w });
      S.set('bodylog', arr); C.Toast('已记录 ✓'); renderFitness();
    };
    wWrap.appendChild(row); wWrap.appendChild(cmp);

    /* 近7天迷你趋势 */
    if (log.length >= 2) {
      const last7 = log.slice(-7);
      const trend = el('div', 'chart-box');
      const ws = last7.map(x => x.w);
      const min = Math.min(...ws), max = Math.max(...ws);
      trend.style.height = '70px';
      last7.forEach(x => {
        const col = el('div', 'bar-col');
        const hh = max === min ? 40 : 20 + ((x.w - min) / (max - min)) * 60;
        col.innerHTML = `<div class="bar" style="height:${hh}%;background:#A98FE0"></div>
          <div class="bar-label">${x.date.slice(5).replace('-', '/')}</div>`;
        trend.appendChild(col);
      });
      wWrap.appendChild(trend);
    }
    box.appendChild(card('身高体重 · 每日记录', '📏', wWrap));

    /* 计时器 */
    const tm = el('div', 'timer');
    tm.innerHTML = `<div class="tm-time">00:00</div>
      <div class="tm-row">
        <button class="tm-btn go" id="tmGo">开始</button>
        <button class="tm-btn reset" id="tmReset">重置</button>
        <button class="tm-btn rec" id="tmRec">记1次</button>
      </div>`;
    let sec = S.get('fitTimer', 0), timerId = null, running = false;
    const tick = () => {
      sec++; S.set('fitTimer', sec);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      tm.querySelector('.tm-time').textContent = `${mm}:${ss}`;
    };
    const syncBtn = () => {
      const b = tm.querySelector('#tmGo');
      b.textContent = running ? '暂停' : '继续';
      b.className = 'tm-btn ' + (running ? 'pause' : 'go');
    };
    tm.querySelector('#tmGo').onclick = () => {
      if (running) { clearInterval(timerId); running = false; }
      else { running = true; timerId = setInterval(tick, 1000); }
      syncBtn();
    };
    tm.querySelector('#tmReset').onclick = () => {
      clearInterval(timerId); running = false; sec = 0; S.set('fitTimer', 0);
      tm.querySelector('.tm-time').textContent = '00:00'; syncBtn();
    };
    tm.querySelector('#tmRec').onclick = () => {
      const fit = S.dayGet('fitDone', false);
      S.daySet('fitDone', true);
      C.Toast(`已记录一次训练（${String(Math.floor(sec / 60)).padStart(2, '0')}分钟）🏅`);
    };
    const mm0 = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss0 = String(sec % 60).padStart(2, '0');
    tm.querySelector('.tm-time').textContent = `${mm0}:${ss0}`;
    box.appendChild(card('健身计时器', '⏱️', tm));

    /* 训练视频（按部位） */
    const tabs = el('div', 'tabs');
    const parts = Object.entries(DATA_FITNESS);
    let part = S.get('fitPart', 'chest');
    parts.forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === part ? ' active' : ''), `${v.icon} ${v.name}`);
      t.onclick = () => { part = k; S.set('fitPart', k); renderFitness(); };
      tabs.appendChild(t);
    });
    box.appendChild(tabs);
    const sub = el('div', 'subpanel');
    const cur = DATA_FITNESS[part];
    C.pickDaily(cur.list, 3, 'fit:' + part).forEach(x => {
      sub.appendChild(dyCard(x.t, `${x.d} · ${cur.name}部训练`, x.kw, 'play', cur.icon));
    });
    sub.appendChild(el('div', 'notice',
      `每天自动轮换 3 条<b>最新热门</b>训练视频，点击卡片直达抖音观看。内容实时更新，不做循环重复。`));
    box.appendChild(sub);

    /* 体态矫正专项 */
    const postureCard = el('div', 'card');
    postureCard.appendChild(el('div', 'card-title', '🧍 体态矫正'));
    const postLog = S.get('posture_log', {});
    const todayPost = postLog[ymd(new Date())] || {};
    POSTURE_PLANS.forEach(plan => {
      const dayIdx = C.dayIndex() % plan.days.length;
      const todayDay = plan.days[dayIdx];
      const done = todayPost[plan.id] || [];
      const row = el('div', 'habit-row');
      const allDone = todayDay.moves.length > 0 && todayDay.moves.every((m, i) => done.includes(i));
      row.innerHTML = `<span class="habit-ic" style="background:${allDone ? 'var(--ok)' : 'var(--primary-soft)'}">${plan.icon}</span>
        <div style="flex:1"><div class="habit-name">${plan.name} · ${todayDay.day}</div>
        <div class="set-note">${plan.desc}${todayDay.moves.length ? ' · ' + todayDay.moves.length + '个动作' : ' · 休息日'}</div></div>
        ${todayDay.moves.length ? `<button class="habit-toggle ${allDone ? 'on' : ''}">${allDone ? '✓' : ''}</button>` : ''}`;
      if (todayDay.moves.length) {
        row.querySelector('.habit-toggle').onclick = () => {
          const log = S.get('posture_log', {});
          const todayKey = ymd(new Date());
          log[todayKey] = log[todayKey] || {};
          if (allDone) log[todayKey][plan.id] = [];
          else log[todayKey][plan.id] = todayDay.moves.map((_, i) => i);
          S.set('posture_log', log); renderFitness();
        };
      }
      postureCard.appendChild(row);
    });
    box.appendChild(postureCard);
  }

  /* ==========================================================
      二·五、舞蹈（现在学爵士）
     ========================================================== */
  function renderDance() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">💃</div><div><h2>舞蹈</h2><p>爵士入门 · 每日基本功 · 跟练视频</p></div>`;
    box.appendChild(ph);

    /* 练习计时器 */
    const tm = el('div', 'timer');
    tm.innerHTML = `<div class="tm-time">00:00</div>
      <div class="tm-row">
        <button class="tm-btn go" id="dmGo">开始</button>
        <button class="tm-btn reset" id="dmReset">重置</button>
        <button class="tm-btn rec" id="dmRec">记1次</button>
      </div>`;
    let sec = S.get('danceTimer', 0), timerId = null, running = false;
    const tick = () => {
      sec++; S.set('danceTimer', sec);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      tm.querySelector('.tm-time').textContent = `${mm}:${ss}`;
    };
    const syncBtn = () => {
      const b = tm.querySelector('#dmGo');
      b.textContent = running ? '暂停' : '继续';
      b.className = 'tm-btn ' + (running ? 'pause' : 'go');
    };
    tm.querySelector('#dmGo').onclick = () => {
      if (running) { clearInterval(timerId); running = false; }
      else { running = true; timerId = setInterval(tick, 1000); }
      syncBtn();
    };
    tm.querySelector('#dmReset').onclick = () => {
      clearInterval(timerId); running = false; sec = 0; S.set('danceTimer', 0);
      tm.querySelector('.tm-time').textContent = '00:00'; syncBtn();
    };
    tm.querySelector('#dmRec').onclick = () => {
      S.daySet('danceDone', true);
      C.Toast(`已记录一次练习（${String(Math.floor(sec / 60)).padStart(2, '0')}分钟）💃`);
    };
    const mm0 = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss0 = String(sec % 60).padStart(2, '0');
    tm.querySelector('.tm-time').textContent = `${mm0}:${ss0}`;
    box.appendChild(card('舞蹈练习计时', '⏱️', tm));

    /* 今日爵士基本功 */
    const basics = C.pickDaily(DATA_DANCE_BASICS, 4, 'dance:basic');
    const bWrap = el('div', '');
    basics.forEach(x => bWrap.appendChild(dyCard(x.t, x.d, x.kw, 'play', '🕺')));
    bWrap.appendChild(el('div', 'notice',
      `每天自动轮换 <b>4 个</b>爵士基本功（isolation / 律动 / 转动等），点击卡片直达抖音跟练。内容每日更新，不循环重复。`));
    box.appendChild(card('今日爵士基本功', '🩰', bWrap));

    /* 风格视频推荐 */
    const tabs = el('div', 'tabs');
    const styles = Object.entries(DATA_DANCE_STYLES);
    let style = S.get('danceStyle', 'broadway');
    styles.forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === style ? ' active' : ''), `${v.icon} ${v.name}`);
      t.onclick = () => { style = k; S.set('danceStyle', k); renderDance(); };
      tabs.appendChild(t);
    });
    box.appendChild(tabs);
    const sub = el('div', 'subpanel');
    const cur = DATA_DANCE_STYLES[style];
    C.pickDaily(cur.list, 3, 'dance:' + style).forEach(x => {
      sub.appendChild(dyCard(x.t, `${x.d} · ${cur.name}`, x.kw, 'play', cur.icon));
    });
    sub.appendChild(el('div', 'notice',
      `每天自动轮换 3 条<b>最新热门</b>${cur.name}视频，点击卡片直达抖音观看。内容实时更新，不做循环重复。`));
    box.appendChild(sub);
  }

  /* ==========================================================
      三、创作
     ========================================================== */
  function renderCreate() {
    const box = $('#panel');
    box.innerHTML = '';

    /* 页头 */
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🎬</div><div><h2>视频创作</h2><p>AI漫剧学习 · 爆款脚本 · 多平台入口</p></div>
      <div class="ph-right"><button class="ph-btn" title="刷新">🔄</button></div>`;
    ph.querySelector('.ph-btn').onclick = () => { renderCreate(); $('#panel').scrollTop = 0; };
    box.appendChild(ph);

    /* 视频创作中心 */
    const plat = el('div', 'plat-grid');
    [
      { n: '抖音', ic: '🎵', kw: 'AI漫剧 制作教程' },
      { n: '小红书', ic: '📕', kw: '短剧 爆款 脚本' },
      { n: '快手', ic: '⚡', kw: '短剧 爆款' },
      { n: 'B站', ic: '📺', kw: 'AI短剧 教程' }
    ].forEach(p => {
      const b = el('button', 'plat-item', `<span class="pi-ic">${p.ic}</span><span class="pi-tx">${p.n}</span>`);
      b.onclick = () => openPlatform(p.n, p.kw);
      plat.appendChild(b);
    });
    box.appendChild(card('视频创作中心', '🎬', plat));

    /* AI漫剧学习 */
    const manju = C.pickDaily(DATA_MANJU, 6, 'manju');
    const promo = el('div', 'promo-card');
    promo.innerHTML = `
      <div class="promo-title">🤖 AI漫剧学习</div>
      <div class="promo-desc">从剧本创作到AI工具使用，系统学习AI短剧制作全流程，每天看一段快速入门。</div>
      <div class="promo-actions">
        <button class="pa-btn dy"><span>📱</span> 看抖音教程</button>
        <button class="pa-btn more"><span>🤖</span> 更多教程</button>
      </div>`;
    promo.querySelector('.dy').onclick = () => C.openDouyin(manju[0].kw);
    promo.querySelector('.more').onclick = () => showManjuModal(manju);
    box.appendChild(promo);

    /* 今日爆款脚本 */
    const viral = C.pickDaily(DATA_VIRAL, 10, 'viral');
    const tabs = ['全部', '治愈陪伴', '反差搞笑', '情感共鸣'];
    let active = S.get('viralTab', '全部');
    if (!tabs.includes(active)) active = '全部';
    const filtered = active === '全部' ? viral : viral.filter(x => x.cat === active);

    const sHead = el('div', 'script-head');
    const todayLabel = `${new Date().getMonth() + 1}月${new Date().getDate()}日已更新`;
    sHead.innerHTML = `<div class="sh-left"><span class="sh-ic">📝</span><span class="sh-title">今日爆款脚本</span></div>
      <div class="sh-right">${todayLabel} · 共${filtered.length}个素材</div>`;
    box.appendChild(sHead);

    const tabWrap = el('div', 'tabs');
    tabs.forEach(t => {
      const b = el('button', 'tab' + (t === active ? ' active' : ''), t);
      b.onclick = () => { S.set('viralTab', t); renderCreate(); $('#panel').scrollTop = 0; };
      tabWrap.appendChild(b);
    });
    box.appendChild(tabWrap);

    const list = el('div', 'script-list');
    filtered.forEach(x => list.appendChild(scriptCard(x)));
    box.appendChild(list);

    /* 我的灵感 */
    renderCreateIdeas(box);

    /* 右下角 FAB */
    const fab = el('button', 'fab');
    fab.innerHTML = '＋';
    fab.title = '记录灵感';
    fab.onclick = () => showIdeaModal();
    document.body.appendChild(fab);
    currentFab = fab;
  }

  function showScript(topic) {
    const scenes = window.makeScript(topic.t);
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.style.maxHeight = '88vh';
    m.innerHTML = `<h3>✍️ 分镜脚本 · ${C.esc(topic.t)}</h3>`;
    const body = el('div', '');
    body.innerHTML = `
      <div class="notice">🎯 核心卖点：反转 + 情绪 + 悬念，前 3 秒抛出最大矛盾。总时长约 45 秒 / 6 镜。</div>
      <div class="card" style="margin-bottom:10px">
        <div class="card-title">👥 角色设定</div>
        <div style="font-size:12px;line-height:1.8;color:#4A4268">
          主角A：被迫隐忍 / 受委屈一方（情绪出口）<br>
          主角B：强势 / 隐藏秘密一方（冲突来源）<br>
          配角：线索提供者（推动反转）
        </div>
      </div>`;
    scenes.forEach((s, i) => {
      const c = el('div', 'card');
      c.style.marginBottom = '10px';
      c.innerHTML = `
        <div class="card-title">🎬 第${i + 1}镜 · ${s.name} <span class="pill" style="margin-left:auto">${s.time}</span></div>
        <div style="font-size:11.5px;line-height:1.8;color:#4A4268">
          <div><b>【场景描述】</b>${s.sub}</div>
          <div style="margin-top:4px"><b>【镜头语言】</b>${s.shots}</div>
          <div style="margin-top:4px"><b>【台词/字幕】</b><span style="white-space:pre-line">${s.lines}</span></div>
          <div style="margin-top:4px"><b>【音乐建议】</b>${s.music}</div>
        </div>`;
      body.appendChild(c);
    });
    body.appendChild(el('div', 'notice',
      `<b>运营建议：</b>封面选情绪冲突最强一帧；标题带悬念关键词；发布后 2 小时内在评论区埋互动话题引导讨论，提升完播与互动。`));
    m.appendChild(body);
    const acts = el('div', 'modal-actions');
    acts.innerHTML = `<button class="m-btn cancel">关闭</button><button class="m-btn ok">📋 一键复制</button>`;
    acts.querySelector('.cancel').onclick = () => mask.remove();
    acts.querySelector('.ok').onclick = () =>
      C.copyText(window.scriptToText(topic.t, scenes));
    m.appendChild(acts);
    mask.appendChild(m);
    mask.onclick = e => { if (e.target === mask) mask.remove(); };
    document.body.appendChild(mask);
  }

  /* ---------- 创作页辅助 ---------- */
  function openPlatform(name, kw) {
    const k = encodeURIComponent(kw);
    const urls = {
      '抖音': 'https://www.douyin.com/search/' + k,
      '小红书': 'https://www.xiaohongshu.com/search_result?keyword=' + k,
      '快手': 'https://www.kuaishou.com/search?searchKey=' + k,
      'B站': 'https://search.bilibili.com/all?keyword=' + k
    };
    const u = urls[name] || urls['抖音'];
    try { window.open(u, '_blank', 'noopener'); } catch (e) { location.href = u; }
  }

  function viralMeta(t) {
    const h = C.hashStr(t);
    const authors = ['爆款研究所', '短剧观察', '流量密码君', '创作小助手', '热门拆解'];
    const sec = 12 + (h % 49);
    const like = (1.2 + (h % 80) / 10).toFixed(1);
    return { author: authors[h % authors.length], duration: sec + '秒', likes: like + '万赞' };
  }

  function viralAnalysis(cat) {
    const map = {
      '治愈陪伴': {
        analyze: '用温暖/甜宠场景建立代入感，人物关系简单直接，节奏舒缓。',
        reason: '情绪治愈 + 强共鸣，观众愿意点赞收藏并反复观看。',
        copy: '把日常小事拍出仪式感，结尾留一句暖心金句。'
      },
      '反差搞笑': {
        analyze: '身份或场景错位制造反差，节奏快、梗密集、反转多。',
        reason: '搞笑解压 + 意外感，完播率和互动率都很高。',
        copy: '先铺垫“普通”，再突然揭示“不普通”，形成记忆点。'
      },
      '情感共鸣': {
        analyze: '聚焦亲情/友情/爱情冲突，台词扎心，情绪张力强。',
        reason: '情绪强烈容易引发评论、转发，用户粘性高。',
        copy: '用真实生活场景，替目标人群说出他们想说的话。'
      },
      '悬疑反转': {
        analyze: '开头抛悬念，中段埋线索，结尾大反转，信息密度高。',
        reason: '强钩子 + 好奇心驱动，用户会追完并期待下集。',
        copy: '前3秒给冲突或疑问，结尾回扣开头，形成闭环。'
      }
    };
    return map[cat] || map['悬疑反转'];
  }

  function makePrompt(x, meta) {
    const core = {
      '治愈陪伴': '甜宠/治愈氛围，情绪递进，结尾暖心金句',
      '反差搞笑': '身份错位，先抑后扬，反转笑点',
      '情感共鸣': '真实冲突，扎心台词，情绪爆发点',
      '悬疑反转': '悬念钩子，线索铺设，结尾大反转'
    }[x.cat];
    return `【视频类型】${x.cat} · ${x.t}\n【时长】${meta.duration}\n【核心结构】${core}\n【文案方向】围绕“${x.t}”设计前3秒钩子，中段强化冲突/反差，结尾留互动或下集预告\n【音乐建议】根据情绪选择：治愈用轻音乐，搞笑用轻快音效，情感用弦乐，悬疑用鼓点+低频铺垫`;
  }

  function showManjuModal(manju) {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `<h3>🤖 AI漫剧学习 · 今日${manju.length}个选题</h3>`;
    const list = el('div', '');
    manju.forEach(x => {
      const row = el('div', 'dy-card');
      row.innerHTML = `<div class="dy-ic">🤖</div>
        <div class="dy-body"><div class="dy-t">${C.esc(x.t)} <span class="pill">${C.esc(x.d)}</span></div>
        <div class="dy-d">抖音搜索：${C.esc(x.kw)}</div></div>
        <button class="dy-btn play">▶</button>`;
      row.querySelector('.dy-btn').onclick = () => C.openDouyin(x.kw);
      list.appendChild(row);
    });
    m.appendChild(list);
    const acts = el('div', 'modal-actions');
    acts.innerHTML = `<button class="m-btn cancel">关闭</button>`;
    acts.querySelector('.cancel').onclick = () => mask.remove();
    m.appendChild(acts);
    mask.appendChild(m);
    mask.onclick = e => { if (e.target === mask) mask.remove(); };
    document.body.appendChild(mask);
  }

  function scriptCard(x) {
    const meta = viralMeta(x.t);
    const a = viralAnalysis(x.cat);
    const prompt = makePrompt(x, meta);
    const c = el('div', 'script-card');
    c.innerHTML = `
      <div class="sc-head"><span class="sc-tag">${C.esc(x.cat)}</span><span class="sc-meta">${C.esc(meta.author)} · ${C.esc(meta.duration)} · ${C.esc(meta.likes)}</span></div>
      <div class="sc-title">${C.esc(x.t)}</div>
      <div class="sc-bullets">
        <div><span class="sc-dot">🔍</span><b>原视频分析：</b>${a.analyze}</div>
        <div><span class="sc-dot">📊</span><b>爆款原因：</b>${a.reason}</div>
        <div><span class="sc-dot">🎯</span><b>可复刻点：</b>${a.copy}</div>
      </div>
      <div class="sc-prompt">
        <div class="scp-label">📋 AI制作口令（可直接复制到AI视频工具）</div>
        <pre>${C.esc(prompt)}</pre>
      </div>
      <div class="sc-actions">
        <button class="sc-btn copy">复制口令</button>
        <button class="sc-btn script">生成完整脚本</button>
        <button class="sc-btn video">看同款</button>
      </div>`;
    c.querySelector('.copy').onclick = () => C.copyText(prompt);
    c.querySelector('.script').onclick = () => showScript(x);
    c.querySelector('.video').onclick = () => C.openDouyin(x.kw);
    return c;
  }

  function renderCreateIdeas(container) {
    const ideas = S.get('ideas', []);
    if (!ideas.length) return;
    container.appendChild(el('div', 'section-head', `<h3>💡 我的灵感</h3><span class="sh-sub">${ideas.length} 条</span>`));
    ideas.slice().reverse().forEach(item => {
      const row = el('div', 'idea-card');
      row.innerHTML = `<div class="idea-title">${C.esc(item.t)}<span class="idea-time">${C.esc(item.time || '')}</span></div>
        <div class="idea-note">${C.esc(item.note || '')}</div>
        <button class="idea-del" title="删除">×</button>`;
      row.querySelector('.idea-del').onclick = () => {
        const arr = S.get('ideas', []).filter(x => x.id !== item.id);
        S.set('ideas', arr);
        renderCreate(); $('#panel').scrollTop = 0;
      };
      container.appendChild(row);
    });
  }

  function showIdeaModal() {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `<h3>✨ 记录灵感</h3>`;
    const body = el('div', '');
    body.innerHTML = `
      <div class="modal-field"><label>灵感标题</label><input id="ideaTitle" placeholder="例如：深夜便利店奇遇"></div>
      <div class="modal-field"><label>备注 / 梗概</label><textarea id="ideaNote" rows="3" placeholder="人物、场景、反转点..."></textarea></div>`;
    const acts = el('div', 'modal-actions');
    acts.innerHTML = `<button class="m-btn cancel">取消</button><button class="m-btn ok">保存</button>`;
    acts.querySelector('.cancel').onclick = () => mask.remove();
    acts.querySelector('.ok').onclick = () => {
      const t = $('#ideaTitle').value.trim();
      if (!t) { C.Toast('请输入标题'); return; }
      const arr = S.get('ideas', []);
      arr.push({ id: C.uid(), t, note: $('#ideaNote').value.trim(), time: C.todayStr().slice(5) });
      S.set('ideas', arr);
      mask.remove();
      renderCreate(); $('#panel').scrollTop = 0;
    };
    m.appendChild(body);
    m.appendChild(acts);
    mask.appendChild(m);
    mask.onclick = e => { if (e.target === mask) mask.remove(); };
    document.body.appendChild(mask);
  }

  /* ==========================================================
     四、英语
     ========================================================== */
  function renderEnglish() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🇬🇧</div><div><h2>英语</h2><p>零基础入门 · 场景口语 · 每日一句 · 跟读打分</p></div>`;
    box.appendChild(ph);
    const tabs = el('div', 'tabs');
    const items = [['words', '📖 单词打卡'], ['talk', '🗣️ 场景口语'], ['nc', '💡 每日一句'], ['follow', '🎤 跟读']];
    let sub = S.get('enTab', 'words');
    items.forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === sub ? ' active' : ''), v);
      t.onclick = () => { sub = k; S.set('enTab', k); renderEnglish(); $('#panel').scrollTop = 0; };
      tabs.appendChild(t);
    });
    box.appendChild(tabs);
    const panel = el('div', 'subpanel');
    if (sub === 'words') renderWords(panel);
    else if (sub === 'talk') renderTalk(panel);
    else if (sub === 'nc') renderNC(panel);
    else renderFollow(panel);
    box.appendChild(panel);
  }

  /* --- 单词 --- */
  function renderWords(panel) {
    let book = S.get('enBook', 'beginner');
    const books = WORD_BOOKS;
    const top = el('div', 'word-top');
    books.forEach(b => {
      const t = el('button', 'word-book' + (b.id === book ? ' active' : ''), b.name);
      t.onclick = () => { book = b.id; S.set('enBook', b.id); renderEnglish(); $('#panel').scrollTop = 0; };
      top.appendChild(t);
    });
    const today = C.pickDaily(DATA_WORDS[book], 10, 'words:' + book);
    const idx = S.dayGet('wi:' + book, 0);
    const curW = today[Math.min(idx, today.length - 1)];
    const rec = S.get('wrec', {});
    const doneKeys = rec[C.todayStr()] || [];
    const streak = streakCount('wrec');
    top.appendChild(el('span', 'word-count', `今日进度 ${Math.min(idx + 1, today.length)}/${today.length}`));
    panel.appendChild(top);

    const hc = el('div', 'wc-head');
    hc.innerHTML = `
      <div class="wc-word">${C.esc(curW[0])}</div>
      <div class="wc-phon">${C.esc(curW[1])}</div>
      <div class="wc-mean"><span id="meanHide">${C.esc(curW[2])}</span><span id="meanShow" style="display:none"></span></div>
      <div class="wc-ex" id="wcEx">
        <div class="we-en">${C.esc(curW[3])}</div>
        <div class="we-cn">${C.esc(curW[4])}</div>
      </div>`;
    panel.appendChild(hc);

    const acts = el('div', 'wc-actions');
    acts.innerHTML = `
      <button class="wc-btn speak">🔊 朗读</button>
      <button class="wc-btn again">🔄 下一个</button>`;
    acts.querySelector('.speak').onclick = () => {
      hc.querySelector('#wcEx').classList.add('show');
      C.TTS.speak(curW[0] + '. ' + curW[3], 'en-US', 0.85);
    };
    acts.querySelector('.again').onclick = () => {
      const next = Math.min(idx + 1, today.length - 1);
      S.daySet('wi:' + book, next);
      if (!doneKeys.includes(curW[0])) {
        doneKeys.push(curW[0]); rec[C.todayStr()] = doneKeys; S.set('wrec', rec);
      }
      if (next === today.length - 1 && idx === today.length - 1) {
        C.Toast('今日 10 词全部学完 🎉 明天自动更新新词');
      } else renderWords(panel);
    };
    panel.appendChild(acts);
    panel.appendChild(el('div', 'streak',
      `🔥 连续学习 <b>${streak} 天</b> · 今日已掌握 <b>${doneKeys.length}</b> 词`));
    panel.appendChild(el('div', 'notice',
      `每天自动更新 <b>10 个新单词</b>，点击「朗读」用真实语音跟读，学习记录自动保存。零基础入门最简单，想挑战可以切换词库。`));
  }

  function streakCount(key) {
    const rec = S.get(key, {});
    const dates = Object.keys(rec).sort();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = C.todayStr(new Date(d.getTime() - i * 86400000));
      if (rec[ds]) streak++;
      else if (i === 0) continue;
      else break;
    }
    return streak || (rec[C.todayStr()] ? 1 : 0);
  }

  /* --- 口语 --- */
  function renderTalk(panel) {
    let talk = S.get('enTalk', DATA_TALK[0].id);
    const top = el('div', 'talk-list');
    DATA_TALK.forEach(x => {
      const t = el('div', 'talk-item' + (x.id === talk ? ' active' : ''),
        `<div class="tk-ic">${x.icon}</div><div class="tk-name">${x.name}</div>`);
      t.onclick = () => { talk = x.id; S.set('enTalk', x.id); renderEnglish(); $('#panel').scrollTop = 0; };
      top.appendChild(t);
    });
    panel.appendChild(top);

    const scene = DATA_TALK.find(x => x.id === talk);
    const set = C.pickOne(scene.sets, 'talk:' + talk, 'week');
    panel.appendChild(el('div', 'notice',
      `${scene.icon} <b>${scene.name}</b> · 本周对话已更新，点击句子旁的 ▶ 可跟读`));
    const dl = el('div', '');
    // set 结构：[[en,cn],[en,cn],...]，A/B 交替（偶数句=A，奇数句=B）
    set.forEach((line, i) => {
      const isA = i % 2 === 0;
      const row = el('div', 'dialog-line' + (isA ? '' : ' reply'));
      row.innerHTML = `
        <div class="dl-role ${isA ? 'a' : 'b'}">${isA ? 'A' : 'B'}</div>
        <div class="dl-text"><div class="dl-en">${C.esc(line[0])}</div>
        <div class="dl-cn">${C.esc(line[1])}</div>
        <div class="dl-play" data-i="${i}">▶ 跟读 ${isA ? 'A' : 'B'}</div></div>`;
      row.querySelector('.dl-play').onclick = () => C.TTS.speak(line[0], 'en-US', 0.85);
      dl.appendChild(row);
    });
    panel.appendChild(dl);
    panel.appendChild(el('div', 'notice', `共 <b>8 大真实场景</b>，每周自动更新一套新对话。`));
  }

  /* --- 每日一句 --- */
  function renderNC(panel) {
    const art = C.pickOne(DATA_READING_EN, 'nc', 'week');
    panel.appendChild(el('div', 'notice',
      `💡 <b>${C.esc(art.title)}</b> · ${C.esc(art.level)} · 每周更新，中英对照可跟读`));
    const readBox = el('div', 'card');
    readBox.innerHTML = `<div class="card-title">📖 ${C.esc(art.title)}</div>`;
    art.s.forEach((pair, i) => {
      const row = el('div', 'dialog-line');
      row.innerHTML = `
        <div class="dl-role a" style="background:#B39DDB">${i + 1}</div>
        <div class="dl-text">
          <div class="dl-en">${C.esc(pair[0])}</div>
          <div class="dl-cn">${C.esc(pair[1])}</div>
          <div class="dl-play">▶ 朗读这句</div>
        </div>`;
      row.querySelector('.dl-play').onclick = () => C.TTS.speak(pair[0], 'en-US', 0.8);
      readBox.appendChild(row);
    });
    panel.appendChild(readBox);
    const allBtn = el('button', 'dy-btn', '🔊 朗读全文');
    allBtn.style.width = '100%';
    allBtn.style.marginBottom = '10px';
    allBtn.onclick = () => C.TTS.speak(art.s.map(p => p[0]).join('. '), 'en-US', 0.8);
    panel.appendChild(allBtn);
  }

  /* ==========================================================
     五、阅读
     ========================================================== */
  /* ==========================================================
      四·五、粤语学习（置于英语之后）
     ========================================================== */
  function renderCantonese() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">💬</div><div><h2>粵語學習</h2><p>常用語 · 場景對話 · 九聲六調</p></div>`;
    box.appendChild(ph);
    const tabs = el('div', 'tabs');
    const items = [['phrase', '📖 常用語'], ['talk', '💬 場景'], ['tone', '🎵 九聲'], ['follow', '🎤 跟讀']];
    let sub = S.get('yueTab', 'phrase');
    items.forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === sub ? ' active' : ''), v);
      t.onclick = () => { sub = k; S.set('yueTab', k); renderCantonese(); $('#panel').scrollTop = 0; };
      tabs.appendChild(t);
    });
    box.appendChild(tabs);
    // 粤语声线检测：设备未装标准粤语语音包时给出安装指引（非 bug，是系统缺语音包）
    if (!C.TTS.has('zh-HK')) {
      box.appendChild(el('div', 'notice warn',
        `⚠️ 當前設備未安裝標準粵語語音包，朗讀可能變成普通話（聽起來「唔標準」）。解決方法：<br>` +
        `· iOS：設置 → 輔助功能 → 語音內容 → 嗓音 → 加入「中文（香港）」<br>` +
        `· 安卓：安裝 Google 粵語語音，或在系統語言裡啟用粵語<br>` +
        `安裝後重開本頁即可用真·粵語朗讀。`));
    }
    const panel = el('div', 'subpanel');
    if (sub === 'phrase') renderYuePhrase(panel);
    else if (sub === 'talk') renderYueTalk(panel);
    else if (sub === 'follow') renderYueFollow(panel);
    else renderYueTone(panel);
    box.appendChild(panel);
  }

  /* --- 常用语打卡 --- */
  function renderYuePhrase(panel) {
    panel.innerHTML = '';
    const today = C.pickDaily(DATA_YUE_PHRASE, 8, 'yue:phrase');
    const idx = S.dayGet('yi:yue', 0);
    const cur = today[Math.min(idx, today.length - 1)];
    const rec = S.get('yrec', {});
    const done = rec[C.todayStr()] || [];
    const streak = streakCount('yrec');
    panel.appendChild(el('div', 'word-top',
      `<span class="word-count">今日進度 ${Math.min(idx + 1, today.length)}/${today.length}</span>`));
    const hc = el('div', 'wc-head');
    hc.innerHTML = `
      <div class="wc-word">${C.esc(cur[0])}</div>
      <div class="wc-phon">${C.esc(cur[1])}</div>
      <div class="wc-mean">${C.esc(cur[2])}</div>`;
    panel.appendChild(hc);
    const acts = el('div', 'wc-actions');
    acts.innerHTML = `<button class="wc-btn speak">🔊 朗讀</button><button class="wc-btn again">🔄 下一個</button>`;
    acts.querySelector('.speak').onclick = () => C.TTS.speak(cur[0], 'zh-HK', 0.85);
    acts.querySelector('.again').onclick = () => {
      const next = Math.min(idx + 1, today.length - 1);
      S.daySet('yi:yue', next);
      if (!done.includes(cur[0])) { done.push(cur[0]); rec[C.todayStr()] = done; S.set('yrec', rec); }
      if (next === today.length - 1 && idx === today.length - 1) C.Toast('今日常用語學完 🎉 明日自動更新');
      else renderYuePhrase(panel);
    };
    panel.appendChild(acts);
    panel.appendChild(el('div', 'streak',
      `🔥 連續學習 <b>${streak} 天</b> · 今日已學 <b>${done.length}</b> 句`));
    panel.appendChild(el('div', 'notice',
      `每天自動更新 <b>8 句常用粵語</b>（漢字＋粵拼＋普通話），點「朗讀」用粵語語音跟讀，學習記錄自動保存。`));
  }

  /* --- 场景对话 --- */
  function renderYueTalk(panel) {
    panel.innerHTML = '';
    let talk = S.get('yueTalk', DATA_YUE_TALK[0].id);
    const top = el('div', 'talk-list');
    DATA_YUE_TALK.forEach(x => {
      const t = el('div', 'talk-item' + (x.id === talk ? ' active' : ''),
        `<div class="tk-ic">${x.icon}</div><div class="tk-name">${x.name}</div>`);
      t.onclick = () => { talk = x.id; S.set('yueTalk', x.id); renderCantonese(); $('#panel').scrollTop = 0; };
      top.appendChild(t);
    });
    panel.appendChild(top);
    const scene = DATA_YUE_TALK.find(x => x.id === talk);
    const set = C.pickOne(scene.sets, 'yueTalk:' + talk, 'week');
    panel.appendChild(el('div', 'notice',
      `${scene.icon} <b>${scene.name}</b> · 本週對話已更新，點句子旁 ▶ 可跟讀`));
    const dl = el('div', '');
    set.forEach((line, i) => {
      const isA = i % 2 === 0;
      const row = el('div', 'dialog-line' + (isA ? '' : ' reply'));
      row.innerHTML = `
        <div class="dl-role ${isA ? 'a' : 'b'}">${isA ? 'A' : 'B'}</div>
        <div class="dl-text"><div class="dl-en">${C.esc(line[0])}</div>
        <div class="dl-cn">${C.esc(line[1])}</div>
        <div class="dl-play">▶ 跟讀 ${isA ? 'A' : 'B'}</div></div>`;
      row.querySelector('.dl-play').onclick = () => C.TTS.speak(line[0], 'zh-HK', 0.9);
      dl.appendChild(row);
    });
    panel.appendChild(dl);
    panel.appendChild(el('div', 'notice',
      `共 <b>${DATA_YUE_TALK.length} 大真實場景</b>，每週自動更新一套新對話。`));
  }

  /* --- 九声六调 --- */
  function renderYueTone(panel) {
    panel.innerHTML = '';
    panel.appendChild(el('div', 'notice',
      `粵語有 <b>九聲六調</b>。下面用「分 fan」字族展示——同一字音因聲調不同而意思完全不同：`));
    const grid = el('div', 'tone-grid');
    DATA_YUE_TONE.forEach(t => {
      const c = el('div', 'tone-card');
      c.innerHTML = `
        <div class="tone-num">${t.tone}</div>
        <div class="tone-char">${C.esc(t.char)}<span class="tone-jp">${C.esc(t.jp)}</span></div>
        <div class="tone-name">${C.esc(t.name)}</div>
        <div class="tone-note">${C.esc(t.note)}</div>
        <div class="tone-play">▶ 聽聲調</div>`;
      c.querySelector('.tone-play').onclick = () => C.TTS.speak(t.char, 'zh-HK', 0.6);
      grid.appendChild(c);
    });
    panel.appendChild(grid);
  }

  /* --- 粤语跟读评分（复用英语 followCard，识别语言 zh-HK） --- */
  function renderYueFollow(panel) {
    let mode = S.get('yueFollow', 'phrase');
    const top = el('div', 'tabs');
    [['phrase', '🗣️ 常用語'], ['talk', '💬 對話']].forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === mode ? ' active' : ''), v);
      t.onclick = () => { mode = k; S.set('yueFollow', k); renderYueFollow(panel); };
      top.appendChild(t);
    });
    panel.appendChild(top);
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      panel.appendChild(el('div', 'notice warn',
        '⚠️ 當前瀏覽器不支持語音識別跟讀。請用 <b>Safari（iOS）</b> 或 <b>Chrome</b> 打開本頁，並允許麥克風權限。'));
    }
    panel.appendChild(el('div', 'notice',
      `先點「🔊 聽」原聲，再按「🎤 跟讀」——讀完後<b>再點一下按鈕結束</b>，系統用<b>粵語語音識別</b>評分（0–100），並標出<b>讀不準的字</b>與<b>多讀/讀錯</b>的字。每日自動更新內容。`));
    if (mode === 'phrase') {
      const today = C.pickDaily(DATA_YUE_PHRASE, 8, 'yue:phrase');
      today.forEach(p => panel.appendChild(followCard({
        target: p[0], lang: 'zh-HK', label: p[0] + '  [' + p[1] + ']', sub: p[2]
      })));
    } else {
      let talk = S.get('yueTalk', DATA_YUE_TALK[0].id);
      const scene = DATA_YUE_TALK.find(x => x.id === talk);
      const set = C.pickOne(scene.sets, 'yueTalk:' + talk, 'week');
      set.forEach(line => panel.appendChild(followCard({
        target: line[0], lang: 'zh-HK', label: line[0], sub: line[1]
      })));
    }
  }

  function renderReading() {
    const box = $('#panel');
    box.innerHTML = '';
    if (currentFab) { currentFab.remove(); currentFab = null; }
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">📚</div><div><h2>阅读</h2><p>书籍全文 · 播客 · 每日金句</p></div>`;
    box.appendChild(ph);
    const tabs = el('div', 'tabs');
    const items = [['book', '📖 书籍'], ['pod', '🎧 播客'], ['quote', '💬 金句']];
    let sub = S.get('readTab', 'book');
    items.forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === sub ? ' active' : ''), v);
      t.onclick = () => { sub = k; S.set('readTab', k); renderReading(); $('#panel').scrollTop = 0; };
      tabs.appendChild(t);
    });
    box.appendChild(tabs);
    const panel = el('div', 'subpanel');
    if (sub === 'book') renderBooks(panel);
    else if (sub === 'pod') renderPod(panel);
    else renderQuote(panel);
    box.appendChild(panel);
  }

  function renderBooks(panel) {
    const prog = S.get('readprog', {});
    const pctStore = S.get('readpct', {});
    const custom = S.get('customBooks', []);
    const all = [...DATA_BOOKS, ...custom];
    migrateReadPct(all, prog, pctStore);

    const list = el('div', 'book-list');
    all.forEach(b => {
      const p = prog[b.id] || { ch: 0 };
      const pct = Math.min(100, Math.max(0, pctStore[b.id] || 0));
      const coverChar = (b.cover && b.cover.length === 1) ? b.cover : C.esc(b.title.slice(0, 1));
      const c = el('div', 'book-row');
      c.innerHTML = `
        <div class="br-cover">${coverChar}</div>
        <div class="br-body">
          <div class="br-title">${C.esc(b.title)}</div>
          <div class="br-author">${C.esc(b.author)}</div>
          <div class="br-intro">${C.esc(b.intro || '')}</div>
          <div class="br-progress">
            <div class="br-pbar"><div class="br-pfill" style="width:${pct}%"></div></div>
            <span>${pct}%</span>
          </div>
          <div class="br-actions">
            <button class="br-btn minus">−10%</button>
            <button class="br-btn plus">+10%</button>
            <button class="br-btn read">阅读</button>
          </div>
        </div>`;
      c.querySelector('.br-btn.read').onclick = () => openReader(b, Math.max(p.ch, 0));
      c.querySelector('.br-btn.minus').onclick = (e) => { e.stopPropagation(); adjustBookPct(b.id, -10, all); };
      c.querySelector('.br-btn.plus').onclick = (e) => { e.stopPropagation(); adjustBookPct(b.id, 10, all); };
      list.appendChild(c);
    });
    panel.appendChild(list);

    /* 新增书籍 FAB */
    const fab = el('button', 'fab');
    fab.innerHTML = '＋';
    fab.title = '添加书籍';
    fab.onclick = () => openAddBook(() => { renderReading(); $('#panel').scrollTop = 0; });
    document.body.appendChild(fab);
    currentFab = fab;

    panel.appendChild(el('div', 'notice',
      `精选 <b>提升阅历</b>类经典书籍，全文收录，可<b>朗读</b>。进度可 ±10% 微调。点击右下角紫色 + 填「书名 / 作者 / 其它简介」，<b>章节内容可一键自动获取</b>。`));
  }

  function migrateReadPct(all, prog, pctStore) {
    let changed = false;
    all.forEach(b => {
      if (pctStore[b.id] == null && prog[b.id] && prog[b.id].ch != null) {
        pctStore[b.id] = Math.round((prog[b.id].ch / b.chapters.length) * 100);
        changed = true;
      }
    });
    if (changed) S.set('readpct', pctStore);
  }

  function adjustBookPct(id, delta, all) {
    const pctStore = S.get('readpct', {});
    const prog = S.get('readprog', {});
    const b = all.find(x => x.id === id);
    if (!b) return;
    let v = Math.min(100, Math.max(0, (pctStore[id] || 0) + delta));
    pctStore[id] = v;
    const ch = Math.min(b.chapters.length - 1, Math.floor(v / 100 * b.chapters.length));
    prog[id] = { ch, at: Date.now() };
    S.set('readpct', pctStore);
    S.set('readprog', prog);
    renderReading();
  }

  function openReader(book, chIdx) {
    const mask = el('div', 'reader');
    mask.innerHTML = `
      <div class="reader-top">
        <button class="rt-btn" id="rdBack">←</button>
        <div class="rt-title">${book.cover || '📖'} ${C.esc(book.title)} · ${C.esc(book.author)}</div>
        <button class="rt-btn danger" id="rdSpeak">🔊</button>
      </div>
      <div class="reader-chaps" id="rdChaps"></div>
      <div class="reader-body" id="rdBody"></div>
      <div class="reader-actions">
        <button class="rd-btn more" id="rdMore">☰ 更多</button>
        <button class="rd-btn ok" id="rdDone">✓ 完成本章</button>
        <button class="rd-btn play" id="rdPlay">▶ 朗读本章</button>
      </div>`;
    const close = () => { C.TTS.stop(); mask.remove(); };
    mask.querySelector('#rdBack').onclick = close;
    let ch = Math.min(chIdx, book.chapters.length - 1);
    let speaking = false;
    const chaps = mask.querySelector('#rdChaps');
    book.chapters.forEach((c, i) => {
      const t = el('button', 'rc' + (i === ch ? ' active' : ''), `第${i + 1}章`);
      t.onclick = () => { ch = i; C.TTS.stop(); renderCh(); };
      chaps.appendChild(t);
    });
    const body = mask.querySelector('#rdBody');
    const saveProg = () => {
      const prog = S.get('readprog', {});
      prog[book.id] = { ch, at: Date.now() };
      S.set('readprog', prog);
      const pctStore = S.get('readpct', {});
      pctStore[book.id] = Math.round((ch / book.chapters.length) * 100);
      S.set('readpct', pctStore);
    };
    const renderCh = () => {
      chaps.querySelectorAll('.rc').forEach((t, i) => t.classList.toggle('active', i === ch));
      body.innerHTML = `<h4>${C.esc(book.chapters[ch].t)}</h4><p>${C.esc(book.chapters[ch].c)}</p>`;
      saveProg();
      body.scrollTop = 0;
    };
    renderCh();
    const playBtn = mask.querySelector('#rdPlay');
    playBtn.onclick = () => {
      speaking = !speaking;
      if (speaking) {
        const full = book.chapters[ch].c;
        C.TTS.speak(full.replace(/[【】]/g, ''), 'zh-CN', 0.95);
        playBtn.textContent = '⏸ 暂停';
      } else { C.TTS.stop(); playBtn.textContent = '▶ 朗读本章'; }
    };
    mask.querySelector('#rdMore').onclick = () => {
      mask.querySelector('#rdChaps').scrollIntoView({ behavior: 'smooth' });
    };
    mask.querySelector('#rdDone').onclick = () => {
      const pctStore = S.get('readpct', {});
      const target = Math.min(100, Math.round(((ch + 1) / book.chapters.length) * 100));
      pctStore[book.id] = target;
      S.set('readpct', pctStore);
      const prog = S.get('readprog', {});
      prog[book.id] = { ch: Math.min(ch + 1, book.chapters.length - 1), at: Date.now() };
      S.set('readprog', prog);
      C.Toast(`已标记第 ${ch + 1} 章完成 · 总进度 ${target}%`);
      if (ch < book.chapters.length - 1) { ch++; C.TTS.stop(); renderCh(); }
    };
    mask.querySelector('#rdSpeak').onclick = () => {
      const full = book.chapters[ch].c.replace(/[【】]/g, '');
      C.TTS.speak(full, 'zh-CN', 0.95);
    };
    mask.onclick = e => { if (e.target === mask) close(); };
    document.body.appendChild(mask);
  }

  /* 数字转中文（1-99），用于生成章节骨架 */
  function numCn(n) {
    const d = ['零','一','二','三','四','五','六','七','八','九','十'];
    if (n <= 10) return d[n];
    if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
    if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
    return String(n);
  }

  /* 解析维基文库 wikitext 的二级/三级标题为章节 */
  function parseWikisource(wt) {
    const lines = wt.split('\n');
    const chapters = [];
    let cur = null;
    const clean = (s) => s
      .replace(/\{\{[^{}]*\}\}/g, ' ')
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/'''?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    for (const raw of lines) {
      const m = raw.match(/^==\s*(.+?)\s*==\s*$/);
      const m3 = raw.match(/^===\s*(.+?)\s*===\s*$/);
      if (m || m3) {
        if (cur) chapters.push(cur);
        cur = { t: clean(m ? m[1] : m3[1]), c: '' };
      } else if (cur) {
        const c = clean(raw);
        if (c) cur.c += (cur.c ? '\n' : '') + c;
      }
    }
    if (cur) chapters.push(cur);
    return chapters.filter(x => x.t && x.t.length <= 30);
  }

  /* 把维基文库 wikitext 清理成可读纯文本 */
  function cleanWikitext(wt) {
    return (wt || '')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{\{[^{}]*\}\}/g, ' ')
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
      .replace(/'''?/g, '')
      .replace(/^=+\s*(.+?)\s*=+$/gm, '')
      .replace(/^\s*[\*#:;]\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* 解析维基文库单个子页面：提取章节标题 + 正文 */
  function parseWikiPage(wt, title) {
    let t = '';
    const mNovel = wt.match(/\{\{novel\|[^|]*\|([^|}]+)/);
    const mHeader = wt.match(/\{\{Header\s*\|[^}]*?\btitle\s*=\s*([^|}]+)/i);
    if (mNovel) t = mNovel[1].trim();
    else if (mHeader) t = mHeader[1].trim();
    else {
      const parts = title.split('/');
      t = parts[parts.length - 1].trim();
    }
    t = t.replace(/\s+/g, ' ').trim();
    let c = cleanWikitext(wt);
    // 去掉正文开头重复出现的章节标题
    if (t && c.startsWith(t)) c = c.slice(t.length).trim();
    return { t, c };
  }

  /* 抓取维基文库中「主页面/子页面」结构的章节（章回体小说常见） */
  async function fetchWikiSubpages(prefix, base, signal) {
    try {
      const listUrl = base + '&list=allpages&apprefix=' + encodeURIComponent(prefix + '/') + '&apnamespace=0&aplimit=50';
      const listRes = await fetch(listUrl, { mode: 'cors', signal });
      if (!listRes.ok) return null;
      const listData = await listRes.json();
      let pages = (listData.query && listData.query.allpages) || [];
      if (pages.length < 2) return null;
      // 排序：序言/自叙类放前，第N回按数字排序
      pages.sort((a, b) => {
        const na = a.title.match(/第(\d+)回/);
        const nb = b.title.match(/第(\d+)回/);
        if (na && nb) return parseInt(na[1], 10) - parseInt(nb[1], 10);
        if (na) return 1;
        if (nb) return -1;
        return a.title.localeCompare(b.title);
      });
      const chapters = [];
      const concurrency = 3; // 降低并发，避免被公开 API 限流
      for (let i = 0; i < pages.length; i += concurrency) {
        const batch = pages.slice(i, i + concurrency).map(async p => {
          try {
            const pRes = await fetch(base + '&action=parse&page=' + encodeURIComponent(p.title) + '&prop=wikitext',
              { mode: 'cors', signal });
            if (!pRes.ok) return null;
            const pData = await pRes.json();
            const wt = pData.parse && pData.parse.wikitext && pData.parse.wikitext['*'];
            if (!wt) return null;
            return parseWikiPage(wt, p.title);
          } catch (e) { return null; }
        });
        const res = await Promise.all(batch);
        res.forEach(r => { if (r && r.t) chapters.push(r); });
      }
      return chapters.length >= 2 ? { chapters, source: prefix + '（' + chapters.length + '章）' } : null;
    } catch (e) {
      return null;
    }
  }

  /* 尝试从维基文库自动抓取公版书章节（CORS 友好，真实抓取古典/公版书）。
     限制在于公开数据源覆盖有限——即便公版书，维基文库也可能未收录全文。
     因此用「书名 / 书名+作者 / 去标点书名」多候选检索，并放宽命中规则，尽量多抓到数据源里已有的书。
     对章回体小说，若主页面是目录，则进一步抓取「主页面/第N回」子页面。 */
  async function autoFetchChapters(title, author) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    const base = 'https://zh.wikisource.org/w/api.php?action=query&format=json&origin=*';
    const cleanStr = (s) => (s || '').replace(/[《》\s·\-:：·（）()]/g, '');
    const cleanTitle = cleanStr(title);
    const queries = [title, cleanTitle];
    if (author) queries.push(title + ' ' + author, author + ' ' + title);
    try {
      for (const q of queries) {
        let sRes;
        try {
          sRes = await fetch(base + '&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=5',
            { mode: 'cors', signal: ctrl.signal });
        } catch (e) { continue; }
        if (!sRes.ok) continue;
        const sData = await sRes.json();
        const hits = (sData.query && sData.query.search) || [];
        if (!hits.length) continue;
        const chosen = hits.find(h => {
          const ht = cleanStr(h.title);
          return ht.includes(cleanTitle) || cleanTitle.includes(ht);
        }) || hits[0];
        try {
          const pRes = await fetch(base + '&action=parse&page=' + encodeURIComponent(chosen.title) + '&prop=wikitext',
            { mode: 'cors', signal: ctrl.signal });
          if (!pRes.ok) continue;
          const pData = await pRes.json();
          const wt = pData.parse && pData.parse.wikitext && pData.parse.wikitext['*'];
          if (!wt) continue;
          const chaps = parseWikisource(wt);
          if (chaps.length >= 2) return { chapters: chaps, source: chosen.title };
          // 主页面章节不足：尝试子页面结构（章回体小说）
          const sub = await fetchWikiSubpages(chosen.title, base, ctrl.signal);
          if (sub) return sub;
        } catch (e) { continue; }
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(to);
    }
  }

  function openAddBook(onSave) {
    const mask = el('div', 'reader');
    mask.innerHTML = `
      <div class="reader-top">
        <button class="rt-btn" id="abBack">←</button>
        <div class="rt-title">📚 添加书籍</div>
        <div style="width:40px"></div>
      </div>
      <div class="reader-body" style="padding:16px">
        <div class="ab-field"><label>书名 *</label><input type="text" id="abTitle" placeholder="例如：被讨厌的勇气"></div>
        <div class="ab-field"><label>作者</label><input type="text" id="abAuthor" placeholder="例如：岸见一郎"></div>
        <div class="ab-field"><label>其它简介</label><input type="text" id="abIntro" placeholder="一句话介绍这本书"></div>
        <div class="ab-sep">章节内容</div>
        <div class="notice" id="abTip">点击「🤖 自动获取章节」，系统会联网从公开数据源（维基文库）为你抓取；或点「✍️ 手动输入」自己粘贴。</div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="rm-add" id="abAuto" style="flex:1">🤖 自动获取章节</button>
          <button class="rm-add ghost" id="abManual" style="flex:1">✍️ 手动输入</button>
        </div>
        <div id="abManualWrap" style="display:none;margin-top:12px">
          <textarea id="abChaps" rows="9" placeholder="每行一章，格式：章节标题|正文内容&#10;例：&#10;第一章 我们的不幸是谁的错|哲人：……&#10;第二章 一切烦恼都来自人际关系|哲人：……"></textarea>
        </div>
        <div id="abStatus" class="notice warn" style="display:none"></div>
        <button class="rm-add" id="abSave" style="margin-top:14px">保存书籍</button>
      </div>`;
    const close = () => mask.remove();
    mask.querySelector('#abBack').onclick = close;
    const abChaps = mask.querySelector('#abChaps');
    const abManualWrap = mask.querySelector('#abManualWrap');
    const status = mask.querySelector('#abStatus');

    mask.querySelector('#abManual').onclick = () => {
      abManualWrap.style.display = abManualWrap.style.display === 'none' ? 'block' : 'none';
    };

    const abAuto = mask.querySelector('#abAuto');
    abAuto.onclick = async () => {
      const title = $('#abTitle').value.trim();
      const author = $('#abAuthor').value.trim();
      if (!title) return C.Toast('请先填写书名');
      abAuto.disabled = true; abAuto.textContent = '⏳ 获取中…';
      status.style.display = 'block';
      status.className = 'notice';
      status.textContent = '正在联网获取《' + title + '》的章节，请稍候…';
      const res = await autoFetchChapters(title, author);
      abManualWrap.style.display = 'block';
      if (res && res.chapters.length) {
        abChaps.value = res.chapters.map(c => c.t + '|' + c.c).join('\n');
        status.className = 'notice';
        status.innerHTML = '✅ 已从「' + C.esc(res.source) + '」自动获取 <b>' + res.chapters.length + '</b> 个章节，可直接保存（也可手动微调）。';
      } else {
        const n = 6;
        const sk = [];
        for (let i = 1; i <= n; i++) sk.push({ t: '第' + numCn(i) + '章', c: '' });
        abChaps.value = sk.map(c => c.t + '|' + c.c).join('\n');
        status.className = 'notice warn';
        status.innerHTML = '⚠️ 维基文库的公开数据源未收录《' + C.esc(title) + '》的全文（数据源覆盖有限，并非版权限制）。已自动生成 <b>' + n + '</b> 章空框架，保存后可在阅读页逐章补充正文。若需要真实全文，可让千慕（我）联网预抓后直接写进书库。';
      }
      abAuto.disabled = false; abAuto.textContent = '🤖 自动获取章节';
    };

    mask.querySelector('#abSave').onclick = () => {
      const title = $('#abTitle').value.trim();
      const author = $('#abAuthor').value.trim() || '未知作者';
      const intro = $('#abIntro').value.trim() || '用户添加的书籍';
      if (!title) return C.Toast('请填写书名');
      const raw = abChaps.value.trim();
      const chapters = [];
      if (raw) {
        raw.split('\n').forEach(line => {
          line = line.trim();
          if (!line) return;
          const sep = line.indexOf('|');
          if (sep > -1) {
            chapters.push({ t: line.slice(0, sep).trim(), c: line.slice(sep + 1).trim() });
          } else {
            chapters.push({ t: line, c: '' });
          }
        });
      }
      if (!chapters.length) chapters.push({ t: '第一章', c: '' });
      const custom = S.get('customBooks', []);
      const id = 'cb_' + Date.now().toString(36);
      custom.push({ id, title, author, intro, cover: title.slice(0, 1), chapters });
      S.set('customBooks', custom);
      C.Toast('已添加《' + title + '》');
      close();
      if (onSave) onSave();
    };
    mask.onclick = e => { if (e.target === mask) close(); };
    document.body.appendChild(mask);
    $('#abTitle').focus();
  }

  function renderPod(panel) {
    const pods = C.pickDaily(DATA_PODCASTS, 3, 'pod');
    let playing = null;
    pods.forEach(p => {
      const c = el('div', 'dy-card pod-card');
      const colors = { '提升': 'linear-gradient(135deg,#8B6FD8,#6C4FC4)', '经济': 'linear-gradient(135deg,#4FA3C7,#2E7FA0)', '减压': 'linear-gradient(135deg,#7FB77E,#4E9E6B)' };
      c.innerHTML = `
        <div class="pod-ic" style="background:${colors[p.cat]}">${p.icon}</div>
        <div class="pod-body">
          <div class="pod-title">${C.esc(p.title)}</div>
          <div class="pod-meta"><span class="pill">${p.cat}</span><span>${p.minutes}</span><span>· 每日轮换</span></div>
        </div>
        <button class="pod-play" data-i="0">▶</button>`;
      const btn = c.querySelector('.pod-play');
      btn.onclick = () => {
        if (playing === p) { C.TTS.stop(); btn.textContent = '▶'; playing = null; return; }
        if (playing) { playing = null; document.querySelectorAll('.pod-play').forEach(x => x.textContent = '▶'); }
        playing = p;
        btn.textContent = '⏸';
        const speak = () => {
          C.TTS.speak(p.text.replace(/\n/g, '。'), 'zh-CN', 0.95);
        };
        speak();
        const t = setInterval(() => {
          if (!window.speechSynthesis.speaking && playing === p) {
            clearInterval(t); btn.textContent = '▶'; playing = null;
          }
        }, 1200);
        btn.dataset.timer = t;
      };
      panel.appendChild(c);
    });
    panel.appendChild(el('div', 'notice',
      `每天轮换 <b>3 期播客</b>（提升 / 经济 / 减压），点击 ▶ 直接收听，无需跳转。`));
  }

  function renderQuote(panel) {
    const qs = C.pickDaily(DATA_QUOTES, 6, 'quote');
    qs.forEach(q => {
      const c = el('div', 'quote-card');
      c.innerHTML = `
        <div class="q-text">${C.esc(q.s)}</div>
        <div class="q-meta"><span>${C.esc(q.a)}</span><span class="q-kw"># ${C.esc(q.k)}</span></div>`;
      panel.appendChild(c);
    });
    panel.appendChild(el('div', 'notice', `每天自动更新 <b>6 条</b>金句，为一天充电。`));
  }

  /* ==========================================================
     六、数据（分析知识 + 每日新视频）
     ========================================================== */
  function renderLearn() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">📊</div><div><h2>学习中心</h2><p>跟读统计 · 数据分析 · 进度追踪</p></div>`;
    box.appendChild(ph);

    /* 跟读统计卡 */
    const hist = S.get('sunpad_recite_hist', []);
    const fav = S.get('sunpad_recite_fav', []);
    const recTotal = hist.length;
    const avgScore = recTotal ? Math.round(hist.reduce((s, x) => s + x.score, 0) / recTotal) : 0;
    const bestScore = recTotal ? Math.max(...hist.map(x => x.score)) : 0;
    const days = new Set(hist.map(x => x.date)).size;
    const stat = el('div', 'card');
    stat.innerHTML = `<div class="card-title">🗣️ 跟读统计</div>
      <div class="stat-grid">
        <div class="stat-card"><div class="sc-num">${recTotal}</div><div class="sc-label">总跟读</div></div>
        <div class="stat-card"><div class="sc-num">${avgScore}</div><div class="sc-label">平均分</div></div>
        <div class="stat-card"><div class="sc-num">${bestScore}</div><div class="sc-label">最高分</div></div>
        <div class="stat-card"><div class="sc-num">${days}</div><div class="sc-label">学习天数</div></div>
      </div>`;
    box.appendChild(stat);

    /* 收藏口语本快捷 */
    if (fav.length) {
      const fc = el('div', 'card');
      fc.appendChild(el('div', 'card-title', `⭐ 收藏口语本 (${fav.length})`));
      fav.slice(0, 5).forEach(f => {
        const row = el('div', 'suggest-item');
        row.innerHTML = `<span class="sg-tx"><b>${C.esc(f.label)}</b>${f.sub ? ' · ' + C.esc(f.sub) : ''}</span>`;
        fc.appendChild(row);
      });
      if (fav.length > 5) fc.appendChild(el('div', 'set-note', `…还有 ${fav.length - 5} 条，在「跟读」页面可查看全部`));
      box.appendChild(fc);
    }

    /* 最近跟读 */
    if (hist.length) {
      const rc = el('div', 'card');
      rc.appendChild(el('div', 'card-title', '📝 最近跟读'));
      hist.slice(-5).reverse().forEach(h => {
        const row = el('div', 'habit-row');
        row.innerHTML = `<span class="habit-ic" style="background:${h.score >= 80 ? 'var(--ok)' : h.score >= 50 ? 'var(--warn)' : 'var(--danger)'}22">${h.score >= 80 ? '🏆' : h.score >= 50 ? '💪' : '📌'}</span>
          <div style="flex:1"><div class="habit-name">${C.esc(h.target)}</div><div class="set-note">${h.date}</div></div>
          <div style="font-size:16px;font-weight:800;color:${h.score >= 80 ? 'var(--ok)' : h.score >= 50 ? 'var(--warn)' : 'var(--danger)'}">${h.score}分</div>`;
        rc.appendChild(row);
      });
      box.appendChild(rc);
    }

    /* 数据分析章节 */
    const all = DATA_LEARN;
    const todayIdx = C.dayIndex() % all.length;
    const seen = S.get('learnSeen', []);
    if (!seen.includes(todayIdx)) seen.push(todayIdx);
    S.set('learnSeen', seen);
    const mastery = S.get('learnMastery', {});

    const total = all.length;
    const progress = seen.length ? Math.round(seen.reduce((s, idx) => s + (mastery[all[idx].ch] || 0), 0) / (seen.length * 100) * 100) : 0;

    /* 顶部进度卡 */
    const hero = el('div', 'card learn-hero');
    hero.innerHTML = `
      <div class="lh-icon">📊</div>
      <div class="lh-body">
        <div class="lh-title">数据分析之旅</div>
        <div class="lh-sub">从基础到业务，重新拾起数据分析</div>
        <div class="lh-progress"><div class="lhp-bar"><div class="lhp-fill" style="width:${progress}%"></div></div></div>
        <div class="lh-meta">进度：${progress}% · 共${total}章节</div>
      </div>`;
    box.appendChild(hero);

    /* 学习路径 */
    const pathHead = el('div', 'section-head');
    pathHead.innerHTML = `<h3>🚧 学习路径</h3><span class="sh-sub">点击章节展开详情+观看视频</span>`;
    box.appendChild(pathHead);

    box.appendChild(learnItem(all[todayIdx], true));
    seen.slice().reverse().forEach(idx => {
      if (idx === todayIdx) return;
      box.appendChild(learnItem(all[idx], false));
    });

    box.appendChild(el('div', 'notice',
      `已积累 <b>${seen.length}</b> 章知识，全部保留不删除。点击卡片展开学习笔记，用 ±10% 标记每章掌握度。`));
  }

  function learnItem(ch, isNew) {
    const mastery = S.get('learnMastery', {});
    const pct = Math.min(100, Math.max(0, mastery[ch.ch] || 0));
    const item = el('div', 'learn-card');
    item.innerHTML = `
      <div class="lc-head">
        <div class="lc-no">${ch.ch}</div>
        <div class="lc-info">
          <div class="lc-title">${C.esc(ch.title)} ${isNew ? '<span class="ln-new">NEW</span>' : ''}</div>
          <div class="lc-meta"><span class="pill gray">${C.esc(ch.tags[0] || '数据分析')}</span><span>⏱ ${C.esc(ch.d)}</span></div>
          <div class="lc-pct"><div class="lc-pbar"><div class="lc-pfill" style="width:${pct}%"></div></div><span>${pct}%</span></div>
        </div>
        <button class="lc-toggle">展开详情</button>
      </div>
      <div class="lc-body">
        <div class="lc-text">${C.esc(ch.text)}</div>
        <div class="lc-act">
          <button class="lc-btn minus">−10%</button>
          <button class="lc-btn plus">+10%</button>
          <button class="lc-btn video">🎬 抖音视频</button>
        </div>
      </div>`;
    const body = item.querySelector('.lc-body');
    const toggle = item.querySelector('.lc-toggle');
    item.querySelector('.lc-head').onclick = () => {
      body.classList.toggle('show');
      toggle.textContent = body.classList.contains('show') ? '收起详情' : '展开详情';
    };
    item.querySelector('.lc-btn.video').onclick = (e) => { e.stopPropagation(); C.openDouyin(ch.kw); };
      const savePct = v => {
        const m = S.get('learnMastery', {});
        m[ch.ch] = Math.min(100, Math.max(0, v));
        S.set('learnMastery', m);
        renderLearn();
      };
    item.querySelector('.lc-btn.minus').onclick = (e) => { e.stopPropagation(); savePct(pct - 10); };
    item.querySelector('.lc-btn.plus').onclick = (e) => { e.stopPropagation(); savePct(pct + 10); };
    return item;
  }

  /* ==========================================================
     七、记账
     ========================================================== */
  function ledgerAll() { return S.get('ledger', []); }
  function ledgerToday() {
    return ledgerAll().filter(x => x.date === C.todayStr() && x.type === 'out')
      .reduce((s, x) => s + x.amt, 0);
  }

  function renderLedger() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">💰</div><div><h2>记账</h2><p>记录每一笔 · 看清钱去哪了</p></div>`;
    box.appendChild(ph);

    const month = S.get('ledgerMonth', C.monthStr());
    const all = ledgerAll();
    const monthRows = all.filter(x => x.date.startsWith(month));
    const outM = monthRows.filter(x => x.type === 'out').reduce((s, x) => s + x.amt, 0);
    const inM = monthRows.filter(x => x.type === 'in').reduce((s, x) => s + x.amt, 0);

    const bal = el('div', 'balance');
    bal.innerHTML = `
      <div class="bal-label">${month === C.monthStr() ? '本月' : '历史月'}结余</div>
      <div class="bal-num">${C.fmtMoney(inM - outM)}</div>
      <div class="bal-row"><span>收入 <b class="bal-in">${C.fmtMoney(inM)}</b></span>
        <span>支出 <b class="bal-out">${C.fmtMoney(outM)}</b></span></div>`;
    box.appendChild(bal);

    /* 月份切换 */
    const sw = el('div', 'month-switch');
    const prevM = prevMonth(month);
    const nextM = nextMonth(month);
    sw.innerHTML = `
      <button class="ms-btn" id="mPrev">‹</button>
      <span>${month}</span>
      <button class="ms-btn" id="mNext">›</button>`;
    sw.querySelector('#mPrev').onclick = () => { S.set('ledgerMonth', prevM); renderLedger(); };
    sw.querySelector('#mNext').onclick = () => {
      if (nextM > C.monthStr()) return C.Toast('已是当前月');
      S.set('ledgerMonth', nextM); renderLedger();
    };
    box.appendChild(sw);

    /* 添加记录 */
    const add = el('div', 'b-add');
    add.innerHTML = `
      <select id="bType"><option value="out">支出</option><option value="in">收入</option></select>
      <input type="number" id="bAmt" inputmode="decimal" placeholder="金额">
      <select id="bCat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.i}${v.n}</option>`).join('')}</select>
      <button id="bAdd">＋</button>`;
    add.querySelector('#bAdd').onclick = () => {
      const amt = parseFloat($('#bAmt').value);
      if (!amt || amt <= 0) return C.Toast('请输入有效金额');
      const type = $('#bType').value;
      const cat = $('#bCat').value;
      openNoteModal(amt, type, cat);
    };
    box.appendChild(add);

    /* 分类占比图（支出） */
    const outRows = monthRows.filter(x => x.type === 'out');
    const catSum = {};
    outRows.forEach(x => { catSum[x.cat] = (catSum[x.cat] || 0) + x.amt; });
    const catArr = Object.entries(catSum).sort((a, b) => b[1] - a[1]);
    const chart = card('本月支出分类占比', '📊', (() => {
      const w = el('div', '');
      if (!catArr.length) {
        w.appendChild(el('div', 'empty', `<span class="em-ic">🍃</span>本月还没有支出记录`));
        return w;
      }
      const total = catArr.reduce((s, x) => s + x[1], 0);
      const bars = el('div', '');
      catArr.forEach(([k, v]) => {
        const pct = Math.round(v / total * 100);
        const row = el('div', '');
        row.style.marginBottom = '9px';
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:3px">
            <span>${CATS[k].i} ${CATS[k].n}</span><span>${C.fmtMoney(v)} · ${pct}%</span></div>
          <div class="sc-progress"><i style="width:${pct}%;background:linear-gradient(90deg,${catColor(k)},${catColor(k, 1)})"></i></div>`;
        bars.appendChild(row);
      });
      w.appendChild(bars);
      return w;
    })());
    box.appendChild(chart);

    /* 每日支出趋势折线 */
    const y = parseInt(month.slice(0, 4)), mth = parseInt(month.slice(5, 7));
    const daysInMonth = new Date(y, mth, 0).getDate();
    const dailyOut = Array.from({ length: daysInMonth }, (_, i) => {
      const dd = month + '-' + String(i + 1).padStart(2, '0');
      return monthRows.filter(x => x.date === dd && x.type === 'out').reduce((s, x) => s + x.amt, 0);
    });
    const trendCard = card('本月每日支出趋势', '📈', (() => {
      const w = el('div', 'trend-box');
      w.innerHTML = drawTrend(dailyOut);
      const ax = el('div', 'trend-axis');
      ax.innerHTML = `<span>1</span><span>${Math.round(daysInMonth / 2)}</span><span>${daysInMonth}</span>`;
      w.appendChild(ax);
      return w;
    })());
    box.appendChild(trendCard);

    /* SVG 饼图（分类占比） */
    if (catArr.length) {
      const total = catArr.reduce((s, x) => s + x[1], 0);
      const R = 54, CX = 70, CY = 70;
      let cum = 0;
      const slices = catArr.map(([k, v]) => {
        const pct = v / total, start = cum * 2 * Math.PI - Math.PI / 2; cum += pct;
        const end = cum * 2 * Math.PI - Math.PI / 2;
        const large = pct > 0.5 ? 1 : 0;
        const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
        const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end);
        return `<path d="M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z" fill="${catColor(k)}" stroke="var(--card)" stroke-width="2"/>`;
      });
      const legend = catArr.map(([k, v]) => `<span class="cat-dot"><span style="background:${catColor(k)}"></span>${CATS[k].i}${CATS[k].n} ${Math.round(v / total * 100)}%</span>`).join('');
      box.appendChild(card('分类占比', '🍩', `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><svg width="140" height="140" viewBox="0 0 140 140">${slices.join('')}</svg><div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11px">${legend}</div></div>`));
    }

    /* 心愿存钱清单 */
    const wishes = S.get('wishes', []);
    const wCard = el('div', 'card');
    wCard.appendChild(el('div', 'card-title', '🎯 心愿存钱'));
    if (wishes.length) {
      wishes.forEach((w, idx) => {
        const row = el('div', 'habit-row');
        const saved = S.get('wish_saved_' + idx, 0);
        const pct = w.amt > 0 ? Math.min(100, Math.round(saved / w.amt * 100)) : 0;
        row.innerHTML = `<span class="habit-ic" style="background:var(--primary-softer)">${w.icon || '🎁'}</span>
          <div style="flex:1"><div class="habit-name">${C.esc(w.name)}</div>
          <div class="sc-progress" style="margin-top:4px"><i style="width:${pct}%"></i></div>
          <div class="set-note" style="margin-top:3px">${C.fmtMoney(saved)} / ${C.fmtMoney(w.amt)} · ${pct}%</div></div>
          <button class="hc-plus">＋</button><button class="habit-del">✕</button>`;
        row.querySelector('.hc-plus').onclick = () => {
          const add = parseFloat(prompt('存入金额：')); if (!add || add <= 0) return;
          S.set('wish_saved_' + idx, saved + add); renderLedger();
        };
        row.querySelector('.habit-del').onclick = () => { wishes.splice(idx, 1); S.set('wishes', wishes); renderLedger(); };
        wCard.appendChild(row);
      });
    } else {
      wCard.appendChild(el('div', 'empty', '还没有心愿，点下方添加'));
    }
    const addW = el('button', 'rm-add', '＋ 新增心愿');
    addW.onclick = () => {
      const name = prompt('心愿名称（如：买个包包）：'); if (!name || !name.trim()) return;
      const amt = parseFloat(prompt('目标金额（元）：')); if (!amt || amt <= 0) return;
      wishes.push({ name: name.trim(), amt, icon: '🎁' }); S.set('wishes', wishes); renderLedger();
    };
    wCard.appendChild(addW);
    box.appendChild(wCard);

    /* CSV 导出 */
    const csvBtn = el('button', 'btn-line', '📄 导出 CSV');
    csvBtn.style.cssText = 'width:100%;margin-bottom:12px';
    csvBtn.onclick = () => {
      const header = '日期,类型,分类,金额,备注\n';
      const body = rows.map(r => `${r.date},${r.type === 'in' ? '收入' : '支出'},${CATS[r.cat]?.n || r.cat},${r.amt},"${(r.note || '').replace(/"/g, '""')}"`).join('\n');
      const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `记账_${month}.csv`; a.click();
    };
    box.appendChild(csvBtn);

    /* 搜索 */
    const searchL = el('div', 'food-search');
    searchL.innerHTML = `<span class="fs-ic">🔍</span><input type="text" id="ledgerSearch" class="fs-input" placeholder="搜索备注…">`;
    box.appendChild(searchL);
    searchL.querySelector('#ledgerSearch').oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      listWrap.querySelectorAll('.bl-item').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    };

    /* 月度预算进度 */
    const budget = S.get('budget', 0);
    if (budget > 0) {
      const pct = Math.min(100, Math.round(outM / budget * 100));
      const over = outM > budget;
      const bCard = card('本月预算', '🎯', (() => {
        const w = el('div', 'budget-bar');
        w.innerHTML = `
          <div class="budget-num"><span>已花 ${C.fmtMoney(outM)}</span>
            <span class="${over ? 'over' : ''}">${over ? '超支 ' : '预算 '}${C.fmtMoney(budget)} · ${pct}%</span></div>
          <div class="sc-progress"><i style="width:${pct}%;background:${over ? 'var(--danger)' : 'linear-gradient(90deg,var(--primary),var(--accent))'}"></i></div>`;
        return w;
      })());
      box.appendChild(bCard);
    }

    /* 明细 */
    const rows = monthRows.slice().sort((a, b) => b.ts - a.ts);
    const listWrap = el('div', '');
    if (!rows.length) {
      listWrap.appendChild(el('div', 'empty', `<span class="em-ic">🧾</span>${month} 暂无记录`));
    } else {
      rows.forEach(r => {
        const row = el('div', 'bl-item');
        const cat = CATS[r.cat] || CATS.extra;
        const time = (r.ts || 0) ? new Date(r.ts) : new Date(r.date + 'T08:00:00');
        row.innerHTML = `
          <div class="bl-cat">${cat.i}</div>
          <div class="bl-info">
            <div class="bl-name">${cat.n}${r.note ? ' · ' + C.esc(r.note) : ''}</div>
            <div class="bl-note">${r.date} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}</div>
          </div>
          <div class="bl-amt ${r.type === 'in' ? 'in' : 'out'}">${r.type === 'in' ? '+' : '-'}${C.fmtMoney(r.amt)}</div>
          <button class="bl-del">✕</button>`;
        row.querySelector('.bl-del').onclick = () => {
          const idx = all.findIndex(x => x.ts === r.ts);
          if (idx > -1) { all.splice(idx, 1); S.set('ledger', all); renderLedger(); }
        };
        listWrap.appendChild(row);
      });
    }
    box.appendChild(card('收支明细', '🧾', listWrap));
  }

  function catColor(k, dark) {
    const map = {
      food: ['#F9B16E', '#F08A4B'], shop: ['#A98FE0', '#8B6FD8'], travel: ['#6FB3E0', '#4A90C4'],
      home: ['#9BC4A8', '#6F9E85'], fun: ['#E89BB0', '#D96A8C'], study: ['#8FB8E8', '#5C8FD8'],
      health: ['#7FB77E', '#4E9E6B'], salary: ['#A9C4E8', '#7C9FD8'],
      beauty: ['#F5A6C8', '#E07AA0'], outfit: ['#C4A0F0', '#A878E0'], nail: ['#FFB6D9', '#FF8EC4'],
      med: ['#B0E0E6', '#7CC8D8'], flower: ['#FFB6C1', '#FF8FA3'], tea: ['#D4A574', '#B8884C'],
      social: ['#FFD700', '#E6C200'], extra: ['#B5ACD6', '#958AC4']
    };
    const c = map[k] || map.extra;
    return dark ? c[1] : c[0];
  }

  function openNoteModal(amt, type, cat) {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `
      <h3>${type === 'in' ? '💵' : '💸'} 记一笔 ${type === 'in' ? '收入' : '支出'} · ${CATS[cat].n}</h3>
      <div class="modal-field"><label>金额</label><input type="number" id="nAmt" value="${amt}" inputmode="decimal"></div>
      <div class="modal-field"><label>备注（可选）</label><input id="nNote" maxlength="20" placeholder="如：和朋友吃火锅"></div>
      <div class="modal-actions"><button class="m-btn cancel">取消</button><button class="m-btn ok">保存</button></div>`;
    mask.appendChild(m);
    const close = () => mask.remove();
    mask.onclick = e => { if (e.target === mask) close(); };
    m.querySelector('.cancel').onclick = close;
    m.querySelector('.ok').onclick = () => {
      const a = parseFloat($('#nAmt').value);
      if (!a || a <= 0) return C.Toast('请输入有效金额');
      const note = $('#nNote').value.trim();
      const all = ledgerAll();
      all.push({ ts: Date.now(), date: C.todayStr(), type, cat, amt: Math.round(a * 100) / 100, note });
      S.set('ledger', all);
      C.Toast('已记录 ✓'); close(); renderLedger();
    };
    document.body.appendChild(mask);
    setTimeout(() => $('#nAmt').focus(), 100);
  }

  function prevMonth(m) {
    const [y, mo] = m.split('-').map(Number);
    return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  }
  function nextMonth(m) {
    const [y, mo] = m.split('-').map(Number);
    return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
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
    setTimeout(() => $('#qAmt').focus(), 100);
  }

  /* ==========================================================
     八、菜谱
     ========================================================== */
  function renderFood() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🍲</div><div><h2>今日菜谱</h2><p>每天更新 · 今日推荐 + 搜索你想做的菜</p></div>`;
    box.appendChild(ph);

    /* 搜索栏 */
    const searchWrap = el('div', 'food-search');
    searchWrap.innerHTML = `
      <span class="fs-ic">🔍</span>
      <input type="text" id="foodSearch" class="fs-input" placeholder="搜想做的菜，如：豆腐 / 鸡肉 / 鱼香 / 凉拌" maxlength="20">
      <button class="fs-clear" id="foodClear" style="display:none">✕</button>`;
    box.appendChild(searchWrap);

    /* 食材库存（一键匹配可做菜谱） */
    const pantry = S.get('food_pantry', []);
    const pantryBar = el('div', 'card');
    pantryBar.innerHTML = `<div class="card-title">🧊 食材库存 <span class="set-note" style="margin-left:auto;font-weight:400">录入现有食材，一键匹配可做菜谱</span></div>`;
    const pantryInput = el('div', 'food-search');
    pantryInput.innerHTML = `<span class="fs-ic">🥕</span><input type="text" id="pantryInp" class="fs-input" placeholder="输入食材，如：鸡蛋、土豆…"><button class="fs-clear" id="pantryAdd" style="background:var(--primary);color:#fff;border-radius:8px;width:auto;padding:0 10px;font-size:12px">＋</button>`;
    pantryBar.appendChild(pantryInput);
    if (pantry.length) {
      const tagW = el('div', 'pill-row');
      pantry.forEach((p, i) => {
        const b = el('button', 'pill on', p + ' ✕');
        b.onclick = () => { pantry.splice(i, 1); S.set('food_pantry', pantry); renderFood(); };
        tagW.appendChild(b);
      });
      pantryBar.appendChild(tagW);
      const matchBtn = el('button', 'btn-pill', '🔍 匹配可做菜谱');
      matchBtn.onclick = () => {
        const matched = DATA_FOOD.filter(d => pantry.some(p => (d.ing || []).some(ing => ing.includes(p))));
        if (!matched.length) return C.Toast('没有匹配的菜谱，试试添加更多食材');
        const resWrap = box.querySelector('.food-results') || box.appendChild(el('div', 'food-results'));
        resWrap.style.display = 'block';
        resWrap.innerHTML = `<div class="res-count">🧊 匹配到 ${matched.length} 道可做菜谱</div>` +
          matched.map(d => `<div class="card recipe-card">${recipeCardHtml(d, '', '🧊')}</div>`).join('');
        resWrap.querySelectorAll('.recipe-search').forEach((b, i) => b.onclick = () => C.openDouyin(matched[i].kw));
        resWrap.querySelectorAll('.recipe-video').forEach((b, i) => b.onclick = () => C.openDouyin(matched[i].kw));
      };
      pantryBar.appendChild(matchBtn);
    }
    box.appendChild(pantryBar);
    pantryInput.querySelector('#pantryAdd').onclick = () => {
      const v = pantryInput.querySelector('#pantryInp').value.trim();
      if (!v || pantry.includes(v)) return;
      pantry.push(v); S.set('food_pantry', pantry); renderFood();
    };

    /* 功能标签筛选 */
    const tags = ['全部', '低卡减脂', '经期暖宫', '一人食', '快手菜', '川菜', '家常菜', '烘焙'];
    const tagBar = el('div', 'tabs food-cats');
    let activeTag = '全部';
    tags.forEach(t => {
      const b = el('button', 'tab' + (t === activeTag ? ' active' : ''), t);
      b.onclick = () => {
        activeTag = t;
        tagBar.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.textContent === t));
        doSearch(input.value, activeTag);
      };
      tagBar.appendChild(b);
    });
    box.appendChild(tagBar);

    /* 经期联动：暖宫提示 */
    if (isPeriodActive()) {
      box.appendChild(el('div', 'notice', '🌸 经期中 · 注意饮食温补，避免寒凉辛辣'));
    }

    const today = C.pickDaily(DATA_FOOD, 1, 'food')[0];
    const tomorrow = C.pickDaily(DATA_FOOD, 1, 'food', 'day', C.dayIndex() + 1)[0];

    const defWrap = el('div', 'food-default');
    const todayCard = el('div', 'card recipe-card today');
    todayCard.innerHTML = recipeCardHtml(today, '今日推荐', '🔥');
    todayCard.querySelector('.recipe-search').onclick = () => C.openDouyin(today.kw);
    todayCard.querySelector('.recipe-video').onclick = () => C.openDouyin(today.kw);
    defWrap.appendChild(todayCard);

    const tomorrowCard = el('div', 'card recipe-card');
    tomorrowCard.innerHTML = recipeCardHtml(tomorrow, '明日预告', '📅');
    tomorrowCard.querySelector('.recipe-search').onclick = () => C.openDouyin(tomorrow.kw);
    tomorrowCard.querySelector('.recipe-video').onclick = () => C.openDouyin(tomorrow.kw);
    defWrap.appendChild(tomorrowCard);

    defWrap.appendChild(el('div', 'notice',
      `今日推荐来自 <b>${DATA_FOOD.length}</b> 道菜库（川菜 / 家常菜 / 减脂餐 / 烘焙），每天自动换新；上方可搜菜名 / 食材 / 口味，或按分类筛选。点击按钮直达抖音搜索。`));
    box.appendChild(defWrap);

    const resWrap = el('div', 'food-results');
    box.appendChild(resWrap);

    const input = searchWrap.querySelector('#foodSearch');
    const clearBtn = searchWrap.querySelector('#foodClear');

    /* 智能标签匹配函数 */
    function foodHasTag(d, tag) {
      const hay = [d.n, d.tag, d.kw, d.tip, (d.ing || []).join(' ')].join(' ').toLowerCase();
      const cat = (d.cat || '川菜');
      if (tag === '全部') return true;
      if (tag === '川菜') return cat === '川菜';
      if (tag === '家常菜') return cat === '家常菜';
      if (tag === '烘焙') return cat === '烘焙';
      if (tag === '低卡减脂') return cat === '减脂餐' || hay.includes('低卡') || hay.includes('减脂') || hay.includes('鸡胸') || hay.includes('沙拉');
      if (tag === '经期暖宫') return hay.includes('红糖') || hay.includes('姜') || hay.includes('暖') || hay.includes('温补') || hay.includes('红枣') || hay.includes('桂圆');
      if (tag === '一人食') return hay.includes('简单') || hay.includes('快手') || hay.includes('速') || d.t.includes('15分') || d.t.includes('10分');
      if (tag === '快手菜') return hay.includes('快手') || d.t.includes('15分') || d.t.includes('10分') || d.t.includes('20分');
      return false;
    }
    function doSearch(q, tag) {
      q = (q || '').trim();
      tag = tag || '全部';
      if (!q && tag === '全部') {
        defWrap.style.display = '';
        resWrap.style.display = 'none';
        resWrap.innerHTML = '';
        clearBtn.style.display = 'none';
        return;
      }
      clearBtn.style.display = '';
      defWrap.style.display = 'none';
      resWrap.style.display = 'block';
      const kw = q.toLowerCase();
      const hits = DATA_FOOD.filter(d => {
        if (!foodHasTag(d, tag)) return false;
        if (!kw) return true;
        const hay = [d.n, d.tag, d.kw, d.tip, (d.ing || []).join(' '), (d.step || []).join(' ')]
          .join(' ').toLowerCase();
        return hay.includes(kw);
      });
      if (!hits.length) {
        const scope = tag !== '全部' ? `「${tag}」` : '';
        resWrap.innerHTML = `<div class="notice warn">没有找到${scope}与「${C.esc(q)}」相关的菜，换个关键词试试～</div>`;
        return;
      }
      const scope = tag !== '全部' ? `（${tag}）` : '';
      resWrap.innerHTML = `<div class="res-count">找到 <b>${hits.length}</b> 道相关菜${scope}</div>`;
      hits.forEach(d => {
        const c = el('div', 'card recipe-card');
        c.innerHTML = recipeCardHtml(d, '搜索结果', '🔍');
        c.querySelector('.recipe-search').onclick = () => C.openDouyin(d.kw);
        c.querySelector('.recipe-video').onclick = () => C.openDouyin(d.kw);
        resWrap.appendChild(c);
      });
    }
    input.oninput = e => doSearch(e.target.value, activeTag);
    clearBtn.onclick = () => {
      input.value = '';
      activeTag = '全部';
      tagBar.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.textContent === '全部'));
      doSearch('', '全部');
      input.focus();
    };
  }

  function recipeCardHtml(d, label, icon) {
    return `
      <div class="recipe-label"><span>${icon}</span>${label}</div>
      <div class="recipe-hero">
        <div class="rh-ic">🍳</div>
        <div>
          <div class="rh-t">${C.esc(d.n)}</div>
          <div class="rh-meta">
            <span class="pill">${d.lv}</span><span class="pill gray">${d.t}</span><span class="pill gray">${d.tag}</span>
          </div>
        </div>
      </div>
      <div class="rec-section">
        <h4>🥬 食材</h4>
        <div class="ing-list">${d.ing.map(i => `<span class="ing-tag">${C.esc(i)}</span>`).join('')}</div>
      </div>
      ${d.sauce ? `<div class="rec-section"><h4>🧪 灵魂酱汁</h4><div class="ing-list"><span class="ing-tag" style="background:#FFF6EC">${C.esc(d.sauce)}</span></div></div>` : ''}
      <div class="rec-section">
        <h4>👨‍🍳 做法</h4>
        ${d.step.map((s, i) => `
          <div class="step-item"><div class="step-num">${i + 1}</div><div class="step-tx">${C.esc(s)}</div></div>`).join('')}
      </div>
      <div class="tip-box"><b>💡 小贴士</b> ${C.esc(d.tip)}</div>
      <div class="recipe-actions">
        <button class="recipe-search">📱 下厨房搜「${C.esc(d.n)}」</button>
        <button class="recipe-video">▶ 看视频</button>
      </div>`;
  }

  /* ==========================================================
     十一、每日提醒
     ========================================================== */
  function renderRemind() {
    const box = $('#panel');
    box.innerHTML = '';

    const today = new Date();
    const wk = ['日','一','二','三','四','五','六'][today.getDay()];
    const dateStr = `${today.getMonth()+1}月${today.getDate()}日 周${wk}`;

    let list = S.dayGet('reminders', []);
    const doneCount = list.filter(x => x.done).length;
    const todoCount = list.length - doneCount;

    /* 顶部统计卡 */
    const hero = el('div', 'card hero-card');
    hero.innerHTML = `
      <div class="hero-date">${dateStr}</div>
      <div class="hero-count">${todoCount} 项待办</div>
      <div class="hero-sub">已完成 ${doneCount} 项</div>`;
    box.appendChild(hero);

    /* 添加表单 */
    const formCard = el('div', 'card');
    formCard.innerHTML = `
      <div class="card-title"><span class="ct-ic">➕</span>添加提醒</div>
      <div class="remind-form">
        <div class="rf-row dual">
          <div class="rf-field">
            <label>时间</label>
            <input type="time" id="rmTime" value="09:00">
          </div>
          <div class="rf-field">
            <label>时段</label>
            <select id="rmPeriod">
              <option value="上午">🌅 上午</option>
              <option value="下午">☀️ 下午</option>
              <option value="晚上">🌙 晚上</option>
            </select>
          </div>
        </div>
        <div class="rf-field">
          <label>内容</label>
          <input type="text" id="rmText" placeholder="例如：喂小鸡崽 / 健身打卡 / 喝水" maxlength="60">
        </div>
        <div class="rf-field">
          <label>备注（可选）</label>
          <input type="text" id="rmNote" placeholder="可选补充" maxlength="80">
        </div>
        <button class="rm-add" id="rmAdd">添加提醒</button>
      </div>`;
    box.appendChild(formCard);

    function saveAndRender() {
      S.daySet('reminders', list);
      renderRemind();
    }

    function addReminder() {
      const time = $('#rmTime').value;
      const period = $('#rmPeriod').value;
      const text = $('#rmText').value.trim();
      const note = $('#rmNote').value.trim();
      if (!time) { C.Toast('请选择一个时间'); return; }
      if (!text) { C.Toast('请填写提醒内容'); return; }
      list.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
        time, period, text, note,
        done: false
      });
      list.sort((a,b)=>a.time.localeCompare(b.time));
      saveAndRender();
      C.Toast('提醒已添加');
    }

    formCard.querySelector('#rmAdd').onclick = addReminder;
    formCard.querySelector('#rmText').addEventListener('keypress', e => { if(e.key==='Enter') addReminder(); });

    /* 列表 */
    if (!list.length) {
      const empty = el('div', 'empty-state');
      empty.innerHTML = `<div class="es-ic">⏰</div><div class="es-t">今天还没有提醒</div><div class="es-d">点击上方表单或右下角 + 号添加</div>`;
      box.appendChild(empty);
    } else {
      const listCard = el('div', 'card');
      listCard.innerHTML = `<div class="card-title"><span class="ct-ic">📋</span>今日提醒</div>`;
      list.forEach(item => {
        const row = el('div', 'rm-item' + (item.done ? ' done' : ''));
        row.innerHTML = `
          <div class="rm-check"><input type="checkbox" ${item.done ? 'checked' : ''}></div>
          <div class="rm-body">
            <div class="rm-time">${C.esc(item.period)} · ${C.esc(item.time)}</div>
            <div class="rm-text">${C.esc(item.text)}</div>
            ${item.note ? `<div class="rm-note">${C.esc(item.note)}</div>` : ''}
          </div>
          <button class="rm-del" title="删除">🗑️</button>`;
        row.querySelector('input').onchange = () => {
          item.done = !item.done;
          saveAndRender();
        };
        row.querySelector('.rm-del').onclick = () => {
          if (confirm('确定删除这条提醒吗？')) {
            list = list.filter(x => x.id !== item.id);
            saveAndRender();
          }
        };
        listCard.appendChild(row);
      });
      box.appendChild(listCard);
    }

    /* 说明 */
    box.appendChild(el('div', 'notice warn',
      `<b>💡 关于提醒</b><br>纯前端 PWA 在 iOS 上无法锁屏/后台推送。提醒会在当天打开工作台后，到点弹出提示；安卓 Chrome 可额外尝试系统通知。`));

    /* 右下角 FAB */
    const fab = el('button', 'fab');
    fab.innerHTML = '＋';
    fab.title = '快速添加';
    fab.onclick = () => {
      $('#rmText').focus();
      $('#panel').scrollTo({ top: formCard.offsetTop - 20, behavior: 'smooth' });
    };
    document.body.appendChild(fab);
    currentFab = fab;
  }

  /* ========== 入口 ========== */
  /* ==========================================================
      新增 P0 — 通用日期/经期/习惯 工具
      ========================================================== */
  function ymd(d) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
  function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function diffDays(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function monthGrid(y, m) {
    const first = new Date(y, m, 1), startDow = first.getDay(), cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    const days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  function periodStore() { return S.get('sunpad_period_days', {}); }
  function periodDaysArr() { return Object.keys(periodStore()).sort(); }
  function periodClusters() {
    const days = periodDaysArr(); const clusters = []; let cur = null;
    for (const d of days) {
      if (cur && diffDays(cur.end, d) <= 1) cur.end = d;
      else { cur = { start: d, end: d }; clusters.push(cur); }
    }
    return clusters;
  }
  function predictPeriod() {
    const clusters = periodClusters();
    const set = S.get('sunpad_period_set', { avgCycle: 28, avgPeriod: 5 });
    if (clusters.length === 0) {
      const last = S.get('sunpad_last_period', null);
      if (!last) return { cold: true, daysUntil: null };
      const next = addDays(parseYmd(last), set.avgCycle);
      return { cold: true, next: ymd(next), daysUntil: diffDays(ymd(new Date()), ymd(next)), confidence: false };
    }
    const starts = clusters.map(c => c.start), lastStart = starts[starts.length - 1];
    let next;
    if (clusters.length < 2) next = addDays(parseYmd(lastStart), set.avgCycle);
    else {
      const gaps = []; for (let i = 1; i < starts.length; i++) gaps.push(diffDays(starts[i - 1], starts[i]));
      let wsum = 0, gsum = 0; gaps.forEach((g, idx) => { const w = idx + 1; wsum += w; gsum += g * w; });
      next = addDays(parseYmd(lastStart), Math.round(gsum / wsum));
    }
    return { cold: false, next: ymd(next), daysUntil: diffDays(ymd(new Date()), ymd(next)), confidence: clusters.length >= 3 };
  }
  function isPeriodActive() { return periodDaysArr().includes(ymd(new Date())); }

  /* ==========================================================
      新增 P0 — 经期记录（menstrual）
      ========================================================== */
  function renderMenstrual() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🌸</div><div><h2>经期记录</h2><p>周期追踪 · 预测 · 症状与情绪</p></div>`;
    box.appendChild(ph);

    const days = periodDaysArr(), clusters = periodClusters(), pred = predictPeriod();
    const set = S.get('sunpad_period_set', { avgCycle: 28, avgPeriod: 5 });
    const today = ymd(new Date()), active = days.includes(today);

    if (clusters.length === 0 && !S.get('sunpad_last_period', null)) {
      const g = el('div', 'card');
      g.innerHTML = `<div class="card-title">🌸 欢迎使用经期记录</div>
        <p class="set-note">先告诉我上次经期开始日，我会帮你预测周期。记录越久，预测越准。</p>
        <div class="rf-field" style="margin-top:10px"><label>上次经期开始日</label><input type="date" id="mpLast"></div>
        <div class="rf-field" style="margin-top:8px"><label>平均周期（天）</label><input type="number" id="mpCycle" value="28" min="20" max="45"></div>
        <button class="rm-add" id="mpSave" style="margin-top:12px">开始记录</button>`;
      box.appendChild(g);
      g.querySelector('#mpSave').onclick = () => {
        const last = g.querySelector('#mpLast').value, cyc = parseInt(g.querySelector('#mpCycle').value, 10) || 28;
        if (!last) return C.Toast('请选择开始日');
        S.set('sunpad_last_period', last);
        S.set('sunpad_period_set', { avgCycle: cyc, avgPeriod: 5 });
        const st = periodStore();
        for (let i = 0; i < 5; i++) st[ymd(addDays(parseYmd(last), i))] = { flow: 2, symptoms: [], skin: [], mood: null };
        S.set('sunpad_period_days', st); renderMenstrual();
      };
      return;
    }

    const pc = el('div', 'card');
    if (active) pc.innerHTML = `<div class="card-title">🌸 当前状态</div><div style="font-size:15px;font-weight:800;color:var(--primary-deep)">经期进行中 · 注意休息与保暖 🌸</div>`;
    else if (pred.cold) pc.innerHTML = `<div class="card-title">🌸 预测</div><div style="font-size:15px;font-weight:800">距下次经期约 <b>${Math.max(0, pred.daysUntil)}</b> 天${pred.daysUntil != null && pred.daysUntil <= 3 && pred.daysUntil > 0 ? ' · 记得备好暖宝宝 🌸' : ''}</div><div class="set-note" style="margin-top:6px">记录越久预测越准</div>`;
    else pc.innerHTML = `<div class="card-title">🌸 预测</div><div style="font-size:15px;font-weight:800">距下次经期 <b>${pred.daysUntil}</b> 天 · 预计 ${pred.next}${pred.confidence ? '' : '（参考）'}</div>`;
    box.appendChild(pc);

    if (!window._mc) { const n = new Date(); window._mc = { y: n.getFullYear(), m: n.getMonth() }; }
    const y = window._mc.y, m = window._mc.m;
    const calCard = el('div', 'card');
    calCard.innerHTML = `<div class="cal-head"><button class="cal-nav" id="mpPrev">‹</button><span class="cal-title">${y}年${m + 1}月</span><button class="cal-nav" id="mpNext">›</button></div>
      <div class="cal-week">${['日', '一', '二', '三', '四', '五', '六'].map(w => `<span>${w}</span>`).join('')}</div><div class="cal-grid"></div>`;
    box.appendChild(calCard);
    const grid = calCard.querySelector('.cal-grid');
    const predSet = new Set();
    if (pred.next) for (let i = 0; i < set.avgPeriod; i++) predSet.add(ymd(addDays(parseYmd(pred.next), i)));
    monthGrid(y, m).forEach((c, idx) => {
      if (!c) return; // 跳过空位，用 grid-column/row 定位
      const cell = el('div', 'cal-cell');
      cell.style.gridColumn = (idx % 7 + 1) + '';
      cell.style.gridRow = (Math.floor(idx / 7) + 1) + '';
      const k = ymd(c); cell.textContent = c.getDate();
      if (k === today) cell.classList.add('today');
      if (days.includes(k)) cell.classList.add('pd'); else if (predSet.has(k)) cell.classList.add('pp');
      cell.onclick = () => {
        const st = periodStore();
        if (st[k]) delete st[k]; else st[k] = { flow: 2, symptoms: [], skin: [], mood: null };
        S.set('sunpad_period_days', st); renderMenstrual();
      };
      grid.appendChild(cell);
    });
    calCard.querySelector('#mpPrev').onclick = () => { window._mc.m--; if (window._mc.m < 0) { window._mc.m = 11; window._mc.y--; } renderMenstrual(); };
    calCard.querySelector('#mpNext').onclick = () => { window._mc.m++; if (window._mc.m > 11) { window._mc.m = 0; window._mc.y++; } renderMenstrual(); };

    const st = periodStore(), td = st[today] || null;
    const det = el('div', 'card'); det.appendChild(el('div', 'card-title', '🌸 今日记录'));
    if (td) {
      det.appendChild(el('div', '', `<div class="set-note" style="margin-bottom:6px">流量</div>`));
      const flowWrap = el('div', 'seg');
      [['1', '少'], ['2', '中'], ['3', '多']].forEach(([v, l]) => {
        const b = el('button', td.flow == +v ? 'on' : '', l);
        b.onclick = () => { td.flow = +v; st[today] = td; S.set('sunpad_period_days', st); renderMenstrual(); };
        flowWrap.appendChild(b);
      });
      det.appendChild(flowWrap);
      const SYM = [['cramp', '痛经'], ['back', '腰酸'], ['head', '头痛'], ['tired', '疲劳'], ['mood', '情绪波动'], ['appetite', '食欲变化']];
      det.appendChild(el('div', '', `<div class="set-note" style="margin:10px 0 6px">症状</div>`));
      const symWrap = el('div', 'pill-row');
      SYM.forEach(([v, l]) => { const b = el('button', 'pill' + (td.symptoms.includes(v) ? ' on' : ''), l); b.onclick = () => { const i = td.symptoms.indexOf(v); if (i >= 0) td.symptoms.splice(i, 1); else td.symptoms.push(v); st[today] = td; S.set('sunpad_period_days', st); renderMenstrual(); }; symWrap.appendChild(b); });
      det.appendChild(symWrap);
      const SKIN = [['oily', '油脂'], ['acne', '痘痘'], ['sensitive', '敏感'], ['dry', '干燥']];
      det.appendChild(el('div', '', `<div class="set-note" style="margin:10px 0 6px">皮肤状态</div>`));
      const skinWrap = el('div', 'pill-row');
      SKIN.forEach(([v, l]) => { const b = el('button', 'pill' + (td.skin.includes(v) ? ' on' : ''), l); b.onclick = () => { const i = td.skin.indexOf(v); if (i >= 0) td.skin.splice(i, 1); else td.skin.push(v); st[today] = td; S.set('sunpad_period_days', st); renderMenstrual(); }; skinWrap.appendChild(b); });
      det.appendChild(skinWrap);
      det.appendChild(el('div', '', `<div class="set-note" style="margin:10px 0 6px">今日心情</div>`));
      const mw = el('div', 'seg');
      [['1', '😢'], ['2', '😟'], ['3', '😐'], ['4', '🙂'], ['5', '😊']].forEach(([v, l]) => { const b = el('button', (td.mood && td.mood == +v) ? 'on' : '', l); b.onclick = () => { td.mood = +v; st[today] = td; S.set('sunpad_period_days', st); renderMenstrual(); }; mw.appendChild(b); });
      det.appendChild(mw);
    } else det.appendChild(el('div', 'empty', '今天未标记经期。点击上方日历中的日期即可记录～'));
    box.appendChild(det);

    const stat = el('div', 'card');
    const avgCyc = clusters.length >= 2 ? (() => { const s = clusters.map(c => c.start); const gaps = []; for (let i = 1; i < s.length; i++) gaps.push(diffDays(s[i - 1], s[i])); return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length); })() : set.avgCycle;
    const lens = clusters.map(c => diffDays(c.start, c.end) + 1);
    const avgLen = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : set.avgPeriod;
    stat.innerHTML = `<div class="card-title">📊 周期统计</div>
      <div class="stat-grid">
        <div class="stat-card"><div class="sc-num">${avgCyc}</div><div class="sc-label">平均周期(天)</div></div>
        <div class="stat-card"><div class="sc-num">${avgLen}</div><div class="sc-label">平均经期(天)</div></div>
        <div class="stat-card"><div class="sc-num">${clusters.length}</div><div class="sc-label">已记录周期</div></div>
      </div>`;
    box.appendChild(stat);
  }

  /* ==========================================================
      新增 P0 — 习惯打卡（habits）
      ========================================================== */
  function habitsData() {
    return S.get('sunpad_habits', {
      habits: [
        { id: 'water', name: '喝水8杯', icon: '💧', type: 'count', target: 8, color: '#6C5CE7' },
        { id: 'sleep_early', name: '早睡', icon: '🌙', type: 'toggle', target: 1, color: '#A29BFE' },
        { id: 'skincare', name: '护肤', icon: '🧴', type: 'toggle', target: 1, color: '#B8A9E8' },
        { id: 'exercise', name: '运动', icon: '🏃', type: 'toggle', target: 1, color: '#9B8EC4' },
        { id: 'reading', name: '阅读30分钟', icon: '📖', type: 'toggle', target: 1, color: '#C4B5E3' },
        { id: 'no_cold', name: '不喝冷饮', icon: '🧊', type: 'toggle', target: 1, color: '#7B6FA8' }
      ], log: {}
    });
  }
  function habitStreak() {
    const data = habitsData(); const today = ymd(new Date());
    let streak = 0, d = new Date();
    if (!data.log[today]) d = addDays(d, -1);
    while (data.log[ymd(d)] && Object.keys(data.log[ymd(d)]).length > 0) { streak++; d = addDays(d, -1); }
    return streak;
  }
  function renderHabits() {
    const box = $('#panel'); box.innerHTML = '';
    const data = habitsData(), today = ymd(new Date()), log = data.log[today] || {};
    const done = data.habits.filter(h => h.type === 'toggle' ? log[h.id] === true : (log[h.id] || 0) >= h.target).length;
    const total = data.habits.length;
    const ph = el('div', 'page-head'); ph.innerHTML = `<div class="ph-ic">✅</div><div><h2>习惯打卡</h2><p>连续打卡，温柔坚持</p></div>`; box.appendChild(ph);

    const streak = habitStreak();
    const title = streak >= 30 ? '👑 自律女王' : streak >= 14 ? '🏆 习惯养成' : streak >= 7 ? '⭐ 一周达人' : streak >= 3 ? '🔥 坚持中' : '🌱 新手';
    const pc = el('div', 'card');
    pc.innerHTML = `<div class="card-title">✅ 今日完成</div>
      <div style="font-size:22px;font-weight:800;color:var(--primary-deep)">${done}/${total}</div>
      <div class="sc-progress" style="margin-top:8px"><i style="width:${total ? Math.round(done / total * 100) : 0}%"></i></div>
      <div class="set-note" style="margin-top:8px">🔥 连续打卡 ${streak} 天 · ${title}</div>`;
    box.appendChild(pc);

    const list = el('div', 'card'); list.appendChild(el('div', 'card-title', '📋 今日习惯'));
    data.habits.forEach(h => {
      const row = el('div', 'habit-row');
      const isDone = h.type === 'toggle' ? log[h.id] === true : (log[h.id] || 0) >= h.target;
      const ctrl = h.type === 'toggle'
        ? `<button class="habit-toggle ${isDone ? 'on' : ''}">${isDone ? '✓' : ''}</button>`
        : `<div class="habit-count"><button class="hc-minus">−</button><span class="hc-num">${log[h.id] || 0}<small>/${h.target}</small></span><button class="hc-plus">＋</button></div>`;
      row.innerHTML = `<span class="habit-ic" style="background:${h.color}22">${h.icon}</span><span class="habit-name">${C.esc(h.name)}</span>${ctrl}<button class="habit-del">✕</button>`;
      if (h.type === 'toggle') row.querySelector('.habit-toggle').onclick = () => { const d = habitsData(); d.log[today] = d.log[today] || {}; d.log[today][h.id] = !(d.log[today][h.id] === true); S.set('sunpad_habits', d); renderHabits(); };
      else {
        row.querySelector('.hc-minus').onclick = () => { const d = habitsData(); d.log[today] = d.log[today] || {}; d.log[today][h.id] = Math.max(0, (d.log[today][h.id] || 0) - 1); S.set('sunpad_habits', d); renderHabits(); };
        row.querySelector('.hc-plus').onclick = () => { const d = habitsData(); d.log[today] = d.log[today] || {}; d.log[today][h.id] = (d.log[today][h.id] || 0) + 1; S.set('sunpad_habits', d); renderHabits(); };
      }
      row.querySelector('.habit-del').onclick = () => { const d = habitsData(); d.habits = d.habits.filter(x => x.id !== h.id); S.set('sunpad_habits', d); renderHabits(); };
      list.appendChild(row);
    });
    const addBtn = el('button', 'rm-add', '＋ 新增习惯');
    addBtn.onclick = () => { const name = prompt('习惯名称：'); if (!name || !name.trim()) return; const d = habitsData(); d.habits.push({ id: 'h_' + C.uid(), name: name.trim(), icon: '🌟', type: 'toggle', target: 1, color: '#9B8EC4' }); S.set('sunpad_habits', d); renderHabits(); };
    list.appendChild(addBtn);
    box.appendChild(list);

    const hm = el('div', 'card'); hm.appendChild(el('div', 'card-title', '🔥 本月热力图'));
    const hg = el('div', 'heat-grid');
    monthGrid(new Date().getFullYear(), new Date().getMonth()).forEach((c, idx) => {
      if (!c) return;
      const cell = el('div', 'heat-cell');
      cell.style.gridColumn = (idx % 7 + 1) + '';
      cell.style.gridRow = (Math.floor(idx / 7) + 1) + '';
      const k = ymd(c), dl = data.log[k];
      let ratio = 0;
      if (dl) { const dn = data.habits.filter(h => h.type === 'toggle' ? dl[h.id] === true : (dl[h.id] || 0) >= h.target).length; ratio = data.habits.length ? dn / data.habits.length : 0; }
      cell.style.background = ratio > 0 ? `rgba(139,111,216,${0.2 + ratio * 0.8})` : 'var(--card-soft)';
      hg.appendChild(cell);
    });
    hm.appendChild(hg); box.appendChild(hm);
  }

  /* ==========================================================
      新增 P0 — 情绪日记（mood）
      ========================================================== */
  function renderMood() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head'); ph.innerHTML = `<div class="ph-ic">💗</div><div><h2>情绪日记</h2><p>每天一句话，温柔待自己</p></div>`; box.appendChild(ph);
    const today = ymd(new Date()), md = S.get('sunpad_mood', {}), rec = Object.assign({ level: 0, tags: [], note: '' }, md[today] || {});

    const card = el('div', 'card'); card.appendChild(el('div', 'card-title', '💗 今天心情如何'));
    const emo = el('div', 'seg');
    [['1', '😢 很低落'], ['2', '😟 有点烦'], ['3', '😐 一般'], ['4', '🙂 不错'], ['5', '😊 开心']].forEach(([v, l]) => {
      const b = el('button', rec.level == +v ? 'on' : '', l);
      b.onclick = () => { const d = S.get('sunpad_mood', {}); d[today] = Object.assign(d[today] || {}, { level: +v }); S.set('sunpad_mood', d); renderMood(); };
      emo.appendChild(b);
    });
    card.appendChild(emo);
    const TAGS = ['工作', '学习', '恋爱', '家庭', '健康', '社交', '独处'];
    card.appendChild(el('div', '', `<div class="set-note" style="margin:10px 0 6px">标签</div>`));
    const tagw = el('div', 'pill-row');
    TAGS.forEach(t => { const b = el('button', 'pill' + ((rec.tags || []).includes(t) ? ' on' : ''), t); b.onclick = () => { const d = S.get('sunpad_mood', {}); const r = d[today] = Object.assign({ level: 0, tags: [], note: '' }, d[today] || {}); const i = r.tags.indexOf(t); if (i >= 0) r.tags.splice(i, 1); else r.tags.push(t); S.set('sunpad_mood', d); renderMood(); }; tagw.appendChild(b); });
    card.appendChild(tagw);
    const ta = el('textarea'); ta.className = 'mood-note'; ta.placeholder = '一句话记录今天…'; ta.maxLength = 200; ta.value = rec.note || '';
    ta.oninput = () => { const d = S.get('sunpad_mood', {}); d[today] = Object.assign(d[today] || {}, { note: ta.value }); S.set('sunpad_mood', d); };
    card.appendChild(ta);
    box.appendChild(card);

    if (rec.level && rec.level <= 2) {
      const sen = C.pickOne(MOOD_SENTENCES, 'moodheal');
      const hc = el('div', 'card heal-card');
      hc.innerHTML = `<div class="card-title">🌷 给你的一句话</div><div class="heal-text">${C.esc(sen)}</div>`;
      const fav = S.get('sunpad_mood_fav', []), fb = el('button', 'btn-pill', fav.includes(sen) ? '★ 已收藏' : '☆ 收藏这句话');
      fb.onclick = () => { const f = S.get('sunpad_mood_fav', []); const i = f.indexOf(sen); if (i >= 0) f.splice(i, 1); else f.push(sen); S.set('sunpad_mood_fav', f); renderMood(); };
      hc.appendChild(fb); box.appendChild(hc);
    }

    const hm = el('div', 'card'); hm.appendChild(el('div', 'card-title', '🗓️ 心情日历'));
    const hg = el('div', 'heat-grid');
    const LV = { 1: '#F48FB1', 2: '#F8BBD0', 3: '#FFE0B2', 4: '#C5E1A5', 5: '#A5D6A7' };
    monthGrid(new Date().getFullYear(), new Date().getMonth()).forEach((c, idx) => {
      if (!c) return;
      const cell = el('div', 'heat-cell');
      cell.style.gridColumn = (idx % 7 + 1) + '';
      cell.style.gridRow = (Math.floor(idx / 7) + 1) + '';
      const k = ymd(c), r = md[k]; cell.style.background = r && r.level ? LV[r.level] : 'var(--card-soft)'; hg.appendChild(cell);
    });
    hm.appendChild(hg); box.appendChild(hm);

    const tr = el('div', 'card'); tr.appendChild(el('div', 'card-title', '📈 近30天心情'));
    const pts = []; for (let i = 29; i >= 0; i--) { const k = ymd(addDays(new Date(), -i)); const r = md[k]; pts.push(r && r.level ? r.level : 0); }
    const W = 300, H = 70, step = W / (pts.length - 1);
    const coords = pts.map((v, i) => `${Math.round(i * step)},${Math.round(H - v / 5 * (H - 10) - 5)}`).join(' ');
    tr.innerHTML += `<div class="mood-trend"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><polyline points="${coords}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/><line x1="0" y1="${H - 5}" x2="${W}" y2="${H - 5}" stroke="var(--line)"/></svg></div>`;
    box.appendChild(tr);

    const fav = S.get('sunpad_mood_fav', []);
    if (fav.length) {
      const fc = el('div', 'card'); fc.appendChild(el('div', 'card-title', '⭐ 收藏的短句'));
      fav.forEach(s => { const d = el('div', 'fav-item', C.esc(s)); const del = el('button', 'rm-del', '✕'); del.onclick = () => { const f = S.get('sunpad_mood_fav', []); S.set('sunpad_mood_fav', f.filter(x => x !== s)); renderMood(); }; d.appendChild(del); fc.appendChild(d); });
      box.appendChild(fc);
    }
  }

  /* ==========================================================
      新增 P3 — 护肤成分库（skincare）
      ========================================================== */
  function renderSkincare() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🔬</div><div><h2>护肤成分库</h2><p>${SKINCARE_DB.length} 个常见成分 · 搭配禁忌速查</p></div>`;
    box.appendChild(ph);

    const searchW = el('div', 'food-search');
    searchW.innerHTML = `<span class="fs-ic">🔍</span><input type="text" id="skSearch" class="fs-input" placeholder="搜索成分名/功效/肤质…">`;
    box.appendChild(searchW);

    const listW = el('div');
    box.appendChild(listW);

    function renderList(q) {
      q = (q || '').trim().toLowerCase();
      const items = q ? SKINCARE_DB.filter(d => [d.n, d.eff, d.skin, d.avoid, d.note].join(' ').toLowerCase().includes(q)) : SKINCARE_DB;
      listW.innerHTML = '';
      if (!items.length) { listW.appendChild(el('div', 'empty', '未找到相关成分')); return; }
      items.forEach(d => {
        const c = el('div', 'card');
        c.innerHTML = `<div class="card-title">🧪 ${C.esc(d.n)} <span class="pill gray" style="margin-left:auto">${d.pct}</span></div>
          <div style="font-size:12.5px;line-height:1.7;color:var(--text-2)">
          <b>功效：</b>${C.esc(d.eff)}<br>
          <b>适用肤质：</b>${C.esc(d.skin)}<br>
          <b>搭配禁忌：</b><span style="color:${d.avoid === '无明显禁忌' ? 'var(--ok)' : 'var(--danger)'}">${C.esc(d.avoid)}</span><br>
          <b>注意：</b>${C.esc(d.note)}</div>`;
        listW.appendChild(c);
      });
    }
    searchW.querySelector('#skSearch').oninput = e => renderList(e.target.value);
    renderList('');
  }

  /* ==========================================================
      新增 P3 — 打卡徽章体系（badge）
      ========================================================== */
  function renderBadge() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🏅</div><div><h2>成就徽章</h2><p>坚持打卡，解锁徽章</p></div>`;
    box.appendChild(ph);

    /* 计算数据 */
    const hData = habitsData(), hLog = hData.log || {};
    const hist = S.get('sunpad_recite_hist', []);
    const enHist = hist.filter(x => !x.lang || x.lang.startsWith('en'));
    const moodD = S.get('sunpad_mood', {});
    const cosD = S.get('sunpad_cosmetics', []);
    const bodyD = S.get('bodylog', []);
    const periodD = periodClusters();
    const ledgerD = S.get('ledger', []);
    const todayMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const monthSpend = ledgerD.filter(x => x.date.startsWith(todayMonth) && x.type === 'out').reduce((s, x) => s + x.amt, 0);

    /* mood streak */
    let moodStreak = 0;
    for (let i = 0; i < 365; i++) { const k = ymd(addDays(new Date(), -i)); if (moodD[k] && moodD[k].level) moodStreak++; else break; }

    const data = {
      habitStreak: habitStreak(),
      habitsData: () => hData,
      reciteTotal: hist.length,
      enAvgScore: enHist.length ? Math.round(enHist.reduce((s, x) => s + x.score, 0) / enHist.length) : 0,
      bodyLogDays: bodyD.length,
      moodStreak,
      periodCycles: periodD.length,
      cosmeticCount: cosD.length,
      monthSpend,
      foodSearches: S.get('food_search_count', 0)
    };

    /* 已获得 / 未获得 */
    const earned = [], locked = [];
    BADGE_DEFS.forEach(b => { try { if (b.check(data)) earned.push(b); else locked.push(b); } catch (e) { locked.push(b); } });

    if (earned.length) {
      const ec = el('div', 'card');
      ec.appendChild(el('div', 'card-title', `🏆 已获得 (${earned.length}/${BADGE_DEFS.length})`));
      const grid = el('div', 'stat-grid');
      earned.forEach(b => {
        const g = el('div', 'stat-card');
        g.innerHTML = `<div class="sc-num" style="font-size:28px">${b.icon}</div><div class="sc-label">${b.name}</div><div class="set-note" style="margin-top:4px">${b.desc}</div>`;
        grid.appendChild(g);
      });
      ec.appendChild(grid);
      box.appendChild(ec);
    }

    if (locked.length) {
      const lc = el('div', 'card');
      lc.appendChild(el('div', 'card-title', `🔒 待解锁 (${locked.length})`));
      const grid = el('div', 'stat-grid');
      locked.forEach(b => {
        const g = el('div', 'stat-card');
        g.style.opacity = '0.5';
        g.innerHTML = `<div class="sc-num" style="font-size:28px;filter:grayscale(1)">${b.icon}</div><div class="sc-label">${b.name}</div><div class="set-note" style="margin-top:4px">${b.desc}</div>`;
        grid.appendChild(g);
      });
      lc.appendChild(grid);
      box.appendChild(lc);
    }

    box.appendChild(el('div', 'notice', `共 ${BADGE_DEFS.length} 枚徽章，已获得 <b>${earned.length}</b> 枚。坚持打卡，解锁更多成就！`));
  }

  /* ==========================================================
      新增 P2 — 数据总览 Dashboard
      ========================================================== */
  function renderDashboard() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">📈</div><div><h2>数据总览</h2><p>一张页面看完全月数据</p></div>`;
    box.appendChild(ph);

    const today = new Date(), todayStr = ymd(today);
    const month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

    /* 顶部四卡 */
    const habitsD = habitsData(), habitLog = habitsD.log || {};
    const fitDays = S.get('bodylog', []).filter(x => x.date.startsWith(month)).length;
    const studyDays = new Set((S.get('sunpad_recite_hist', [])).filter(x => x.date.startsWith(month)).map(x => x.date)).size;
    const habitDoneDays = Object.keys(habitLog).filter(d => d.startsWith(month) && Object.keys(habitLog[d]).length > 0).length;
    const monthLedger = S.get('ledger', []).filter(x => x.date.startsWith(month));
    const monthSpend = monthLedger.filter(x => x.type === 'out').reduce((s, x) => s + x.amt, 0);
    const moodData = S.get('sunpad_mood', {});
    const moodDays = Object.keys(moodData).filter(d => d.startsWith(month) && moodData[d] && moodData[d].level).length;

    const top = el('div', 'card');
    top.innerHTML = `<div class="card-title">📊 ${month} 月报</div>
      <div class="stat-grid">
        <div class="stat-card"><div class="sc-num">${fitDays}</div><div class="sc-label">记录体重</div></div>
        <div class="stat-card"><div class="sc-num">${studyDays}</div><div class="sc-label">学习天数</div></div>
        <div class="stat-card"><div class="sc-num">${habitDoneDays}</div><div class="sc-label">打卡天数</div></div>
        <div class="stat-card"><div class="sc-num">${C.fmtMoney(monthSpend)}</div><div class="sc-label">本月消费</div></div>
      </div>`;
    box.appendChild(top);

    /* 经期状态 */
    const pred = predictPeriod();
    const periodCard = el('div', 'card');
    const active = isPeriodActive();
    periodCard.innerHTML = `<div class="card-title">🌸 经期状态</div>
      <div style="font-size:15px;font-weight:800;color:var(--primary-deep)">${active ? '经期进行中 · 注意休息' : (pred.daysUntil != null ? `距下次经期 ${Math.max(0, pred.daysUntil)} 天` : '未设置')}</div>
      ${pred.next ? `<div class="set-note" style="margin-top:4px">预计 ${pred.next}${pred.confidence ? '' : '（参考）'}</div>` : ''}`;
    box.appendChild(periodCard);

    /* 心情热力图（本月） */
    const hm = el('div', 'card');
    hm.appendChild(el('div', 'card-title', '💗 心情日历'));
    const hg = el('div', 'heat-grid');
    const LV = { 1: '#F48FB1', 2: '#F8BBD0', 3: '#FFE0B2', 4: '#C5E1A5', 5: '#A5D6A7' };
    monthGrid(today.getFullYear(), today.getMonth()).forEach((c, idx) => {
      if (!c) return;
      const cell = el('div', 'heat-cell');
      cell.style.gridColumn = (idx % 7 + 1) + '';
      cell.style.gridRow = (Math.floor(idx / 7) + 1) + '';
      const k = ymd(c), r = moodData[k];
      cell.style.background = r && r.level ? LV[r.level] : 'var(--card-soft)';
      hg.appendChild(cell);
    });
    hm.appendChild(hg);
    box.appendChild(hm);

    /* 心情趋势折线 */
    const moods = [];
    for (let i = 29; i >= 0; i--) { const k = ymd(addDays(today, -i)); const r = moodData[k]; moods.push(r && r.level ? r.level : 0); }
    if (moods.some(v => v > 0)) {
      const tr = el('div', 'card');
      tr.appendChild(el('div', 'card-title', '📈 近30天心情'));
      const W = 300, H = 70, step = W / (moods.length - 1);
      const coords = moods.map((v, i) => `${Math.round(i * step)},${Math.round(H - v / 5 * (H - 10) - 5)}`).join(' ');
      tr.innerHTML += `<div class="mood-trend"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><polyline points="${coords}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/><line x1="0" y1="${H - 5}" x2="${W}" y2="${H - 5}" stroke="var(--line)"/></svg></div>`;
      box.appendChild(tr);
    }

    /* 消费饼图 */
    const outRows = monthLedger.filter(x => x.type === 'out');
    if (outRows.length) {
      const catSum = {};
      outRows.forEach(x => { catSum[x.cat] = (catSum[x.cat] || 0) + x.amt; });
      const catArr = Object.entries(catSum).sort((a, b) => b[1] - a[1]);
      const total = catArr.reduce((s, x) => s + x[1], 0);
      const R = 54, CX = 70, CY = 70;
      let cum = 0;
      const slices = catArr.map(([k, v]) => {
        const pct = v / total, start = cum * 2 * Math.PI - Math.PI / 2; cum += pct;
        const end = cum * 2 * Math.PI - Math.PI / 2;
        const large = pct > 0.5 ? 1 : 0;
        const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
        const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end);
        return `<path d="M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z" fill="${catColor(k)}" stroke="var(--card)" stroke-width="2"/>`;
      });
      const legend = catArr.map(([k, v]) => `<span class="cat-dot"><span style="background:${catColor(k)}"></span>${CATS[k] ? CATS[k].i + CATS[k].n : k} ${Math.round(v / total * 100)}%</span>`).join('');
      box.appendChild(card('消费分类占比', '🍩', `<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><svg width="140" height="140" viewBox="0 0 140 140">${slices.join('')}</svg><div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11px">${legend}</div></div>`));
    }

    /* 习惯完成率热力图 */
    const hhm = el('div', 'card');
    hhm.appendChild(el('div', 'card-title', '✅ 习惯打卡'));
    const hhg = el('div', 'heat-grid');
    monthGrid(today.getFullYear(), today.getMonth()).forEach((c, idx) => {
      if (!c) return;
      const cell = el('div', 'heat-cell');
      cell.style.gridColumn = (idx % 7 + 1) + '';
      cell.style.gridRow = (Math.floor(idx / 7) + 1) + '';
      const k = ymd(c), dl = habitLog[k];
      let ratio = 0;
      if (dl) { const dn = habitsD.habits.filter(h => h.type === 'toggle' ? dl[h.id] === true : (dl[h.id] || 0) >= h.target).length; ratio = habitsD.habits.length ? dn / habitsD.habits.length : 0; }
      cell.style.background = ratio > 0 ? `rgba(139,111,216,${0.2 + ratio * 0.8})` : 'var(--card-soft)';
      hhg.appendChild(cell);
    });
    hhm.appendChild(hhg);
    box.appendChild(hhm);
  }

  /* ==========================================================
      新增 — 关于（about）
      ========================================================== */
  function renderAbout() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head'); ph.innerHTML = `<div class="ph-ic">ℹ️</div><div><h2>关于</h2></div>`; box.appendChild(ph);
    const card = el('div', 'card');
    card.innerHTML = `<div class="hero-card" style="border-radius:var(--r);margin-bottom:12px"><div><div style="font-size:20px;font-weight:800">小王的工作台</div><div style="opacity:.85;margin-top:4px">sunpad · v21</div></div></div>
      <div class="set-about">
        你的个人专属工作台 · 纯前端 PWA<br>
        涵盖 健身 / 舞蹈 / 创作 / 妆容 / 英语 / 粤语 / 阅读 / 数据 / 记账 / 提醒 / 菜谱 / 新闻 / 天气 / 经期 / 习惯 / 心情<br><br>
        所有数据仅存于本机（localStorage），不上传任何服务器。<br>
        换机或清缓存前，请到「设置 → 备份」导出数据。
      </div>`;
    box.appendChild(card);
  }

  /* ==========================================================
      新增 P1 — 美妆保质期台账（cosmetics）
      ========================================================== */
  function cosData() { return S.get('sunpad_cosmetics', []); }
  function renderCosmetics() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🧴</div><div><h2>美妆保质期</h2><p>开封记录 · 临期提醒</p></div>`;
    box.appendChild(ph);

    const data = cosData();
    const today = new Date();

    /* 临期提醒卡（7天内过期） */
    const soon = data.filter(d => {
      const opened = new Date(d.opened);
      const exp = new Date(opened); exp.setMonth(exp.getMonth() + (d.shelf || 12));
      return (exp - today) / 86400000 <= 7 && (exp - today) / 86400000 >= 0;
    });
    if (soon.length) {
      const warn = el('div', 'card');
      warn.innerHTML = `<div class="card-title">⚠️ 临期提醒</div><div class="set-note">${soon.map(s => `🧴 <b>${C.esc(s.name)}</b> 将在 ${Math.ceil((new Date(new Date(s.opened).setMonth(new Date(s.opened).getMonth() + (s.shelf||12))) - today) / 86400000)} 天后过期`).join('<br>')}</div>`;
      box.appendChild(warn);
    }

    /* 添加表单 */
    const add = el('div', 'card');
    add.innerHTML = `<div class="card-title">＋ 添加产品</div>
      <div class="rf-field"><label>产品名称</label><input id="cName" placeholder="如：兰蔻小黑瓶"></div>
      <div class="rf-field"><label>品牌</label><input id="cBrand" placeholder="如：兰蔻"></div>
      <div class="rf-field"><label>开封日期</label><input id="cOpened" type="date" value="${ymd(today)}"></div>
      <div class="rf-field"><label>保质期（月）</label><input id="cShelf" type="number" value="12" min="1" max="60"></div>
      <div class="rf-field"><label>分类</label><select id="cCat"><option value="护肤">护肤</option><option value="彩妆">彩妆</option><option value="香水">香水</option></select></div>
      <button class="rm-add" id="cSave" style="margin-top:8px">保存</button>`;
    box.appendChild(add);
    add.querySelector('#cSave').onclick = () => {
      const name = $('#cName').value.trim();
      if (!name) return C.Toast('请输入产品名称');
      const d = cosData();
      d.push({ name, brand: $('#cBrand').value.trim(), opened: $('#cOpened').value, shelf: parseInt($('#cShelf').value, 10) || 12, cat: $('#cCat').value });
      S.set('sunpad_cosmetics', d); C.Toast('已保存 ✓'); renderCosmetics();
    };

    /* 列表（按临期时间排序） */
    const sorted = data.slice().sort((a, b) => {
      const ea = new Date(a.opened); ea.setMonth(ea.getMonth() + (a.shelf || 12));
      const eb = new Date(b.opened); eb.setMonth(eb.getMonth() + (b.shelf || 12));
      return ea - eb;
    });
    if (sorted.length) {
      const list = el('div', 'card');
      list.appendChild(el('div', 'card-title', '📋 产品清单'));
      sorted.forEach((d, idx) => {
        const opened = new Date(d.opened);
        const exp = new Date(opened); exp.setMonth(exp.getMonth() + (d.shelf || 12));
        const daysLeft = Math.ceil((exp - today) / 86400000);
        const pct = Math.max(0, Math.min(100, Math.round(((today - opened) / 86400000) / ((exp - opened) / 86400000) * 100)));
        const catIco = { '护肤': '🧴', '彩妆': '💄', '香水': '🌸' }[d.cat] || '📦';
        const row = el('div', 'habit-row');
        const color = daysLeft <= 7 ? 'var(--danger)' : daysLeft <= 30 ? 'var(--warn)' : 'var(--primary)';
        row.innerHTML = `<span class="habit-ic" style="background:${color}22">${catIco}</span>
          <div style="flex:1"><div class="habit-name">${C.esc(d.name)}${d.brand ? ' · ' + C.esc(d.brand) : ''}</div>
          <div class="sc-progress" style="margin-top:4px"><i style="width:${pct}%;background:${color}"></i></div>
          <div class="set-note" style="margin-top:3px">开封 ${d.opened} · ${daysLeft > 0 ? '剩余 ' + daysLeft + ' 天' : '已过期 ' + Math.abs(daysLeft) + ' 天'} · ${d.cat}</div></div>
          <button class="habit-del">✕</button>`;
        row.querySelector('.habit-del').onclick = () => { const arr = cosData(); arr.splice(arr.findIndex(x => x.name === d.name && x.opened === d.opened), 1); S.set('sunpad_cosmetics', arr); renderCosmetics(); };
        list.appendChild(row);
      });
      box.appendChild(list);
    } else {
      box.appendChild(el('div', 'empty', '还没有产品记录，添加你的第一个美妆品吧～'));
    }
  }

  /* ==========================================================
      增强 — 学习数据面板（学习进度可视化）
      ========================================================== */
  function renderStudyPanel() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">📊</div><div><h2>学习数据</h2><p>跟读记录 · 学习进度</p></div>`;
    box.appendChild(ph);

    const hist = S.get('sunpad_recite_hist', []);
    const fav = S.get('sunpad_recite_fav', []);
    const total = hist.length;
    const avgScore = total ? Math.round(hist.reduce((s, x) => s + x.score, 0) / total) : 0;
    const bestScore = total ? Math.max(...hist.map(x => x.score)) : 0;
    const days = new Set(hist.map(x => x.date)).size;
    const enHist = hist.filter(x => !x.lang || x.lang.startsWith('en'));
    const yueHist = hist.filter(x => x.lang && x.lang.startsWith('zh'));

    const stat = el('div', 'card');
    stat.innerHTML = `<div class="card-title">📊 学习统计</div>
      <div class="stat-grid">
        <div class="stat-card"><div class="sc-num">${total}</div><div class="sc-label">总跟读次数</div></div>
        <div class="stat-card"><div class="sc-num">${avgScore}</div><div class="sc-label">平均分</div></div>
        <div class="stat-card"><div class="sc-num">${bestScore}</div><div class="sc-label">最佳分</div></div>
        <div class="stat-card"><div class="sc-num">${days}</div><div class="sc-label">学习天数</div></div>
      </div>`;
    box.appendChild(stat);

    /* 英语/粤语分项 */
    const sub = el('div', 'card');
    sub.innerHTML = `<div class="card-title">🗣️ 分项统计</div>
      <div style="display:flex;gap:12px">
        <div style="flex:1;background:var(--primary-softer);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--primary-deep)">${enHist.length}</div><div class="set-note">英语跟读</div>
          <div style="font-size:14px;font-weight:700;margin-top:4px">平均 ${enHist.length ? Math.round(enHist.reduce((s, x) => s + x.score, 0) / enHist.length) : 0} 分</div></div>
        <div style="flex:1;background:var(--primary-softer);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--primary-deep)">${yueHist.length}</div><div class="set-note">粤语跟读</div>
          <div style="font-size:14px;font-weight:700;margin-top:4px">平均 ${yueHist.length ? Math.round(yueHist.reduce((s, x) => s + x.score, 0) / yueHist.length) : 0} 分</div></div>
      </div>`;
    box.appendChild(sub);

    /* 近30天跟读趋势 */
    if (hist.length) {
      const tr = el('div', 'card');
      tr.appendChild(el('div', 'card-title', '📈 近30天跟读次数'));
      const daily = {};
      for (let i = 29; i >= 0; i--) { const k = ymd(addDays(new Date(), -i)); daily[k] = 0; }
      hist.forEach(h => { if (daily[h.date] !== undefined) daily[h.date]++; });
      const vals = Object.values(daily);
      const max = Math.max(...vals, 1);
      const W = 300, H = 70, step = W / (vals.length - 1);
      const coords = vals.map((v, i) => `${Math.round(i * step)},${Math.round(H - v / max * (H - 10) - 5)}`).join(' ');
      tr.innerHTML += `<div class="mood-trend"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><polyline points="${coords}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/><line x1="0" y1="${H - 5}" x2="${W}" y2="${H - 5}" stroke="var(--line)"/></svg></div>`;
      box.appendChild(tr);
    }

    /* 收藏口语本 */
    if (fav.length) {
      const fc = el('div', 'card');
      fc.appendChild(el('div', 'card-title', `⭐ 收藏口语本 (${fav.length})`));
      fav.forEach(f => {
        const row = el('div', 'suggest-item');
        row.innerHTML = `<span class="sg-tx" style="flex:1"><b>${C.esc(f.label)}</b>${f.sub ? '<br><span style="font-size:11px;color:var(--text-3)">' + C.esc(f.sub) + '</span>' : ''}</span><button class="habit-del">✕</button>`;
        row.querySelector('.habit-del').onclick = () => { const arr = S.get('sunpad_recite_fav', []); S.set('sunpad_recite_fav', arr.filter(x => x.target !== f.target)); renderStudyPanel(); };
        fc.appendChild(row);
      });
      box.appendChild(fc);
    }

    /* 最近跟读记录 */
    if (hist.length) {
      const rc = el('div', 'card');
      rc.appendChild(el('div', 'card-title', '📝 最近跟读'));
      hist.slice(-10).reverse().forEach(h => {
        const row = el('div', 'habit-row');
        row.innerHTML = `<span class="habit-ic" style="background:${h.score >= 80 ? 'var(--ok)' : h.score >= 50 ? 'var(--warn)' : 'var(--danger)'}22">${h.score >= 80 ? '🏆' : h.score >= 50 ? '💪' : '📌'}</span>
          <div style="flex:1"><div class="habit-name">${C.esc(h.target)}</div><div class="set-note">${h.date} · ${h.lang || 'en'}</div></div>
          <div style="font-size:16px;font-weight:800;color:${h.score >= 80 ? 'var(--ok)' : h.score >= 50 ? 'var(--warn)' : 'var(--danger)'}">${h.score}分</div>`;
        rc.appendChild(row);
      });
      box.appendChild(rc);
    }
  }

  /* 今日三件事（首页智能决策器，经期期间追加暖宫建议） */
  function suggestToday() {
    let pool = SUGGEST_POOL.slice();
    if (isPeriodActive()) pool = pool.concat([{ page: 'food', text: '来碗红糖姜茶', icon: '🍵' }, { page: 'fitness', text: '做组经期舒缓拉伸', icon: '🧘' }]);
    const seed = C.todayStr(); let arr = pool.slice(), h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    for (let i = arr.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.slice(0, 3);
  }

  const RENDER = {
    home: renderHome, fitness: renderFitness, dance: renderDance, create: renderCreate,
    glam: renderGlam, english: renderEnglish, cantonese: renderCantonese, reading: renderReading,
    learn: renderLearn, ledger: renderLedger, remind: renderRemind, food: renderFood,
    news: renderNews, weather: renderWeather,     menstrual: renderMenstrual,
    habits: renderHabits, mood: renderMood, cosmetics: renderCosmetics, dashboard: renderDashboard, skincare: renderSkincare, badge: renderBadge, about: renderAbout
  };

  /* ==========================================================
      新增一、天气（Open-Meteo 真实数据，默认中山，可改城市）
     ========================================================== */
  const WCODE = {
    0: { ico: '☀️', label: '晴' }, 1: { ico: '🌤️', label: '大致晴朗' }, 2: { ico: '⛅', label: '局部多云' },
    3: { ico: '☁️', label: '阴' }, 45: { ico: '🌫️', label: '雾' }, 48: { ico: '🌫️', label: '雾凇' },
    51: { ico: '🌦️', label: '小毛毛雨' }, 53: { ico: '🌦️', label: '毛毛雨' }, 55: { ico: '🌧️', label: '大毛毛雨' },
    56: { ico: '🌧️', label: '冻毛毛雨' }, 57: { ico: '🌧️', label: '冻毛毛雨' },
    61: { ico: '🌧️', label: '小雨' }, 63: { ico: '🌧️', label: '中雨' }, 65: { ico: '🌧️', label: '大雨' },
    66: { ico: '🌧️', label: '冻雨' }, 67: { ico: '🌧️', label: '冻雨' },
    71: { ico: '🌨️', label: '小雪' }, 73: { ico: '🌨️', label: '中雪' }, 75: { ico: '❄️', label: '大雪' }, 77: { ico: '🌨️', label: '雪粒' },
    80: { ico: '🌦️', label: '阵雨' }, 81: { ico: '🌦️', label: '强阵雨' }, 82: { ico: '⛈️', label: '暴雨' },
    85: { ico: '🌨️', label: '阵雪' }, 86: { ico: '🌨️', label: '强阵雪' },
    95: { ico: '⛈️', label: '雷暴' }, 96: { ico: '⛈️', label: '雷暴伴冰雹' }, 99: { ico: '⛈️', label: '强雷暴伴冰雹' }
  };
  function weatherTip(temp, code) {
    if (code >= 95) return '有雷暴，出门带伞并注意防雷，尽量待在室内。';
    if (code >= 71) return '有降雪，注意保暖防滑，路面可能结冰。';
    if (code >= 61 || code === 80) return '有雨，记得带伞，淋湿易着凉。';
    if (code >= 45) return '有雾，视线不佳，驾车请减速慢行。';
    if (temp >= 33) return '高温炎热，穿轻薄透气衣物，及时补水防晒。';
    if (temp >= 28) return '较热，短袖为主，午间注意遮阳。';
    if (temp >= 22) return '舒适宜人，薄长袖或短袖都合适。';
    if (temp >= 15) return '微凉，建议备一件薄外套或长袖。';
    if (temp >= 8) return '偏冷，加件外套更稳妥。';
    return '寒冷，注意羽绒服 / 厚外套保暖。';
  }
  function renderWeatherData(main, city, d) {
    const cur = d.current;
    const ci = WCODE[cur.weather_code] || { ico: '🌡️', label: '未知' };
    const dy = d.daily;
    const wd = ['日', '一', '二', '三', '四', '五', '六'];
    let html = `
      <div class="w-now">
        <div class="w-now-left">
          <div class="w-temp">${Math.round(cur.temperature_2m)}°</div>
          <div class="w-cond">${ci.ico} ${ci.label}</div>
          <div class="w-city">📍 ${C.esc(city.name)}${city.admin1 ? ' · ' + C.esc(city.admin1) : ''}</div>
        </div>
        <div class="w-now-right">
          <div class="w-row">体感 <b>${Math.round(cur.apparent_temperature)}°</b></div>
          <div class="w-row">湿度 <b>${cur.relative_humidity_2m}%</b></div>
          <div class="w-row">风速 <b>${Math.round(cur.wind_speed_10m)} km/h</b></div>
        </div>
      </div>
      <div class="w-tip">👕 ${weatherTip(cur.temperature_2m, cur.weather_code)}</div>
      <div class="w-7title">未来 7 天</div>
      <div class="w-7">`;
    for (let i = 0; i < 7; i++) {
      const dc = WCODE[dy.weather_code[i]] || { ico: '🌡️', label: '未知' };
      const dt = new Date(dy.time[i]);
      const label = i === 0 ? '今天' : (i === 1 ? '明天' : '周' + wd[dt.getDay()]);
      html += `<div class="w-d">
        <div class="w-d-d">${label}</div>
        <div class="w-d-ico">${dc.ico}</div>
        <div class="w-d-t">${Math.round(dy.temperature_2m_min[i])}°/${Math.round(dy.temperature_2m_max[i])}°</div>
      </div>`;
    }
    html += `</div>`;
    main.innerHTML = html;
  }
  function renderWeather() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🌤️</div><div><h2>今日天气</h2><p>Open-Meteo 实时数据 · 可切换城市</p></div>`;
    box.appendChild(ph);

    const city = S.get('weatherCity', { name: '中山', lat: 22.517, lon: 113.393, admin1: '广东省' });
    const bar = el('div', 'w-search');
    bar.innerHTML = `
      <input type="text" id="wCityInput" class="w-input" placeholder="切换城市，如：北京 / 广州 / 上海" value="${C.esc(city.name)}">
      <button class="w-go" id="wGo">🔍 切换</button>`;
    box.appendChild(bar);
    const status = el('div', 'w-status', city.name + (city.admin1 ? ' · ' + city.admin1 : ''));
    box.appendChild(status);
    const main = el('div', 'w-main', `<div class="skeleton-card"></div><div class="skeleton-card short"></div><div class="skeleton-card line"></div>`);
    box.appendChild(main);

    async function load(c) {
      main.innerHTML = `<div class="w-loading">⏳ 正在获取天气…</div>`;
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}`
          + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
          + `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=7`;
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error('net');
        const d = await res.json();
        renderWeatherData(main, c, d);
        S.set('weather_data', { temp: d.current.temperature_2m, code: d.current.weather_code, apparent: d.current.apparent_temperature });
      } catch (e) {
        main.innerHTML = `<div class="notice warn">⚠️ 天气获取失败（网络或接口受限）。请检查网络后重试。</div>`;
      }
    }
    bar.querySelector('#wGo').onclick = async () => {
      const name = bar.querySelector('#wCityInput').value.trim();
      if (!name) return;
      status.className = 'w-status';
      status.textContent = '正在定位「' + name + '」…';
      try {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`, { mode: 'cors' });
        const gd = await g.json();
        if (!gd.results || !gd.results.length) {
          status.className = 'w-status warn';
          status.textContent = '未找到「' + name + '」，换个写法试试（如：广州市）';
          return;
        }
        const r = gd.results[0];
        const nc = { name: r.name, lat: r.latitude, lon: r.longitude, admin1: r.admin1 || r.country || '' };
        S.set('weatherCity', nc);
        status.className = 'w-status';
        status.textContent = '已切换到 ' + nc.name + (nc.admin1 ? ' · ' + nc.admin1 : '');
        load(nc);
      } catch (e) {
        status.className = 'w-status warn';
        status.textContent = '定位失败，请检查网络';
      }
    };
    bar.querySelector('#wCityInput').addEventListener('keypress', e => { if (e.key === 'Enter') bar.querySelector('#wGo').click(); });
    load(city);
  }

  /* ==========================================================
      新增二、妆容穿搭（每日轮换，视频卡片跳抖音）
     ========================================================== */
  function renderGlam() {
    const box = $('#panel');
    box.innerHTML = '';
    const banner = el('div', 'glam-banner');
    banner.innerHTML = `
      <div class="gb-badge">每日 9:00 更新</div>
      <div class="gb-title">💄 妆容 · 穿搭</div>
      <div class="gb-sub">方圆脸 & 小个子专属灵感</div>`;
    box.appendChild(banner);

    /* 天气联动穿搭贴士 */
    const wd = S.get('weather_data', null);
    if (wd) {
      const t = wd.apparent || wd.temp, code = wd.code || 0;
      let tip = '';
      if (code >= 61 || code >= 80) tip = '今日有雨，建议带帽防水外套，妆容防晕染';
      else if (t >= 30) tip = '今日炎热，建议穿搭透气面料 + 妆容重点定妆散粉';
      else if (t <= 15) tip = '今日微凉，内搭亮色高领 + 外套防风更佳';
      else if (t >= 22 && (code === 0 || code <= 2)) tip = '紫外线较强，记得防晒补涂，穿搭浅色更清爽';
      if (tip) box.appendChild(el('div', 'notice', `🌤️ ${tip}`));
    }

    const tabs = ['妆容', '穿搭'];
    let sub = S.get('glamTab', '妆容');
    if (!tabs.includes(sub)) sub = '妆容';
    const tabWrap = el('div', 'tabs');
    tabs.forEach(t => {
      const b = el('button', 'tab' + (t === sub ? ' active' : ''), t);
      b.onclick = () => { S.set('glamTab', t); renderGlam(); $('#panel').scrollTop = 0; };
      tabWrap.appendChild(b);
    });
    box.appendChild(tabWrap);

    const pool = sub === '妆容' ? GLAM_MAKEUP : GLAM_OUTFIT;
    const picks = C.pickDaily(pool, 6, 'glam:' + sub);
    const grid = el('div', 'glam-grid');
    picks.forEach(x => {
      const hue = (x.t.length * 37) % 360;
      const card = el('div', 'glam-card');
      card.innerHTML = `
        <div class="gc-cover" style="background:linear-gradient(135deg,hsl(${hue},70%,74%),hsl(${(hue + 45) % 360},62%,58%))">
          <span class="gc-tag">${C.esc(x.tag)}</span>
          <span class="gc-play">▶</span>
          <span class="gc-plat">抖音</span>
        </div>
        <div class="gc-body">
          <div class="gc-t">${C.esc(x.t)}</div>
          <div class="gc-d">${C.esc(x.d)}</div>
        </div>`;
      card.onclick = () => C.openDouyin(x.kw);
      grid.appendChild(card);
    });
    box.appendChild(grid);
    box.appendChild(el('div', 'notice',
      `每天自动轮换 <b>6 条</b>${sub}灵感（库共 ${pool.length} 条），点击卡片直达抖音看视频教程。`));

    /* 穿搭打卡日记 */
    const diary = S.get('outfit_diary', {});
    const todayD = diary[ymd(new Date())] || '';
    const dCard = el('div', 'card');
    dCard.appendChild(el('div', 'card-title', '👗 今日穿搭'));
    const ta = el('textarea');
    ta.className = 'mood-note'; ta.placeholder = '记录今天的穿搭…如：白色T恤+牛仔裤+帆布鞋'; ta.maxLength = 200; ta.value = todayD;
    ta.oninput = () => { const d = S.get('outfit_diary', {}); d[ymd(new Date())] = ta.value; S.set('outfit_diary', d); };
    dCard.appendChild(ta);
    /* 本月穿搭日历 */
    const monthD = el('div', 'card');
    monthD.appendChild(el('div', 'card-title', '📅 本月穿搭日历'));
    const hg = el('div', 'heat-grid');
    monthGrid(new Date().getFullYear(), new Date().getMonth()).forEach((c, idx) => {
      if (!c) return;
      const cell = el('div', 'heat-cell');
      cell.style.gridColumn = (idx % 7 + 1) + '';
      cell.style.gridRow = (Math.floor(idx / 7) + 1) + '';
      const k = ymd(c), val = diary[k];
      cell.style.background = val ? 'var(--primary)' : 'var(--card-soft)';
      cell.title = val || '';
      hg.appendChild(cell);
    });
    monthD.appendChild(hg);
    box.appendChild(dCard);
    box.appendChild(monthD);
  }

  /* ==========================================================
      新增三、新闻（每日 10 条轮换）
     ========================================================== */
  function renderNews() {
    const box = $('#panel');
    box.innerHTML = '';
    const banner = el('div', 'news-banner');
    banner.innerHTML = `
      <div class="nb-badge">每日 9:00 更新 · 至少10条</div>
      <div class="nb-title">📰 今日新闻</div>
      <div class="nb-sub" id="newsSub">${C.todayStr()} · 加载中…</div>`;
    box.appendChild(banner);

    const list = el('div', 'news-list');
    box.appendChild(list);
    const skel = el('div');
    for (let i = 0; i < 6; i++) skel.appendChild(el('div', 'skeleton-card'));
    box.appendChild(skel);
    const loading = skel;

    function renderList(items, isLive) {
      loading.style.display = 'none';
      list.innerHTML = '';
      const sub = $('#newsSub');
      if (sub) sub.textContent = C.todayStr() + (isLive ? ' · 实时要闻' : ' · 精选要闻');
      items.forEach((x, i) => {
        const row = el('div', 'news-item');
        const meta = isLive
          ? `${C.esc(x.src)} · ${C.esc(x.time || '')}`.trim()
          : (() => {
              const hh = 9 + (i * 13) % 12, mm = (i * 7) % 60;
              return `${C.esc(x.cat)} ${C.esc(x.src)} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            })();
        row.innerHTML = `
          <div class="ni-no">${i + 1}</div>
          <div class="ni-main">
            <div class="ni-t">${C.esc(x.t)}</div>
            <div class="ni-meta">${meta}</div>
          </div>
          <div class="ni-arrow">›</div>`;
        row.onclick = () => {
          const url = isLive && x.link ? x.link : 'https://www.baidu.com/s?wd=' + encodeURIComponent(x.t);
          try { window.open(url, '_blank', 'noopener'); } catch (e) { location.href = url; }
        };
        list.appendChild(row);
      });
    }

    const cache = S.get('liveNewsCache', null);
    if (cache && cache.ts && (Date.now() - cache.ts < 30 * 60 * 1000) && cache.list && cache.list.length) {
      renderList(cache.list, true);
      return;
    }
    /* 总超时保底：10 秒内 loadLiveNews 未返回则直接用本地数据 */
    const fallback = () => renderList(C.pickDaily(window.NEWS_POOL || [], 10, 'news'), false);
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; fallback(); } }, 10000);
    loadLiveNews().then(live => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (live.length >= 10) {
        S.set('liveNewsCache', { ts: Date.now(), list: live });
        renderList(live, true);
      } else {
        fallback();
      }
    }).catch(() => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      fallback();
    });
  }

  /* 经公开代理(allorigins)拉取中文 RSS 实时新闻；合并多源、按时间排序。
     注意：免费代理对中文源稳定性有限（多数源会 500/空），因此：
     ① 多源候选、任一可用即合并；② 实时不足 10 条则回退本地 NEWS_POOL，保证不白屏。
     若要彻底稳定，需「真后端」自建代理（见后续扩展）。 */
  async function loadLiveNews() {
    const feeds = [
      { name: '36氪', url: 'https://36kr.com/feed' },
      { name: 'cnBeta', url: 'https://www.cnbeta.com/backend.php' },
      { name: '少数派', url: 'https://sspai.com/feed' },
      { name: '人民网', url: 'http://www.people.com.cn/rss/politics.xml' }
    ];
    const proxy = u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u);
    const out = [];
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    await Promise.all(feeds.map(f => (async () => {
      try {
        const res = await fetch(proxy(f.url), { signal: ctrl.signal, cache: 'no-store' });
        if (!res.ok) return;
        const txt = await res.text();
        const doc = new DOMParser().parseFromString(txt, 'text/xml');
        doc.querySelectorAll('item, entry').forEach(it => {
          const title = (it.querySelector('title')?.textContent || '').trim();
          if (!title) return;
          const linkEl = it.querySelector('link');
          const link = (linkEl?.textContent || linkEl?.getAttribute('href') || '').trim();
          const dEl = it.querySelector('pubDate, published, updated');
          const raw = dEl?.textContent?.trim() || '';
          out.push({ t: title, src: f.name, link, time: fmtNewsTime(raw), ts: Date.parse(raw) || 0 });
        });
      } catch (e) { /* 忽略单源失败，继续合并其他源 */ }
    })()));
    clearTimeout(to);
    out.sort((a, b) => b.ts - a.ts);
    return out.slice(0, 22);
  }

  function fmtNewsTime(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /* ==========================================================
      新增四、英语跟读打分（Web Speech 语音识别）
     ========================================================== */
  /* 全局单例 SpeechRecognition。iOS Safari 连续 new SR() 会导致第二句后无法收音，
     因此整个页面只创建一个实例，每次录音只更新 callbacks 与 lang，复用同一麦克风通道。 */
  let _sr = null, _srCb = null, _srFinalized = '';
  function startRecognition(lang, onResult, onInterim, onError) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError && onError('norec'); return null; }
    if (!_sr) {
      _sr = new SR();
      _sr.interimResults = true;
      _sr.maxAlternatives = 1;
      _sr.continuous = true;
      _sr.onresult = e => {
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const seg = e.results[i][0].transcript;
          if (e.results[i].isFinal) _srFinalized += seg;
          else interim += seg;
        }
        if (_srCb && _srCb.onInterim) _srCb.onInterim((_srFinalized + interim).trim());
      };
      _sr.onerror = e => {
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        if (_srCb && _srCb.onError) _srCb.onError(e.error || 'err');
      };
      _sr.onend = () => {
        if (_srCb && _srCb.onResult) _srCb.onResult(_srFinalized.trim());
      };
    }
    // 若实例仍在 running，先安全停止再 start（理论上不会，但防并发）
    try {
      _sr.stop();
    } catch (e) {}
    _sr.lang = lang;
    _srCb = { onResult, onInterim, onError };
    _srFinalized = '';
    // iOS 上 stop->start 需要极短延迟让音频会话释放
    setTimeout(() => {
      try { _sr.start(); } catch (e) { if (onError) onError('err'); }
    }, 80);
    return _sr;
  }
  function stopRecognition() {
    if (_sr) try { _sr.stop(); } catch (e) {}
  }
  function gradeRead(target, heard, lang) {
    const isZh = (lang || '').toLowerCase().startsWith('zh');
    const norm = s => (s || '').toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, isZh ? '' : ' ')
      .replace(/\s+/g, isZh ? '' : ' ').trim();
    const tU = isZh ? norm(target).split('') : norm(target).split(' ').filter(Boolean);
    const hU = isZh ? norm(heard).split('') : norm(heard).split(' ').filter(Boolean);
    const hSet = new Set(hU);
    const missed = [];
    let hit = 0;
    tU.forEach(u => { if (hSet.has(u)) hit++; else missed.push(u); });
    const tSet = new Set(tU);
    const extra = hU.filter(u => !tSet.has(u));
    const score = tU.length ? Math.round((hit / tU.length) * 100) : 0;
    return { score, hit, total: tU.length, missed, extra };
  }
  function scoreComment(s) {
    if (s >= 90) return '🏆 非常标准，继续保持！';
    if (s >= 80) return '👍 读得不错，再稳一点就完美';
    if (s >= 60) return '💪 有进步空间，注意标红的词多练几遍';
    if (s >= 40) return '📌 听起来有点赶哦，试试慢一点，每个词都读饱满~';
    return '🔁 别灰心，先听原声再跟读，慢慢来比较快~';
  }
  function followCard(o) {
    const c = el('div', 'follow-card');
    c.innerHTML = `
      <div class="fc-head">
        <div class="fc-label">${C.esc(o.label)}</div>
        <button class="fc-listen">🔊 听</button>
      </div>
      ${o.sub ? `<div class="fc-sub">${C.esc(o.sub)}</div>` : ''}
      <button class="fc-rec">🎤 跟读</button>
      <div class="fc-live" style="display:none"></div>
      <div class="fc-result" style="display:none"></div>`;
    c.querySelector('.fc-listen').onclick = () => C.TTS.speak(o.target, o.lang, 0.85);
    const recBtn = c.querySelector('.fc-rec');
    const liveBox = c.querySelector('.fc-live');
    const resBox = c.querySelector('.fc-result');
    let state = 'idle'; // idle / recording / stopping
    let rec = null;
    let timeoutId = null;

    function reset() {
      state = 'idle';
      rec = null;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      recBtn.textContent = '🎤 跟读';
      recBtn.disabled = false;
      recBtn.classList.remove('recording');
      liveBox.style.display = 'none';
    }

    function finish(heard) {
      state = 'stopping';
      recBtn.textContent = '⏹ 评分中…';
      recBtn.disabled = true;
      const g = gradeRead(o.target, heard, o.lang);
      resBox.style.display = 'block';
      let html = `<div class="fc-score ${g.score >= 80 ? 'good' : (g.score >= 50 ? 'mid' : 'bad')}">${g.score}<span>分</span></div>`;
      html += `<div class="fc-comment">${scoreComment(g.score)}</div>`;
      html += `<div class="fc-heard">你说：${C.esc(heard) || '（未识别到）'}</div>`;
      if (g.missed.length) html += `<div class="fc-miss">没读准：${g.missed.map(m => '<b>' + C.esc(m) + '</b>').join('、')}</div>`;
      if (g.extra.length) html += `<div class="fc-extra">多读/读错：${g.extra.map(m => '<b>' + C.esc(m) + '</b>').join('、')}</div>`;
      /* 跟读收藏按钮 */
      const fav = S.get('sunpad_recite_fav', []);
      const isFav = fav.some(f => f.target === o.target);
      html += `<button class="btn-pill ${isFav ? 'on' : ''}" id="favRecite" style="margin-top:8px">${isFav ? '★ 已收藏' : '☆ 收藏到口语本'}</button>`;
      /* 同时记录跟读历史 */
      const hist = S.get('sunpad_recite_hist', []);
      hist.push({ ts: Date.now(), date: ymd(new Date()), target: o.target, score: g.score, lang: o.lang || '' });
      if (hist.length > 200) hist.splice(0, hist.length - 200);
      S.set('sunpad_recite_hist', hist);
      resBox.innerHTML = html;
      resBox.querySelector('#favRecite').onclick = () => {
        const f = S.get('sunpad_recite_fav', []);
        const idx = f.findIndex(x => x.target === o.target);
        if (idx >= 0) f.splice(idx, 1); else f.push({ label: o.label, sub: o.sub, target: o.target, lang: o.lang || '', date: ymd(new Date()) });
        S.set('sunpad_recite_fav', f);
        const btn = resBox.querySelector('#favRecite');
        btn.textContent = idx >= 0 ? '☆ 收藏到口语本' : '★ 已收藏';
        btn.classList.toggle('on');
      };
      reset();
      recBtn.textContent = '🎤 再读一次';
    }

    recBtn.onclick = () => {
      if (state === 'recording') {
        // 用户主动结束
        state = 'stopping';
        recBtn.disabled = true;
        recBtn.textContent = '⏹ 评分中…';
        if (rec) try { rec.stop(); } catch (e) {}
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        return;
      }
      // 开始录音
      resBox.style.display = 'none';
      resBox.innerHTML = '';
      liveBox.style.display = 'block';
      liveBox.textContent = '等待识别…';
      recBtn.textContent = '🎙️ 聆听中…（点击结束评分）';
      recBtn.classList.add('recording');
      state = 'recording';
      rec = startRecognition(o.lang,
        (heard) => finish(heard),
        (txt) => { liveBox.textContent = '识别中：' + C.esc(txt); },
        (err) => {
          if (state === 'stopping') return; // 主动停止可能触发 no-speech，忽略
          reset();
          if (err === 'norec') C.Toast('当前浏览器不支持语音识别');
          else if (err === 'not-allowed' || err === 'service-not-allowed') C.Toast('请允许麦克风权限后重试');
          else C.Toast('识别失败，请重试');
        }
      );
      if (!rec) { reset(); return; }
      // 15 秒自动停止，避免一直监听
      timeoutId = setTimeout(() => {
        if (state === 'recording' && rec) {
          state = 'stopping';
          recBtn.disabled = true;
          recBtn.textContent = '⏹ 评分中…';
          try { rec.stop(); } catch (e) {}
        }
      }, 15000);
    };
    return c;
  }
  function renderFollow(panel) {
    let mode = S.get('enFollow', 'word');
    const top = el('div', 'tabs');
    [['word', '📝 单词'], ['sent', '💬 语句']].forEach(([k, v]) => {
      const t = el('button', 'tab' + (k === mode ? ' active' : ''), v);
      t.onclick = () => { mode = k; S.set('enFollow', k); renderFollow(panel); };
      top.appendChild(t);
    });
    panel.appendChild(top);
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      panel.appendChild(el('div', 'notice warn',
        '⚠️ 当前浏览器不支持语音识别跟读。请用 <b>Safari（iOS）</b> 或 <b>Chrome</b> 打开本页，并允许麦克风权限。'));
    }
    panel.appendChild(el('div', 'notice',
      `先点「🔊 听」原声，再按「🎤 跟读」——读完后<b>再点一下按钮结束</b>，系统立即评分（0–100）并标出读不准的词。`));
    if (mode === 'word') {
      const book = S.get('enBook', 'cet6');
      const today = C.pickDaily(DATA_WORDS[book], 10, 'words:' + book);
      today.forEach(w => panel.appendChild(followCard({
        target: w[0], lang: 'en-US', label: w[0] + '  [' + w[1] + ']', sub: w[2]
      })));
    } else {
      const talk = DATA_TALK[Math.floor(C.dayIndex() % DATA_TALK.length)];
      const talkSet = talk.sets[Math.floor(C.dayIndex() % talk.sets.length)];
      const nc = C.pickOne(DATA_READING_EN, 'nc', 'week');
      const sents = [];
      talkSet.slice(0, 3).forEach(l => sents.push({ en: l[0], cn: l[1], from: talk.name }));
      nc.s.slice(0, 3).forEach(p => sents.push({ en: p[0], cn: p[1], from: nc.title }));
      sents.forEach(s => panel.appendChild(followCard({
        target: s.en, lang: 'en-US', label: s.en, sub: s.cn + '  (' + s.from + ')'
      })));
    }
  }

  /* ==========================================================
      全局功能：主题 / 更新提示 / 设置 / 备份 / 提醒
     ========================================================== */
  function applyTheme() {
    document.body.setAttribute('data-theme', S.get('theme', 'light'));
    document.body.setAttribute('data-skin', S.get('skin', 'lavender'));
  }

  const CHANGELOG = {
    'sunpad-v32': 'v32：修复经期日历日期错位（CSS Grid列被撑大导致）',
    'sunpad-v31': 'v31：修复情绪日记低落时治愈短句不弹',
    'sunpad-v30': 'v30：新闻加载10秒超时保底，防白屏',
    'sunpad-v29': 'v29：数据文件const→window修复（新闻/短句/妆容模块）',
    'sunpad-v28': 'v28：导航改回左侧竖排',
    'sunpad-v27': 'v27：健身体态专项+穿搭打卡相册',
    'sunpad-v26': 'v26：护肤成分库+打卡徽章+多套皮肤+更新日志',
    'sunpad-v25': 'v25：菜谱智能筛选+数据总览Dashboard',
    'sunpad-v24': 'v24：跟读收藏+美妆台账+学习中心增强',
    'sunpad-v23': 'v23：记账升级（女性分类+饼图+心愿存钱+CSV导出）',
    'sunpad-v22': 'v22：天气联动穿搭+跟读柔和警告+经期联动+骨架屏',
    'sunpad-v21': 'v21：底部5Tab导航+经期/习惯/情绪三大模块+今日三件事'
  };
  function showUpdateBanner() {
    if (document.getElementById('updBanner')) return;
    const b = el('div', 'update-banner');
    b.id = 'updBanner';
    const notes = CHANGELOG['sunpad-v32'] || '已发布新版本';
    const span = el('span', '', `🎉 ${notes}，点击更新`);
    const btn = el('button', '', '立即更新');
    btn.onclick = () => location.reload();
    const close = el('button', 'ub-close', '✕');
    close.onclick = () => b.remove();
    b.append(span, btn, close);
    document.body.appendChild(b);
  }

  function renderLedgerSafe() {
    try {
      const act = document.querySelector('.nav-item.active');
      if (act && act.dataset.page === 'ledger') renderLedger();
    } catch (e) {}
  }

  function exportBackup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      data[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    a.href = url;
    a.download = `小王工作台备份_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    C.Toast('备份已导出 💾');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
        C.Toast('备份已恢复，即将刷新 ↻');
        setTimeout(() => location.reload(), 900);
      } catch (e) { C.Toast('文件格式错误，导入失败'); }
    };
    reader.readAsText(file);
  }

  function drawTrend(daily) {
    const W = 300, H = 80, pad = 6;
    const n = daily.length;
    const max = Math.max(1, ...daily);
    const pts = daily.map((v, i) => {
      const x = pad + (W - 2 * pad) * (n === 1 ? 0.5 : i / (n - 1));
      const y = H - pad - (H - 2 * pad) * (v / max);
      return [x, y];
    });
    const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
    const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2" style="fill:var(--primary)"/>`).join('');
    return `<svg class="trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polygon points="${area}" style="fill:var(--primary-soft)" opacity=".5"/>
      <polyline points="${line}" fill="none" style="stroke:var(--primary);stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>
      ${dots}</svg>`;
  }

  function startReminderCheck() {
    let lastFired = {};
    const fire = (label, sub) => {
      C.Toast(`${label} 时间到 · ${sub}`, 6000);
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(label + ' 时间到', { body: sub });
        }
      } catch (e) {}
    };
    const check = () => {
      const now = new Date();
      const cur = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      /* 设置里的早睡/早起提醒 */
      const rem = S.get('reminders', null);
      if (rem) {
        const key = (id, on, time, label, sub) => {
          if (on && time === cur && lastFired[id] !== cur) { lastFired[id] = cur; fire(label, sub); }
        };
        key('sleep', rem.sleepOn, rem.sleep, '🌙 早睡', '该休息了，23:00 前入睡');
        key('wake', rem.wakeOn, rem.wake, '🌅 早起', '新的一天，09:00 前起床');
      }
      /* 每日提醒列表 */
      const list = S.dayGet('reminders', []);
      const fired = S.dayGet('reminders_fired', {});
      list.forEach(item => {
        if (!item.done && item.time === cur && !fired[item.id]) {
          fired[item.id] = true;
          S.daySet('reminders_fired', fired);
          fire(`⏰ ${item.text}`, item.note || '该去做啦');
        }
      });
    };
    setInterval(check, 30000);
    check();
    try {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    } catch (e) {}
  }

  function openSettings() {
    const ov = el('div', 'overlay');
    const sheet = el('div', 'settings-sheet');
    const theme = S.get('theme', 'light');
    const budget = S.get('budget', 0);
    const rem = S.get('reminders', { sleep: '23:00', wake: '09:00', sleepOn: true, wakeOn: true });

    const hd = el('div', 'set-hd');
    hd.innerHTML = `<h3>⚙️ 设置</h3>`;
    const close = el('button', 'set-close', '✕');
    close.onclick = () => ov.remove();
    hd.appendChild(close);
    sheet.appendChild(hd);

    /* 外观 */
    const sec1 = el('div', 'set-sec');
    sec1.appendChild(el('div', 'set-sec-t', '外观'));
    const themeRow = el('div', 'set-row');
    themeRow.innerHTML = `<div><div class="sr-label">夜间模式</div><div class="sr-sub">深色护眼，睡前更舒适</div></div>`;
    const seg = el('div', 'seg');
    const segLight = el('button', theme === 'light' ? 'on' : '', '浅色');
    const segDark = el('button', theme === 'dark' ? 'on' : '', '深色');
    segLight.onclick = () => { S.set('theme', 'light'); applyTheme(); segLight.classList.add('on'); segDark.classList.remove('on'); };
    segDark.onclick = () => { S.set('theme', 'dark'); applyTheme(); segDark.classList.add('on'); segLight.classList.remove('on'); };
    seg.append(segLight, segDark);
    themeRow.appendChild(seg);
    sec1.appendChild(themeRow);

    /* 皮肤切换 */
    const skinRow = el('div', 'set-row');
    skinRow.innerHTML = `<div><div class="sr-label">主题皮肤</div><div class="sr-sub">选择你喜欢的色调</div></div>`;
    const skinSeg = el('div', 'seg');
    const skins = [['lavender', '薰衣草'], ['cream', '奶油白'], ['naked-pink', '裸粉'], ['mint', '薄荷']];
    const curSkin = S.get('skin', 'lavender');
    skins.forEach(([k, l]) => {
      const b = el('button', curSkin === k ? 'on' : '', l);
      b.onclick = () => {
        S.set('skin', k); applyTheme();
        skinSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      };
      skinSeg.appendChild(b);
    });
    skinRow.appendChild(skinSeg);
    sec1.appendChild(skinRow);
    sheet.appendChild(sec1);

    /* 数据备份 */
    const sec2 = el('div', 'set-sec');
    sec2.appendChild(el('div', 'set-sec-t', '数据备份'));
    const row2 = el('div', 'set-row');
    row2.innerHTML = `<div><div class="sr-label">导出 / 导入备份</div><div class="sr-sub">换手机或清缓存前请先备份</div></div>`;
    const ctrl2 = el('div', 'sr-ctrl');
    const expBtn = el('button', 'btn-line', '导出');
    expBtn.onclick = exportBackup;
    const impBtn = el('button', 'btn-line', '导入');
    const fileInput = el('input'); fileInput.type = 'file'; fileInput.accept = 'application/json'; fileInput.style.display = 'none';
    impBtn.onclick = () => fileInput.click();
    fileInput.onchange = e => { const f = e.target.files[0]; if (f) importBackup(f); };
    ctrl2.append(expBtn, impBtn);
    row2.appendChild(ctrl2);
    sec2.append(row2, fileInput);
    sheet.appendChild(sec2);

    /* 本月预算 */
    const sec3 = el('div', 'set-sec');
    sec3.appendChild(el('div', 'set-sec-t', '本月预算'));
    const row3 = el('div', 'set-row');
    row3.innerHTML = `<div><div class="sr-label">月度支出预算</div><div class="sr-sub">设置后记账页显示进度</div></div>`;
    const ctrl3 = el('div', 'sr-ctrl');
    const inp = el('input', 'set-input'); inp.type = 'number'; inp.value = budget || ''; inp.placeholder = '0';
    const saveB = el('button', 'btn-pill', '保存');
    saveB.onclick = () => { S.set('budget', parseFloat(inp.value) || 0); C.Toast('预算已保存 💾'); renderLedgerSafe(); };
    ctrl3.append(inp, saveB);
    row3.appendChild(ctrl3);
    sec3.appendChild(row3);
    sheet.appendChild(sec3);

    /* 定时提醒 */
    const sec4 = el('div', 'set-sec');
    sec4.appendChild(el('div', 'set-sec-t', '定时提醒'));
    const remRow = (key, label, sub) => {
      const row = el('div', 'set-row');
      row.innerHTML = `<div><div class="sr-label">${label}</div><div class="sr-sub">${sub}</div></div>`;
      const ctrl = el('div', 'sr-ctrl');
      const timeInp = el('input', 'set-input'); timeInp.type = 'time'; timeInp.value = rem[key];
      timeInp.onchange = () => { rem[key] = timeInp.value; S.set('reminders', rem); C.Toast('提醒时间已更新'); };
      const tog = el('button', 'btn-pill' + (rem[key + 'On'] ? ' on' : ''), rem[key + 'On'] ? '开' : '关');
      tog.onclick = () => { rem[key + 'On'] = !rem[key + 'On']; S.set('reminders', rem); tog.classList.toggle('on'); tog.textContent = rem[key + 'On'] ? '开' : '关'; };
      ctrl.append(timeInp, tog);
      row.appendChild(ctrl);
      return row;
    };
    sec4.appendChild(remRow('sleep', '🌙 早睡提醒', '建议 23:00 前'));
    sec4.appendChild(remRow('wake', '🌅 早起提醒', '建议 09:00 前'));
    const note = el('div', 'set-note', 'ℹ️ iOS 系统限制：纯前端无法在锁屏/后台弹系统通知。本提醒在工作台打开时到点弹出，请确保当日用过本 App。需要锁屏提醒请用手机自带闹钟。');
    sec4.appendChild(note);
    sheet.appendChild(sec4);

    /* 关于 */
    const sec5 = el('div', 'set-sec');
    sec5.appendChild(el('div', 'set-sec-t', '关于'));
    const about = el('div', 'set-about');
    about.innerHTML = `<b>小王的工作台</b> · v2.0<br>纯前端 PWA · 数据存于本机<br>抖音内容每日实时更新`;
    sec5.appendChild(about);
    sheet.appendChild(sec5);

    ov.appendChild(sheet);
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
  }

  global.App = {
    init() {
      C.TTS.init();
      C.Store.pruneOldDays(30); // 启动时清理 30 天前的按天键，防 localStorage 无限膨胀
      applyTheme();          // 应用夜间/浅色主题
      startReminderCheck();  // 定时提醒（页面内检查，iOS 友好）
      // 注册 Service Worker，实现离线可用（PWA 核心能力）
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').then(reg => {
            const promptUpdate = () => showUpdateBanner();
            if (reg.waiting && navigator.serviceWorker.controller) promptUpdate();
            reg.addEventListener('updatefound', () => {
              const nw = reg.installing;
              if (!nw) return;
              nw.addEventListener('statechange', () => {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate();
              });
            });
          }).catch(() => {});
          // 新版 SW 激活后不自动刷新，等用户点「立即更新」再 reload，避免横幅闪退
        });
      }
      renderTopDate();
      const setBtn = document.getElementById('btnSettings');
      if (setBtn) setBtn.onclick = openSettings;
      document.querySelectorAll('.nav-item').forEach(b => {
        b.onclick = () => switchPage(b.dataset.page);
      });
      switchPage('home');
    }
  };
})(window);
