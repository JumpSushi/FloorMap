const isMobile =
  typeof globalThis === "undefined" ? false : globalThis.innerWidth < 640;

const config = {
  geoCodingApi: "https://nominatim.openstreetmap.org",
  routingApi: "https://router.project-osrm.org/route/v1",
  mapConfig: {
    center: [-77.0723, 38.9076], // Georgetown University Hilltop Campus
    zoom: isMobile ? 17 : 18.5,
    bearing: 0, // Reset bearing for Georgetown campus
    pitch: 40,
    maxBounds: [
      [-77.0850, 38.9000], // Southwest corner of Georgetown campus area (expanded left)
      [-77.0650, 38.9150], // Northeast corner of Georgetown campus area
    ],
  } as maplibregl.MapOptions,
  mapStyles: {
    light: "https://tiles.openfreemap.org/styles/bright",
    dark: "/styles/dark/style.json",
  },
};

export default config;
