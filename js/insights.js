/* ==========================================================
   小王的工作台 — 深度洞察 Insight（纯计算模块，无 DOM 依赖）
   覆盖：记账区间报表 / 习惯周报 / 心情月报 / 体重趋势 / 周期洞察
   + 一键生成周报、月报纯文本
   所有函数只吃数据、只吐结果，可在 Node 中直接单测
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------- 日期工具（模块内独立实现，保持纯净） ---------- */
  const DAY_MS = 86400000;
  const p2 = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / DAY_MS);
  const inRange = (s, from, to) => s >= from && s <= to;
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
  const monthOf = s => s.slice(0, 7);
  const prevMonth = m => { const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 2, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
  const daysInMonth = m => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm, 0).getDate(); };

  function fmtMoney(n) {
    if (global.Core && global.Core.fmtMoney) return global.Core.fmtMoney(n);
    return '¥' + (Number(n) || 0).toFixed(2);
  }

  /* ==========================================================
     1) 记账区间报表
     rows: [{date,type:'in'/'out',cat,amt,note}]
     ========================================================== */
  function ledgerRange(rows, from, to) {
    rows = Array.isArray(rows) ? rows : [];
    const list = rows.filter(r => r && r.date && inRange(r.date, from, to));
    let income = 0, expense = 0;
    const catSum = {};
    list.forEach(r => {
      const amt = Number(r.amt) || 0;
      if (r.type === 'in') income += amt;
      else { expense += amt; catSum[r.cat || 'extra'] = (catSum[r.cat || 'extra'] || 0) + amt; }
    });
    const byCat = Object.entries(catSum)
      .map(([cat, amt]) => ({ cat, amt, pct: pct(amt, expense) }))
      .sort((a, b) => b.amt - a.amt);
    const dayCount = Math.max(1, diffDays(from, to) + 1);
    return {
      from, to, count: list.length,
      income, expense, balance: income - expense,
      byCat, topCat: byCat[0] || null,
      dayCount, days: new Set(list.map(r => r.date)).size,
      avgPerDay: expense / dayCount
    };
  }

  /* ==========================================================
     2) 习惯窗口完成情况
     data: {habits:[{id,name,icon,type,target}], log:{date:{id:val}}}
     ========================================================== */
  function habitWindow(data, from, to) {
    const habits = (data && data.habits) || [];
    const log = (data && data.log) || {};
    const dayCount = Math.max(1, diffDays(from, to) + 1);
    const perHabit = habits.map(h => {
      let doneDays = 0;
      for (let d = parseYmd(from); ymd(d) <= to; d = addDays(d, 1)) {
        const dl = log[ymd(d)];
        if (!dl) continue;
        const v = dl[h.id];
        const done = h.type === 'toggle' ? v === true : (Number(v) || 0) >= (h.target || 1);
        if (done) doneDays++;
      }
      return { id: h.id, name: h.name, icon: h.icon, type: h.type, target: h.target, color: h.color, doneDays, pct: pct(doneDays, dayCount) };
    });
    let activeDays = 0;
    for (let d = parseYmd(from); ymd(d) <= to; d = addDays(d, 1)) {
      const dl = log[ymd(d)];
      if (dl && Object.keys(dl).length) activeDays++;
    }
    const totalSlots = habits.length * dayCount;
    const doneSlots = perHabit.reduce((s, x) => s + x.doneDays, 0);
    const sorted = perHabit.slice().sort((a, b) => b.doneDays - a.doneDays);
    return {
      from, to, dayCount, activeDays, habits: perHabit,
      overallPct: pct(doneSlots, totalSlots),
      best: sorted[0] || null,
      worst: sorted[sorted.length - 1] || null
    };
  }

  /* ==========================================================
     3) 心情窗口统计
     md: {date:{level(1-5),tags[],note}}
     ========================================================== */
  function moodWindow(md, from, to) {
    md = md || {};
    const recs = [];
    for (let d = parseYmd(from); ymd(d) <= to; d = addDays(d, 1)) {
      const r = md[ymd(d)];
      if (r && r.level) recs.push({ date: ymd(d), level: r.level, tags: r.tags || [] });
    }
    const avg = recs.length ? recs.reduce((s, x) => s + x.level, 0) / recs.length : 0;
    const tagCount = {};
    recs.forEach(r => r.tags.forEach(t => { if (t) tagCount[t] = (tagCount[t] || 0) + 1; }));
    const tagsTop = Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
    const sorted = recs.slice().sort((a, b) => b.level - a.level || (a.date < b.date ? 1 : -1));
    return {
      from, to, count: recs.length, avg,
      best: sorted[0] || null,
      worst: sorted[sorted.length - 1] || null,
      tagsTop
    };
  }

  /* ==========================================================
     4) 体重趋势
     log: [{date,h,w}]（按日期升序）
     ========================================================== */
  function weightTrend(log) {
    log = (Array.isArray(log) ? log : []).slice()
      .filter(x => x && x.date && x.w)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (!log.length) return { count: 0 };
    const today = new Date();
    const first = log[0], last = log[log.length - 1];
    const w7from = ymd(addDays(today, -6));
    const wPrev7from = ymd(addDays(today, -13));
    const r7 = log.filter(x => x.date >= w7from);
    const rPrev7 = log.filter(x => x.date >= wPrev7from && x.date < w7from);
    const r30 = log.filter(x => x.date >= ymd(addDays(today, -29)));
    const avg = arr => arr.length ? arr.reduce((s, x) => s + x.w, 0) / arr.length : null;
    const avg7 = avg(r7), avgPrev7 = avg(rPrev7);
    let delta7 = null;
    if (r7.length >= 2) delta7 = r7[r7.length - 1].w - r7[0].w;
    else if (avg7 != null && avgPrev7 != null) delta7 = avg7 - avgPrev7;
    const delta = last.w - first.w;
    let bmi = null, bmiCat = null;
    if (last.h && last.h > 0) {
      bmi = last.w / Math.pow(last.h / 100, 2);
      bmiCat = bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '超重' : '肥胖';
    }
    const verdict = delta7 == null ? 'none'
      : delta7 > 0.15 ? 'up' : delta7 < -0.15 ? 'down' : 'flat';
    return {
      count: log.length, first, last,
      delta, delta7, avg7, avgPrev7,
      bmi, bmiCat, verdict,
      min30: r30.length ? Math.min(...r30.map(x => x.w)) : null,
      max30: r30.length ? Math.max(...r30.map(x => x.w)) : null
    };
  }

  /* ==========================================================
     5) 周期洞察
     clusters: [{start,end}]（app.js periodClusters() 产出）
     pred: {next,daysUntil,confidence}（predictPeriod() 产出）
     ========================================================== */
  function periodInsight(clusters, pred) {
    clusters = Array.isArray(clusters) ? clusters : [];
    const gaps = [];
    for (let i = 1; i < clusters.length; i++) gaps.push(diffDays(clusters[i - 1].start, clusters[i].start));
    const durations = clusters.map(c => diffDays(c.start, c.end) + 1);
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const minGap = gaps.length ? Math.min(...gaps) : null;
    const maxGap = gaps.length ? Math.max(...gaps) : null;
    const spread = gaps.length ? maxGap - minGap : null;
    const regular = spread == null ? null : spread <= 3 ? '很规律' : spread <= 6 ? '基本规律' : '波动较大';
    return {
      cycles: clusters.length, gaps, avgCycle: avgGap, avgDuration: avgDur,
      minGap, maxGap, spread, regular,
      lastStart: clusters.length ? clusters[clusters.length - 1].start : null,
      pred: pred || null
    };
  }

  /* ==========================================================
     6) 一键报告文本
     b: {ledger, habits, mood, bodylog, clusters, pred, cats?, today?}
     cats: 分类映射 {key:{i:'🍜',n:'餐饮'}}（可选，用于可读分类名）
     ========================================================== */
  function buildReport(kind, b) {
    b = b || {};
    const today = b.today ? parseYmd(b.today) : new Date();
    let from, to, prevFrom, prevTo, title, unit;
    if (kind === 'week') {
      from = ymd(addDays(today, -6)); to = ymd(today);
      prevFrom = ymd(addDays(today, -13)); prevTo = ymd(addDays(today, -7));
      title = `周报（${from.slice(5)} ~ ${to.slice(5)}）`;
      unit = '周';
    } else {
      const m = monthOf(ymd(today));
      from = m + '-01'; to = ymd(today);
      const pm = prevMonth(m);
      prevFrom = pm + '-01'; prevTo = `${pm}-${p2(daysInMonth(pm))}`;
      title = `月报（${m}）`;
      unit = '月';
    }
    const catLabel = c => (b.cats && b.cats[c]) ? b.cats[c].i + b.cats[c].n : c;
    const parts = [];

    /* 💰 记账 */
    const lr = ledgerRange(b.ledger, from, to);
    if (lr.count) {
      const lines = ['💰 记账'];
      lines.push(`支出 ${fmtMoney(lr.expense)} · 收入 ${fmtMoney(lr.income)} · 结余 ${fmtMoney(lr.balance)}`);
      lines.push(`日均支出 ${fmtMoney(lr.avgPerDay)} · 共 ${lr.count} 笔`);
      if (lr.topCat) lines.push(`最大开销：${catLabel(lr.topCat.cat)} ${fmtMoney(lr.topCat.amt)}（${lr.topCat.pct}%）`);
      const lrP = ledgerRange(b.ledger, prevFrom, prevTo);
      if (lrP.expense > 0 && lrP.count) {
        const ch = Math.round((lr.expense - lrP.expense) / lrP.expense * 100);
        lines.push(`较上${unit} ${ch > 0 ? '↑' : ch < 0 ? '↓' : '→'} ${Math.abs(ch)}%`);
      }
      parts.push(lines.join('\n'));
    }

    /* ✅ 习惯 */
    const hw = habitWindow(b.habits, from, to);
    if (hw.habits.length) {
      const lines = ['✅ 习惯'];
      lines.push(`完成率 ${hw.overallPct}% · 活跃打卡 ${hw.activeDays}/${hw.dayCount} 天`);
      if (hw.best && hw.best.doneDays > 0) lines.push(`最佳：${hw.best.icon || ''}${hw.best.name} ${hw.best.doneDays}/${hw.dayCount} 天`);
      if (hw.worst && hw.worst.doneDays < hw.dayCount) lines.push(`待加强：${hw.worst.icon || ''}${hw.worst.name} ${hw.worst.doneDays}/${hw.dayCount} 天`);
      parts.push(lines.join('\n'));
    }

    /* 💗 心情 */
    const mw = moodWindow(b.mood, from, to);
    if (mw.count) {
      const lines = ['💗 心情'];
      lines.push(`平均 ${mw.avg.toFixed(1)}/5 · 记录 ${mw.count} 天`);
      const mwP = moodWindow(b.mood, prevFrom, prevTo);
      if (mwP.count) {
        const d = mw.avg - mwP.avg;
        const sign = d > 0.05 ? '↑' : d < -0.05 ? '↓' : '→';
        lines.push(`较上${unit} ${sign} ${Math.abs(d).toFixed(1)} 分`);
      }
      if (mw.tagsTop.length) lines.push(`高频标签：${mw.tagsTop.slice(0, 3).map(t => `${t.tag}×${t.count}`).join('、')}`);
      if (mw.best) lines.push(`最开心：${mw.best.date.slice(5)}（${mw.best.level} 分）`);
      parts.push(lines.join('\n'));
    }

    /* ⚖️ 体重 */
    const wt = weightTrend(b.bodylog);
    if (wt.count) {
      const lines = ['⚖️ 体重'];
      let s = `最新 ${wt.last.w}kg`;
      if (wt.delta7 != null) s += ` · 近7天 ${wt.delta7 > 0 ? '+' : ''}${wt.delta7.toFixed(1)}kg`;
      if (wt.bmi) s += ` · BMI ${wt.bmi.toFixed(1)}（${wt.bmiCat}）`;
      lines.push(s);
      const verdictText = { up: '有所上升，注意节奏', down: '有所下降，趋势良好', flat: '保持平稳', none: '持续记录可看趋势' }[wt.verdict];
      lines.push(`趋势：${verdictText}`);
      parts.push(lines.join('\n'));
    }

    /* 🌸 周期 */
    const pi = periodInsight(b.clusters, b.pred);
    if (pi.avgCycle != null || (pi.pred && pi.pred.next)) {
      const lines = ['🌸 周期'];
      if (pi.avgCycle != null) {
        let s = `平均周期 ${Math.round(pi.avgCycle)} 天`;
        if (pi.regular) s += ` · ${pi.regular}（${pi.minGap}–${pi.maxGap} 天）`;
        lines.push(s);
      }
      if (pi.avgDuration != null) lines.push(`经期平均持续 ${pi.avgDuration.toFixed(1)} 天`);
      if (pi.pred && pi.pred.next) {
        lines.push(`下次预计 ${pi.pred.next}${pi.pred.daysUntil != null ? `（${pi.pred.daysUntil} 天后）` : ''}${pi.pred.confidence === false ? '（参考）' : ''}`);
      }
      parts.push(lines.join('\n'));
    }

    const head = `📊 深度洞察 · ${title}`;
    if (!parts.length) return head + '\n\n暂无足够记录，多用几天再来生成吧～';
    return head + '\n' + parts.map(p => '\n' + p).join('\n');
  }

  const weeklyReport = b => buildReport('week', b);
  const monthlyReport = b => buildReport('month', b);

  global.Insights = {
    ledgerRange, habitWindow, moodWindow, weightTrend, periodInsight,
    buildReport, weeklyReport, monthlyReport
  };
})(typeof window !== 'undefined' ? window : globalThis);
