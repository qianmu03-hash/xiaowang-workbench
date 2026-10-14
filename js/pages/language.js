/* ==========================================================
   小王的工作台 — 页面模块：language.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

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

  App.page('english', renderEnglish);
  App.page('cantonese', renderCantonese);
})(window);
