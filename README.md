# StreetGuess on Cingy.Tech

StreetGuess is a static HTML/CSS/JavaScript geography game under `/CingyFun/Streetguess/`.

It uses:

- Google Maps JavaScript API for `google.maps.Map`
- Google Street View through `google.maps.StreetViewPanorama`
- Google reverse geocoding for guessed countries
- Netlify Identity for `/CingyFun` game accounts
- Netlify Functions + Netlify Blobs for online duel rooms

## Google Maps Setup

1. Create a Google Maps browser key.
2. Enable Maps JavaScript API and Geocoding API.
3. Restrict the key by HTTP referrer for `cingy.tech` and local dev if needed.
4. For production, add this Netlify environment variable:

`GOOGLE_MAPS_API_KEY`

The browser fetches it from `/api/cingyfun/streetguess/config`, so the key does not need to be committed to Git.

For localhost-only testing, you can also edit `js/config.js`:

```js
const CONFIG = {
  GOOGLE_MAPS_API_KEY: "YOUR_KEY_HERE"
};

window.CONFIG = CONFIG;
```

If the key is missing, the game intentionally stops and shows:

`Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY in Netlify environment variables or add a local key in /js/config.js.`

## Accounts And Online Duel

`/CingyFun/Streetguess/login.html` is only for game accounts. It is separate from the rest of Cingy.Tech.

Production accounts use Netlify Identity. Enable Identity in Netlify project settings before using the deployed login.

Online duel flow:

1. Log in at `/CingyFun/Streetguess/login.html`.
2. Open `/CingyFun/Streetguess/duel-lobby.html`.
3. Create a room and send the six-character room code to a friend.
4. The friend logs in, enters the room code and joins.
5. Start the duel and play from two browsers.

During localhost development, the login page uses a local dev account so the UI can be tested. Real account auth is tested on Netlify.

## Add Street View Locations

Client seed locations are in `js/locations.js`.
Server online duel seed locations are in `netlify/functions/_shared/locations.mts`.

Each location needs:

```js
{
  id: "cz-prague-001",
  country: "Czech Republic",
  countryCode: "CZ",
  lat: 50.087,
  lng: 14.421,
  heading: 25,
  pitch: 0,
  zoom: 1,
  difficulty: "easy"
}
```

`streetview.js` checks Street View availability. If a panorama is not found in solo, the game skips to another seed.

## Deploy

Netlify publishes the repository root. There is no build command. Functions live in `netlify/functions/`.

Netlify will install dependencies from `package.json` during deploy.
