// Личный кабинет студента: баланс, цель, заказы, история.
import { store } from './store.js';
import { num, esc, coin, date, toast, $ } from './ui.js';
import { openProduct } from './market.js';

export async function initCabinet() {
  const root = $('#cab'); if (!root) return;

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = root.querySelector('[data-err]');
    try { const s = await store.login(e.target.code.value); toast('Привет, ' + s.name + '!'); }
    catch (x) { err.textContent = x.message; }
  });
  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-logout]')) { await store.logout(); toast('Ты вышел из аккаунта'); }
    const g = e.target.closest('[data-goal]'); if (g) openProduct(+g.dataset.goal);
  });

  async function draw() {
    const me = await store.me();
    if (!me) {
      root.innerHTML = `<form class="panel auth stack" novalidate><h3>Вход по коду студента</h3>
        <p class="muted">Код выдаёт преподаватель, например TCC-1001. Пароль не нужен.</p>
        <div class="field"><label for="cc">Код</label><input class="input" id="cc" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="TCC-1001" required></div>
        <p class="hint" data-err role="alert" style="color:var(--bad)"></p>
        <button class="btn btn--acc btn--block" type="submit">Войти</button></form>`;
      return;
    }
    const [orders, tx, products] = [await store.myOrders(), await store.myTx(), await store.products()];
    const earned = tx.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const spent = tx.filter((t) => t.amount < 0).reduce((a, t) => a - t.amount, 0);
    const goal = me.goal ? products.find((p) => p.id === me.goal) : null;
    const pct = goal ? Math.min(100, Math.round((me.balance / goal.price) * 100)) : 0;
    root.innerHTML = `<div class="cab">
      <div class="stack" style="gap:16px">
        <div class="balcard"><small style="opacity:.8;font-weight:700">${esc(me.name)} · ${esc(me.code)}</small>
          <div class="balcard__n">${num(me.balance)}</div><span style="font-weight:700;opacity:.9">крокус-коинов на балансе</span>${coin('bc')}</div>
        <div class="stats"><div><b>${num(earned)}</b><small>заработано</small></div><div><b>${num(spent)}</b><small>потрачено</small></div><div><b>${orders.length}</b><small>заказов</small></div></div>
        <div class="panel goal"><h3 style="margin:0">Моя цель</h3>
          ${goal ? `<div class="li" style="border:0;padding:0"><span class="li__ico">${goal.emoji}</span><span class="li__main"><b>${esc(goal.name)}</b><small>${num(me.balance)} из ${num(goal.price)}</small></span><span class="amt">${pct}%</span></div>
            <div class="goal__bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Прогресс к цели"><i style="width:${pct}%"></i></div>
            <p class="hint">${pct >= 100 ? 'Коинов уже хватает — можно забирать!' : 'Осталось накопить ' + num(goal.price - me.balance) + ' коинов.'}</p>
            <button class="btn btn--soft btn--sm" data-goal="${goal.id}">Открыть товар</button>`
            : '<p class="muted">Выбери товар в маркете и нажми «Сделать целью», здесь появится прогресс.</p><a class="btn btn--soft btn--sm" href="market.html" style="justify-self:start">В маркет</a>'}
        </div>
        <div class="row"><a class="btn btn--acc" href="market.html">Перейти в маркет</a><button class="btn btn--ghost" data-logout>Выйти</button></div>
      </div>
      <div class="stack" style="gap:16px">
        <div class="panel"><h3>Мои заказы</h3><div class="list">${orders.length ? orders.map((o) => `<div class="li"><span class="li__ico">${o.emoji || '🎁'}</span><span class="li__main"><b>${esc(o.item)}</b><small>${date(o.date)} · ${num(o.price)} коинов</small></span><span class="st ${o.status === 'done' ? 'st--done' : ''}">${o.status === 'done' ? 'выдан' : 'ждёт выдачи'}</span></div>`).join('') : '<p class="muted">Заказов пока нет.</p>'}</div></div>
        <div class="panel"><h3>История коинов</h3><div class="list">${tx.length ? tx.slice(0, 40).map((t) => `<div class="li"><span class="li__ico">${t.amount > 0 ? '⭐' : '🛍️'}</span><span class="li__main"><b>${esc(t.reason)}</b><small>${date(t.date)}</small></span><span class="amt ${t.amount > 0 ? 'amt--p' : 'amt--m'}">${t.amount > 0 ? '+' : '−'}${num(Math.abs(t.amount))}</span></div>`).join('') : '<p class="muted">Начислений пока нет. Коины появятся после занятий.</p>'}</div></div>
      </div></div>`;
  }
  store.subscribe(draw);
  draw();
}
