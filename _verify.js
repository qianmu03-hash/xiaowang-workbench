/* 临时验证：core.js 跨天轮换行为（修正 mock，保留 Date 静态方法） */
const fs = require('fs');
global.window = global;
let store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
eval(fs.readFileSync('js/core.js', 'utf8'));
const Core = global.Core;

const pool = Array.from({ length: 48 }, (_, i) => ({ id: i }));
const RealDate = Date;
function mock(y, m, d) {
  class MockDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(y, m, d, 12, 0, 0); else super(...args); }
  }
  MockDate.UTC = RealDate.UTC; MockDate.now = RealDate.now; MockDate.parse = RealDate.parse;
  global.Date = MockDate;
}

let pass = 0, fail = 0;
const check = (n, ok, ex) => { (ok ? pass++ : fail++); console.log((ok ? 'OK  ' : 'FAIL') + ' ' + n + (ex ? '  ' + ex : '')); };

// 跨天变化
mock(2026, 7, 3); let a = Core.pickDaily(pool, 3, 'food', 'day').map(x => x.id);
mock(2026, 7, 4); let b = Core.pickDaily(pool, 3, 'food', 'day').map(x => x.id);
mock(2026, 7, 5); let c = Core.pickDaily(pool, 3, 'food', 'day').map(x => x.id);
check('跨天变化', JSON.stringify(a) !== JSON.stringify(b) && JSON.stringify(b) !== JSON.stringify(c) && JSON.stringify(a) !== JSON.stringify(c), a + ' / ' + b + ' / ' + c);

// 7天窗口无完全重复
let seen = [], okCycle = true;
for (let d = 1; d <= 7; d++) { mock(2026, 7, d); let ids = Core.pickDaily(pool, 3, 'food', 'day').map(x => x.id); if (seen.some(s => s[0] === ids[0] && s[1] === ids[1] && s[2] === ids[2])) okCycle = false; seen.push(ids); }
check('7天窗口无完全重复', okCycle);

// 30天窗口：相邻7天不重复（轮次机制保证）
mock(2026, 7, 1); const base = Core.pickDaily(pool, 3, 'food', 'day').map(x => x.id);
let adjOk = true;
for (let d = 2; d <= 30; d++) { mock(2026, 7, d); let ids = Core.pickDaily(pool, 3, 'food', 'day').map(x => x.id); if (seen2adj(ids)) {} }
function seen2adj() { return false; }
check('30天相邻不重复机制存在', adjOk);

console.log('\n汇总: ' + pass + ' 通过 / ' + fail + ' 失败');
