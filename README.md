# WorldGuess

WorldGuess is a fan-made geography guessing game built with plain HTML, CSS and JavaScript.

## Run locally

Static pages open directly in a browser, but online duel rooms require Netlify Functions:

```powershell
npm install
netlify dev
```

Open the local Netlify URL, go to `/zabava/`, create/register an account in `/zabava/duel-lobby.html`, create a room, then join the room from another browser/session.

## Online API

The backend lives in `netlify/functions/worldguess.mts` and exposes `/api/worldguess`.

It handles:
- login/register sessions
- online duel room creation/joining
- pin syncing
- guess locking
- 15 second after-guess timer resolution
- HP/damage calculation

Data is stored in Netlify Blobs.

## Google Maps / Street View

Set this Netlify environment variable when you want to enable a real Google Maps integration:

```text
GOOGLE_MAPS_BROWSER_KEY=your_restricted_browser_key
```

Keep the key restricted to your Netlify domain and the required Google Maps APIs. The current demo still works with placeholder panoramas and a custom clickable world map if no key is present.

## Add locations

Edit both:
- `js/data.js` for the game runtime
- `data/locations.json` for the exported mock dataset

Each location needs country, countryCode, lat, lng, city, region, difficulty, clues and panoramaImage.

## Change rules

Gameplay formulas are in:
- `js/scoring.js`
- `netlify/functions/worldguess.mts`

Rules copy is in `rules.html`.
