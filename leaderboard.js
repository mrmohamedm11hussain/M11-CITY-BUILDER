/* لوحة أحسن الحسابات (محلية على المتصفح) | M11 */
'use strict';

const Board = (() => {
  const KEY = 'm11-microbus-board';
  const NAME_KEY = 'm11-microbus-name';
  const MAX = 5;

  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* تجاهل */ } };

  function read() {
    try { return JSON.parse(get(KEY)) || []; } catch { return []; }
  }

  return {
    read,
    lastName: () => get(NAME_KEY) || '',
    qualifies(score) {
      const list = read();
      return score > 0 && (list.length < MAX || score > list[list.length - 1].score);
    },
    add(name, score, stop) {
      const clean = name.trim().slice(0, 12) || 'سواق';
      const list = read();
      list.push({ name: clean, score, stop });
      list.sort((a, b) => b.score - a.score);
      set(KEY, JSON.stringify(list.slice(0, MAX)));
      set(NAME_KEY, clean);
    },
  };
})();
