(function () {
  let guessMap = null;
  let guessMarker = null;
  let guessLatLng = null;
  let resultMap = null;
  let resultLine = null;
  let geocoder = null;
  let expansionKeyInstalled = false;
  let activeExpandedPanel = null;

  function initGuessMap(options = {}) {
    const mapEl = document.getElementById("guess-map");
    guessLatLng = null;
    guessMap = new google.maps.Map(mapEl, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapTypeId: Store.state().settings.mapType || "roadmap",
      clickableIcons: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: true,
      gestureHandling: "greedy"
    });
    geocoder = new google.maps.Geocoder();

    guessMap.addListener("click", (event) => {
      placeGuessMarker(event.latLng);
      options.onPin?.(event.latLng);
    });

    setupMapExpansion();
    return guessMap;
  }

  function setupMapExpansion() {
    const panel = document.getElementById("guess-map-panel");
    const expandButton = panel?.querySelector("[data-map-expand]");
    const closeButton = panel?.querySelector("[data-map-close]");
    if (!panel || !expandButton || !closeButton) return;

    function refreshMapSize() {
      if (!guessMap) return;
      const center = guessLatLng || guessMap.getCenter();
      google.maps.event.trigger(guessMap, "resize");
      if (center) guessMap.panTo(center);
    }

    function setExpanded(value) {
      panel.classList.toggle("map-expanded", value);
      document.body.classList.toggle("guess-map-open", value);
      activeExpandedPanel = value ? panel : null;
      window.setTimeout(refreshMapSize, 230);
    }

    expandButton.onclick = () => setExpanded(true);
    closeButton.onclick = () => setExpanded(false);
    if (!expansionKeyInstalled) {
      expansionKeyInstalled = true;
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeExpandedPanel) {
          activeExpandedPanel.classList.remove("map-expanded");
          document.body.classList.remove("guess-map-open");
          activeExpandedPanel = null;
          window.setTimeout(refreshMapSize, 230);
        }
      });
    }
  }

  function placeGuessMarker(latLng) {
    guessLatLng = latLng;
    if (!guessMarker) {
      guessMarker = new google.maps.Marker({
        map: guessMap,
        draggable: true,
        title: "Your guess",
        animation: google.maps.Animation.DROP
      });
      guessMarker.addListener("dragend", () => {
        guessLatLng = guessMarker.getPosition();
        document.dispatchEvent(new CustomEvent("streetguess:pin", { detail: guessLatLng }));
      });
    }
    guessMarker.setPosition(latLng);
  }

  function resetGuessMarker() {
    guessLatLng = null;
    if (guessMarker) guessMarker.setMap(null);
    guessMarker = null;
  }

  function closeGuessMap() {
    const panel = document.getElementById("guess-map-panel");
    panel?.classList.remove("map-expanded");
    document.body.classList.remove("guess-map-open");
    activeExpandedPanel = null;
    window.setTimeout(() => {
      if (!guessMap) return;
      google.maps.event.trigger(guessMap, "resize");
    }, 230);
  }

  function resetGuessMapView() {
    if (!guessMap) return;
    guessMap.setCenter({ lat: 20, lng: 0 });
    guessMap.setZoom(2);
  }

  function resetRoundMap() {
    closeGuessMap();
    resetGuessMarker();
    window.setTimeout(resetGuessMapView, 240);
  }

  function getGuessLatLng() {
    return guessLatLng;
  }

  function reverseGeocodeCountry(latLng) {
    if (!geocoder) geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status !== "OK" || !results?.length) {
          resolve({ code: null, name: "Unknown" });
          return;
        }
        const country = results
          .flatMap((result) => result.address_components)
          .find((component) => component.types.includes("country"));
        resolve({ code: country?.short_name || null, name: country?.long_name || "Unknown" });
      });
    });
  }

  function showResultMap(correctLatLng, playerLatLng) {
    const target = document.getElementById("result-map");
    if (!target) return;
    resultMap = new google.maps.Map(target, {
      center: correctLatLng,
      zoom: 2,
      clickableIcons: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false
    });

    new google.maps.Marker({
      map: resultMap,
      position: correctLatLng,
      title: "Correct location",
      label: "C"
    });

    if (playerLatLng) {
      new google.maps.Marker({
        map: resultMap,
        position: playerLatLng,
        title: "Your guess",
        label: "?"
      });
      drawResultLine(correctLatLng, playerLatLng);
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(correctLatLng);
      bounds.extend(playerLatLng);
      resultMap.fitBounds(bounds, 80);
    }
  }

  function drawResultLine(correctLatLng, playerLatLng) {
    if (resultLine) resultLine.setMap(null);
    resultLine = new google.maps.Polyline({
      path: [correctLatLng, playerLatLng],
      geodesic: true,
      strokeColor: "#ff4d5e",
      strokeOpacity: 0.95,
      strokeWeight: 3,
      map: resultMap
    });
  }

  window.GameMaps = {
    initGuessMap,
    placeGuessMarker,
    resetGuessMarker,
    closeGuessMap,
    resetGuessMapView,
    resetRoundMap,
    getGuessLatLng,
    reverseGeocodeCountry,
    showResultMap,
    drawResultLine
  };
})();
