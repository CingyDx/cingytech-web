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

## Crystal Studio revision — stronger materials and smoother motion

The user rejected a subtle polish and requested stronger realistic glass, violet LEDs, water droplets and immediate autoplay. Real home-PC Opera diagnosed the original manual-start state as `reduced-motion`; this is independent of GPU power. The owner preview explicitly opts into animation (`?motion=on`), including blocked storage. Ordinary visitors still receive accessible reduced-motion and saved-pause behavior.

Actual Blender source: 360 genuine Cycles frames, 3840×2160/60fps, OptiX RTX 5070, OIDN GPU. Website movies are 768/30, 1080/60 and 1440/60 square crops, 1.63/3.73/5.67MB. Native video no longer has a per-frame color filter, shadow or alpha mask. The wet glass service texture is a real Cycles render with water lenses, 33.8KB. Manrope is self-hosted under SIL OFL; the editable Figma material board and website share the same font.

Quality selection uses modest device/network hints, then actual dropped-frame counters when available. Two consecutive >12% dropped-frame windows with at least 30 measured frames step down one quality level. A single startup hitch, hidden tab or manual pause does not trigger switching. This is playback adaptation, not an assertion that every physical phone sustains 60fps. Slow connections retain the poster while the selected file loads.

Additional primary sources consulted:
- https://developer.mozilla.org/en-US/docs/Web/API/VideoPlaybackQuality/droppedVideoFrames
- https://docs.blender.org/manual/sr/latest/render/cycles/gpu_rendering.html
- https://www.blender.org/features/rendering/
- https://fonts.google.com/specimen/Manrope
- https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt

Figma: https://www.figma.com/design/d9sQYFCGwWKApIN1lOwlIf?node-id=7-29 — editable native text, component instances, semantic tokens and actual rendered object/material assets. This is a first-impression material board, not a claim that every website page is duplicated in Figma.

Validation: 24 Node tests and 109 local route/interaction checks; actual Chromium desktop and mobile viewport + WebKit mobile viewport playback. Both contact forms had intercepted success/error tests, attribution preservation, denied tracking and no-JavaScript availability. No real lead was submitted and mailbox delivery is not certified by these checks. Real Opera played the large source without a gesture. Independent review confirmed adaptive switching preserves loop position from seekable assets; Python's basic local server does not support range seeking, so file:// verified that behavior. Review found a stale encoder-cache reproducibility issue, corrected by writing fresh raw derivatives on every encode.

Reference fidelity: split hero, concise copy, brand, purple identity and service hierarchy retained; stronger material render and optical edges are intentional changes. Native text remains readable on mobile. Production and Ads await the existing approval boundary and are unchanged by this preview.
