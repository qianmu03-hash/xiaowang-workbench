/* ==========================================================
   小王的工作台 — 页面模块：fitness.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;


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

  App.page('fitness', renderFitness);
  App.page('dance', renderDance);
})(window);
