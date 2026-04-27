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
- odeslani pres same-origin AJAX request, aby uzivatel zustal na kontaktni strance

JavaScript validni odeslani zachytava jen proto, aby nedoslo k presmerovani na jinou stranku. Data posila jako `application/x-www-form-urlencoded` na stejny web, bez ukladani osobnich udaju do prohlizece. Odeslani zastavi predem pouze tehdy, pokud chybi povinna pole.

## Co otestovat po deployi

- Otevrit hlavni web a zkontrolovat, ze se nacita CSS, JS, favicony a obrazky.
- Odeslat test kontaktniho formulare pres Netlify.
- Overit, ze kontaktni formular po odeslani zustane na kontaktni strance a zobrazi uspesny stav.
- Otevrit `/privacy` a `pages/privacy.html`.
- Zkontrolovat hlavicky pres online security headers checker.
- Projit PageSpeed a HTML/CSS validatory.
