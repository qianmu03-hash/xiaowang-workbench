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
    habits:{n:'习惯',i:'✅'}, mood:{n:'心情',i:'💗'}, cosmetics:{n:'美妆台账',i:'🧴'}, dashboard:{n:'数据总览',i:'📈'}, insights:{n:'深度洞察',i:'🧠'}, skincare:{n:'成分库',i:'🔬'}, badge:{n:'徽章',i:'🏅'}, about:{n:'关于',i:'ℹ️'}
  };
  const TABS = [
    { id:'home',   ic:'🏠', name:'首页', pages:['home'] },
    { id:'study',  ic:'📚', name:'学习', pages:['english','cantonese','reading','learn'] },
    { id:'create', ic:'🎨', name:'创作', pages:['create','glam','cosmetics'] },
    { id:'life',   ic:'🏃', name:'生活', pages:['fitness','dance','food','ledger','remind','menstrual','habits','mood','news','weather'] },
    { id:'mine',   ic:'⚙️', name:'我的', pages:['dashboard','insights','skincare','badge','about'] }
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
    setFab(null);
    RENDER[page]();
  }

  /* 悬浮按钮生命周期：页面文件通过 App.ctx.setFab() 设置，切页时统一清理 */
  function setFab(f) {
    if (currentFab) { currentFab.remove(); currentFab = null; }
    currentFab = f || null;
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
  function bodyLog() { return S.get('bodylog', []); }
  function ledgerAll() { return S.get('ledger', []); }

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

  // 页面渲染注册表：各 js/pages/*.js 通过 App.page(name, fn) 注册，core 只保留查表调用
  const RENDER = {};

  /* ==========================================================
      新增一、天气（Open-Meteo 真实数据，默认中山，可改城市）
     ========================================================== */
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
    'sunpad-v41': 'v41：数据玩法四件套——周期账单、预算月底预测、运动×心情关联洞察、月度回顾海报',
    'sunpad-v40': 'v40：快速四件套——全局搜索Ctrl+K、番茄专注钟、倒数日、随手笔记',
    'sunpad-v39': 'v39：提醒升级系统级通知（SW通道支持iOS主屏+设置页授权按钮+通知点击聚焦）',
    'sunpad-v38': 'v38：架构升级——主逻辑拆分为10个页面模块+回归冒烟测试网',
    'sunpad-v37': 'v37：深度洞察——周报/月报/趋势报告一键生成',
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
    const notes = CHANGELOG[Object.keys(CHANGELOG)[0]] || '已发布新版本';
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
      if (act && act.dataset.page === 'ledger' && RENDER.ledger) RENDER.ledger();
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

  function startReminderCheck() {
    let lastFired = {};
    const fire = (label, sub) => {
      C.Toast(`${label} 时间到 · ${sub}`, 6000);
      /* 系统级通知：优先 Service Worker 通道（iOS 主屏 PWA 唯一可用通道，桌面/Android 通用），
         回退 new Notification；都失败时静默，上方 Toast 已兜底 */
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const title = label + ' 时间到';
          const opt = { body: sub, tag: 'sunpad-reminder', icon: './icons/icon-192.png' };
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready
              .then(r => r.showNotification(title, opt))
              .catch(() => { try { new Notification(title, opt); } catch (e) {} });
          } else {
            new Notification(title, opt);
          }
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
    /* 系统通知权限（本地零后端方案：App 打开期间到点弹系统级通知） */
    const notifyRow = el('div', 'set-row');
    notifyRow.innerHTML = `<div><div class="sr-label">🔔 系统通知</div><div class="sr-sub">授权后到点弹系统级通知（iOS 需从主屏幕图标打开本应用）</div></div>`;
    const notifyBtn = el('button', 'btn-pill', '去授权');
    const syncNotifyBtn = () => {
      if (!('Notification' in window)) { notifyBtn.textContent = '不支持'; notifyBtn.disabled = true; return; }
      const p = Notification.permission;
      notifyBtn.textContent = p === 'granted' ? '已授权 ✓' : (p === 'denied' ? '被拒绝' : '去授权');
      if (p === 'denied') notifyBtn.disabled = true;
    };
    syncNotifyBtn();
    notifyBtn.onclick = () => {
      if (!('Notification' in window)) return;
      Promise.resolve(Notification.requestPermission()).then(p => {
        syncNotifyBtn();
        C.Toast(p === 'granted' ? '系统通知已开启 🔔' : '未获得通知权限');
      }).catch(() => {});
    };
    const notifyCtrl = el('div', 'sr-ctrl');
    notifyCtrl.appendChild(notifyBtn);
    notifyRow.appendChild(notifyCtrl);
    sec4.appendChild(notifyRow);
    const note = el('div', 'set-note', 'ℹ️ 纯前端限制：锁屏/后台推送需 Web Push 服务端（已评估不做，国内 Chrome 推送通道 FCM 不可达）。已授权系统通知时，App 打开期间到点会弹系统级通知；未授权则弹应用内提醒。需要完全离线的锁屏提醒请用手机自带闹钟。');
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
    go: switchPage, // 供内联链接/外部调用跳转板块
    /* 页面注册：js/pages/*.js 调用 App.page('name', renderFn) 挂进 RENDER 注册表 */
    page(name, fn) { RENDER[name] = fn; },
    /* 跨文件共享上下文：页面文件 const { … } = App.ctx 解构使用（core 内部符号的只读出口） */
    ctx: {
      C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF,
      renderTopDate, setFab, bodyLog, ledgerAll, catColor,
      ymd, parseYmd, addDays, diffDays, monthGrid,
      periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive,
      habitsData, habitStreak,
      startRecognition, stopRecognition,
      gradeRead, scoreComment, followCard, renderFollow,
      applyTheme, showUpdateBanner, renderLedgerSafe,
      exportBackup, importBackup, startReminderCheck, openSettings
    },
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
