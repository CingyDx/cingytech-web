# Security notes

## Netlify headers

Soubor `_headers` pridava zakladni bezpecnostni hlavicky pro vsechny stranky:

- `Content-Security-Policy` omezuje nacitani skriptu, stylu, obrazku, fontu, manifestu a formularu na stejny web. Nepovoluje inline skripty ani externi domeny.
- `X-Frame-Options: DENY` a `frame-ancestors 'none'` brani vlozeni webu do ciziho iframe.
- `X-Content-Type-Options: nosniff` omezuje MIME sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` omezuje predavani cele URL mimo web.
- `Permissions-Policy` vypina nepotrebna browser API jako kamera, mikrofon, geolokace, platby, USB nebo senzory.
- `Strict-Transport-Security` vynucuje HTTPS po nasazeni na HTTPS domene.

## Privacy

Web je staticky HTML/CSS/JS web. Nepouziva marketingove cookies, analyticke trackery ani reklamni skripty. Externi Google Fonts import byl odstranen, aby web neposilal beznou navstevu na externi fontovou domenu.

Stranka `pages/privacy.html` lidsky popisuje, ze kontaktni formular sbira jen udaje vyplnene uzivatelem: jmeno, e-mail a zpravu. Formular je zpracovany pres Netlify Forms a udaje slouzi pouze ke zpracovani dotazu.

## Contact form

Kontaktni formular v `pages/kontakt.html` pouziva:

- `method="POST"`
- `data-netlify="true"`
- skryte pole `form-name`
- honeypot pole `bot-field`
- redirect po odeslani na `pages/dekujeme.html`

JavaScript validni odeslani neblokuje. Pouze zastavi odeslani, pokud chybi povinna pole.

## Co otestovat po deployi

- Otevrit hlavni web a zkontrolovat, ze se nacita CSS, JS, favicony a obrazky.
- Odeslat test kontaktniho formulare pres Netlify.
- Overit redirect na `/pages/dekujeme.html` nebo `/dekujeme`.
- Otevrit `/privacy` a `pages/privacy.html`.
- Zkontrolovat hlavicky pres online security headers checker.
- Projit PageSpeed a HTML/CSS validatory.
