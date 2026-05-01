(function () {
  let guessMap = null;
  let guessMarker = null;
  let guessLatLng = null;
  let resultMap = null;
  let resultLine = null;
  let geocoder = null;

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

    return guessMap;
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
    getGuessLatLng,
    reverseGeocodeCountry,
    showResultMap,
    drawResultLine
  };
})();
