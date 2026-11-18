#!/usr/bin/env python3
"""Сборка страниц: src/layout.html + src/pages/*.html -> *.html в корне.

Запуск: python3 build.py
Каждая страница начинается с блока настроек:
---
title: Заголовок вкладки
desc: Описание для поиска и соцсетей
page: home        (какой js-модуль запустить: home, market, cabinet, admin или пусто)
nav: index.html   (какой пункт меню подсветить)
---
"""
import pathlib, re, time, datetime

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
WA = 'https://wa.me/77084809944'
SITE = 'https://gdev49df.github.io/tcc/'
VERSION = str(int(time.time()))

NAV = [('index.html', 'Главная'), ('about.html', 'О нас'), ('courses.html', 'Курсы'), ('events.html', 'События'),
       ('coins.html', 'Коины'), ('market.html', 'Маркет'), ('contacts.html', 'Контакты')]

ICONS = {
    'home': '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/>',
    'book': '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7"/>',
    'bag': '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 016 0v2"/>',
    'coin': '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.8 2.5-1.8s2.5.8 2.5 1.8-1 1.6-2.5 1.9-2.5.9-2.5 2 1 1.8 2.5 1.8 2.5-.8 2.5-1.8"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
}
TABS = [('index.html', 'Главная', 'home'), ('courses.html', 'Курсы', 'book'), ('market.html', 'Маркет', 'bag'),
        ('coins.html', 'Коины', 'coin'), ('cabinet.html', 'Кабинет', 'user')]


def svg(name):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'


def cur(href, active):
    return ' aria-current="page"' if href == active else ''


def parse(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    meta = dict(line.split(':', 1) for line in m.group(1).splitlines())
    return {k.strip(): v.strip() for k, v in meta.items()}, text[m.end():]


def build():
    layout = (SRC / 'layout.html').read_text()
    pages = sorted((SRC / 'pages').glob('*.html'))
    for f in pages:
        meta, body = parse(f.read_text())
        active = meta.get('nav', '')
        html = layout
        repl = {
            'title': meta['title'], 'desc': meta['desc'], 'page': meta.get('page', ''), 'v': VERSION,
            'extra_head': meta.get('head', ''),
            'nav': ''.join(f'<a href="{h}"{cur(h, active)}>{n}</a>' for h, n in NAV),
            'menu': ''.join(f'<a href="{h}"{cur(h, active)}>{n}</a>' for h, n in NAV + [('cabinet.html', 'Кабинет')]),
            'footer_nav': ''.join(f'<a href="{h}">{n}</a>' for h, n in NAV),
            'tabbar': ''.join(f'<a href="{h}"{cur(h, active)}>{svg(i)}<span>{n}</span></a>' for h, n, i in TABS),
            'wa': WA, 'year': str(datetime.date.today().year), 'body': body.replace('{{wa}}', WA),
        }
        for k, v in repl.items():
            html = html.replace('{{' + k + '}}', v)
        assert '{{' not in html, f'незаполненный шаблон в {f.name}'
        (ROOT / f.name).write_text(html)
        print('собрано', f.name)
    urls = [p.name for p in pages if p.name not in ('404.html', 'admin.html')]
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      + ''.join(f'  <url><loc>{SITE}{"" if u == "index.html" else u}</loc></url>\n' for u in urls) + '</urlset>\n')


if __name__ == '__main__':
    build()
