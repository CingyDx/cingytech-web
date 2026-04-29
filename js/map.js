(function () {
  const { countries } = window.WorldGuessData;

  function latLngToPoint(lat, lng) {
    return {
      x: ((lng + 180) / 360) * 100,
      y: ((90 - lat) / 180) * 100
    };
  }

  function pointToLatLng(x, y) {
    return {
      lat: 90 - (y / 100) * 180,
      lng: (x / 100) * 360 - 180
    };
  }

  function nearestCountry(lat, lng) {
    return countries.reduce((nearest, country) => {
      const distance = Math.hypot((country.lat - lat) * 1.25, country.lng - lng);
      if (!nearest || distance < nearest.distance) {
        return { country, distance };
      }
      return nearest;
    }, null).country;
  }

  function createGuessMap(container, options = {}) {
    let pin = null;
    let value = null;

    container.classList.add("wg-map");
    container.innerHTML = `
      <div class="wg-map-grid"></div>
      <div class="continent continent-americas"></div>
      <div class="continent continent-europe"></div>
      <div class="continent continent-africa"></div>
      <div class="continent continent-asia"></div>
      <div class="continent continent-australia"></div>
      <button class="map-reset mini-action" type="button">Reset pin</button>
    `;

    countries.forEach((country) => {
      const point = latLngToPoint(country.lat, country.lng);
      const dot = document.createElement("button");
      dot.className = "country-dot";
      dot.type = "button";
      dot.title = country.name;
      dot.setAttribute("aria-label", country.name);
      dot.style.left = `${point.x}%`;
      dot.style.top = `${point.y}%`;
      dot.dataset.code = country.code;
      container.appendChild(dot);
    });

    function setPin(lat, lng, country) {
      const point = latLngToPoint(lat, lng);
      if (!pin) {
        pin = document.createElement("div");
        pin.className = "guess-pin";
        container.appendChild(pin);
      }

      value = {
        lat,
        lng,
        countryCode: country.code,
        country: country.name
      };

      pin.style.left = `${point.x}%`;
      pin.style.top = `${point.y}%`;
      pin.hidden = false;
      options.onChange?.(value);
    }

    function resetPin() {
      value = null;
      if (pin) pin.hidden = true;
      options.onChange?.(null);
    }

    container.addEventListener("click", (event) => {
      if (event.target.closest(".map-reset")) {
        resetPin();
        return;
      }

      const dot = event.target.closest(".country-dot");
      if (dot) {
        const country = countries.find((item) => item.code === dot.dataset.code);
        if (country) setPin(country.lat, country.lng, country);
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
      const latLng = pointToLatLng(x, y);
      const country = nearestCountry(latLng.lat, latLng.lng);
      setPin(latLng.lat, latLng.lng, country);
    });

    return {
      getValue: () => value,
      setCountry(code) {
        const country = countries.find((item) => item.code === code);
        if (country) setPin(country.lat, country.lng, country);
      },
      resetPin
    };
  }

  function renderPanorama(container, location) {
    const clueTags = location.clues.map((clue) => `<span>${clue}</span>`).join("");
    container.className = `panorama-shell pano-${location.style || "europe"}`;
    container.innerHTML = `
      <div class="pano-sky"></div>
      <div class="pano-sun"></div>
      <div class="pano-horizon"></div>
      <div class="pano-road"><span></span><span></span></div>
      <div class="pano-building left"></div>
      <div class="pano-building right"></div>
      <div class="pano-sign main">
        <strong>${location.city}</strong>
        <small>${location.region}</small>
      </div>
      <div class="pano-sign side">
        <strong>${location.countryCode}</strong>
        <small>${location.country}</small>
      </div>
      <div class="pano-tree t1"></div>
      <div class="pano-tree t2"></div>
      <div class="pano-vignette"></div>
      <div class="pano-overlay">
        <div>
          <p>Street View Preview</p>
          <strong>${location.city}, ${location.region}</strong>
        </div>
        <div class="clue-row">${clueTags}</div>
      </div>
    `;
  }

  async function getMapsConfig() {
    try {
      return await window.WorldGuessAPI.request("mapsConfig", {}, { public: true });
    } catch {
      return { enabled: false, apiKey: "" };
    }
  }

  window.WorldGuessMap = {
    createGuessMap,
    renderPanorama,
    getMapsConfig,
    latLngToPoint,
    pointToLatLng,
    nearestCountry
  };
})();
