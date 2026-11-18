// Главная: диалог в герое, параллакс стикеров, счётчик, превью маркета.
import { store } from './store.js';
import { reduced, $, $$ } from './ui.js';
import { tile, openProduct } from './market.js';

function chat() {
  const box = $('#chat'); if (!box) return;
  const msgs = $$('.msg', box), typing = $('.typing', box);
  if (reduced()) { msgs.forEach((m) => m.classList.add('is-on')); return; }
  let i = 0, started = false;
  const next = () => {
    if (i >= msgs.length) { typing.classList.remove('is-on'); return; }
    const m = msgs[i++], fromTeacher = m.classList.contains('msg--t');
    if (fromTeacher) { box.insertBefore(typing, m); typing.classList.add('is-on'); }
    setTimeout(() => { typing.classList.remove('is-on'); m.classList.add('is-on'); setTimeout(next, 650); }, fromTeacher ? 1000 : 450);
  };
  // запускаем, только когда чат виден
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting && !started) { started = true; io.disconnect(); setTimeout(next, 300); } }, { threshold: 0.3 }).observe(box);
}

function parallax() {
  const h = $('.hero'); if (!h || reduced() || !matchMedia('(pointer:fine)').matches) return;
  let raf = 0;
  h.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const r = h.getBoundingClientRect(); h.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5) * 28); h.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5) * 28); });
  });
}

function counter() {
  const n = $('[data-count]'); if (!n) return;
  const to = parseFloat(n.dataset.count);
  if (reduced()) return;
  n.textContent = '0.0';
  new IntersectionObserver((es, io) => {
    if (!es[0].isIntersecting) return; io.disconnect();
    const t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / 1300); n.textContent = (to * (1 - Math.pow(1 - k, 3))).toFixed(1); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }, { threshold: 0.5 }).observe(n);
}

async function peek() {
  const el = $('#peek'); if (!el) return;
  const draw = async () => {
    const me = await store.me();
    const items = (await store.products()).filter((p) => p.stock > 0).sort((a, b) => a.price - b.price).slice(0, 8);
    el.innerHTML = items.map((p, i) => `<div class="peek">${tile(p, me, i)}</div>`).join('');
  };
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (b) openProduct(+b.dataset.pid, [...el.children].indexOf(b.parentElement)); });
  store.subscribe(draw); draw();
}

export function initHome() { chat(); parallax(); counter(); peek(); }
