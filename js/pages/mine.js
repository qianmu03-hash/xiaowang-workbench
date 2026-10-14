/* ==========================================================
   小王的工作台 — 页面模块：mine.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

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
    const today = new Date();
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

    /* 深度洞察入口 */
    const ig = el('div', 'card');
    ig.innerHTML = `<div class="card-title">🧠 深度洞察</div>
      <div class="set-note">一键生成：记账月报 · 习惯周报 · 心情月报 · 体重趋势 · 周期洞察</div>`;
    const goIg = el('button', 'btn-pill', '进入洞察 →');
    goIg.style.marginTop = '10px';
    goIg.onclick = () => switchPage('insights');
    ig.appendChild(goIg);
    box.appendChild(ig);
  }

  /* ==========================================================
      新增 — 深度洞察（insights）：数据来自 js/insights.js 纯计算
     ========================================================== */
  function renderInsights() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🧠</div><div><h2>深度洞察</h2><p>记账 · 习惯 · 心情 · 体重 · 周期，自动出报告</p></div>`;
    box.appendChild(ph);

    const I = global.Insights;
    const ledger = S.get('ledger', []);
    const habits = habitsData();
    const mood = S.get('sunpad_mood', {});
    const body = bodyLog();
    const clusters = periodClusters();
    const pred = predictPeriod();
    const today = new Date();
    const wkFrom = ymd(addDays(today, -6)), wkTo = ymd(today);
    const mFrom = ymd(new Date(today.getFullYear(), today.getMonth(), 1)), mTo = ymd(today);
    const bundle = { ledger, habits, mood, bodylog: body, clusters, pred, cats: CATS, today: wkTo };

    /* ---------- ① 一键生成报告 ---------- */
    const rp = el('div', 'card');
    rp.appendChild(el('div', 'card-title', '📝 一键生成报告'));
    const out = el('pre');
    out.style.cssText = 'display:none;margin-top:10px;padding:12px;background:var(--card-soft);border-radius:10px;font-size:12px;line-height:1.75;white-space:pre-wrap;word-break:break-word;color:var(--text);max-height:320px;overflow:auto';
    const btnRow = el('div', '');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:4px';
    const bWeek = el('button', 'btn-pill on', '📄 生成本周周报');
    const bMonth = el('button', 'btn-pill on', '📊 生成本月月报');
    const bCopy = el('button', 'btn-pill', '📋 复制');
    bWeek.onclick = () => { out.textContent = I.weeklyReport(bundle); out.style.display = 'block'; };
    bMonth.onclick = () => { out.textContent = I.monthlyReport(bundle); out.style.display = 'block'; };
    bCopy.onclick = () => { if (!out.textContent) return C.Toast('先生成一份报告吧'); C.copyText(out.textContent); };
    btnRow.appendChild(bWeek); btnRow.appendChild(bMonth); btnRow.appendChild(bCopy);
    rp.appendChild(btnRow); rp.appendChild(out);
    box.appendChild(rp);

    /* ---------- ② 记账月报 ---------- */
    const lm = I.ledgerRange(ledger, mFrom, mTo);
    if (lm.count) {
      const top3 = lm.byCat.slice(0, 3).map(c => `
        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-2);font-weight:600">
            <span>${CATS[c.cat] ? CATS[c.cat].i + CATS[c.cat].n : C.esc(c.cat)}</span><span>${C.fmtMoney(c.amt)} · ${c.pct}%</span></div>
          <div class="sc-progress" style="margin-top:4px"><i style="width:${c.pct}%;background:${catColor(c.cat)}"></i></div>
        </div>`).join('');
      const lmPrev = I.ledgerRange(ledger, ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)), ymd(new Date(today.getFullYear(), today.getMonth(), 0)));
      let cmp = '';
      if (lmPrev.expense > 0 && lm.expense > 0) {
        const ch = Math.round((lm.expense - lmPrev.expense) / lmPrev.expense * 100);
        cmp = `<div class="set-note" style="margin-top:8px">较上月支出 ${ch > 0 ? '↑' : ch < 0 ? '↓' : '→'} ${Math.abs(ch)}%</div>`;
      }
      box.appendChild(card('💰 ' + mFrom.slice(0, 7) + ' 记账月报', '💰', `
        <div class="stat-grid">
          <div class="stat-card"><div class="sc-num">${C.fmtMoney(lm.income)}</div><div class="sc-label">收入</div></div>
          <div class="stat-card"><div class="sc-num">${C.fmtMoney(lm.expense)}</div><div class="sc-label">支出</div></div>
          <div class="stat-card"><div class="sc-num">${C.fmtMoney(lm.balance)}</div><div class="sc-label">结余</div></div>
          <div class="stat-card"><div class="sc-num">${C.fmtMoney(lm.avgPerDay)}</div><div class="sc-label">日均支出</div></div>
        </div>${cmp}${top3}`));
    }

    /* ---------- ③ 习惯周报 ---------- */
    const hw = I.habitWindow(habits, wkFrom, wkTo);
    if (hw.habits.length) {
      const rows = hw.habits.map(h => `
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <span style="width:96px;font-size:12px;font-weight:700;color:var(--text);flex:0 0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.icon || ''} ${C.esc(h.name)}</span>
          <div class="sc-progress" style="flex:1"><i style="width:${h.pct}%;background:${h.color || ''}"></i></div>
          <span style="font-size:11px;font-weight:800;color:var(--primary-deep);min-width:44px;text-align:right">${h.doneDays}/${hw.dayCount}</span>
        </div>`).join('');
      box.appendChild(card('✅ 习惯周报（近7天）', '✅', `
        <div style="font-size:22px;font-weight:800;color:var(--primary-deep)">${hw.overallPct}%</div>
        <div class="set-note">总完成率 · 活跃打卡 ${hw.activeDays}/${hw.dayCount} 天${hw.best && hw.best.doneDays ? ` · 最佳「${C.esc(hw.best.name)}」` : ''}</div>
        ${rows}`));
    }

    /* ---------- ④ 心情月报 ---------- */
    const mw = I.moodWindow(mood, mFrom, mTo);
    if (mw.count) {
      const tagPills = mw.tagsTop.slice(0, 4).map(t => `<span class="pill">${C.esc(t.tag)} ×${t.count}</span>`).join('');
      box.appendChild(card('💗 心情月报', '💗', `
        <div class="stat-grid">
          <div class="stat-card"><div class="sc-num">${mw.avg.toFixed(1)}</div><div class="sc-label">平均分 /5</div></div>
          <div class="stat-card"><div class="sc-num">${mw.count}</div><div class="sc-label">记录天数</div></div>
          <div class="stat-card"><div class="sc-num">${mw.best ? mw.best.level : '-'}</div><div class="sc-label">最佳一天</div></div>
          <div class="stat-card"><div class="sc-num">${mw.worst ? mw.worst.date.slice(5) : '-'}</div><div class="sc-label">最低一天</div></div>
        </div>
        ${tagPills ? `<div class="pill-row" style="margin-top:10px">${tagPills}</div>` : ''}
        ${mw.best ? `<div class="set-note" style="margin-top:8px">最开心 ${mw.best.date.slice(5)} · 低谷 ${mw.worst.date.slice(5)}</div>` : ''}`));
    }

    /* ---------- ⑤ 体重趋势 ---------- */
    const wt = I.weightTrend(body);
    if (wt.count) {
      const verdict = { up: '↑ 有所上升，注意节奏', down: '↓ 有所下降，趋势良好', flat: '→ 保持平稳', none: '持续记录可看趋势' }[wt.verdict];
      box.appendChild(card('⚖️ 体重趋势', '⚖️', `
        <div class="stat-grid">
          <div class="stat-card"><div class="sc-num">${wt.last.w}</div><div class="sc-label">最新 kg</div></div>
          <div class="stat-card"><div class="sc-num" style="color:${wt.delta7 > 0 ? 'var(--warn)' : wt.delta7 < 0 ? 'var(--ok)' : 'var(--primary-deep)'}">${wt.delta7 == null ? '-' : (wt.delta7 > 0 ? '+' : '') + wt.delta7.toFixed(1)}</div><div class="sc-label">近7天 kg</div></div>
          <div class="stat-card"><div class="sc-num">${wt.bmi ? wt.bmi.toFixed(1) : '-'}</div><div class="sc-label">BMI${wt.bmiCat ? ' · ' + wt.bmiCat : ''}</div></div>
          <div class="stat-card"><div class="sc-num">${wt.min30 != null ? wt.min30 + '~' + wt.max30 : '-'}</div><div class="sc-label">30天区间 kg</div></div>
        </div>
        <div class="set-note" style="margin-top:8px">${verdict} · 累计 ${wt.delta > 0 ? '+' : ''}${wt.delta.toFixed(1)}kg（共 ${wt.count} 条记录）</div>`));
    }

    /* ---------- ⑥ 周期洞察 ---------- */
    const pi = I.periodInsight(clusters, pred);
    if (pi.cycles || (pred && pred.next)) {
      let s = '';
      if (pi.avgCycle != null) s += `<div class="stat-grid">
          <div class="stat-card"><div class="sc-num">${Math.round(pi.avgCycle)}</div><div class="sc-label">平均周期 天</div></div>
          <div class="stat-card"><div class="sc-num">${pi.cycles}</div><div class="sc-label">已记录周期</div></div>
          <div class="stat-card"><div class="sc-num">${pi.avgDuration ? pi.avgDuration.toFixed(1) : '-'}</div><div class="sc-label">经期天数</div></div>
          <div class="stat-card"><div class="sc-num">${pred && pred.daysUntil != null ? Math.max(0, pred.daysUntil) : '-'}</div><div class="sc-label">距下次 天</div></div>
        </div>`;
      let note = '';
      if (pi.regular) note += `规律度：${pi.regular}（${pi.minGap}–${pi.maxGap} 天）`;
      if (pred && pred.next) note += (note ? ' · ' : '') + `下次预计 ${pred.next}${pred.confidence === false ? '（参考）' : ''}`;
      if (note) s += `<div class="set-note" style="margin-top:8px">${note}</div>`;
      box.appendChild(card('🌸 周期洞察', '🌸', s));
    }

    if (!lm.count && !mw.count && !wt.count && !hw.habits.length) {
      box.appendChild(el('div', 'notice', '还没有足够数据，先去<a href="javascript:void(0)" onclick="App.go(&quot;ledger&quot;)">记账</a>或<a href="javascript:void(0)" onclick="App.go(&quot;habits&quot;)">打卡</a>几天，洞察会自动生成。'));
    }
  }

  /* ==========================================================
      新增 — 关于（about）
      ========================================================== */
  function renderAbout() {
    const box = $('#panel'); box.innerHTML = '';
    const ph = el('div', 'page-head'); ph.innerHTML = `<div class="ph-ic">ℹ️</div><div><h2>关于</h2></div>`; box.appendChild(ph);
    const card = el('div', 'card');
    card.innerHTML = `<div class="hero-card" style="border-radius:var(--r);margin-bottom:12px"><div><div style="font-size:20px;font-weight:800">小王的工作台</div><div style="opacity:.85;margin-top:4px">sunpad · v39</div></div></div>
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

  App.page('dashboard', renderDashboard);
  App.page('insights', renderInsights);
  App.page('skincare', renderSkincare);
  App.page('badge', renderBadge);
  App.page('about', renderAbout);
})(window);
