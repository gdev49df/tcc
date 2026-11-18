// Панель преподавателя. ВНИМАНИЕ: в демо проверка пароля идёт в браузере.
// Для боевой версии проверку нужно перенести на сервер.
import { store } from './store.js';
import { num, esc, date, toast, sheet, icon, $, $$ } from './ui.js';

const HASH = 'bdc9aaba8c6f04f0ef3fd76c1c91c4102691a082951e22c195cac28e3cab41dc'; // sha-256
const KEY = 'tcc.admin';
const REASONS = ['Посещение занятия', 'Домашнее задание', 'Speaking club', 'Movie night', 'Teambuilding', 'Победа в конкурсе', 'Другое'];

async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const authed = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

export async function initAdmin() {
  const root = $('#adm'); if (!root) return;
  let tab = 'award', orderFilter = 'new', sq = '';

  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try {
      if (f.id === 'f-login') {
        if (!crypto?.subtle) throw new Error('Откройте сайт по https, чтобы войти.');
        if ((await sha256(f.pass.value)) !== HASH) throw new Error('Неверный пароль.');
        sessionStorage.setItem(KEY, '1'); draw();
      }
      if (f.id === 'f-award') {
        const codes = $$('input[name=st]:checked', f).map((i) => i.value);
        if (!codes.length) throw new Error('Отметь хотя бы одного студента.');
        const amount = +f.amount.value * (f.mode.value === 'minus' ? -1 : 1);
        for (const c of codes) await store.award(c, amount, f.reason.value);
        toast(`${amount > 0 ? 'Начислено' : 'Списано'} ${num(Math.abs(amount))} × ${codes.length}`);
      }
      if (f.id === 'f-student') { const s = await store.addStudent(f.name.value, f.code.value); toast('Добавлен: ' + s.name + ', код ' + s.code); }
      if (f.id === 'f-product') { await store.saveProduct({ name: f.name.value, price: f.price.value, stock: f.stock.value, cat: f.cat.value, emoji: f.emoji.value }); toast('Товар добавлен'); }
    } catch (err) { toast(err.message, true); }
  });

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; draw(); return; }
    const of = e.target.closest('[data-of]'); if (of) { orderFilter = of.dataset.of; draw(); return; }
    const give = e.target.closest('[data-give]'); if (give) { await store.setOrderStatus(+give.dataset.give, 'done'); toast('Заказ отмечен как выданный'); return; }
    const sv = e.target.closest('[data-save]');
    if (sv) {
      const tr = sv.closest('tr'); const get = (n) => tr.querySelector(`[name=${n}]`).value;
      try { await store.saveProduct({ id: +sv.dataset.save, name: get('name'), price: get('price'), stock: get('stock'), cat: get('cat'), emoji: get('emoji') }); toast('Сохранено'); } catch (err) { toast(err.message, true); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) confirmBox(`Удалить товар «${esc(del.dataset.name)}»?`, 'Удалить', () => store.removeProduct(+del.dataset.del).then(() => toast('Товар удалён')));
    const ds = e.target.closest('[data-delst]');
    if (ds) confirmBox(`Удалить студента ${esc(ds.dataset.delst)}? Баланс пропадёт.`, 'Удалить', () => store.removeStudent(ds.dataset.delst).then(() => toast('Студент удалён')));
    if (e.target.closest('[data-all]')) $$('#f-award input[name=st]').forEach((i) => { i.checked = e.target.closest('[data-all]').dataset.all === '1'; });
    if (e.target.closest('[data-export]')) {
      const blob = new Blob([await store.exportJSON()], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `tcc-backup-${new Date().toISOString().slice(0, 10)}.json` });
      a.click(); URL.revokeObjectURL(a.href); toast('Файл выгрузки скачан');
    }
    if (e.target.closest('[data-reset]')) confirmBox('Сбросить все данные к демо? Студенты, заказы и история удалятся.', 'Сбросить', () => store.reset().then(() => toast('Данные сброшены')));
    if (e.target.closest('[data-logout]')) { sessionStorage.removeItem(KEY); draw(); }
  });
  root.addEventListener('change', async (e) => {
    if (e.target.id === 'imp') {
      const file = e.target.files[0]; if (!file) return;
      try { await store.importJSON(await file.text()); toast('Данные загружены'); } catch (err) { toast(err.message || 'Не удалось прочитать файл', true); }
    }
  });
  root.addEventListener('input', (e) => { if (e.target.id === 'sq') { sq = e.target.value.toLowerCase(); $$('#f-award [data-row]').forEach((r) => { r.hidden = !r.dataset.row.includes(sq); }); } });

  function confirmBox(text, label, onYes) {
    const s = sheet(`<div class="stack"><h3>Подтверди действие</h3><p>${text}</p><div class="row"><button class="btn" data-yes style="background:var(--bad)">${label}</button><button class="btn btn--soft" data-close>Отмена</button></div></div>`, { label: 'Подтверждение' });
    s.box.querySelector('[data-yes]').addEventListener('click', async () => { await onYes(); s.close(); });
  }

  async function draw() {
    if (!authed()) {
      root.innerHTML = `<form class="panel auth stack" id="f-login" novalidate><h3>Вход для преподавателей</h3>
        <div class="field"><label for="ap">Пароль</label><input class="input" id="ap" name="pass" type="password" autocomplete="current-password" required></div>
        <button class="btn btn--acc btn--block">Войти</button></form>`;
      return;
    }
    const [students, orders, products, tx] = [await store.students(), await store.orders(), await store.products(), await store.tx()];
    const newCount = orders.filter((o) => o.status !== 'done').length;
    const tabs = [['award', 'Начислить'], ['orders', `Заказы${newCount ? ' · ' + newCount : ''}`], ['students', 'Студенты'], ['products', 'Товары'], ['data', 'Данные']];
    let body = '';
    if (tab === 'award') body = `<div class="adm-grid"><form class="panel stack" id="f-award" novalidate><h3 style="margin:0">Начислить или списать</h3>
      <div class="form-grid form-grid--2"><div class="field"><label for="am">Сколько коинов</label><input class="input" id="am" name="amount" type="number" inputmode="numeric" min="1" value="1000" required></div>
      <div class="field"><label for="mo">Действие</label><select class="select" id="mo" name="mode"><option value="plus">Начислить</option><option value="minus">Списать</option></select></div></div>
      <div class="field"><label for="rs">За что</label><select class="select" id="rs" name="reason">${REASONS.map((r) => `<option>${r}</option>`).join('')}</select></div>
      <div class="field"><span class="lbl">Студенты</span><input class="input" id="sq" placeholder="Поиск по имени или коду" value="${esc(sq)}">
        <div class="row" style="margin:4px 0"><button type="button" class="btn btn--soft btn--sm" data-all="1">Отметить всех</button><button type="button" class="btn btn--soft btn--sm" data-all="0">Снять</button></div>
        <div class="list">${students.map((s) => `<label class="li" data-row="${esc((s.name + ' ' + s.code).toLowerCase())}" style="cursor:pointer"><input type="checkbox" name="st" value="${esc(s.code)}" style="width:22px;height:22px;accent-color:var(--acc)"><span class="li__main"><b>${esc(s.name)}</b><small>${esc(s.code)}</small></span><span class="amt">${num(s.balance)}</span></label>`).join('')}</div></div>
      <button class="btn btn--acc btn--block">Применить</button></form>
      <div class="panel"><h3>Последние операции</h3><div class="list">${tx.slice(0, 12).map((t) => `<div class="li"><span class="li__main"><b>${esc(students.find((s) => s.code === t.code)?.name || t.code)}: ${esc(t.reason)}</b><small>${date(t.date)}</small></span><span class="amt ${t.amount > 0 ? 'amt--p' : 'amt--m'}">${t.amount > 0 ? '+' : '−'}${num(Math.abs(t.amount))}</span></div>`).join('') || '<p class="muted">Операций пока нет.</p>'}</div></div></div>`;
    if (tab === 'orders') {
      const list = orders.filter((o) => orderFilter === 'all' || (orderFilter === 'new' ? o.status !== 'done' : o.status === 'done'));
      body = `<div class="panel"><div class="row" style="margin-bottom:12px">${[['new', 'Ждут выдачи'], ['done', 'Выданы'], ['all', 'Все']].map(([k, n]) => `<button class="chip" data-of="${k}" aria-pressed="${k === orderFilter}">${n}</button>`).join('')}</div>
      <div class="list">${list.map((o) => `<div class="li"><span class="li__ico">${o.emoji || '🎁'}</span><span class="li__main"><b>${esc(o.item)}</b><small>${esc(o.name)} · ${esc(o.code)} · ${date(o.date)} · ${num(o.price)}</small></span>${o.status === 'done' ? '<span class="st st--done">выдан</span>' : `<button class="btn btn--sm" data-give="${o.id}">Выдать</button>`}</div>`).join('') || '<p class="muted">Здесь пусто.</p>'}</div></div>`;
    }
    if (tab === 'students') body = `<div class="adm-grid"><form class="panel stack" id="f-student" novalidate><h3 style="margin:0">Новый студент</h3>
      <div class="field"><label for="sn">Имя</label><input class="input" id="sn" name="name" required></div>
      <div class="field"><label for="sc">Код</label><input class="input" id="sc" name="code" placeholder="оставь пустым, создастся сам" autocapitalize="characters"><span class="hint">Этот код студент вводит для входа.</span></div>
      <button class="btn btn--acc btn--block">Добавить</button></form>
      <div class="panel"><h3>Все студенты · ${students.length}</h3><div class="list">${students.map((s) => `<div class="li"><span class="li__main"><b>${esc(s.name)}</b><small>${esc(s.code)}</small></span><span class="amt">${num(s.balance)}</span><button class="iconbtn iconbtn--bad" data-delst="${esc(s.code)}" aria-label="Удалить ${esc(s.name)}">${icon.trash}</button></div>`).join('')}</div></div></div>`;
    if (tab === 'products') body = `<form class="panel stack" id="f-product" novalidate style="margin-bottom:16px"><h3 style="margin:0">Новый товар</h3>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><div class="field"><label for="pn">Название</label><input class="input" id="pn" name="name" required></div><div class="field"><label for="pp">Цена</label><input class="input" id="pp" name="price" type="number" inputmode="numeric" min="1" required></div><div class="field"><label for="ps">Остаток</label><input class="input" id="ps" name="stock" type="number" inputmode="numeric" min="0" value="5"></div><div class="field"><label for="pc">Категория</label><input class="input" id="pc" name="cat" list="cats" value="Другое"><datalist id="cats">${[...new Set(products.map((p) => p.cat))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div><div class="field"><label for="pe">Значок</label><input class="input" id="pe" name="emoji" value="🎁" maxlength="4"></div></div>
      <button class="btn btn--acc" style="justify-self:start">Добавить товар</button></form>
      <div class="panel"><h3>Каталог · ${products.length}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Значок</th><th>Название</th><th>Категория</th><th>Цена</th><th>Остаток</th><th></th></tr></thead><tbody>
      ${products.map((p) => `<tr><td><input class="input" name="emoji" value="${esc(p.emoji)}" style="width:56px" aria-label="Значок"></td><td><input class="input" name="name" value="${esc(p.name)}" style="min-width:200px" aria-label="Название"></td><td><input class="input" name="cat" value="${esc(p.cat)}" list="cats" style="width:130px" aria-label="Категория"></td><td><input class="input" name="price" type="number" value="${p.price}" style="width:120px" aria-label="Цена"></td><td><input class="input" name="stock" type="number" value="${p.stock}" style="width:80px" aria-label="Остаток"></td><td style="white-space:nowrap"><button class="iconbtn" data-save="${p.id}" aria-label="Сохранить ${esc(p.name)}">${icon.save}</button> <button class="iconbtn iconbtn--bad" data-del="${p.id}" data-name="${esc(p.name)}" aria-label="Удалить ${esc(p.name)}">${icon.trash}</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
    if (tab === 'data') body = `<div class="panel stack"><h3 style="margin:0">Данные</h3><p class="muted">Пока сайт работает без сервера, все данные лежат в этом браузере. Делай выгрузку, чтобы не потерять их или перенести на другое устройство.</p>
      <div class="row"><button class="btn" data-export>Скачать выгрузку</button><label class="btn btn--soft" style="cursor:pointer">Загрузить файл<input type="file" id="imp" accept="application/json" hidden></label><button class="btn btn--ghost" data-reset style="color:var(--bad)">Сбросить к демо</button></div></div>`;
    root.innerHTML = `<div class="tabs hscroll" role="tablist">${tabs.map(([k, n]) => `<button class="chip" role="tab" data-tab="${k}" aria-selected="${k === tab}" aria-pressed="${k === tab}">${n}</button>`).join('')}<button class="chip" data-logout>Выйти</button></div>${body}`;
  }
  store.subscribe(draw);
  draw();
}
