// Слой данных. Сейчас хранит всё в localStorage этого браузера.
// Все методы асинхронные: чтобы подключить бэкенд, достаточно заменить
// реализацию на fetch к API, не трогая интерфейс страниц.
import { SEED } from './seed.js';

const KEY = 'tcc.state.v3';
const SESSION = 'tcc.me';
const clone = (o) => JSON.parse(JSON.stringify(o));

function safe(fn, fallback = null) { try { return fn(); } catch { return fallback; } }

function read() {
  const raw = safe(() => localStorage.getItem(KEY));
  const data = raw ? safe(() => JSON.parse(raw)) : null;
  if (data && data.version === SEED.version) return data;
  const fresh = clone(SEED);
  write(fresh);
  return fresh;
}
function write(state) { safe(() => localStorage.setItem(KEY, JSON.stringify(state))); }

let state = read();
const listeners = new Set();
function commit() { write(state); listeners.forEach((f) => f(state)); }

// синхронизация между вкладками
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = read(); listeners.forEach((f) => f(state)); } });

export class StoreError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export const store = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // --- сессия студента ---
  meCode() { return safe(() => sessionStorage.getItem(SESSION)); },
  async me() { const c = this.meCode(); return c ? state.students.find((s) => s.code === c) || null : null; },
  async login(code) {
    const c = String(code || '').trim().toUpperCase();
    const s = state.students.find((x) => x.code === c);
    if (!s) throw new StoreError('not_found', 'Код не найден. Проверь, как его написал преподаватель.');
    safe(() => sessionStorage.setItem(SESSION, c));
    listeners.forEach((f) => f(state));
    return s;
  },
  async logout() { safe(() => sessionStorage.removeItem(SESSION)); listeners.forEach((f) => f(state)); },

  // --- каталог ---
  async products() { return state.products; },
  async product(id) { return state.products.find((p) => p.id === id) || null; },
  async categories() { return [...new Set(state.products.map((p) => p.cat))]; },

  // --- покупки ---
  async buy(id) {
    const s = await this.me();
    if (!s) throw new StoreError('auth', 'Сначала войди по коду студента.');
    const p = state.products.find((x) => x.id === id);
    if (!p || p.stock < 1) throw new StoreError('stock', 'Товар закончился.');
    if (s.balance < p.price) throw new StoreError('money', `Не хватает ${(p.price - s.balance).toLocaleString('ru-RU')} коинов.`);
    s.balance -= p.price; p.stock -= 1;
    if (s.goal === p.id) s.goal = null;
    const order = { id: Date.now(), code: s.code, name: s.name, productId: p.id, item: p.name, emoji: p.emoji, price: p.price, status: 'new', date: Date.now() };
    state.orders.unshift(order);
    state.tx.unshift({ id: Date.now() + 1, code: s.code, amount: -p.price, reason: 'Маркет: ' + p.name, date: Date.now() });
    commit();
    return order;
  },
  async setGoal(id) {
    const s = await this.me(); if (!s) throw new StoreError('auth', 'Сначала войди по коду студента.');
    s.goal = s.goal === id ? null : id; commit(); return s.goal;
  },
  async myOrders() { const c = this.meCode(); return state.orders.filter((o) => o.code === c); },
  async myTx() { const c = this.meCode(); return state.tx.filter((t) => t.code === c); },

  // --- админка ---
  async students() { return state.students; },
  async orders() { return state.orders; },
  async tx() { return state.tx; },
  async award(code, amount, reason) {
    const s = state.students.find((x) => x.code === code);
    const n = Math.trunc(Number(amount));
    if (!s) throw new StoreError('not_found', 'Студент не найден.');
    if (!n) throw new StoreError('amount', 'Укажи количество коинов.');
    if (s.balance + n < 0) throw new StoreError('amount', 'Нельзя списать больше, чем есть на балансе.');
    s.balance += n;
    state.tx.unshift({ id: Date.now(), code, amount: n, reason: reason || 'Начисление', date: Date.now() });
    commit(); return s;
  },
  async addStudent(name, code) {
    const n = String(name || '').trim();
    if (!n) throw new StoreError('name', 'Введи имя студента.');
    let c = String(code || '').trim().toUpperCase();
    if (!c) { let i = 1001; while (state.students.some((s) => s.code === 'TCC-' + i)) i++; c = 'TCC-' + i; }
    if (!/^[A-Z0-9-]{3,20}$/.test(c)) throw new StoreError('code', 'Код: латиница, цифры и дефис, от 3 до 20 символов.');
    if (state.students.some((s) => s.code === c)) throw new StoreError('code', 'Такой код уже есть.');
    const s = { code: c, name: n, balance: 0, goal: null };
    state.students.push(s); commit(); return s;
  },
  async removeStudent(code) { state.students = state.students.filter((s) => s.code !== code); commit(); },
  async setOrderStatus(id, status) { const o = state.orders.find((x) => x.id === id); if (o) { o.status = status; commit(); } },
  async saveProduct(p) {
    const name = String(p.name || '').trim();
    const price = Math.trunc(Number(p.price)); const stock = Math.trunc(Number(p.stock));
    if (!name) throw new StoreError('name', 'Введи название товара.');
    if (!(price > 0)) throw new StoreError('price', 'Цена должна быть больше нуля.');
    if (!(stock >= 0)) throw new StoreError('stock', 'Остаток не может быть отрицательным.');
    const clean = { id: p.id || Math.max(0, ...state.products.map((x) => x.id)) + 1, name, price, stock, cat: String(p.cat || 'Другое').trim() || 'Другое', emoji: String(p.emoji || '🎁').trim() || '🎁' };
    const i = state.products.findIndex((x) => x.id === clean.id);
    if (i >= 0) state.products[i] = clean; else state.products.push(clean);
    commit(); return clean;
  },
  async removeProduct(id) { state.products = state.products.filter((p) => p.id !== id); commit(); },
  async exportJSON() { return JSON.stringify(state, null, 2); },
  async importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.students) || !Array.isArray(d.products)) throw new StoreError('format', 'Файл не похож на выгрузку сайта.');
    state = { version: SEED.version, students: d.students, products: d.products, orders: d.orders || [], tx: d.tx || [] };
    commit();
  },
  async reset() { state = clone(SEED); commit(); }
};
