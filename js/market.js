// Маркет: каталог, поиск, сортировка, окно товара и покупка.
import { store } from './store.js';
import { num, esc, coin, toast, sheet, loginSheet, icon, $ } from './ui.js';

const BG = ['var(--g-yellow)', 'var(--g-blue)', 'var(--g-purple)', 'var(--g-green)'];

export function tile(p, me, i) {
  const out = p.stock < 1;
  const pct = me ? Math.min(100, Math.round((me.balance / p.price) * 100)) : 0;
  const goal = me && me.goal === p.id;
  return `<button class="pr c${i % 4}${out ? ' is-out' : ''}" data-pid="${p.id}" aria-label="${esc(p.name)}, ${num(p.price)} коинов${out ? ', нет в наличии' : ''}">
    ${goal ? '<span class="pr__goal">моя цель</span>' : ''}
    <span class="pr__top"><span class="pr__price">${coin('')}${num(p.price)}</span><span class="pr__plus" aria-hidden="true">+</span></span>
    <span class="pr__emo" aria-hidden="true">${p.emoji}</span>
    <span class="pr__name">${esc(p.name)}</span>
    <span class="pr__meta">${out ? 'нет в наличии' : me ? (pct >= 100 ? 'хватает коинов' : `накоплено ${pct}%`) : 'осталось ' + p.stock}</span>
    ${me && !out && pct < 100 ? `<span class="pr__bar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ''}
  </button>`;
}

export async function openProduct(id, i = 0) {
  const p = await store.product(id); if (!p) return;
  const me = await store.me();
  const left = me ? me.balance - p.price : 0;
  const can = me && left >= 0 && p.stock > 0;
  const s = sheet(`<div class="pd">
    <div class="pd__pic" style="background:${BG[i % 4]}" aria-hidden="true">${p.emoji}</div>
    <div><span class="tag">${esc(p.cat)}</span></div>
    <h3>${esc(p.name)}</h3>
    <div class="pd__price">${num(p.price)} ${coin('')}</div>
    <p class="muted">${p.stock > 0 ? 'В наличии: ' + p.stock + ' шт. Забрать можно у администратора в центре.' : 'Сейчас нет в наличии.'}</p>
    ${me ? `<div class="pd__calc"><div><small>Твой баланс</small><b>${num(me.balance)}</b></div><div><small>${left >= 0 ? 'Останется' : 'Не хватает'}</small><b style="color:${left >= 0 ? 'var(--ok)' : 'var(--bad)'}">${num(Math.abs(left))}</b></div></div>` : ''}
    <div class="stack">
      ${!me ? '<button class="btn btn--acc btn--block" data-act="login">Войти, чтобы купить</button>'
        : `<button class="btn btn--acc btn--block" data-act="buy" ${can ? '' : 'disabled'}>${p.stock < 1 ? 'Нет в наличии' : can ? 'Купить за ' + num(p.price) : 'Пока не хватает коинов'}</button>
           <button class="btn btn--soft btn--block" data-act="goal">${icon.heart}${me.goal === p.id ? 'Убрать из цели' : 'Сделать целью'}</button>`}
    </div></div>`, { label: p.name });
  s.box.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
    if (act === 'login') { s.close(); loginSheet(() => openProduct(id, i)); }
    if (act === 'goal') { const g = await store.setGoal(p.id); s.close(); toast(g ? 'Цель сохранена. Прогресс в кабинете.' : 'Цель убрана'); }
    if (act === 'buy') {
      const b = e.target.closest('button'); b.disabled = true; b.textContent = 'Оформляем…';
      try { await store.buy(p.id); s.close(); toast('Готово! Покажи заказ администратору, чтобы забрать.'); if (navigator.vibrate) navigator.vibrate(18); }
      catch (err) { toast(err.message, true); b.disabled = false; b.textContent = 'Купить за ' + num(p.price); }
    }
  });
}

export async function initMarket() {
  const grid = $('#shop'); if (!grid) return;
  const st = { q: '', cat: 'Все', sort: 'popular' };
  const params = new URLSearchParams(location.search);
  if (params.get('cat')) st.cat = params.get('cat');

  const wallet = $('#wallet'), cats = $('#cats'), q = $('#q'), sort = $('#sort'), count = $('#count');
  q.addEventListener('input', () => { st.q = q.value.trim().toLowerCase(); draw(); });
  sort.addEventListener('change', () => { st.sort = sort.value; draw(); });
  cats.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; st.cat = b.dataset.cat; draw(); b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
  grid.addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (b) openProduct(+b.dataset.pid, [...grid.children].indexOf(b)); });
  wallet.addEventListener('click', async (e) => {
    if (e.target.closest('[data-login]')) loginSheet();
    if (e.target.closest('[data-logout]')) { await store.logout(); toast('Ты вышел из аккаунта'); }
  });
  $('#reset')?.addEventListener('click', () => { st.q = ''; st.cat = 'Все'; q.value = ''; draw(); });

  async function draw() {
    const [all, me, list] = [await store.products(), await store.me(), await store.categories()];
    wallet.className = 'wallet' + (me ? '' : ' wallet--guest');
    wallet.innerHTML = me
      ? `<div class="wallet__bal">${coin('')}<div><b>${num(me.balance)}</b><small>${esc(me.name)}, твой баланс</small></div></div><div class="row"><a class="btn btn--white btn--sm" href="cabinet.html">Кабинет</a><button class="btn btn--ghost btn--sm" data-logout>Выйти</button></div>`
      : `<div class="wallet__bal">${coin('')}<div><b>Войди по коду</b><small>чтобы видеть баланс</small></div></div><button class="btn btn--white btn--sm" data-login>Войти</button>`;
    cats.innerHTML = ['Все', ...list].map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === st.cat}">${esc(c)}</button>`).join('');
    let items = all.filter((p) => (st.cat === 'Все' || p.cat === st.cat) && (!st.q || p.name.toLowerCase().includes(st.q)));
    if (st.sort === 'cheap') items = [...items].sort((a, b) => a.price - b.price);
    if (st.sort === 'expensive') items = [...items].sort((a, b) => b.price - a.price);
    if (st.sort === 'afford' && me) items = [...items].sort((a, b) => (a.price <= me.balance ? 0 : 1) - (b.price <= me.balance ? 0 : 1) || a.price - b.price);
    count.textContent = `${items.length} ${plural(items.length, 'товар', 'товара', 'товаров')}`;
    grid.innerHTML = items.map((p, i) => tile(p, me, i)).join('');
    $('#empty').hidden = items.length > 0;
  }
  store.subscribe(draw);
  draw();
}

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}
