/* The Crocus Community — общий скрипт: шапка, подвал, анимации, коины и маркет */
const WA = 'https://wa.me/77084809944';
const PAGES = [
  ['index.html','Главная'],['about.html','О нас'],['courses.html','Курсы'],
  ['events.html','Клубы и события'],['coins.html','Коины'],['market.html','Маркет'],['contacts.html','Контакты']
];
const LOGO = 'assets/logo.png';
const LOGO_W = 'assets/logo-inv.png';

/* ---------- данные (localStorage; для боевой версии заменить на worker/d1) ---------- */
const SEED = {
  students: [
    {code:'TCC-1001',name:'Алия',balance:120},
    {code:'TCC-1002',name:'Ерлан',balance:45},
    {code:'TCC-1003',name:'Дана',balance:300}
  ],
  products:[
    {id:1,emoji:'☕',name:'Кофе в кафе рядом',cat:'Еда',price:30,stock:50},
    {id:2,emoji:'🎟️',name:'Билет на movie night',cat:'События',price:60,stock:20},
    {id:3,emoji:'✏️',name:'Набор канцелярии TCC',cat:'Мерч',price:80,stock:25},
    {id:4,emoji:'👕',name:'Футболка с щитом',cat:'Мерч',price:350,stock:10},
    {id:5,emoji:'🧢',name:'Кепка TCC',cat:'Мерч',price:220,stock:12},
    {id:6,emoji:'🎒',name:'Шоппер Crocus',cat:'Мерч',price:150,stock:15},
    {id:7,emoji:'🗣️',name:'Бесплатный speaking club',cat:'Занятия',price:100,stock:30},
    {id:8,emoji:'📚',name:'Индивидуальный урок 45 мин',cat:'Занятия',price:400,stock:8},
    {id:9,emoji:'💸',name:'Скидка 10% на следующий месяц',cat:'Занятия',price:600,stock:5}
  ],
  orders:[],tx:[]
};
const DB = {
  get(){try{const d=JSON.parse(localStorage.getItem('tcc_db'));if(d)return d}catch(e){}const d=structuredClone(SEED);localStorage.setItem('tcc_db',JSON.stringify(d));return d},
  set(d){try{localStorage.setItem('tcc_db',JSON.stringify(d))}catch(e){}},
  me(){try{return sessionStorage.getItem('tcc_me')}catch(e){return null}},
  setMe(c){try{c?sessionStorage.setItem('tcc_me',c):sessionStorage.removeItem('tcc_me')}catch(e){}},
  user(){const c=this.me();return c?this.get().students.find(s=>s.code===c)||null:null},
  login(code){code=code.trim().toUpperCase();const s=this.get().students.find(x=>x.code===code);if(s)this.setMe(code);return s||null},
  addCoins(code,amount,reason){const d=this.get(),s=d.students.find(x=>x.code===code);if(!s)return false;
    if(s.balance+amount<0)return false;s.balance+=amount;d.tx.unshift({code,amount,reason,date:Date.now()});this.set(d);return true},
  buy(id){const d=this.get(),s=d.students.find(x=>x.code===this.me()),p=d.products.find(x=>x.id===id);
    if(!s)return 'login';if(!p||p.stock<1)return 'stock';if(s.balance<p.price)return 'money';
    s.balance-=p.price;p.stock--;d.orders.unshift({id:Date.now(),code:s.code,name:s.name,item:p.name,price:p.price,status:'new',date:Date.now()});
    d.tx.unshift({code:s.code,amount:-p.price,reason:'Маркет: '+p.name,date:Date.now()});this.set(d);return 'ok'}
};
const fmt=t=>new Date(t).toLocaleDateString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coinI=`<span class="coin"><img src="assets/coin.png" alt=""></span>`;

function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600)}

/* ---------- шапка и подвал ---------- */
function layout(){
  const cur=(location.pathname.split('/').pop()||'index.html');
  const me=DB.user();
  document.body.insertAdjacentHTML('afterbegin',`<header class="site"><div class="wrap">
    <a class="brand" href="index.html"><img src="${LOGO}" alt="">The Crocus Community</a>
    <nav class="main" id="nav">${PAGES.map(([h,n])=>`<a href="${h}" class="${h===cur?'on':''}">${n}</a>`).join('')}
      <a href="cabinet.html" class="me">${me?'Кабинет · '+esc(me.balance):'Войти'}</a></nav>
    <button class="burger" aria-label="меню" onclick="document.getElementById('nav').classList.toggle('open')"><i></i><i></i></button></div></header>`);
  document.body.insertAdjacentHTML('beforeend',`<footer class="site"><div class="wrap"><div class="cols">
    <div><div class="brand"><img src="${LOGO_W}" alt="">The Crocus Community</div>
      <p style="margin-top:14px;opacity:.7;max-width:320px">Офлайн английский для подростков в Астане. General English и IELTS. Собственная методика.</p></div>
    <div><b>Страницы</b>${PAGES.map(([h,n])=>`<a href="${h}">${n}</a>`).join('')}</div>
    <div><b>Связаться</b><a href="${WA}" target="_blank" rel="noopener">WhatsApp</a><a href="https://www.instagram.com/thecrocuscommunity/" target="_blank" rel="noopener">Instagram</a><a href="admin.html">Для преподавателей</a></div>
    </div><div class="sign"><span>© ${new Date().getFullYear()} The Crocus Community</span><span>Создано @bauyrzhanov_12_</span></div></div></footer>`);
}
function reveal(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*90+'ms';io.observe(el)})}

/* ---------- вход по коду ---------- */
function loginModal(after){
  let m=document.getElementById('loginM');
  if(!m){document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="loginM"><div class="box">
    <h3>Вход по коду</h3><p style="margin-top:8px;opacity:.7">Код выдаёт преподаватель, например TCC-1001</p>
    <label>Код студента</label><input id="lc" placeholder="TCC-1001" autocomplete="off">
    <div style="display:flex;gap:10px;margin-top:20px"><button class="btn red" id="lgo">Войти</button><button class="btn ghost" id="lx">Отмена</button></div></div></div>`);
    m=document.getElementById('loginM');
    m.querySelector('#lx').onclick=()=>m.classList.remove('open');
    m.querySelector('#lgo').onclick=()=>{const s=DB.login(m.querySelector('#lc').value);
      if(!s)return toast('Код не найден');m.classList.remove('open');toast('Привет, '+s.name+'!');m._after&&m._after()};
    m.querySelector('#lc').addEventListener('keydown',e=>e.key==='Enter'&&m.querySelector('#lgo').click())}
  m._after=after;m.classList.add('open');setTimeout(()=>m.querySelector('#lc').focus(),50)}

/* ---------- маркет ---------- */
function initMarket(){
  const root=document.getElementById('shop');if(!root)return;let cat='Все';
  const draw=()=>{const d=DB.get(),me=DB.user();
    document.getElementById('balbox').innerHTML=me?`<span class="bal">${coinI} ${me.balance}</span> <button class="btn ghost sm" id="out">Выйти</button>`:`<button class="btn blue sm" id="inb">Войти по коду</button>`;
    const o=document.getElementById('out');if(o)o.onclick=()=>{DB.setMe(null);location.reload()};
    const i=document.getElementById('inb');if(i)i.onclick=()=>loginModal(()=>location.reload());
    const cats=['Все',...new Set(d.products.map(p=>p.cat))];
    document.getElementById('chips').innerHTML=cats.map(c=>`<button class="chip ${c===cat?'on':''}" data-c="${c}">${c}</button>`).join('');
    document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{cat=b.dataset.c;draw()});
    root.innerHTML=d.products.filter(p=>cat==='Все'||p.cat===cat).map((p,i)=>`<div class="tk c${i%3}"><div class="l"><div><small>${esc(p.cat)}</small><h3>${esc(p.name)}</h3></div><div class="em">${p.emoji}</div></div>
      <div class="stub"><div class="price">${p.price}${coinI}</div><div class="stock">${p.stock>0?'осталось '+p.stock:'нет в наличии'}</div><button class="btn sm" data-id="${p.id}" ${p.stock<1?'disabled':''}>Купить</button></div></div>`).join('');
    root.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{
      const id=+b.dataset.id;const go=()=>{const r=DB.buy(id);
        if(r==='ok'){toast('Заказ оформлен! Заберите у администратора');draw();layoutBal()}
        else if(r==='money')toast('Не хватает коинов');else if(r==='stock')toast('Товар закончился');else loginModal(go)};
      go()})};
  draw()}
function layoutBal(){const me=DB.user();const a=document.querySelector('nav.main a.me');if(a&&me)a.textContent='Кабинет · '+me.balance}

/* ---------- кабинет ---------- */
function initCabinet(){
  const root=document.getElementById('cab');if(!root)return;
  const draw=()=>{const me=DB.user();
    if(!me){root.innerHTML=`<div class="panel" style="max-width:460px"><h3>Вход по коду студента</h3><label>Код</label><input id="cc" placeholder="TCC-1001"><button class="btn red" id="cg" style="margin-top:18px">Войти</button></div>`;
      const go=()=>{const s=DB.login(document.getElementById('cc').value);s?location.reload():toast('Код не найден')};
      document.getElementById('cg').onclick=go;document.getElementById('cc').onkeydown=e=>e.key==='Enter'&&go();return}
    const d=DB.get(),tx=d.tx.filter(t=>t.code===me.code),ord=d.orders.filter(o=>o.code===me.code);
    root.innerHTML=`<div class="g2"><div class="panel"><b>${me.code}</b><h3 style="margin:12px 0 8px">${esc(me.name)}</h3>
      <div class="cabnum">${me.balance} ${coinI}</div>
      <div style="margin-top:20px;display:flex;gap:10px"><a class="btn blue sm" href="market.html">В маркет</a><button class="btn ghost sm" id="lo">Выйти</button></div></div>
      <div class="panel"><h3>Мои заказы</h3><table style="margin-top:10px">${ord.length?ord.map(o=>`<tr><td>${esc(o.item)}</td><td>${o.price}</td><td><span class="status ${o.status==='done'?'done':''}">${o.status==='done'?'выдан':'новый'}</span></td></tr>`).join(''):'<tr><td>Пока пусто</td></tr>'}</table></div></div>
      <div class="panel" style="margin-top:22px"><h3>История коинов</h3><table style="margin-top:10px"><tr><th>Дата</th><th>Причина</th><th>Коины</th></tr>
      ${tx.length?tx.map(t=>`<tr><td>${fmt(t.date)}</td><td>${esc(t.reason)}</td><td class="${t.amount>0?'plus':'minus'}">${t.amount>0?'+':''}${t.amount}</td></tr>`).join(''):'<tr><td colspan=3>Операций пока нет</td></tr>'}</table></div>`;
    document.getElementById('lo').onclick=()=>{DB.setMe(null);location.reload()}};
  draw()}

/* ---------- админка ---------- */
const ADMIN_PASS='crocus2026';
function initAdmin(){
  const root=document.getElementById('adm');if(!root)return;
  const ok=()=>{try{return sessionStorage.getItem('tcc_adm')==='1'}catch(e){return false}};
  const draw=()=>{
    if(!ok()){root.innerHTML=`<div class="panel" style="max-width:420px"><h3>Вход для преподавателей</h3><label>Пароль</label><input id="ap" type="password"><button class="btn red" id="ag" style="margin-top:18px">Войти</button></div>`;
      const go=()=>{if(document.getElementById('ap').value===ADMIN_PASS){try{sessionStorage.setItem('tcc_adm','1')}catch(e){}draw()}else toast('Неверный пароль')};
      document.getElementById('ag').onclick=go;document.getElementById('ap').onkeydown=e=>e.key==='Enter'&&go();return}
    const d=DB.get();
    root.innerHTML=`<div class="g2">
    <div class="panel"><h3>Начислить / списать коины</h3>
      <label>Студент</label><select id="as">${d.students.map(s=>`<option value="${s.code}">${esc(s.name)} · ${s.code} · ${s.balance}</option>`).join('')}</select>
      <label>Количество (минус — списать)</label><input id="aa" type="number" value="10">
      <label>Причина</label><select id="ar"><option>Посещение занятия</option><option>Домашнее задание</option><option>Победа в клубе</option><option>Активность</option><option>Другое</option></select>
      <button class="btn red" id="ago" style="margin-top:18px">Применить</button></div>
    <div class="panel"><h3>Новый студент</h3><label>Имя</label><input id="sn"><label>Код (оставьте пустым — создастся сам)</label><input id="sc" placeholder="TCC-1004">
      <button class="btn blue" id="sgo" style="margin-top:18px">Добавить</button></div></div>
    <div class="panel" style="margin-top:22px"><h3>Заказы</h3><table style="margin-top:10px"><tr><th>Дата</th><th>Студент</th><th>Товар</th><th>Цена</th><th></th></tr>
    ${d.orders.length?d.orders.map(o=>`<tr><td>${fmt(o.date)}</td><td>${esc(o.name)}</td><td>${esc(o.item)}</td><td>${o.price}</td><td>${o.status==='done'?'<span class="status done">выдан</span>':`<button class="btn sm" data-o="${o.id}">Выдать</button>`}</td></tr>`).join(''):'<tr><td colspan=5>Заказов нет</td></tr>'}</table></div>
    <div class="panel" style="margin-top:22px"><h3>Товары</h3><table style="margin-top:10px"><tr><th>Товар</th><th>Цена</th><th>Остаток</th><th></th></tr>
    ${d.products.map(p=>`<tr><td>${p.emoji} ${esc(p.name)}</td><td><input type="number" value="${p.price}" data-p="${p.id}" data-f="price" style="width:90px;padding:8px"></td><td><input type="number" value="${p.stock}" data-p="${p.id}" data-f="stock" style="width:90px;padding:8px"></td><td></td></tr>`).join('')}</table>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><input id="np" placeholder="Название нового товара" style="flex:2"><input id="npp" type="number" placeholder="цена" style="flex:1"><button class="btn sm" id="npg">Добавить</button></div></div>
    <p style="margin-top:20px"><button class="btn ghost sm" id="aout">Выйти</button></p>`;
    document.getElementById('ago').onclick=()=>{const r=DB.addCoins(document.getElementById('as').value,+document.getElementById('aa').value,document.getElementById('ar').value);toast(r?'Готово':'Нельзя: баланс уйдёт в минус');draw()};
    document.getElementById('sgo').onclick=()=>{const d=DB.get();const n=document.getElementById('sn').value.trim();if(!n)return toast('Введите имя');
      let c=document.getElementById('sc').value.trim().toUpperCase()||'TCC-'+(1001+d.students.length);
      if(d.students.some(s=>s.code===c))return toast('Такой код уже есть');d.students.push({code:c,name:n,balance:0});DB.set(d);toast('Студент добавлен: '+c);draw()};
    root.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const d=DB.get();d.orders.find(o=>o.id==b.dataset.o).status='done';DB.set(d);draw()});
    root.querySelectorAll('[data-p]').forEach(i=>i.onchange=()=>{const d=DB.get();d.products.find(p=>p.id==i.dataset.p)[i.dataset.f]=Math.max(0,+i.value);DB.set(d);toast('Сохранено')});
    document.getElementById('npg').onclick=()=>{const n=document.getElementById('np').value.trim(),p=+document.getElementById('npp').value;if(!n||!p)return toast('Название и цена');
      const d=DB.get();d.products.push({id:Date.now(),emoji:'🎁',name:n,cat:'Другое',price:p,stock:10});DB.set(d);draw()};
    document.getElementById('aout').onclick=()=>{try{sessionStorage.removeItem('tcc_adm')}catch(e){}draw()}};
  draw()}

/* ---------- диалог в герое: появляется по очереди ---------- */
function initChat(){
  const box=document.getElementById('chat');if(!box)return;
  const msgs=[...box.querySelectorAll('.msg')],typ=box.querySelector('.typing');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){msgs.forEach(m=>m.classList.add('show'));return}
  let i=0;const next=()=>{if(i>=msgs.length){typ.classList.remove('on');return}
    const m=msgs[i++],isT=m.classList.contains('t');
    if(isT){box.insertBefore(typ,m);typ.classList.add('on')}
    setTimeout(()=>{typ.classList.remove('on');m.classList.add('show');setTimeout(next,m.classList.contains('win')?0:700)},isT?1100:500)};
  setTimeout(next,500)}

/* ---------- живые мелочи: счётчик 7.0 и параллакс стикеров ---------- */
function initLive(){
  const n=document.querySelector('[data-count]');
  if(n){const to=parseFloat(n.dataset.count),still=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(still){n.textContent=to.toFixed(1)}else{
      const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();const t0=performance.now();
        const f=t=>{const k=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-k,3);n.textContent=(to*e).toFixed(1);if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}},{threshold:.4});io.observe(n)}}
  const h=document.querySelector('.hero');
  if(h&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&matchMedia('(pointer:fine)').matches){
    h.addEventListener('pointermove',e=>{const r=h.getBoundingClientRect();
      h.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*30);h.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*30)})}}

document.addEventListener('DOMContentLoaded',()=>{layout();reveal();initMarket();initCabinet();initAdmin();initChat();initLive();
  document.querySelectorAll('[data-wa]').forEach(a=>a.href=WA)});
