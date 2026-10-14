/* ==========================================================
   小王的工作台 — 页面模块：ledger.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;


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

    /* 月度预算进度 + 月底预测 */
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
        /* 月底预测：按已过天数日均推算（仅当前月有意义） */
        if (month === C.monthStr()) {
          const y0 = parseInt(month.slice(0, 4)), m0 = parseInt(month.slice(5, 7));
          const dim = new Date(y0, m0, 0).getDate();
          const dayNow = new Date().getDate();
          const fc = Math.round(outM / Math.max(1, dayNow) * dim);
          const diff = fc - budget;
          const fcLine = el('div', 'set-note');
          fcLine.style.marginTop = '5px';
          if (fc > budget) {
            fcLine.innerHTML = `⚠️ 按当前节奏月底约 <b style="color:var(--danger)">${C.fmtMoney(fc)}</b>，预计超支 ${C.fmtMoney(diff)}`;
          } else {
            fcLine.innerHTML = `✅ 按当前节奏月底约 <b>${C.fmtMoney(fc)}</b>，预计结余 ${C.fmtMoney(-diff)}`;
          }
          w.appendChild(fcLine);
        }
        return w;
      })());
      box.appendChild(bCard);
    }

    /* 周期账单：房租/会员等固定支出，到期一键记入 */
    const recs = S.get('recurring', []);
    const recCard = card('📅 周期账单', '📅', (() => {
      const w = el('div', '');
      if (!recs.length) {
        w.appendChild(el('div', 'empty', `<span class="em-ic">🗓️</span>还没有周期账单，点下方添加房租/会员等固定支出`));
        return w;
      }
      const isCur = month === C.monthStr();
      const dayNow = new Date().getDate();
      recs.forEach((r, idx) => {
        const recorded = all.some(x => x.recId === r.id && x.date.startsWith(month));
        const due = isCur && dayNow >= (r.day || 1);
        const row = el('div', 'bl-item');
        let status, sCls;
        if (recorded) { status = '✓ 本月已记'; sCls = 'rec-done'; }
        else if (due) { status = '⚠ 到期未记'; sCls = 'rec-due'; }
        else { status = `每月 ${r.day || 1} 日`; sCls = 'rec-wait'; }
        row.innerHTML = `
          <div class="bl-cat">${(CATS[r.cat] || CATS.extra).i}</div>
          <div class="bl-info">
            <div class="bl-name">${C.esc(r.name)}</div>
            <div class="bl-note">${C.fmtMoney(r.amt)}/月 · ${status}</div>
          </div>
          <button class="hc-plus ${sCls}">${recorded ? '✓' : '记'}</button>
          <button class="bl-del">✕</button>`;
        const btn = row.querySelector('.hc-plus');
        if (recorded) btn.disabled = true;
        else btn.onclick = () => {
          const today = C.todayStr();
          const arr = ledgerAll();
          arr.push({ ts: Date.now(), date: today, type: r.type || 'out', cat: r.cat || 'extra', amt: r.amt, note: r.name, recId: r.id });
          S.set('ledger', arr);
          C.Toast(`已记入「${r.name}」✓`); renderLedger();
        };
        row.querySelector('.bl-del').onclick = () => {
          recs.splice(idx, 1); S.set('recurring', recs); renderLedger();
        };
        w.appendChild(row);
      });
      return w;
    })());
    box.appendChild(recCard);
    const addRec = el('button', 'rm-add', '＋ 新增周期账单');
    addRec.onclick = () => openRecurringModal(() => renderLedger());
    box.appendChild(addRec);

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
    setTimeout(() => { const t = $('#nAmt'); if (t) t.focus(); }, 100);
  }

  function openRecurringModal(onDone) {
    const mask = el('div', 'modal-mask');
    const m = el('div', 'modal');
    m.innerHTML = `
      <h3>📅 新增周期账单</h3>
      <div class="modal-field"><label>名称</label><input id="rName" maxlength="12" placeholder="如：房租 / 视频会员"></div>
      <div class="modal-field"><label>金额（元/月）</label><input type="number" id="rAmt" inputmode="decimal" placeholder="如：1200"></div>
      <div class="modal-field"><label>分类</label>
        <select id="rCat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.i}${v.n}</option>`).join('')}</select></div>
      <div class="modal-field"><label>每月几号扣款（1–31）</label><input type="number" id="rDay" min="1" max="31" value="1"></div>
      <div class="modal-actions"><button class="m-btn cancel">取消</button><button class="m-btn ok">保存</button></div>`;
    mask.appendChild(m);
    const close = () => mask.remove();
    mask.onclick = e => { if (e.target === mask) close(); };
    m.querySelector('.cancel').onclick = close;
    m.querySelector('.ok').onclick = () => {
      const name = $('#rName').value.trim();
      const amt = parseFloat($('#rAmt').value);
      const day = Math.min(31, Math.max(1, parseInt($('#rDay').value) || 1));
      if (!name) return C.Toast('请输入名称');
      if (!amt || amt <= 0) return C.Toast('请输入有效金额');
      const recs = S.get('recurring', []);
      recs.push({ id: C.uid(), name, amt: Math.round(amt * 100) / 100, cat: $('#rCat').value, day, type: 'out' });
      S.set('recurring', recs);
      C.Toast('已添加 ✓'); close(); onDone && onDone();
    };
    document.body.appendChild(mask);
    setTimeout(() => { const t = $('#rName'); if (t) t.focus(); }, 100);
  }

  function prevMonth(m) {
    const [y, mo] = m.split('-').map(Number);
    return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  }
  function nextMonth(m) {
    const [y, mo] = m.split('-').map(Number);
    return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
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

  App.page('ledger', renderLedger);
})(window);
