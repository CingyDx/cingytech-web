# Signal Loom

Experimental preview, not the production homepage. Static semantic HTML is the base; Three.js 0.186.1 and custom GLSL provide a changing, rasterized 3D filament sculpture. This is not a 4K Blender raytracing claim.

## Run

Serve the repository's public directory over HTTP (for example `python -m http.server 4180 --directory public`) and open `/experiments/signal-loom/`. ES modules require HTTP/HTTPS. Opening HTML via file:// still exposes static content and contact links, but does not guarantee the WebGL module.

## Behavior

Three service buttons change geometry and service description. Mouse input influences orientation. Animation is automatic, respects reduced motion, pauses outside view and in hidden tabs, and offers a manual pause/resume control. The poster was captured from this actual scene. No WebGL or data-saving mode keeps the poster. Context restoration reapplies the selected service. Resolution is capped and can step down on measured slow submission/frame cadence; this is not physical-phone certification.

The CSV experiment is local: headers `jmeno;email;stav`, up to 200 rows and 10,000 characters. It trims cells, lowercases e-mails, removes later duplicate e-mails, rejects rows with invalid e-mail/name, and downloads CSV. It does not connect to a CRM or AI service. Spreadsheet formula prefixes are neutralized on export.

Contact uses the unchanged existing `poptavka` Netlify form and shared home.js/ads-tracking.js. Advertising cookies remain opt-in. QA intercepts contact POST requests; no synthetic lead was submitted to Netlify.

## Dependencies

- Three.js 0.186.1 from official npm package, MIT license in vendor/LICENSE. The local vendor bundle includes only the renderer/scene/camera/geometry/shader/mesh/vector exports used here. Built with esbuild 0.25.12, bundle/minify/ESM; no runtime CDN.
- Space Grotesk 700 TTF from Google Fonts, SIL OFL in fonts/OFL.txt. All runtime assets self-hosted.
- Real portfolio screenshots and existing template destinations are reused. DomFINS/WENSPOL are labelled nonbinding concepts.

## Verification 2026-10-09

19/19 Node tests; six widths 360/390/430/768/1440/1920 in Chromium. Browser tests cover real rendered pixel changes, service modes, pause/resume, offscreen stop, local CSV edit/error/export, stale-output cancellation, consent denial, mocked contact failure/success, reduced-motion plus context recovery, unavailable WebGL, no-JS navigation, and selection before delayed scene import. Online draft under the existing CSP passed the same scenarios. No real iOS/Safari/Android device certification or real inbox delivery test performed for this prototype.
