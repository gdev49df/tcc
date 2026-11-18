// Точка входа: общие части + код нужной страницы (data-page на <body>).
import { initChrome } from './ui.js';

const pages = {
  home: () => import('./home.js').then((m) => m.initHome()),
  market: () => import('./market.js').then((m) => m.initMarket()),
  cabinet: () => import('./cabinet.js').then((m) => m.initCabinet()),
  admin: () => import('./admin.js').then((m) => m.initAdmin())
};

initChrome();
pages[document.body.dataset.page]?.();
