# Signal Loom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver an isolated original WebGL prototype with a working local automation demo and a verified contact path.

**Architecture:** Static accessible HTML is the reliable base. Optional Three.js/GLSL controls the live sculpture; a pure CSV engine powers a separate DOM interface. Existing contact and consent handlers are reused.

**Tech Stack:** HTML/CSS, ES modules, Three.js 0.186.1, Node tests, Playwright QA, Netlify draft deploy.

**Spec:** docs/superpowers/specs/2026-10-09-creative-engine-design.md

## Global Constraints
- Separate public/experiments/signal-loom/ route; no production publish or change to existing root/Ads.
- No generic cards, fake metrics, fabricated clients, simulated backend or raytracing claim.
- Motion starts automatically except reduced-motion/data-saving fallback.
- Local demo data never leaves browser; existing form consent/attribution preserved.
- 10,000-character / 200-row demo limits; keyboard/mobile usable; fallback always readable.

## Review Focus
- WebGL initialization/context loss must preserve content and contact; test disabled WebGL and forced loss.
- Background/viewport transitions must stop expensive rendering and resume; test hide and scroll.
- Malformed quoted CSV and unsafe spreadsheet cells must error or export safely; pure engine tests.
- Failed form POST must show error, retain input and avoid conversion; browser mocked POST tests.
- 360px layout, blocked storage and disabled JS must remain navigable; browser QA.

### Task 1: Local automation engine
Files: tests/creative-lab.test.js; public/experiments/signal-loom/data-engine.mjs.
Produces: cleanContacts(text) => {rows,counts}; exportContacts(rows) => CSV. Consumes plain semicolon-separated text.
- [x] Write failing tests for duplicate/invalid/quoted/limits/formula cases.
- [x] Run node --test tests/creative-lab.test.js; verify expected missing-module failure.
- [x] Implement pure bounded parser/normalizer/safe exporter.
- [x] Re-run pure tests; all pass.

### Task 2: Live editorial prototype
Files: public/experiments/signal-loom/index.html, lab.css, lab.mjs, scene.mjs, shaders.mjs, vendor/three.*, vendor/LICENSE.
Consumes cleanContacts/exportContacts. Produces initScene({host,onStatus}) with setMode/pause/resume/dispose lifecycle. DOM remains valid without module loading.
- [x] Vendor pinned official npm Three.js package and license; no CDN dependency.
- [x] Build exact section system and real portfolio assets from design.
- [x] Implement procedural geometry, shader material, adaptive resolution and lifecycle.
- [x] Wire service morph controls, local pipeline/results/export and existing form scripts.
- [x] Generate fallback poster from actual scene, with readable HTML as backup if poster fails.
- [x] Run existing tests plus engine suite; all pass.

### Task 3: QA and review preview
- [x] Capture desktop/mobile screenshots and compare against three concept references; correct material defects.
- [x] Browser-test WebGL state changes, reduced motion, context loss/blocked JS, pipeline edits/export, keyboard/menu, mocked form errors/success; capture measured performance.
- [x] Run fresh whole-change review via requesting-code-review skill; fix important findings.
- [x] Show changed files, commit feature branch, create draft preview and verify online route under actual headers.
- [ ] Return final preview URL, measured evidence, limitations and request production/design approval.

## Decisions / ledger
- User explicitly delegates concept selection and prototype implementation; approval gate is before production deployment as requested.
- Native worktree creation failed because chat cwd is not Git; manual isolated worktree at C:/Users/kryst/Desktop/CingyTech-creative-lab used. Production checkout stays main/clean.
- Browser skill absent; regular Playwright with existing Chromium executable used for owned-site QA.

## Verification ledger
- Task 1 complete: 4 engine tests observed missing-module RED, then GREEN.
- Task 2 complete: isolated static scene + local demo; 19/19 Node tests.
- Fresh reviewer: review_signal_loom, read-only. No consent/CSV injection finding. Three P2 cases found and fixed: no-JS nav, selection before import, paused context-restore selection.
- Context restoration reproduced in actual Chromium: restored mode=1 with selected mode=2 (RED); after fix mode=2 and playing=false (GREEN).
- Full browser run local and online: six widths, render pixels change, motion modes, pause, offscreen, actual local CSV/error/export, mocked form failure/success with no external Google requests, reduced-motion/context restore, WebGL fallback, no-JS, delayed selection all pass.
- Resolution adaptation now samples repeated frame cadence as well as synchronous submissions; physical-phone performance remains unverified.
- Preview lab: ~669KB first-view transfer, LCP 548–1416ms, CLS 0–0.036, 57–60 desktop/35–39 mobile-emulated frames/s. These are individual lab observations, not field scores.
- Ruling: generated site interiors/navigation are corrected to actual assets and agreed navigation — factual correctness takes priority over image-pixel reproduction. Runtime geometry is intentionally procedural and mobile composition subdued for legibility. No extra approvals requested because user delegated choice/build, with production approval deferred.
