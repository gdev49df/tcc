// Общие помощники интерфейса: форматирование, иконки, окна, уведомления.
import { store } from './store.js';

export const num = (n) => Number(n).toLocaleString('ru-RU');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const date = (t) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const COIN = 'assets/coin.png';
export const coin = (cls = 'coin') => `<img class="${cls}" src="${COIN}" alt="" width="64" height="64">`;
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const icon = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>'
};

// ---------- уведомление ----------
let toastEl, toastT;
export function toast(msg, bad = false) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.append(toastEl); }
  toastEl.textContent = msg; toastEl.classList.toggle('toast--bad', bad);
  requestAnimationFrame(() => toastEl.classList.add('is-on'));
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
}

// ---------- лист снизу (на компьютере — окно по центру) ----------
export function sheet(html, { label = 'Окно' } = {}) {
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = `<div class="sheet__bg" data-close></div><div class="sheet__box" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="grab"></div><button class="sheet__x" data-close aria-label="Закрыть">${icon.x}</button><div class="sheet__body">${html}</div></div>`;
  document.body.append(el);
  const prev = document.activeElement;
  const box = el.querySelector('.sheet__box');
  const close = () => {
    el.classList.remove('is-open'); document.removeEventListener('keydown', onKey);
    document.documentElement.style.overflow = '';
    setTimeout(() => el.remove(), 450); prev?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // ловушка фокуса
      const f = [...box.querySelectorAll('button,a[href],input,select,textarea')].filter((x) => !x.disabled);
      if (!f.length) return; const first = f[0], last = f.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  // свайп вниз закрывает лист на телефоне
  let y0 = null;
  box.addEventListener('touchstart', (e) => { if (box.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchmove', (e) => { if (y0 == null) return; const dy = Math.max(0, e.touches[0].clientY - y0); box.style.transition = 'none'; box.style.transform = `translateY(${dy}px)`; }, { passive: true });
  box.addEventListener('touchend', (e) => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; box.style.transition = ''; box.style.transform = ''; y0 = null; if (dy > 110) close(); });
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => { el.classList.add('is-open'); (box.querySelector('[autofocus]') || box.querySelector('.sheet__x')).focus({ preventScroll: true }); });
  return { el, box, close };
}

// ---------- вход по коду ----------
export function loginSheet(after) {
  const s = sheet(`<form class="stack" novalidate><h3>Вход по коду студента</h3><p class="muted">Код выдаёт преподаватель, например TCC-1001.</p>
    <div class="field"><label for="lc">Код</label><input class="input" id="lc" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="TCC-1001" autofocus required></div>
    <p class="hint" data-err role="alert"></p><button class="btn btn--acc btn--block" type="submit">Войти</button></form>`, { label: 'Вход' });
  s.box.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { const st = await store.login(e.target.code.value); s.close(); toast('Привет, ' + st.name + '!'); after?.(st); }
    catch (err) { const h = s.box.querySelector('[data-err]'); h.textContent = err.message; h.style.color = 'var(--bad)'; }
  });
}

// ---------- шапка: баланс, меню, тень при прокрутке ----------
export async function refreshHeader() {
  const me = await store.me();
  $$('[data-bal]').forEach((a) => {
    a.classList.toggle('is-guest', !me);
    a.innerHTML = me ? `${coin('')}<span>${num(me.balance)}</span>` : 'Войти';
    a.setAttribute('aria-label', me ? `Мой баланс: ${num(me.balance)} коинов` : 'Войти по коду студента');
  });
}
export function initChrome() {
  const hdr = $('.hdr');
  const onScroll = () => hdr?.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menu = $('#menu');
  const open = (v) => { menu.classList.toggle('is-open', v); menu.setAttribute('aria-hidden', String(!v)); $('#burger').setAttribute('aria-expanded', String(v)); document.documentElement.style.overflow = v ? 'hidden' : ''; if (v) menu.querySelector('a').focus({ preventScroll: true }); };
  $('#burger')?.addEventListener('click', () => open(true));
  menu?.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target.closest('a')) open(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu?.classList.contains('is-open')) open(false); });
  refreshHeader(); store.subscribe(refreshHeader);
}
