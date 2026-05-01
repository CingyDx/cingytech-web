(function () {
  let service = null;
  let panorama = null;

  function getPanoramaData(location) {
    if (!service) service = new google.maps.StreetViewService();
    return new Promise((resolve) => {
      service.getPanorama({
        location: { lat: location.lat, lng: location.lng },
        radius: 500,
        source: google.maps.StreetViewSource.OUTDOOR
      }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.pano) {
          resolve(data);
        } else {
          resolve(null);
        }
      });
    });
  }

  async function initStreetView(location, options = {}) {
    const data = await getPanoramaData(location);
    if (!data) return false;

    const settings = Store.state().settings;
    const movementAllowed = options.movementAllowed ?? settings.movementAllowed;

    panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
      pano: data.location.pano,
      pov: {
        heading: location.heading || 0,
        pitch: location.pitch || 0
      },
      zoom: location.zoom || 1,
      addressControl: false,
      fullscreenControl: true,
      motionTracking: false,
      motionTrackingControl: false,
      panControl: settings.allowPan !== false,
      zoomControl: settings.allowZoom !== false,
      linksControl: Boolean(movementAllowed),
      clickToGo: Boolean(movementAllowed),
      showRoadLabels: false,
      visible: true
    });

    return true;
  }

  async function pickRandomValidLocation(excludeId = null, maxTries = 10) {
    const shuffled = [...STREET_GUESS_LOCATIONS]
      .filter((location) => location.id !== excludeId)
      .sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(maxTries, shuffled.length); i += 1) {
      const location = shuffled[i];
      const ok = await initStreetView(location);
      if (ok) return location;
    }

    throw new Error("No Street View panorama found for selected locations.");
  }

  window.StreetViewGame = {
    initStreetView,
    pickRandomValidLocation,
    getPanorama: () => panorama
  };
})();
