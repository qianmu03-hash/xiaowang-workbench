/* ==========================================================
   小王的工作台 — 页面模块：create.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

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
    setFab(fab);
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

  App.page('create', renderCreate);
  App.page('glam', renderGlam);
  App.page('cosmetics', renderCosmetics);
})(window);
