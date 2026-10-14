/* ==========================================================
   小王的工作台 — 核心引擎
   1) 日期种子伪随机：保证「同一天内容稳定、跨天必定翻新」
   2) 本地存储封装（记账 / 任务 / 体重 / 阅读记录 全部离线持久化）
   3) 抖音直达：每日轮换关键词，跳转抖音实时热门（内容天然每天新）
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------- 日期工具 ---------- */
  const DAY_MS = 86400000;
  // 以 2024-01-01 为纪元，计算「第几天」，作为一切轮换的基准
  const EPOCH = Date.UTC(2024, 0, 1);

  function todayStr(d) {
    d = d || new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function dayIndex(d) {
    d = d || new Date();
    const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((utc - EPOCH) / DAY_MS);
  }
  function weekIndex(d) {
    return Math.floor(dayIndex(d) / 7);
  }
  function monthStr(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function prevMonthStr(d) {
    d = d || new Date();
    const x = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return monthStr(x);
  }

  /* ---------- 种子伪随机（mulberry32） ---------- */
  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 创建一个「按周期翻新」的随机源
   * @param {string} key  业务标识，不同板块互不干扰
   * @param {string} period 'day' | 'week'
   */
  function rngFor(key, period, forceIdx) {
    const idx = forceIdx != null ? forceIdx : (period === 'week' ? weekIndex() : dayIndex());
    return mulberry32(hashStr(key + '#' + idx));
  }

  /**
   * 核心：从内容池中取 n 条，保证
   *  - 同一天多次进入结果一致
   *  - 相邻若干天不重复（用「游标 + 洗牌」双保险）
   */
  function pickDaily(pool, n, key, period, forceIdx) {
    if (!pool || !pool.length) return [];
    n = Math.min(n, pool.length);
    const idx = forceIdx != null ? forceIdx : (period === 'week' ? weekIndex() : dayIndex());
    const rnd = rngFor(key, period, forceIdx);

    // 1. 按「轮次」把池子整体洗牌，同一轮内顺序固定
    const round = Math.floor((idx * n) / pool.length);
    const shuffleRnd = mulberry32(hashStr(key + '@round' + round));
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // 2. 游标顺序取，保证一轮内绝不重复
    const start = (idx * n) % pool.length;
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[(start + i) % arr.length]);
    // 3. 轻微扰动展示顺序
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function pickOne(pool, key, period) {
    return pickDaily(pool, 1, key, period)[0];
  }

  /* ---------- 本地存储 ---------- */
  const NS = 'sunpad:';
  const Store = {
    get(k, def) {
      try {
        const v = localStorage.getItem(NS + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; }
      catch (e) { console.warn('存储失败', e); return false; }
    },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
    /** 按天存取：自动带日期后缀 */
    dayGet(k, def) { return Store.get(k + ':' + todayStr(), def); },
    daySet(k, v) { return Store.set(k + ':' + todayStr(), v); },
    /**
     * 清理过期的按天键：sunpad:<key>:YYYY-MM-DD 超过 keepDays 天即删除。
     * 防止长期使用后 localStorage 键无限累积逼近 5MB 配额。
     * 长期数据（记账/体重/心情等不带日期后缀的键）不受影响。
     */
    pruneOldDays(keepDays) {
      keepDays = keepDays || 30;
      try {
        const cutoff = new Date(Date.now() - keepDays * DAY_MS);
        const cutoffStr = todayStr(cutoff);
        const stale = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || k.indexOf(NS) !== 0) continue;
          // 形如 sunpad:*:YYYY-MM-DD（最后一段是日期）
          const m = k.match(/^(.*):(\d{4}-\d{2}-\d{2})$/);
          if (m && m[2] < cutoffStr) stale.push(k);
        }
        stale.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
        return stale.length;
      } catch (e) { return 0; }
    }
  };

  /* ---------- 抖音直达 ----------
     纯前端无法（也不应）绕过抖音风控去抓取视频流。
     这里采用「每日轮换关键词 → 跳转抖音实时搜索/话题」的方式：
     打开的永远是抖音当下的热门结果，天然每天不同、绝不循环。 */
  function douyinSearch(keyword) {
    return 'https://www.douyin.com/search/' + encodeURIComponent(keyword);
  }
  function openDouyin(keyword) {
    const url = douyinSearch(keyword);
    try { window.open(url, '_blank', 'noopener'); }
    catch (e) { location.href = url; }
  }

  /* ---------- 语音（TTS） ---------- */
  const TTS = {
    _voices: [],
    init() {
      if (!('speechSynthesis' in window)) return;
      const load = () => { TTS._voices = speechSynthesis.getVoices() || []; };
      load();
      speechSynthesis.onvoiceschanged = load;
    },
    // 判断某语言是否有可用声线（前端提示用）
    has(lang) {
      const vs = TTS._voices.length ? TTS._voices : (window.speechSynthesis ? speechSynthesis.getVoices() : []);
      lang = (lang || '').toLowerCase();
      if (lang === 'zh-hk' || lang.indexOf('yue') === 0) {
        return vs.some(x => x.lang && (x.lang.toLowerCase() === 'zh-hk' || x.lang.toLowerCase().indexOf('yue') === 0));
      }
      const want = lang.slice(0, 2);
      return vs.some(x => x.lang && x.lang.toLowerCase().startsWith(want));
    },
    // 选择最贴近目标语言的声线；粤语必须选真·粤语声线，绝不能用普通话声线冒充
    pick(lang) {
      const vs = TTS._voices.length ? TTS._voices : (window.speechSynthesis ? speechSynthesis.getVoices() : []);
      if (!vs.length) return null;
      lang = (lang || '').toLowerCase();
      // 粤语专用分支：只接受 lang 为 zh-HK 或 yue* 的声线
      if (lang === 'zh-hk' || lang.indexOf('yue') === 0) {
        const yue = vs.filter(x => x.lang && (x.lang.toLowerCase() === 'zh-hk' || x.lang.toLowerCase().indexOf('yue') === 0));
        if (yue.length) {
          const named = yue.find(x => /cantonese|粵|hk|hong\s*kong|sin[- ]|yue/i.test(x.name || ''));
          return named || yue[0];
        }
        return null; // 没有粤语声线
      }
      const want = lang.slice(0, 2);
      let v = vs.find(x => x.lang && x.lang.toLowerCase().startsWith(want) && /female|women|xiaoxiao|mei|siri|google/i.test(x.name));
      if (!v) v = vs.find(x => x.lang && x.lang.toLowerCase().startsWith(want));
      return v || null;
    },
    speak(text, lang, rate) {
      if (!('speechSynthesis' in window)) { Toast('当前浏览器不支持语音朗读'); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'en-US';
      u.rate = rate || 0.92;
      u.pitch = 1;
      const v = TTS.pick(u.lang);
      if (v) u.voice = v;
      else if ((lang || '').toLowerCase() === 'zh-hk' || (lang || '').toLowerCase().indexOf('yue') === 0) {
        Toast('未检测到标准粵語語音包，朗讀可能變成普通話。請在系統語音設置安裝「中文（香港）」後重試');
      }
      speechSynthesis.speak(u);
      return u;
    },
    stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  };

  /* ---------- 轻提示 ---------- */
  let toastTimer = null;
  function Toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  /* ---------- 复制 ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      Toast('已复制到剪贴板 ✓');
      return true;
    } catch (e) { Toast('复制失败，请长按选择文本'); return false; }
  }

  /* ---------- 工具 ---------- */
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function fmtMoney(n) {
    return '¥' + (Number(n) || 0).toFixed(2);
  }

  global.Core = {
    todayStr, dayIndex, weekIndex, monthStr, prevMonthStr,
    pickDaily, pickOne, rngFor, hashStr, mulberry32,
    Store, douyinSearch, openDouyin, TTS, Toast, copyText, esc, uid, fmtMoney
  };
})(window);
