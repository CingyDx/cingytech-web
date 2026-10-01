# Cingy.Tech web

Statický veřejný web Cingy.Tech. Neobsahuje žádné napojení na interní systémy.

## Zaměření

- weby a webové aplikace
- automatizace, AI řešení a IT služby včetně hardwaru
- ověřené veřejné reference
- kontaktní formulář přes Netlify Forms

## Deploy

Netlify publikuje adresář `public/`. Není potřeba build krok.

Po pushi do větve `main` Netlify automaticky spustí produkční deploy.

Změny připravujte v samostatné větvi a nejprve kontrolujte přes Netlify Deploy Preview.
Homepage používá samostatné `public/home.css` a `public/home.js`; existující
podstránky dál používají `public/style.css` a `public/script.js`.
Google Ads měření je už zapojené přes `public/ads-tracking.js` a spouští se
jen po souhlasu. Nový tracker nepřidávejte bez kontroly stávající konfigurace.

## Kontrola

```powershell
npm test
```

Před produkčním nasazením ověřte formulář na Netlify preview: lokální statický
HTTP server neumí přijmout Netlify Forms. Publikujte klientské reference teprve
po ověření živé realizace a souhlasu se zveřejněním.
