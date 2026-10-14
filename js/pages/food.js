/* ==========================================================
   小王的工作台 — 页面模块：food.js
   由 tools/split.js 从 app.js 机械拆出（勿手工回填，改 app.js 后重跑）
   通过 App.page() 向 core 注册渲染函数
   ========================================================== */
(function (global) {
  'use strict';
  const { C, S, $, el, card, dyCard, CATS, PAGE_INFO, TABS, PAGES, TAB_OF, renderTopDate, setFab, bodyLog, ledgerAll, catColor, ymd, parseYmd, addDays, diffDays, monthGrid, periodStore, periodDaysArr, periodClusters, predictPeriod, isPeriodActive, habitsData, habitStreak, startRecognition, stopRecognition, gradeRead, scoreComment, followCard, renderFollow, applyTheme, showUpdateBanner, renderLedgerSafe, exportBackup, importBackup, startReminderCheck, openSettings } = App.ctx;
  const switchPage = App.go;

  function renderFood() {
    const box = $('#panel');
    box.innerHTML = '';
    const ph = el('div', 'page-head');
    ph.innerHTML = `<div class="ph-ic">🍲</div><div><h2>今日菜谱</h2><p>每天更新 · 今日推荐 + 搜索你想做的菜</p></div>`;
    box.appendChild(ph);

    /* 搜索栏 */
    const searchWrap = el('div', 'food-search');
    searchWrap.innerHTML = `
      <span class="fs-ic">🔍</span>
      <input type="text" id="foodSearch" class="fs-input" placeholder="搜想做的菜，如：豆腐 / 鸡肉 / 鱼香 / 凉拌" maxlength="20">
      <button class="fs-clear" id="foodClear" style="display:none">✕</button>`;
    box.appendChild(searchWrap);

    /* 食材库存（一键匹配可做菜谱） */
    const pantry = S.get('food_pantry', []);
    const pantryBar = el('div', 'card');
    pantryBar.innerHTML = `<div class="card-title">🧊 食材库存 <span class="set-note" style="margin-left:auto;font-weight:400">录入现有食材，一键匹配可做菜谱</span></div>`;
    const pantryInput = el('div', 'food-search');
    pantryInput.innerHTML = `<span class="fs-ic">🥕</span><input type="text" id="pantryInp" class="fs-input" placeholder="输入食材，如：鸡蛋、土豆…"><button class="fs-clear" id="pantryAdd" style="background:var(--primary);color:#fff;border-radius:8px;width:auto;padding:0 10px;font-size:12px">＋</button>`;
    pantryBar.appendChild(pantryInput);
    if (pantry.length) {
      const tagW = el('div', 'pill-row');
      pantry.forEach((p, i) => {
        const b = el('button', 'pill on', p + ' ✕');
        b.onclick = () => { pantry.splice(i, 1); S.set('food_pantry', pantry); renderFood(); };
        tagW.appendChild(b);
      });
      pantryBar.appendChild(tagW);
      const matchBtn = el('button', 'btn-pill', '🔍 匹配可做菜谱');
      matchBtn.onclick = () => {
        const matched = DATA_FOOD.filter(d => pantry.some(p => (d.ing || []).some(ing => ing.includes(p))));
        if (!matched.length) return C.Toast('没有匹配的菜谱，试试添加更多食材');
        const resWrap = box.querySelector('.food-results') || box.appendChild(el('div', 'food-results'));
        resWrap.style.display = 'block';
        resWrap.innerHTML = `<div class="res-count">🧊 匹配到 ${matched.length} 道可做菜谱</div>` +
          matched.map(d => `<div class="card recipe-card">${recipeCardHtml(d, '', '🧊')}</div>`).join('');
        resWrap.querySelectorAll('.recipe-search').forEach((b, i) => b.onclick = () => C.openDouyin(matched[i].kw));
        resWrap.querySelectorAll('.recipe-video').forEach((b, i) => b.onclick = () => C.openDouyin(matched[i].kw));
      };
      pantryBar.appendChild(matchBtn);
    }
    box.appendChild(pantryBar);
    pantryInput.querySelector('#pantryAdd').onclick = () => {
      const v = pantryInput.querySelector('#pantryInp').value.trim();
      if (!v || pantry.includes(v)) return;
      pantry.push(v); S.set('food_pantry', pantry); renderFood();
    };

    /* 功能标签筛选 */
    const tags = ['全部', '低卡减脂', '经期暖宫', '一人食', '快手菜', '川菜', '家常菜', '烘焙'];
    const tagBar = el('div', 'tabs food-cats');
    let activeTag = '全部';
    tags.forEach(t => {
      const b = el('button', 'tab' + (t === activeTag ? ' active' : ''), t);
      b.onclick = () => {
        activeTag = t;
        tagBar.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.textContent === t));
        doSearch(input.value, activeTag);
      };
      tagBar.appendChild(b);
    });
    box.appendChild(tagBar);

    /* 经期联动：暖宫提示 */
    if (isPeriodActive()) {
      box.appendChild(el('div', 'notice', '🌸 经期中 · 注意饮食温补，避免寒凉辛辣'));
    }

    const today = C.pickDaily(DATA_FOOD, 1, 'food')[0];
    const tomorrow = C.pickDaily(DATA_FOOD, 1, 'food', 'day', C.dayIndex() + 1)[0];

    const defWrap = el('div', 'food-default');
    const todayCard = el('div', 'card recipe-card today');
    todayCard.innerHTML = recipeCardHtml(today, '今日推荐', '🔥');
    todayCard.querySelector('.recipe-search').onclick = () => C.openDouyin(today.kw);
    todayCard.querySelector('.recipe-video').onclick = () => C.openDouyin(today.kw);
    defWrap.appendChild(todayCard);

    const tomorrowCard = el('div', 'card recipe-card');
    tomorrowCard.innerHTML = recipeCardHtml(tomorrow, '明日预告', '📅');
    tomorrowCard.querySelector('.recipe-search').onclick = () => C.openDouyin(tomorrow.kw);
    tomorrowCard.querySelector('.recipe-video').onclick = () => C.openDouyin(tomorrow.kw);
    defWrap.appendChild(tomorrowCard);

    defWrap.appendChild(el('div', 'notice',
      `今日推荐来自 <b>${DATA_FOOD.length}</b> 道菜库（川菜 / 家常菜 / 减脂餐 / 烘焙），每天自动换新；上方可搜菜名 / 食材 / 口味，或按分类筛选。点击按钮直达抖音搜索。`));
    box.appendChild(defWrap);

    const resWrap = el('div', 'food-results');
    box.appendChild(resWrap);

    const input = searchWrap.querySelector('#foodSearch');
    const clearBtn = searchWrap.querySelector('#foodClear');

    /* 智能标签匹配函数 */
    function foodHasTag(d, tag) {
      const hay = [d.n, d.tag, d.kw, d.tip, (d.ing || []).join(' ')].join(' ').toLowerCase();
      const cat = (d.cat || '川菜');
      if (tag === '全部') return true;
      if (tag === '川菜') return cat === '川菜';
      if (tag === '家常菜') return cat === '家常菜';
      if (tag === '烘焙') return cat === '烘焙';
      if (tag === '低卡减脂') return cat === '减脂餐' || hay.includes('低卡') || hay.includes('减脂') || hay.includes('鸡胸') || hay.includes('沙拉');
      if (tag === '经期暖宫') return hay.includes('红糖') || hay.includes('姜') || hay.includes('暖') || hay.includes('温补') || hay.includes('红枣') || hay.includes('桂圆');
      if (tag === '一人食') return hay.includes('简单') || hay.includes('快手') || hay.includes('速') || d.t.includes('15分') || d.t.includes('10分');
      if (tag === '快手菜') return hay.includes('快手') || d.t.includes('15分') || d.t.includes('10分') || d.t.includes('20分');
      return false;
    }
    function doSearch(q, tag) {
      q = (q || '').trim();
      tag = tag || '全部';
      if (!q && tag === '全部') {
        defWrap.style.display = '';
        resWrap.style.display = 'none';
        resWrap.innerHTML = '';
        clearBtn.style.display = 'none';
        return;
      }
      clearBtn.style.display = '';
      defWrap.style.display = 'none';
      resWrap.style.display = 'block';
      const kw = q.toLowerCase();
      const hits = DATA_FOOD.filter(d => {
        if (!foodHasTag(d, tag)) return false;
        if (!kw) return true;
        const hay = [d.n, d.tag, d.kw, d.tip, (d.ing || []).join(' '), (d.step || []).join(' ')]
          .join(' ').toLowerCase();
        return hay.includes(kw);
      });
      if (!hits.length) {
        const scope = tag !== '全部' ? `「${tag}」` : '';
        resWrap.innerHTML = `<div class="notice warn">没有找到${scope}与「${C.esc(q)}」相关的菜，换个关键词试试～</div>`;
        return;
      }
      const scope = tag !== '全部' ? `（${tag}）` : '';
      resWrap.innerHTML = `<div class="res-count">找到 <b>${hits.length}</b> 道相关菜${scope}</div>`;
      hits.forEach(d => {
        const c = el('div', 'card recipe-card');
        c.innerHTML = recipeCardHtml(d, '搜索结果', '🔍');
        c.querySelector('.recipe-search').onclick = () => C.openDouyin(d.kw);
        c.querySelector('.recipe-video').onclick = () => C.openDouyin(d.kw);
        resWrap.appendChild(c);
      });
    }
    input.oninput = e => doSearch(e.target.value, activeTag);
    clearBtn.onclick = () => {
      input.value = '';
      activeTag = '全部';
      tagBar.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.textContent === '全部'));
      doSearch('', '全部');
      input.focus();
    };
  }

  function recipeCardHtml(d, label, icon) {
    return `
      <div class="recipe-label"><span>${icon}</span>${label}</div>
      <div class="recipe-hero">
        <div class="rh-ic">🍳</div>
        <div>
          <div class="rh-t">${C.esc(d.n)}</div>
          <div class="rh-meta">
            <span class="pill">${d.lv}</span><span class="pill gray">${d.t}</span><span class="pill gray">${d.tag}</span>
          </div>
        </div>
      </div>
      <div class="rec-section">
        <h4>🥬 食材</h4>
        <div class="ing-list">${d.ing.map(i => `<span class="ing-tag">${C.esc(i)}</span>`).join('')}</div>
      </div>
      ${d.sauce ? `<div class="rec-section"><h4>🧪 灵魂酱汁</h4><div class="ing-list"><span class="ing-tag" style="background:#FFF6EC">${C.esc(d.sauce)}</span></div></div>` : ''}
      <div class="rec-section">
        <h4>👨‍🍳 做法</h4>
        ${d.step.map((s, i) => `
          <div class="step-item"><div class="step-num">${i + 1}</div><div class="step-tx">${C.esc(s)}</div></div>`).join('')}
      </div>
      <div class="tip-box"><b>💡 小贴士</b> ${C.esc(d.tip)}</div>
      <div class="recipe-actions">
        <button class="recipe-search">📱 下厨房搜「${C.esc(d.n)}」</button>
        <button class="recipe-video">▶ 看视频</button>
      </div>`;
  }

  /* ==========================================================
     十一、每日提醒
     ========================================================== */
  function renderRemind() {
    const box = $('#panel');
    box.innerHTML = '';

    const today = new Date();
    const wk = ['日','一','二','三','四','五','六'][today.getDay()];
    const dateStr = `${today.getMonth()+1}月${today.getDate()}日 周${wk}`;

    let list = S.dayGet('reminders', []);
    const doneCount = list.filter(x => x.done).length;
    const todoCount = list.length - doneCount;

    /* 顶部统计卡 */
    const hero = el('div', 'card hero-card');
    hero.innerHTML = `
      <div class="hero-date">${dateStr}</div>
      <div class="hero-count">${todoCount} 项待办</div>
      <div class="hero-sub">已完成 ${doneCount} 项</div>`;
    box.appendChild(hero);

    /* 添加表单 */
    const formCard = el('div', 'card');
    formCard.innerHTML = `
      <div class="card-title"><span class="ct-ic">➕</span>添加提醒</div>
      <div class="remind-form">
        <div class="rf-row dual">
          <div class="rf-field">
            <label>时间</label>
            <input type="time" id="rmTime" value="09:00">
          </div>
          <div class="rf-field">
            <label>时段</label>
            <select id="rmPeriod">
              <option value="上午">🌅 上午</option>
              <option value="下午">☀️ 下午</option>
              <option value="晚上">🌙 晚上</option>
            </select>
          </div>
        </div>
        <div class="rf-field">
          <label>内容</label>
          <input type="text" id="rmText" placeholder="例如：喂小鸡崽 / 健身打卡 / 喝水" maxlength="60">
        </div>
        <div class="rf-field">
          <label>备注（可选）</label>
          <input type="text" id="rmNote" placeholder="可选补充" maxlength="80">
        </div>
        <button class="rm-add" id="rmAdd">添加提醒</button>
      </div>`;
    box.appendChild(formCard);

    function saveAndRender() {
      S.daySet('reminders', list);
      renderRemind();
    }

    function addReminder() {
      const time = $('#rmTime').value;
      const period = $('#rmPeriod').value;
      const text = $('#rmText').value.trim();
      const note = $('#rmNote').value.trim();
      if (!time) { C.Toast('请选择一个时间'); return; }
      if (!text) { C.Toast('请填写提醒内容'); return; }
      list.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
        time, period, text, note,
        done: false
      });
      list.sort((a,b)=>a.time.localeCompare(b.time));
      saveAndRender();
      C.Toast('提醒已添加');
    }

    formCard.querySelector('#rmAdd').onclick = addReminder;
    formCard.querySelector('#rmText').addEventListener('keypress', e => { if(e.key==='Enter') addReminder(); });

    /* 列表 */
    if (!list.length) {
      const empty = el('div', 'empty-state');
      empty.innerHTML = `<div class="es-ic">⏰</div><div class="es-t">今天还没有提醒</div><div class="es-d">点击上方表单或右下角 + 号添加</div>`;
      box.appendChild(empty);
    } else {
      const listCard = el('div', 'card');
      listCard.innerHTML = `<div class="card-title"><span class="ct-ic">📋</span>今日提醒</div>`;
      list.forEach(item => {
        const row = el('div', 'rm-item' + (item.done ? ' done' : ''));
        row.innerHTML = `
          <div class="rm-check"><input type="checkbox" ${item.done ? 'checked' : ''}></div>
          <div class="rm-body">
            <div class="rm-time">${C.esc(item.period)} · ${C.esc(item.time)}</div>
            <div class="rm-text">${C.esc(item.text)}</div>
            ${item.note ? `<div class="rm-note">${C.esc(item.note)}</div>` : ''}
          </div>
          <button class="rm-del" title="删除">🗑️</button>`;
        row.querySelector('input').onchange = () => {
          item.done = !item.done;
          saveAndRender();
        };
        row.querySelector('.rm-del').onclick = () => {
          if (confirm('确定删除这条提醒吗？')) {
            list = list.filter(x => x.id !== item.id);
            saveAndRender();
          }
        };
        listCard.appendChild(row);
      });
      box.appendChild(listCard);
    }

    /* 说明 */
    box.appendChild(el('div', 'notice warn',
      `<b>💡 关于提醒</b><br>纯前端 PWA 在 iOS 上无法锁屏/后台推送。提醒会在当天打开工作台后，到点弹出提示；安卓 Chrome 可额外尝试系统通知。`));

    /* 右下角 FAB */
    const fab = el('button', 'fab');
    fab.innerHTML = '＋';
    fab.title = '快速添加';
    fab.onclick = () => {
      $('#rmText').focus();
      $('#panel').scrollTo({ top: formCard.offsetTop - 20, behavior: 'smooth' });
    };
    document.body.appendChild(fab);
    setFab(fab);
  }

  /* ========== 入口 ========== */
  /* ==========================================================
      新增 P0 — 通用日期/经期/习惯 工具
      ========================================================== */

  App.page('food', renderFood);
  App.page('remind', renderRemind);
})(window);
