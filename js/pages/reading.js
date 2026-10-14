/* ==========================================================
   小王的工作台 — 页面模块：reading.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;


  function renderReading() {
    const box = $('#panel');
    box.innerHTML = '';
    setFab(null);
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
    setFab(fab);

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

  App.page('reading', renderReading);
  App.page('learn', renderLearn);
})(window);
