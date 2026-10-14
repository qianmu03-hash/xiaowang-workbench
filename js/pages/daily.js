/* ==========================================================
   小王的工作台 — 页面模块：daily.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

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

  App.page('menstrual', renderMenstrual);
  App.page('habits', renderHabits);
  App.page('mood', renderMood);
})(window);
