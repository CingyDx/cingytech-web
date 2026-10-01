# Cingy.Tech — zadání pro dokončení prémiového veřejného webu

Pracuj jako seniorní webový designér, frontend vývojář a 3D motion designer. Navazuj na existující projekt `C:\Users\kryst\Desktop\CingyTech`, větev `feat/public-site-redesign-2026-10-01` a PR #1. Nezakládej další web. Nejprve prohlédni aktuální stav, změny, renderované assety a skutečnou stránku v prohlížeči. Hotovou práci zachovej a zlepšuj konkrétní slabiny.

## 1. Účel a první dojem

Cingy.Tech potřebuje prémiovou online vizitku a landing page pro návštěvníky z Google Ads, doporučení a QR kódů. Během několika sekund musí být jasné, kdo jsme, co děláme a jak nás kontaktovat. Hlavní nabídka: **weby, webové aplikace, automatizace a IT služby včetně servisu a upgradů hardwaru**. AI prezentuj srozumitelně jako součást praktických řešení.

Návštěvník má okamžitě získat zájem a důvěru. Stránka musí přesvědčit provedením a skutečnou prací. Používej krátkou přirozenou češtinu, velkou čitelnou typografii, volný prostor a minimum sekcí. Hlavní CTA je **Poptat projekt**, sekundární **Prohlédnout práci**. Kontakt: `contact.cingytech@proton.me`.

## 2. Vizuální směr celého webu

Vytvoř luxusní tmavě fialový glass design s klidem a přesností prémiového produktového webu. Inspirací je kvalita prezentace Apple, nikoli kopírování jeho vzhledu. Použij téměř černé pozadí, čistou světlou typografii, kontrolované fialové světlo, skutečně působící hloubku, odlesky a jemné hrany skla.

Celý web musí používat stejný materiálový a světelný jazyk: navigace, tlačítka, reference, formulář i přechody mezi sekcemi. Hloubku vytvářej vrstvením, perspektivou a promyšleným světlem. Každá sekce nemusí být karta. Vyhni se přehnanému neonu, náhodným gradientovým skvrnám, vizuálnímu chaosu a generickému šablonovému vzhledu. Upřednostni méně prvků s výborným provedením.

## 3. Skutečné animované 3D v hero

Hlavní vizuální moment je realistický skleněný objekt vytvořený a raytracovaný v Blenderu, s fialovým nasvícením, studiovými odrazy, refrakcí, objemem a zřetelnou prostorovou rotací. Použij existující Blender scénu a skutečně vyrenderované podklady, pokud vyhovují. Pohyb musí být viditelný při běžném otevření stránky a smyčka musí působit plynule.

Statický obrázek ani CSS rotace plochého obrázku nesplňují hlavní požadavek na 3D animaci. Zachovej upravitelný `.blend`, reprodukovatelný renderovací postup a skutečný zdroj v rozlišení nejméně 3840 × 2160. Pro web připrav efektivně komprimované varianty podle zařízení; neposílej každému telefonu 4K video. Načti nejprve kvalitní poster a přejdi plynule do animace. Nenazývej podklad „4K raytraced“, pokud jeho rozlišení a způsob renderování nejsou doložené.

## 4. Pohyb napříč stránkou

Sjednoť jemné nástupy obsahu, reakce tlačítek, světelné akcenty a prostorový pohyb referencí. Animace mají působit profesionálně a klidně, bez trhavých přechodů, nepřetržitého poskakování, scroll hijackingu nebo zdržování kontaktu. Obsah nesmí zůstat skrytý při selhání JavaScriptu.

Ověř automatické přehrávání bez zvuku, smyčku, přechod z posteru, chování po návratu na kartu a pozastavení mimo záběr. Respektuj reduced motion a úsporu dat; tam nabídni dostupné ruční přehrání. Při blokovaném autoplay nabídni spuštění uživatelem. Při nepodporovaném formátu zachovej kvalitní zobrazení. Prověř Chrome, Edge, Operu a Safari/iOS; pokud se někde zobrazuje jen poster, jasně popiš omezení a hledej kompatibilní animovanou variantu. Netvrď, že animace funguje všude bez ověření.

## 5. Reference a produkty

Ukaž tři skutečné zakázky, které uživatel výslovně schválil jako reference:

- **Baník Rynholec** — https://www.banikrynholec.cz/
- **DomFINS** — https://domfins.netlify.app/
- **WENSPOL** — https://wenspol-stavebni.netlify.app/

Použij kvalitní náhledy skutečných živých webů. Na desktopu je uspořádej do prostorově vrstvených oken s perspektivou, čitelnými názvy a jemnými reakcemi na hover. Všechny tři musí jít snadno rozpoznat a otevřít. Na mobilu dej přednost přehlednému řazení a pohodlnému dotyku. Překrytí nesmí blokovat proklik.

Zachovej živá dema šablon pro řemeslníka, penzion a úklid. Ukazuj pouze doložené produkty; rozlišuj reference a ukázkové šablony. Nevymýšlej klienty, hodnocení, výsledky, technologie ani statistiky.

## 6. Obsah a funkce

Drž stručnou strukturu: hero → služby → skutečná práce a dema → krátký proces → kontakt → čistý footer. U služeb musí být srozumitelně zastoupené weby a aplikace, automatizace/AI a IT/hardware. Technické detaily přidávej pouze tam, kde pomáhají zákazníkovi rozhodnout se.

Zachovej funkční kontaktní formulář: jméno, e-mail, nepovinný telefon, zpráva. Musí mít správné popisky, validaci, stav odesílání, potvrzení, chybový stav a existující ochranu proti spamu. Zachovej Netlify Forms, funkční odkazy, reklamní měření, souhlasy, konverzní logiku, UTM, metadata, canonical, favicon, robots a sitemap. Změny těchto částí prováděj jen z konkrétního důvodu. Formulář nesmí vykazovat úspěch bez skutečného úspěšného odeslání.

## 7. Mobil, rychlost a přístupnost

Mobil je zásadní. Ověř šířky 360, 390 a 430 px, tablet, desktop a velký desktop. Žádné horizontální přetékání, useknuté texty, překryté CTA nebo hero přes několik obrazovek. Ověř menu, klávesnici, focus, kontrast a dotykové ovládání.

Optimalizuj obrázky, video, fonty a množství JavaScriptu. Animace nesmí blokovat první zobrazení obsahu ani kontakt. Zkontroluj LCP, CLS a odezvu interakcí dostupnými nástroji. Výsledky reportuj skutečnými měřeními; neslibuj „100/100 perfection“ bez důkazů. Zachovej jednoduchý statický HTML/CSS/JS stack, pokud není doložený důvod pro změnu.

## 8. Lokální náhled a kompatibilita

Uživatel otevřel `public/index.html` přímo přes `file://` v Opeře a viděl stránku bez stylů a obrázků. Ověř a oprav načítání assetů hlavní stránky i v tomto režimu. Hlavním sdíleným náhledem je funkční HTTPS Netlify Deploy Preview. Rozlišuj lokální prohlížení a online služby, jako je odeslání formuláře. Pouhé fungování v interním náhledu není dostatečný důkaz.

## 9. Rozsah a nasazení

Jde o veřejný prezentační web. Nepřipojuj interní bridge, HQ, agenty, administraci, privátní API, interní automatizační backend ani jiné neveřejné systémy. Do veřejného frontendu nevkládej tajné údaje či interní cesty.

Uživatel povolil samostatnou práci, opravy, testy a nasazení na testovací hosting bez opakovaných potvrzení běžných kroků. Pracuj v existujícím PR #1 a uvedené větvi. Respektuj `AGENTS.md`. **Neslučuj do `main` a neměň produkční DNS ani doménu; produkční nasazení čeká na výslovné schválení uživatele.**

## 10. Podmínky dokončení

Před odevzdáním prohlédni skutečný web na desktopu i mobilu, spusť existující testy a zkontroluj konzoli, chybějící assety, CTA, menu, kotvy, odkazy, formulář, portfolio a dema. Animaci ověř porovnáním jejího stavu v čase; screenshot sám přehrávání nedokazuje. Prověř také reduced motion, zamítnutý autoplay a záložní zobrazení.

Vystav nový Netlify Deploy Preview z aktuálního commitu a otestuj také nasazenou verzi. Odevzdej přímý funkční odkaz, stručný přehled změn, provedené kontroly a známá omezení. Pojmenuj nesplněné body konkrétně. Cílem je dokončený, ověřený náhled, který lze otevřít před zákazníkem a který okamžitě představí Cingy.Tech.
