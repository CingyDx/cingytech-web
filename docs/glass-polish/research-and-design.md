# Cingy.Tech — glass arrival, 9 October 2026

## User decision
Keep the existing glass identity and genuine animated glass object. Improve the website professionally; glass slabs should arrive with the object immediately on opening. The Signal Loom experiment is not the selected direction. Produce an updated review preview before replacing production.

## Research → actual implementation choices

1. Chrome team's animation guide: transform/opacity avoid unnecessary layout/paint; layer promotion should be measured and temporary. Use a coordinated native Web Animations timeline. Do not animate blur/shadow values every frame. https://web.dev/articles/animations-guide
2. Chrome rendering guide: browser work must fit the frame budget. Reduce simultaneous decoration and avoid permanent will-change across all panels. https://web.dev/articles/rendering-performance
3. MDN backdrop-filter: transparent fills expose the filtered backdrop; opacity/transform layering can change backdrop roots. Keep restrained translucent fills and test actual compositing. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
4. GSAP matchMedia: responsive/reduced-motion animation setup must have matching cleanup. Adopt the lifecycle principle with native APIs rather than add a library to this static site. https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
5. Apple video guide: muted, inline playback; pause offscreen and respect autoplay restrictions. Replace the intentional Safari poster-only path with a playable H.264 variant, still with poster/manual fallback. https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari
6. MDN video-frame callback: actual composited frame arrival is stronger than a resolved play promise. Fade the poster only after a frame is ready, and expose a presentation event to the entrance controller. https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
7. MDN Web Animations: use animate() with explicit duration/easing/delay and cancellation when motion preference changes. Avoid content hidden by default. https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
8. web.dev video/source: appropriate codecs, source selection and preload policy. Serve bounded responsive MP4s instead of downloading a 4K loop to a phone. https://web.dev/articles/video-and-source-tags
9. web.dev LCP: prioritize the meaningful first image/text; don't make first content wait for a movie or long loading screen. https://web.dev/articles/lcp
10. W3C SC 2.2.2: provide a pause mechanism for continuing automatic motion. Keep existing saved motion choice and reduced-motion alternative. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
11. MDN autoplay: muted playback is commonly allowed, but browsers/user settings may block it; failure must remain usable. https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

Awwwards Zirka/experimental references and Apple's Materials page were attempted but did not expose usable article content through the research tool. Do not claim those pages were visually audited. Existing user's approved purple-glass site is the visual reference.

## Audit
Production base main 0a563f1; all 15 tests green. Existing files have overlapping CSS entrance animations and independent reveal delays. Services are too low in a 900px first view. Depth-motion writes highlight-gradient coordinates during pointer movement, adding paint work. VP9 alpha player explicitly disables Safari playback. Existing media: true 3840×2160 VP9 5-second source, 24fps; desktop 1920×1080 WebM 7,024,325 bytes; mobile WebM 4,603,245 bytes. Genuine Blender Cycles source/master remain.

## Selected design
Preserve copy, logo, orbital object, purple identity, three service slabs, portfolio layering and contacts. Refine to continuous optical edges, modest dark translucent fills, shallow rim thickness, two meaningful shadow levels and a composited moving highlight. No new metrics, fabricated work, loading gate, scroll hijacking or fake integration.

Opening: navigation settles first; heading and CTA become readable promptly; object arrives from depth while already playing; three slabs rise with a short stagger above their shelf. The sequence completes in about 1.5–1.7 seconds and never waits indefinitely for video. On mobile use shorter travel and start slab motion when it first enters view. One animation owner replaces competing CSS/JS entrances.

Native page content remains visible without JavaScript. Reduced-motion/off preference skips translation and rotation. Saved manual preference, consent, UTM, form contracts, SEO and advertising destination remain unchanged. Related detail-page materials use the same tokens while preserving content and scope (hardware on ordinary website; digital-only advertising landing).

## Scope and QA
Isolated worktree CingyTech-glass-refresh / feat/glass-arrival-polish-2026-10-09. Publish draft preview only until user approves. Main and Ads untouched.

Verify actual early-to-final panel transforms and video frames; desktop/mobile/tablet layout; first-frame poster transition; autoplay rejection/media failure/offscreen/hidden-tab/reduced-motion/storage rejection; menu/keyboard/anchors; form failure and success intercepted (no synthetic real lead); all detail-page local references and existing 15 tests. Try WebKit runtime; distinguish it from physical Safari/iOS. Measure lab LCP/CLS/resource bytes/dropped frames, never promise 100/100 without a real benchmark.
