/* ==========================================================
   小王的工作台 — 页面模块：media.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

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
      if (sub) sub.textContent = C.todayStr() + (isLive ? ' · 实时要闻' : ' · 离线精选（实时源暂不可用）');
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
    /* 旧版缓存结构兼容：有 link 才当实时（否则点开是百度搜索） */
    const cacheOk = cache && cache.ts && (Date.now() - cache.ts < 30 * 60 * 1000)
      && cache.list && cache.list.length && cache.list.some(x => x.link);
    if (cacheOk) {
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

  /* 实时新闻：双通道拉取（v41.2 换源）。
     源清单经 2026-10-14 实测筛选：36氪经 rss2json 服务端抓取可绕过反爬；
     cnBeta/少数派直连不稳、人民网 RSS 冻结于 2025-06 —— 已全部拉黑。
     通道A（首选）：rss2json.com 把 RSS 转 JSON，自带 CORS（*），浏览器直连。
     通道B（兜底）：api.allorigins.win 裸代理拉 XML（服务偶发 408/超时，仅兜底）。
     两通道都挂则回退本地 NEWS_POOL（renderList 标「离线精选」，不冒充实时）。 */
  const NEWS_FEEDS = [
    { name: 'IT之家', url: 'https://www.ithome.com/rss' },
    { name: '36氪', url: 'https://36kr.com/feed' },
    { name: '少数派', url: 'https://sspai.com/feed' },
    { name: '极客公园', url: 'https://www.geekpark.net/rss' },
    { name: '量子位', url: 'https://www.qbitai.com/feed' },
    { name: '爱范儿', url: 'https://www.ifanr.com/feed' }
  ];
  const NEWS_TIMEOUT_MS = 9000;

  function parseRssXml(txt, name) {
    const out = [];
    const doc = new DOMParser().parseFromString(txt, 'text/xml');
    doc.querySelectorAll('item, entry').forEach(it => {
      const title = (it.querySelector('title')?.textContent || '').trim();
      if (!title) return;
      const linkEl = it.querySelector('link');
      const link = (linkEl?.textContent || linkEl?.getAttribute('href') || '').trim();
      const dEl = it.querySelector('pubDate, published, updated');
      const raw = dEl?.textContent?.trim() || '';
      out.push({ t: title, src: name, link, time: fmtNewsTime(raw), ts: Date.parse(raw) || 0 });
    });
    return out;
  }

  async function fetchViaRss2json(f, signal) {
    const u = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(f.url) + '&count=20';
    const res = await fetch(u, { signal, cache: 'no-store' });
    if (!res.ok) return [];
    const j = await res.json();
    if (j.status !== 'ok' || !Array.isArray(j.items)) return [];
    return j.items.map(x => ({
      t: (x.title || '').trim(),
      src: f.name,
      link: (x.link || '').trim(),
      time: fmtNewsTime(x.pubDate || ''),
      ts: Date.parse(x.pubDate) || 0
    })).filter(x => x.t);
  }

  async function fetchViaAllorigins(f, signal) {
    const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(f.url), { signal, cache: 'no-store' });
    if (!res.ok) return [];
    return parseRssXml(await res.text(), f.name);
  }

  async function loadLiveNews() {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), NEWS_TIMEOUT_MS);
    const out = [];
    /* 先整批走通道A；A 一条都没出（服务挂/被墙）才整批降级通道B */
    let viaA = 0;
    const results = await Promise.all(NEWS_FEEDS.map(async f => {
      try {
        let r = await fetchViaRss2json(f, ctrl.signal);
        if (r.length) viaA++;
        if (!r.length) r = await fetchViaAllorigins(f, ctrl.signal);
        return r;
      } catch (e) { return []; }
    }));
    results.forEach(r => { if (r.length) out.push(...r); });
    clearTimeout(to);
    if (!viaA) console.info('[news] rss2json 全部失败，已尝试 allorigins 兜底');
    /* 按时间去重排序（同题多源只留最新），取 30 条 */
    const seen = new Set();
    const uniq = [];
    out.sort((a, b) => b.ts - a.ts).forEach(x => {
      const k = x.t.slice(0, 24);
      if (seen.has(k)) return;
      seen.add(k); uniq.push(x);
    });
    return uniq.slice(0, 30);
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

  App.page('news', renderNews);
  App.page('weather', renderWeather);
})(window);
