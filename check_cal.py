from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
    )
    page = context.new_page()
    page.goto("http://localhost:8766/")
    page.wait_for_load_state("networkidle")
    page.evaluate("""
        const periodDays = {};
        for (let d=9; d<=13; d++) {
            periodDays[`2026-07-${String(d).padStart(2,'0')}`] = { flow: 2, symptoms: [], skin: [], mood: null };
        }
        localStorage.setItem('sunpad:sunpad_last_period', JSON.stringify('2026-07-09'));
        localStorage.setItem('sunpad:sunpad_period_set', JSON.stringify({ avgCycle: 28, avgPeriod: 5 }));
        localStorage.setItem('sunpad:sunpad_period_days', JSON.stringify(periodDays));
    """)
    page.reload(wait_until="networkidle")
    page.click('nav button[data-page="menstrual"]')
    page.wait_for_timeout(1000)

    info = page.evaluate("""() => {
        const grid = document.querySelector('.cal-grid');
        if (!grid) return {error: 'no grid'};
        const gc = window.getComputedStyle(grid);
        const gridRect = grid.getBoundingClientRect();
        const cells = Array.from(grid.children);
        const first = cells[0];
        const firstRect = first.getBoundingClientRect();
        return {
            gridRect: {w: Math.round(gridRect.width), h: Math.round(gridRect.height)},
            gridCols: gc.gridTemplateColumns,
            gridRows: gc.gridTemplateRows,
            cellCount: cells.length,
            firstCellH: Math.round(firstRect.height),
            firstCellInline: first.style.cssText,
            last2Cells: cells.slice(-2).map(c => ({h: Math.round(c.getBoundingClientRect().height), text: c.textContent, css: c.style.cssText}))
        };
    }""")
    print("info:", info)
    out = r"C:\Users\CHENWENBIN\WorkBuddy\2026-08-03-14-08-55\sun-workspace\cal_check.png"
    page.screenshot(path=out, full_page=False)
    browser.close()
    print("saved", out)
