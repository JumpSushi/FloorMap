import "./chunk-VRMXEQCD.js";

// node_modules/@maplibre/maplibre-gl-directions/dist/maplibre-gl-directions.js
var We = Object.defineProperty;
var Ae = (t, i, e) => i in t ? We(t, i, { enumerable: true, configurable: true, writable: true, value: e }) : t[i] = e;
var u = (t, i, e) => (Ae(t, typeof i != "symbol" ? i + "" : i, e), e);
var Ne = class {
  constructor(i) {
    u(this, "map");
    u(this, "listeners", {});
    u(this, "oneTimeListeners", {});
    this.map = i;
  }
  fire(i) {
    var n, o;
    i.target = this.map;
    const e = i.type;
    (n = this.listeners[e]) == null || n.forEach((s) => s(i)), (o = this.oneTimeListeners[e]) == null || o.forEach((s) => {
      var a, h;
      s(i);
      const r = (a = this.oneTimeListeners[e]) == null ? void 0 : a.indexOf(s);
      r !== void 0 && ~r && ((h = this.oneTimeListeners[e]) == null || h.splice(r, 1));
    });
  }
  /**
   * Registers an event listener.
   */
  on(i, e) {
    this.listeners[i] = this.listeners[i] ?? [], this.listeners[i].push(e);
  }
  /**
   * Un-registers an event listener.
   */
  off(i, e) {
    var o, s;
    const n = (o = this.listeners[i]) == null ? void 0 : o.indexOf(e);
    n !== void 0 && ~n && ((s = this.listeners[i]) == null || s.splice(n, 1));
  }
  /**
   * Registers an event listener to be invoked only once.
   */
  once(i, e) {
    this.oneTimeListeners[i] = this.oneTimeListeners[i] ?? [], this.oneTimeListeners[i].push(e);
  }
};
var $ = class {
  /**
   * @private
   */
  constructor(i, e, n) {
    u(this, "type");
    u(this, "target");
    u(this, "originalEvent");
    u(this, "data");
    this.type = i, this.originalEvent = e, this.data = n;
  }
};
var ae = class {
  /**
   * @private
   */
  constructor(i, e, n) {
    u(this, "type");
    u(this, "target");
    u(this, "originalEvent");
    u(this, "data");
    this.type = i, this.originalEvent = e, this.data = n;
  }
};
var xe = {
  api: "https://router.project-osrm.org/route/v1",
  profile: "driving",
  requestOptions: {},
  requestTimeout: null,
  // can't use Infinity here because of this: https://github.com/denysdovhan/wtfjs/issues/61#issuecomment-325321753
  makePostRequest: false,
  sourceName: "maplibre-gl-directions",
  pointsScalingFactor: 1,
  linesScalingFactor: 1,
  sensitiveWaypointLayers: ["maplibre-gl-directions-waypoint", "maplibre-gl-directions-waypoint-casing"],
  sensitiveSnappointLayers: ["maplibre-gl-directions-snappoint", "maplibre-gl-directions-snappoint-casing"],
  sensitiveRoutelineLayers: ["maplibre-gl-directions-routeline", "maplibre-gl-directions-routeline-casing"],
  sensitiveAltRoutelineLayers: ["maplibre-gl-directions-alt-routeline", "maplibre-gl-directions-alt-routeline-casing"],
  dragThreshold: 10,
  refreshOnMove: false,
  bearings: false
};
var L = {
  snapline: "#34343f",
  altRouteline: "#9e91be",
  routelineFoot: "#3665ff",
  routelineBike: "#63c4ff",
  routeline: "#7b51f8",
  congestionLow: "#42c74c",
  congestionHigh: "#d72359",
  hoverpoint: "#30a856",
  snappoint: "#cb3373",
  snappointHighlight: "#e50d3f",
  waypointFoot: "#3665ff",
  waypointFootHighlight: "#0942ff",
  waypointBike: "#63c4ff",
  waypointBikeHighlight: "#0bb8ff",
  waypoint: "#7b51f8",
  waypointHighlight: "#6d26d7"
};
var le = [
  "case",
  ["==", ["get", "profile", ["get", "arriveSnappointProperties"]], "foot"],
  L.routelineFoot,
  ["==", ["get", "profile", ["get", "arriveSnappointProperties"]], "bike"],
  L.routelineBike,
  [
    "interpolate-hcl",
    ["linear"],
    ["get", "congestion"],
    0,
    L.routeline,
    1,
    L.congestionLow,
    100,
    L.congestionHigh
  ]
];
var he = [
  "case",
  ["==", ["get", "profile"], "foot"],
  ["case", ["boolean", ["get", "highlight"], false], L.waypointFootHighlight, L.waypointFoot],
  ["==", ["get", "profile"], "bike"],
  ["case", ["boolean", ["get", "highlight"], false], L.waypointBikeHighlight, L.waypointBike],
  ["case", ["boolean", ["get", "highlight"], false], L.waypointHighlight, L.waypoint]
];
var pe = [
  "case",
  ["boolean", ["get", "highlight"], false],
  L.snappointHighlight,
  L.snappoint
];
function $e(t = 1, i = 1, e = "maplibre-gl-directions") {
  const n = [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    // don't forget it's the radius! The visible value is diameter (which is 2x)
    // on zoom levels 0-5 should be 5px more than the routeline casing. 7 + 5 = 12.
    // When highlighted should be +2px more. 12 + 2 = 14
    0,
    // highlighted to default ratio (epsilon) = 14 / 12 ~= 1.16
    [
      "case",
      ["boolean", ["get", "highlight"], ["==", ["get", "type"], "HOVERPOINT"]],
      14 * t,
      12 * t
    ],
    5,
    [
      "case",
      ["boolean", ["get", "highlight"], ["==", ["get", "type"], "HOVERPOINT"]],
      14 * t,
      12 * t
    ],
    // exponentially grows on zoom levels 5-18 finally becoming the same 5px wider than the routeline's casing on
    // the same zoom level: 23 + 5 = 28px
    18,
    // highlighted = default ~= 33
    [
      "case",
      ["boolean", ["get", "highlight"], ["==", ["get", "type"], "HOVERPOINT"]],
      33 * t,
      28 * t
    ]
  ], o = [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    // on zoom levels 0-5 - 5px smaller than the casing. 12 - 5 = 7.
    0,
    // feature to casing ratio (psi) = 7 / 12 ~= 0.58
    // highlighted to default ratio (epsilon) = 9 / 7 ~= 1.28
    [
      "case",
      ["boolean", ["get", "highlight"], ["==", ["get", "type"], "HOVERPOINT"]],
      9 * t,
      7 * t
    ],
    5,
    [
      "case",
      ["boolean", ["get", "highlight"], ["==", ["get", "type"], "HOVERPOINT"]],
      9 * t,
      7 * t
    ],
    // exponentially grows on zoom levels 5-18 finally becoming psi times the casing
    18,
    // psi * 28 ~= 16
    // when highlighted multiply by epsilon ~= 21
    [
      "case",
      ["boolean", ["get", "highlight"], ["==", ["get", "type"], "HOVERPOINT"]],
      21 * t,
      16 * t
    ]
  ], s = [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    // on zoom levels 0-5 - 4px smaller than the casing (2px on each side). 7 - 4 = 3.
    // Doesn't change when highlighted
    0,
    // feature to casing ratio (psi) = 3 / 7 ~= 0.42
    3 * i,
    5,
    3 * i,
    // exponentially grows on zoom levels 5-18 finally becoming psi times the casing
    18,
    // psi * 23  ~= 10
    10 * i
  ], r = [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    // on zoom levels 0-5 - 7px by default and 10px when highlighted
    0,
    // highlighted to default ratio (epsilon) = 10 / 7 ~= 1.42
    ["case", ["boolean", ["get", "highlight"], false], 10 * i, 7 * i],
    5,
    ["case", ["boolean", ["get", "highlight"], false], 10 * i, 7 * i],
    // exponentially grows on zoom levels 5-18 finally becoming 32px when highlighted
    18,
    // default = 32 / epsilon ~= 23
    ["case", ["boolean", ["get", "highlight"], false], 32 * i, 23 * i]
  ];
  return [
    {
      id: `${e}-snapline`,
      type: "line",
      source: e,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-dasharray": [3, 3],
        "line-color": L.snapline,
        "line-opacity": 0.65,
        "line-width": 3
      },
      filter: ["==", ["get", "type"], "SNAPLINE"]
    },
    {
      id: `${e}-alt-routeline-casing`,
      type: "line",
      source: e,
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": L.altRouteline,
        "line-opacity": 0.55,
        "line-width": r
      },
      filter: ["==", ["get", "route"], "ALT"]
    },
    {
      id: `${e}-alt-routeline`,
      type: "line",
      source: e,
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": L.altRouteline,
        "line-opacity": 0.85,
        "line-width": s
      },
      filter: ["==", ["get", "route"], "ALT"]
    },
    {
      id: `${e}-routeline-casing`,
      type: "line",
      source: e,
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": le,
        "line-opacity": 0.55,
        "line-width": r
      },
      filter: ["==", ["get", "route"], "SELECTED"]
    },
    {
      id: `${e}-routeline`,
      type: "line",
      source: e,
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": le,
        "line-opacity": 0.85,
        "line-width": s
      },
      filter: ["==", ["get", "route"], "SELECTED"]
    },
    {
      id: `${e}-hoverpoint-casing`,
      type: "circle",
      source: e,
      paint: {
        "circle-radius": n,
        "circle-color": L.hoverpoint,
        "circle-opacity": 0.65
      },
      filter: ["==", ["get", "type"], "HOVERPOINT"]
    },
    {
      id: `${e}-hoverpoint`,
      type: "circle",
      source: e,
      paint: {
        // same as snappoint, but always hig(since it's always highlighted while present on the map)
        "circle-radius": o,
        "circle-color": L.hoverpoint
      },
      filter: ["==", ["get", "type"], "HOVERPOINT"]
    },
    {
      id: `${e}-snappoint-casing`,
      type: "circle",
      source: e,
      paint: {
        "circle-radius": n,
        "circle-color": pe,
        "circle-opacity": 0.65
      },
      filter: ["==", ["get", "type"], "SNAPPOINT"]
    },
    {
      id: `${e}-snappoint`,
      type: "circle",
      source: e,
      paint: {
        "circle-radius": o,
        "circle-color": pe
      },
      filter: ["==", ["get", "type"], "SNAPPOINT"]
    },
    {
      id: `${e}-waypoint-casing`,
      type: "circle",
      source: e,
      paint: {
        "circle-radius": n,
        "circle-color": he,
        "circle-opacity": 0.65
      },
      filter: ["==", ["get", "type"], "WAYPOINT"]
    },
    {
      id: `${e}-waypoint`,
      type: "circle",
      source: e,
      paint: {
        "circle-radius": o,
        "circle-color": he
      },
      filter: ["==", ["get", "type"], "WAYPOINT"]
    }
  ];
}
var je = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
var we = (t = 21) => {
  let i = "", e = crypto.getRandomValues(new Uint8Array(t));
  for (; t--; )
    i += je[e[t] & 63];
  return i;
};
function ce(t) {
  return t & 1 ? ~(t >> 1) : t >> 1;
}
function de(t, i = 5) {
  const e = Math.pow(10, i);
  let n = 0, o = 0, s = 0;
  const r = [];
  let a = 0, h = 0, c = null, d, l;
  for (; n < t.length; ) {
    c = null, a = 0, h = 0;
    do
      c = t.charCodeAt(n++) - 63, h |= (c & 31) << a, a += 5;
    while (c >= 32);
    d = ce(h), a = h = 0;
    do
      c = t.charCodeAt(n++) - 63, h |= (c & 31) << a, a += 5;
    while (c >= 32);
    l = ce(h), o += d, s += l, r.push([s / e, o / e]);
  }
  return r;
}
function ze(t, i) {
  return t.geometries === "geojson" ? i.coordinates : t.geometries === "polyline6" ? de(i, 6) : de(i, 5);
}
function qe(t, i, e) {
  var n, o, s, r;
  if ((n = t.annotations) != null && n.includes("congestion_numeric"))
    return ((o = i == null ? void 0 : i.congestion_numeric) == null ? void 0 : o[e]) ?? 0;
  if ((s = t.annotations) != null && s.includes("congestion"))
    switch (((r = i == null ? void 0 : i.congestion) == null ? void 0 : r[e]) ?? "") {
      case "unknown":
        return 0;
      case "low":
        return 1;
      case "moderate":
        return 34;
      case "heavy":
        return 77;
      case "severe":
        return 100;
      default:
        return 0;
    }
  else
    return 0;
}
function Ue(t, i, e) {
  return !t.geometries || t.geometries === "polyline" ? Math.abs(i[0] - e[0]) <= 1e-5 && Math.abs(i[1] - e[1]) <= 1e-5 : i[0] === e[0] && i[1] === e[1];
}
function ge(t) {
  return t.map((i) => [i.geometry.coordinates[0], i.geometry.coordinates[1]]);
}
function ue(t) {
  return t.map((i) => {
    var e, n, o;
    return Array.isArray((e = i.properties) == null ? void 0 : e.bearing) ? [(n = i.properties) == null ? void 0 : n.bearing[0], (o = i.properties) == null ? void 0 : o.bearing[1]] : void 0;
  });
}
function De(t) {
  const i = $e(
    t == null ? void 0 : t.pointsScalingFactor,
    t == null ? void 0 : t.linesScalingFactor,
    t == null ? void 0 : t.sourceName
  );
  return Object.assign({}, xe, { layers: i }, t);
}
function Ee(t, i, e) {
  const n = t.makePostRequest ? "post" : "get";
  let o, s;
  if (n === "get")
    o = `${t.api}/${t.profile}/${i.join(";")}`, s = new URLSearchParams(t.requestOptions);
  else {
    o = `${t.api}/${t.profile}${t.requestOptions.access_token ? `?access_token=${t.requestOptions.access_token}` : ""}`;
    const r = new FormData();
    Object.entries(t.requestOptions).forEach(([a, h]) => {
      a !== "access_token" && r.set(a, h);
    }), r.set("coordinates", i.join(";")), s = new URLSearchParams(r);
  }
  return t.bearings && e && s.set(
    "bearings",
    e.map((r) => r ? `${r[0]},${r[1]}` : "").join(";")
  ), {
    method: n,
    url: o,
    payload: s
  };
}
function Le(t, i, e) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: t
    },
    properties: {
      type: i,
      id: we(),
      ...e ?? {}
    }
  };
}
function Me(t, i, e, n, o = false) {
  if (t.length !== i.length)
    return [];
  const s = t.map((r, a) => ({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [r[0], r[1]],
        [i[a][0], i[a][1]]
      ]
    },
    properties: {
      type: "SNAPLINE"
    }
  }));
  return ~n && e !== void 0 && o && (s.push({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [e[0], e[1]],
        [i[n][0], i[n][1]]
      ]
    },
    properties: {
      type: "SNAPLINE"
    }
  }), s.push({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [e[0], e[1]],
        [i[n + 1][0], i[n + 1][1]]
      ]
    },
    properties: {
      type: "SNAPLINE"
    }
  })), s;
}
function Se(t, i, e, n) {
  return i.map((o, s) => {
    const r = ze(t, o.geometry), a = n.map((m) => m.geometry.coordinates);
    let h = 0;
    const c = a.map((m, f) => {
      const E = r.slice(h).findIndex((v) => Ue(t, v, m)), D = f === a.length - 1;
      if (E !== -1)
        h += E;
      else if (D)
        return r.length - 1;
      return h;
    }).slice(1);
    let d = 0;
    const l = c.map((m) => r.slice(d, d = m + 1)), g = [];
    return l.forEach((m, f) => {
      const E = we();
      m.forEach((D, v) => {
        var b, R, T;
        const _ = g[g.length - 1], y = qe(t, (b = o.legs[f]) == null ? void 0 : b.annotation, v);
        if (f === ((R = _ == null ? void 0 : _.properties) == null ? void 0 : R.legIndex) && ((T = _.properties) == null ? void 0 : T.congestion) === y)
          _.geometry.coordinates.push(D);
        else {
          const x = n[f].properties ?? {}, W = n[f + 1].properties ?? {}, C = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: []
            },
            properties: {
              id: E,
              // used to highlight the whole leg when hovered, not a single segment
              routeIndex: s,
              // used to switch between alternative and selected routes
              route: s === e ? "SELECTED" : "ALT",
              legIndex: f,
              // used across forEach iterations to check whether it's safe to continue a segment
              congestion: y,
              // the current segment's congestion level
              departSnappointProperties: x,
              // include depart and arrive snappoints' properties to allow customization...
              arriveSnappointProperties: W
              // ...of behavior via a subclass
            }
          };
          _ && C.geometry.coordinates.push(
            _.geometry.coordinates[_.geometry.coordinates.length - 1]
          ), C.geometry.coordinates.push(D), g.push(C);
        }
      });
    }), g;
  });
}
var bt = Object.freeze(Object.defineProperty({
  __proto__: null,
  buildConfiguration: De,
  buildPoint: Le,
  buildRequest: Ee,
  buildRoutelines: Se,
  buildSnaplines: Me
}, Symbol.toStringTag, { value: "Module" }));
var _t = class extends Ne {
  constructor(e, n) {
    super(e);
    u(this, "configuration");
    u(this, "_interactive", false);
    u(this, "_hoverable", false);
    u(this, "buildRequest", Ee);
    u(this, "buildPoint", Le);
    u(this, "buildSnaplines", Me);
    u(this, "buildRoutelines", Se);
    u(this, "onMoveHandler");
    u(this, "onDragDownHandler");
    u(this, "onDragMoveHandler");
    u(this, "onDragUpHandler");
    u(this, "onClickHandler");
    u(this, "liveRefreshHandler");
    u(this, "profiles", []);
    u(this, "_waypoints", []);
    u(this, "snappoints", []);
    u(this, "routelines", []);
    u(this, "selectedRouteIndex", 0);
    u(this, "hoverpoint");
    u(this, "highlightedWaypoints", []);
    u(this, "highlightedSnappoints", []);
    u(this, "dragDownPosition", {
      x: 0,
      y: 0
    });
    u(this, "waypointBeingDragged");
    u(this, "waypointBeingDraggedInitialCoordinates");
    u(this, "departSnappointIndex", -1);
    u(this, "currentMousePosition", {
      x: 0,
      y: 0
    });
    u(this, "refreshOnMoveIsRefreshing", false);
    u(this, "noMouseMovementTimer");
    u(this, "lastRequestMousePosition", {
      x: 0,
      y: 0
    });
    u(this, "allowRouteSwitch", false);
    u(this, "abortController");
    this.map = e, this.configuration = De(n), this.onMoveHandler = this.onMove.bind(this), this.onDragDownHandler = this.onDragDown.bind(this), this.onDragMoveHandler = this.onDragMove.bind(this), this.onDragUpHandler = this.onDragUp.bind(this), this.onClickHandler = this.onClick.bind(this), this.liveRefreshHandler = this.liveRefresh.bind(this), this.init();
  }
  /**
   * @alias {@link waypoints}
   *
   * Aliased for the sakes of naming-consistency.
   */
  get waypointsCoordinates() {
    return ge(this._waypoints);
  }
  get snappointsCoordinates() {
    return this.snappoints.map((e) => [e.geometry.coordinates[0], e.geometry.coordinates[1]]);
  }
  get snaplines() {
    var e, n, o;
    return this.buildSnaplines(
      this.waypointsCoordinates,
      this.snappointsCoordinates,
      (e = this.hoverpoint) == null ? void 0 : e.geometry.coordinates,
      this.departSnappointIndex,
      (o = (n = this.hoverpoint) == null ? void 0 : n.properties) == null ? void 0 : o.showSnaplines
    );
  }
  init() {
    this.map.addSource(this.configuration.sourceName, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      }
    }), this.configuration.layers.forEach((e) => {
      this.map.addLayer(e);
    });
  }
  async fetch({ method: e, url: n, payload: o }) {
    var r, a;
    const s = await (e === "get" ? await fetch(`${n}?${o}`, { signal: (r = this.abortController) == null ? void 0 : r.signal }) : await fetch(`${n}`, {
      signal: (a = this.abortController) == null ? void 0 : a.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: o
    })).json();
    if (s.code !== "Ok")
      throw new Error(s.message ?? "An unexpected error occurred.");
    return s;
  }
  async fetchDirections(e) {
    var n;
    if ((n = this.abortController) == null || n.abort(), this._waypoints.length >= 2) {
      this.fire(new ae("fetchroutesstart", e)), this.abortController = new AbortController();
      let o;
      this.configuration.requestTimeout !== null && (o = setTimeout(() => {
        var l;
        return (l = this.abortController) == null ? void 0 : l.abort();
      }, this.configuration.requestTimeout)), this.profiles.length || (this.profiles = [this.configuration.profile]);
      const s = [], r = [];
      this.profiles.reduce((l, g, m) => {
        const f = m === this.profiles.length - 1, E = m > 0 ? this.profiles[m - 1] : void 0, D = g === E, v = f ? (
          /**
           * If it's the last supplied profile include all remaining waypoints
           */
          this._waypoints.length
        ) : D ? (
          /**
           * If profile is same as previous one add a slice of one element only
           */
          l + 1
        ) : (
          /**
           * If profile is different slice corresponding pair of coordinates
           */
          l + 2
        );
        return D ? r[r.length - 1].push(...this._waypoints.slice(l, v)) : (r.push(this._waypoints.slice(l, v)), s.push(g)), v;
      }, 0);
      const a = s.map((l, g) => this.buildRequest(
        { ...this.configuration, profile: l },
        ge(r[g]),
        this.configuration.bearings ? ue(r[g]) : void 0
      ));
      let h;
      try {
        h = await Promise.all(
          a.map(async (l) => {
            let g;
            try {
              g = await this.fetch(l);
            } finally {
              this.fire(new ae("fetchroutesend", e, g));
            }
            return g;
          })
        );
      } finally {
        clearTimeout(o);
      }
      const c = h.flatMap((l, g) => {
        const m = s[g], f = l.waypoints.map(
          (D, v) => this.buildPoint(D.location, "SNAPPOINT", {
            profile: m,
            waypointProperties: r[g][v].properties ?? {}
          })
        ), E = this.buildRoutelines(
          this.configuration.requestOptions,
          l.routes,
          this.selectedRouteIndex,
          f
        );
        return { snappoints: f, routelines: E };
      }), d = h.flatMap((l) => l.routes);
      this.snappoints = c.flatMap((l) => l.snappoints), this.routelines = c.flatMap((l) => l.routelines), d.length <= this.selectedRouteIndex && (this.selectedRouteIndex = 0);
    } else
      this.snappoints = [], this.routelines = [];
    this.draw(false);
  }
  draw(e = true) {
    const n = [
      ...this._waypoints,
      ...this.snappoints,
      ...this.snaplines,
      ...this.routelines.reduce((s, r) => e ? s.concat(...r) : s.concat(
        ...r.map((a) => (a.properties && (a.properties.route = a.properties.routeIndex === this.selectedRouteIndex ? "SELECTED" : "ALT"), a))
      ), [])
    ];
    this.hoverpoint && n.push(this.hoverpoint);
    const o = {
      type: "FeatureCollection",
      features: n
    };
    this.map.getSource(this.configuration.sourceName) && this.map.getSource(this.configuration.sourceName).setData(o);
  }
  deHighlight() {
    this.highlightedWaypoints.forEach((e) => {
      e != null && e.properties && (e.properties.highlight = false);
    }), this.highlightedSnappoints.forEach((e) => {
      e != null && e.properties && (e.properties.highlight = false);
    }), this.routelines.forEach((e) => {
      e.forEach((n) => {
        n.properties && (n.properties.highlight = false);
      });
    });
  }
  onMove(e) {
    var o, s, r, a;
    const n = this.map.queryRenderedFeatures(e.point, {
      layers: [
        ...this.configuration.sensitiveWaypointLayers,
        ...this.configuration.sensitiveSnappointLayers,
        ...this.configuration.sensitiveRoutelineLayers,
        ...this.configuration.sensitiveAltRoutelineLayers
      ]
    })[0];
    if (this.deHighlight(), this.configuration.sensitiveWaypointLayers.includes((n == null ? void 0 : n.layer.id) ?? "")) {
      this.map.getCanvas().style.cursor = "pointer", this.interactive && this.map.dragPan.disable();
      const h = this._waypoints.find((d) => {
        var l, g;
        return ((l = d.properties) == null ? void 0 : l.id) === ((g = n == null ? void 0 : n.properties) == null ? void 0 : g.id);
      }), c = h && this.snappoints.find(
        (d) => {
          var l, g, m;
          return ((g = (l = d.properties) == null ? void 0 : l.waypointProperties) == null ? void 0 : g.id) === ((m = h.properties) == null ? void 0 : m.id);
        }
      );
      h && (this.highlightedWaypoints = [h]), c && (this.highlightedSnappoints = [c]), (o = this.highlightedWaypoints[0]) != null && o.properties && (this.highlightedWaypoints[0].properties.highlight = true), (s = this.highlightedSnappoints[0]) != null && s.properties && (this.highlightedSnappoints[0].properties.highlight = true), this.hoverpoint && (this.hoverpoint = void 0);
    } else if (this.configuration.sensitiveSnappointLayers.includes((n == null ? void 0 : n.layer.id) ?? "")) {
      this.map.getCanvas().style.cursor = "pointer";
      const h = this.snappoints.findIndex((c) => {
        var d, l;
        return ((d = c.properties) == null ? void 0 : d.id) === ((l = n == null ? void 0 : n.properties) == null ? void 0 : l.id);
      });
      this.highlightedSnappoints = [this.snappoints[h]], this.highlightedWaypoints = [this._waypoints[h]], this.highlightedSnappoints[0].properties && (this.highlightedSnappoints[0].properties.highlight = true), this.highlightedWaypoints[0].properties && (this.highlightedWaypoints[0].properties.highlight = true), this.hoverpoint && (this.hoverpoint = void 0);
    } else
      this.configuration.sensitiveRoutelineLayers.includes((n == null ? void 0 : n.layer.id) ?? "") ? (this.map.getCanvas().style.cursor = "pointer", this.interactive && (this.map.dragPan.disable(), this.hoverpoint ? this.hoverpoint.geometry.coordinates = [e.lngLat.lng, e.lngLat.lat] : this.hoverpoint = this.buildPoint([e.lngLat.lng, e.lngLat.lat], "HOVERPOINT", {
        departSnappointProperties: {
          ...JSON.parse(((r = n == null ? void 0 : n.properties) == null ? void 0 : r.departSnappointProperties) ?? "{}")
        },
        arriveSnappointProperties: {
          ...JSON.parse(((a = n == null ? void 0 : n.properties) == null ? void 0 : a.arriveSnappointProperties) ?? "{}")
        }
      })), this.routelines.forEach((h) => {
        h.forEach((c) => {
          var d, l;
          c.properties && ((d = c.properties) == null ? void 0 : d.id) === ((l = n == null ? void 0 : n.properties) == null ? void 0 : l.id) && (c.properties.highlight = true);
        });
      })) : this.configuration.sensitiveAltRoutelineLayers.includes((n == null ? void 0 : n.layer.id) ?? "") ? (this.map.getCanvas().style.cursor = "pointer", this.routelines.forEach((h) => {
        h.forEach((c) => {
          var d, l;
          c.properties && ((d = c.properties) == null ? void 0 : d.id) === ((l = n == null ? void 0 : n.properties) == null ? void 0 : l.id) && (c.properties.highlight = true);
        });
      }), this.hoverpoint && (this.hoverpoint = void 0)) : (this.map.dragPan.enable(), this.map.getCanvas().style.cursor = "", this.hoverpoint = void 0);
    this.draw();
  }
  onDragDown(e) {
    var o, s, r, a, h, c;
    if (e.type === "touchstart" && e.originalEvent.touches.length !== 1 || e.type === "mousedown" && e.originalEvent.which !== 1)
      return;
    const n = this.map.queryRenderedFeatures(e.point);
    if (n.length && n[0].source === this.configuration.sourceName) {
      const d = n.filter((l) => this.configuration.sensitiveWaypointLayers.includes((l == null ? void 0 : l.layer.id) ?? "") || this.configuration.sensitiveSnappointLayers.includes((l == null ? void 0 : l.layer.id) ?? "") || this.configuration.sensitiveRoutelineLayers.includes((l == null ? void 0 : l.layer.id) ?? ""))[0];
      if (this.dragDownPosition = e.point, this.currentMousePosition = e.point, this.configuration.sensitiveWaypointLayers.includes((d == null ? void 0 : d.layer.id) ?? ""))
        this.waypointBeingDragged = this._waypoints.find((l) => {
          var g, m;
          return ((g = l.properties) == null ? void 0 : g.id) === ((m = d == null ? void 0 : d.properties) == null ? void 0 : m.id);
        }), this.waypointBeingDraggedInitialCoordinates = (o = this.waypointBeingDragged) == null ? void 0 : o.geometry.coordinates;
      else if (this.configuration.sensitiveRoutelineLayers.includes((d == null ? void 0 : d.layer.id) ?? "")) {
        if (this.departSnappointIndex = JSON.parse((s = d == null ? void 0 : d.properties) == null ? void 0 : s.legIndex), this.hoverpoint)
          if (this.configuration.refreshOnMove) {
            const l = this.departSnappointIndex !== void 0 ? this.departSnappointIndex + 1 : void 0;
            this._addWaypoint([e.lngLat.lng, e.lngLat.lat], l, e), this.waypointBeingDragged = l ? this._waypoints[l] : void 0, this.hoverpoint = void 0;
          } else
            this.hoverpoint.geometry.coordinates = [e.lngLat.lng, e.lngLat.lat];
        else
          this.hoverpoint = this.buildPoint([e.lngLat.lng, e.lngLat.lat], "HOVERPOINT", {
            departSnappointProperties: {
              ...JSON.parse(((r = d == null ? void 0 : d.properties) == null ? void 0 : r.departSnappointProperties) ?? "{}")
            },
            arriveSnappointProperties: {
              ...JSON.parse(((a = d == null ? void 0 : d.properties) == null ? void 0 : a.arriveSnappointProperties) ?? "{}")
            }
          });
        (h = this.hoverpoint) != null && h.properties && (this.hoverpoint.properties.showSnaplines = true), ~this.departSnappointIndex && ((c = this.snappoints[this.departSnappointIndex]) != null && c.properties) && (this.snappoints[this.departSnappointIndex].properties.highlight = true, this.highlightedSnappoints.push(this.snappoints[this.departSnappointIndex]), this.snappoints[this.departSnappointIndex + 1].properties.highlight = true, this.highlightedSnappoints.push(this.snappoints[this.departSnappointIndex + 1]));
      }
      this.map.off("touchstart", this.onMoveHandler), this.map.off("mousemove", this.onMoveHandler), e.type === "touchstart" ? (this.map.on("touchmove", this.onDragMoveHandler), this.map.on("touchend", this.onDragUpHandler)) : e.type === "mousedown" && (this.map.on("mousemove", this.onDragMoveHandler), this.map.on("mouseup", this.onDragUpHandler)), this.draw();
    }
  }
  onDragMove(e) {
    if (this.configuration.refreshOnMove && (clearTimeout(this.noMouseMovementTimer), this.noMouseMovementTimer = setTimeout(this.liveRefreshHandler, 300, e)), e.type === "touchmove" && e.originalEvent.touches.length !== 1)
      return e.originalEvent.preventDefault();
    e.type === "mousemove" && e.originalEvent.which !== 1 || (this.waypointBeingDragged ? this.waypointBeingDragged.geometry.coordinates = [e.lngLat.lng, e.lngLat.lat] : this.hoverpoint && (this.hoverpoint.geometry.coordinates = [e.lngLat.lng, e.lngLat.lat]), this.currentMousePosition = e.point, this.draw(), this.configuration.refreshOnMove && !this.refreshOnMoveIsRefreshing && this.liveRefreshHandler(e));
  }
  onDragUp(e) {
    var n, o, s;
    if (this.configuration.refreshOnMove && clearTimeout(this.noMouseMovementTimer), !(e.type === "mouseup" && e.originalEvent.which !== 1)) {
      if ((n = this.hoverpoint) != null && n.properties && (this.hoverpoint.properties.showSnaplines = false), Math.abs(e.point.x - ((o = this.dragDownPosition) == null ? void 0 : o.x)) > (this.configuration.dragThreshold >= 0 ? this.configuration.dragThreshold : 0) || Math.abs(e.point.y - ((s = this.dragDownPosition) == null ? void 0 : s.y)) > (this.configuration.dragThreshold >= 0 ? this.configuration.dragThreshold : 0))
        if (this.waypointBeingDragged) {
          this.waypointBeingDragged.geometry.coordinates = [e.lngLat.lng, e.lngLat.lat];
          const r = new $("movewaypoint", e, {
            index: this._waypoints.indexOf(this.waypointBeingDragged),
            initialCoordinates: this.waypointBeingDraggedInitialCoordinates
          });
          this.fire(r), this.fetchDirections(r).catch((a) => {
            a instanceof DOMException && a.name == "AbortError" || this.waypointBeingDragged && this.waypointBeingDraggedInitialCoordinates && (this.waypointBeingDragged.geometry.coordinates = this.waypointBeingDraggedInitialCoordinates);
          }), this.waypointBeingDragged = void 0, this.waypointBeingDraggedInitialCoordinates = void 0;
        } else
          this.hoverpoint && (this._addWaypoint(
            [e.lngLat.lng, e.lngLat.lat],
            this.departSnappointIndex !== void 0 ? this.departSnappointIndex + 1 : void 0,
            e
          ), this.hoverpoint = void 0);
      else
        this.waypointBeingDragged && this.waypointBeingDraggedInitialCoordinates ? (this.waypointBeingDragged.geometry.coordinates = this.waypointBeingDraggedInitialCoordinates, this.waypointBeingDragged = void 0, this.waypointBeingDraggedInitialCoordinates = void 0) : this.hoverpoint && (this.hoverpoint = void 0);
      this.deHighlight(), e.type === "touchend" ? (this.map.off("touchmove", this.onDragMoveHandler), this.map.off("touchend", this.onDragUpHandler)) : e.type === "mouseup" && (this.map.off("mousemove", this.onDragMoveHandler), this.map.off("mouseup", this.onDragUpHandler)), this.map.on("touchstart", this.onMoveHandler), this.map.on("mousemove", this.onMoveHandler), this.map.dragPan.enable(), this.draw(), this.map.once("idle", () => {
        this.onMove(e);
      });
    }
  }
  async liveRefresh(e) {
    var n, o, s, r;
    if (Math.abs(((n = this.lastRequestMousePosition) == null ? void 0 : n.x) - ((o = this.currentMousePosition) == null ? void 0 : o.x)) > (this.configuration.dragThreshold >= 0 ? this.configuration.dragThreshold : 0) || Math.abs(((s = this.lastRequestMousePosition) == null ? void 0 : s.y) - ((r = this.currentMousePosition) == null ? void 0 : r.y)) > (this.configuration.dragThreshold >= 0 ? this.configuration.dragThreshold : 0)) {
      if (this.refreshOnMoveIsRefreshing = true, this.lastRequestMousePosition = this.currentMousePosition, this.waypointBeingDragged) {
        const a = new $("movewaypoint", e, {
          index: this._waypoints.indexOf(this.waypointBeingDragged),
          initialCoordinates: this.waypointBeingDraggedInitialCoordinates
        });
        this.fire(a);
        try {
          await this.fetchDirections(a);
        } catch {
        }
      }
      this.refreshOnMoveIsRefreshing = false;
    }
  }
  onClick(e) {
    const n = this.map.queryRenderedFeatures(e.point, {
      layers: [
        ...this.configuration.sensitiveWaypointLayers,
        ...this.configuration.sensitiveSnappointLayers,
        ...this.configuration.sensitiveAltRoutelineLayers,
        ...this.configuration.sensitiveRoutelineLayers
      ]
    })[0];
    if (this.interactive && this.configuration.sensitiveWaypointLayers.includes((n == null ? void 0 : n.layer.id) ?? "")) {
      const o = this._waypoints.findIndex((s) => {
        var r, a;
        return ((r = s.properties) == null ? void 0 : r.id) === ((a = n == null ? void 0 : n.properties) == null ? void 0 : a.id);
      });
      ~o && this._removeWaypoint(o, e);
    } else if (this.interactive && this.configuration.sensitiveSnappointLayers.includes((n == null ? void 0 : n.layer.id) ?? "")) {
      const o = this.snappoints.findIndex((s) => {
        var r, a;
        return ((r = s.properties) == null ? void 0 : r.id) === ((a = n == null ? void 0 : n.properties) == null ? void 0 : a.id);
      });
      ~o && this._removeWaypoint(o, e);
    } else
      (this.interactive || this.allowRouteSwitch) && this.configuration.sensitiveAltRoutelineLayers.includes((n == null ? void 0 : n.layer.id) ?? "") ? this.selectedRouteIndex = this.routelines.findIndex((o) => !!o.find((s) => {
        var r, a;
        return ((r = s.properties) == null ? void 0 : r.id) === ((a = n == null ? void 0 : n.properties) == null ? void 0 : a.id);
      })) : this.interactive && !this.configuration.sensitiveRoutelineLayers.includes((n == null ? void 0 : n.layer.id) ?? "") && this._addWaypoint([e.lngLat.lng, e.lngLat.lat], void 0, e);
    this.draw(false), this.map.once("idle", () => {
      this.onMove(e);
    });
  }
  assignWaypointsCategories() {
    this._waypoints.forEach((e, n) => {
      const o = n === 0 ? "ORIGIN" : n === this._waypoints.length - 1 ? "DESTINATION" : void 0;
      e.properties && (e.properties.index = n, e.properties.category = o);
    });
  }
  async _addWaypoint(e, n, o) {
    var r;
    (r = this.abortController) == null || r.abort(), n = n ?? this._waypoints.length, this._waypoints.splice(
      n,
      0,
      this.buildPoint(
        e,
        "WAYPOINT",
        this.configuration.bearings ? {
          bearing: void 0
        } : void 0
      )
    ), this.assignWaypointsCategories();
    const s = new $("addwaypoint", o, {
      index: n
    });
    this.fire(s), this.draw();
    try {
      await this.fetchDirections(s);
    } catch {
    }
  }
  async _removeWaypoint(e, n) {
    var s;
    (s = this.abortController) == null || s.abort(), this._waypoints.splice(e, 1), this.snappoints.splice(e, 1), this.assignWaypointsCategories();
    const o = new $("removewaypoint", n, {
      index: e
    });
    this.fire(o), this.draw();
    try {
      await this.fetchDirections(o);
    } catch {
    }
  }
  // the public interface begins here
  /**
   * The interactivity state of the instance. When `true`, the user is allowed to interact with the features drawn on
   * the map and to add waypoints by clicking the map. Automatically set to `false` whenever there's an ongoing
   * routing request.
   */
  get interactive() {
    return this._interactive;
  }
  set interactive(e) {
    this._interactive = e, e ? (this.map.on("touchstart", this.onMoveHandler), this.map.on("touchstart", this.onDragDownHandler), this.map.on("mousedown", this.onDragDownHandler), this.map.on("click", this.onClickHandler), this.hoverable || (this.map.on("mousemove", this.onMoveHandler), this.map.on("click", this.onClickHandler))) : (this.map.off("touchstart", this.onMoveHandler), this.map.off("touchstart", this.onDragDownHandler), this.map.off("mousedown", this.onDragDownHandler), this.hoverable || (this.map.off("mousemove", this.onMoveHandler), this.map.off("click", this.onClickHandler)), this.map.dragPan.enable());
  }
  /**
   * Allows hover effects in non-interactive mode. Can be set to `true` while `interactive` is `false` for the features
   * to be highlighted when hovered over by the user. Does nothing when `interactive` is `true`.
   */
  get hoverable() {
    return this._hoverable;
  }
  set hoverable(e) {
    this._hoverable = e, e && !this.interactive ? (this.map.on("mousemove", this.onMoveHandler), this.map.on("click", this.onClickHandler)) : this.interactive || (this.map.off("mousemove", this.onMoveHandler), this.map.off("click", this.onClickHandler));
  }
  /**
   * Returns all the waypoints' coordinates in the order they appear.
   */
  get waypoints() {
    return this.waypointsCoordinates;
  }
  /**
   * @alias Synchronous analogue of {@link setWaypoints}.
   */
  set waypoints(e) {
    this.setWaypoints(e);
  }
  /**
   * Returns all the waypoints' bearings values or an empty array if the `bearings` configuration option is not
   * enabled.
   */
  get waypointsBearings() {
    return this.configuration.bearings ? ue(this._waypoints) : (console.warn(
      "The `waypointsBearings` getter was referred to, but the `bearings` configuration option is not enabled!"
    ), []);
  }
  /**
   * Sets the waypoints' bearings values. Does not produce any effect in case the `bearings` configuration option is
   * disabled.
   */
  set waypointsBearings(e) {
    if (!this.configuration.bearings) {
      console.warn(
        "The `waypointsBearings` setter was referred to, but the `bearings` configuration option is not enabled!"
      );
      return;
    }
    this._waypoints.forEach((o, s) => {
      (o.properties || (o.properties = {})).bearing = e[s];
    });
    const n = new $("rotatewaypoints", void 0);
    this.fire(n), this.draw();
    try {
      this.fetchDirections(n);
    } catch {
    }
  }
  /**
   * Replaces all the waypoints with the specified ones and re-fetches the routes.
   *
   * @param waypoints The coordinates at which the waypoints should be added
   * @param profiles Profiles for fetching directions between waypoints.
   * @return Resolved after the routing request has finished
   */
  async setWaypoints(e, n = []) {
    var s;
    (s = this.abortController) == null || s.abort(), this.profiles = n.slice(0, e.length - 1), this.profiles.length === 0 && this.profiles.push(this.configuration.profile), this._waypoints = this.profiles.flatMap((r, a) => {
      const h = a === this.profiles.length - 1, c = a > 0 ? this.profiles[a - 1] : void 0, l = r === c ? a + 1 : a, g = h ? e.length : a + 2;
      return e.slice(l, g).map((m, f) => this.buildPoint(m, "WAYPOINT", {
        profile: r,
        ...this.configuration.bearings ? {
          bearing: this.waypointsBearings[f]
        } : void 0
      }));
    }), this.assignWaypointsCategories();
    const o = new $("setwaypoints", void 0);
    this.fire(o), this.draw();
    try {
      await this.fetchDirections(o);
    } catch {
    }
  }
  /**
   * Adds a waypoint at the specified coordinates to the map and re-fetches the routes.
   *
   * @param waypoint The coordinates at which the waypoint should be added
   * @param index The index the waypoint should be inserted at. If omitted, the waypoint is inserted at the end
   * @return Resolved after the routing request has finished
   */
  async addWaypoint(e, n) {
    await this._addWaypoint(e, n);
  }
  /**
   * Removes a waypoint and its related snappoint by the waypoint's index from the map and re-fetches the routes.
   *
   * @param index The index of the waypoint to remove
   * @return Resolved after the routing request has finished
   */
  async removeWaypoint(e) {
    await this._removeWaypoint(e);
  }
  /**
   * Clears the map from all the instance's traces: waypoints, snappoints, routes, etc.
   */
  clear() {
    this.setWaypoints([]), this.routelines = [];
  }
  /**
   * Removes all the added `MapLibreGlDirections`-specific layers and sources. Must be called manually before
   * de-initializing the instance.
   */
  destroy() {
    var e;
    (e = this.abortController) == null || e.abort(), this.clear(), this.hoverable = false, this.interactive = false, this.configuration.layers.forEach((n) => {
      this.map.removeLayer(n.id);
    }), this.map.removeSource(this.configuration.sourceName);
  }
};
function N() {
}
function Pe(t) {
  return t();
}
function fe() {
  return /* @__PURE__ */ Object.create(null);
}
function J(t) {
  t.forEach(Pe);
}
function Re(t) {
  return typeof t == "function";
}
function Ie(t, i) {
  return t != t ? i == i : t !== i || t && typeof t == "object" || typeof t == "function";
}
function Ve(t) {
  return Object.keys(t).length === 0;
}
function w(t, i) {
  t.appendChild(i);
}
function B(t, i, e) {
  t.insertBefore(i, e || null);
}
function O(t) {
  t.parentNode && t.parentNode.removeChild(t);
}
function Ge(t, i) {
  for (let e = 0; e < t.length; e += 1)
    t[e] && t[e].d(i);
}
function S(t) {
  return document.createElement(t);
}
function P(t) {
  return document.createElementNS("http://www.w3.org/2000/svg", t);
}
function X(t) {
  return document.createTextNode(t);
}
function k() {
  return X(" ");
}
function Je() {
  return X("");
}
function F(t, i, e, n) {
  return t.addEventListener(i, e, n), () => t.removeEventListener(i, e, n);
}
function p(t, i, e) {
  e == null ? t.removeAttribute(i) : t.getAttribute(i) !== e && t.setAttribute(i, e);
}
function K(t) {
  return t === "" ? null : +t;
}
function Ye(t) {
  return Array.from(t.childNodes);
}
function Fe(t, i) {
  i = "" + i, t.data !== i && (t.data = /** @type {string} */
  i);
}
function Q(t, i) {
  t.value = i ?? "";
}
function A(t, i, e, n) {
  e == null ? t.style.removeProperty(i) : t.style.setProperty(i, e, n ? "important" : "");
}
var G;
function V(t) {
  G = t;
}
function Xe() {
  if (!G)
    throw new Error("Function called outside component initialization");
  return G;
}
function Ke(t) {
  Xe().$$.on_destroy.push(t);
}
var z = [];
var ee = [];
var q = [];
var me = [];
var Qe = Promise.resolve();
var te = false;
function Ze() {
  te || (te = true, Qe.then(Te));
}
function ie(t) {
  q.push(t);
}
var Z = /* @__PURE__ */ new Set();
var j = 0;
function Te() {
  if (j !== 0)
    return;
  const t = G;
  do {
    try {
      for (; j < z.length; ) {
        const i = z[j];
        j++, V(i), et(i.$$);
      }
    } catch (i) {
      throw z.length = 0, j = 0, i;
    }
    for (V(null), z.length = 0, j = 0; ee.length; )
      ee.pop()();
    for (let i = 0; i < q.length; i += 1) {
      const e = q[i];
      Z.has(e) || (Z.add(e), e());
    }
    q.length = 0;
  } while (z.length);
  for (; me.length; )
    me.pop()();
  te = false, Z.clear(), V(t);
}
function et(t) {
  if (t.fragment !== null) {
    t.update(), J(t.before_update);
    const i = t.dirty;
    t.dirty = [-1], t.fragment && t.fragment.p(t.ctx, i), t.after_update.forEach(ie);
  }
}
function tt(t) {
  const i = [], e = [];
  q.forEach((n) => t.indexOf(n) === -1 ? i.push(n) : e.push(n)), e.forEach((n) => n()), q = i;
}
var it = /* @__PURE__ */ new Set();
function nt(t, i) {
  t && t.i && (it.delete(t), t.i(i));
}
function ye(t) {
  return (t == null ? void 0 : t.length) !== void 0 ? t : Array.from(t);
}
function ot(t, i, e) {
  const { fragment: n, after_update: o } = t.$$;
  n && n.m(i, e), ie(() => {
    const s = t.$$.on_mount.map(Pe).filter(Re);
    t.$$.on_destroy ? t.$$.on_destroy.push(...s) : J(s), t.$$.on_mount = [];
  }), o.forEach(ie);
}
function st(t, i) {
  const e = t.$$;
  e.fragment !== null && (tt(e.after_update), J(e.on_destroy), e.fragment && e.fragment.d(i), e.on_destroy = e.fragment = null, e.ctx = []);
}
function rt(t, i) {
  t.$$.dirty[0] === -1 && (z.push(t), Ze(), t.$$.dirty.fill(0)), t.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function Ce(t, i, e, n, o, s, r = null, a = [-1]) {
  const h = G;
  V(t);
  const c = t.$$ = {
    fragment: null,
    ctx: [],
    // state
    props: s,
    update: N,
    not_equal: o,
    bound: fe(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(i.context || (h ? h.$$.context : [])),
    // everything else
    callbacks: fe(),
    dirty: a,
    skip_bound: false,
    root: i.target || h.$$.root
  };
  r && r(c.root);
  let d = false;
  if (c.ctx = e ? e(t, i.props || {}, (l, g, ...m) => {
    const f = m.length ? m[0] : g;
    return c.ctx && o(c.ctx[l], c.ctx[l] = f) && (!c.skip_bound && c.bound[l] && c.bound[l](f), d && rt(t, l)), g;
  }) : [], c.update(), d = true, J(c.before_update), c.fragment = n ? n(c.ctx) : false, i.target) {
    if (i.hydrate) {
      const l = Ye(i.target);
      c.fragment && c.fragment.l(l), l.forEach(O);
    } else
      c.fragment && c.fragment.c();
    i.intro && nt(t.$$.fragment), ot(t, i.target, i.anchor), Te();
  }
  V(h);
}
var He = class {
  constructor() {
    u(this, "$$");
    u(this, "$$set");
  }
  /** @returns {void} */
  $destroy() {
    st(this, 1), this.$destroy = N;
  }
  /**
   * @template {Extract<keyof Events, string>} K
   * @param {K} type
   * @param {((e: Events[K]) => void) | null | undefined} callback
   * @returns {() => void}
   */
  $on(i, e) {
    if (!Re(e))
      return N;
    const n = this.$$.callbacks[i] || (this.$$.callbacks[i] = []);
    return n.push(e), () => {
      const o = n.indexOf(e);
      o !== -1 && n.splice(o, 1);
    };
  }
  /**
   * @param {Partial<Props>} props
   * @returns {void}
   */
  $set(i) {
    this.$$set && !Ve(i) && (this.$$.skip_bound = true, this.$$set(i), this.$$.skip_bound = false);
  }
};
var at = "4";
typeof window < "u" && (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(at);
function ve(t) {
  let i, e, n, o, s, r, a, h, c, d, l, g, m, f, E, D;
  return {
    c() {
      i = P("svg"), e = P("circle"), o = P("path"), r = P("g"), a = P("path"), c = P("path"), l = P("path"), m = P("animateTransform"), p(e, "cx", "64.13"), p(e, "cy", "64.13"), p(e, "r", "27.63"), p(e, "fill", n = /*configuration*/
      t[0].fill), p(o, "d", "M64.13 18.5A45.63 45.63 0 1 1 18.5 64.13 45.63 45.63 0 0 1 64.13 18.5zm0 7.85a37.78 37.78 0 1 1-37.78 37.78 37.78 37.78 0 0 1 37.78-37.78z"), p(o, "fill-rule", "evenodd"), p(o, "fill", s = /*configuration*/
      t[0].fill), p(a, "d", "M95.25 17.4a56.26 56.26 0 0 0-76.8 13.23L12.1 26.2a64 64 0 0 1 87.6-15.17z"), p(a, "fill", h = /*configuration*/
      t[0].fill), p(c, "d", "M95.25 17.4a56.26 56.26 0 0 0-76.8 13.23L12.1 26.2a64 64 0 0 1 87.6-15.17z"), p(c, "fill", d = /*configuration*/
      t[0].fill), p(c, "transform", "rotate(120 64 64)"), p(l, "d", "M95.25 17.4a56.26 56.26 0 0 0-76.8 13.23L12.1 26.2a64 64 0 0 1 87.6-15.17z"), p(l, "fill", g = /*configuration*/
      t[0].fill), p(l, "transform", "rotate(240 64 64)"), p(m, "attributeName", "transform"), p(m, "type", "rotate"), p(m, "from", "0 64 64"), p(m, "to", "120 64 64"), p(m, "dur", "360ms"), p(m, "repeatCount", "indefinite"), p(i, "xmlns", "http://www.w3.org/2000/svg"), p(i, "width", f = /*configuration*/
      t[0].size), p(i, "height", E = /*configuration*/
      t[0].size), p(i, "viewBox", "0 0 128 128"), p(i, "xml:space", "preserve"), p(i, "class", D = /*configuration*/
      t[0].class);
    },
    m(v, _) {
      B(v, i, _), w(i, e), w(i, o), w(i, r), w(r, a), w(r, c), w(r, l), w(r, m);
    },
    p(v, _) {
      _ & /*configuration*/
      1 && n !== (n = /*configuration*/
      v[0].fill) && p(e, "fill", n), _ & /*configuration*/
      1 && s !== (s = /*configuration*/
      v[0].fill) && p(o, "fill", s), _ & /*configuration*/
      1 && h !== (h = /*configuration*/
      v[0].fill) && p(a, "fill", h), _ & /*configuration*/
      1 && d !== (d = /*configuration*/
      v[0].fill) && p(c, "fill", d), _ & /*configuration*/
      1 && g !== (g = /*configuration*/
      v[0].fill) && p(l, "fill", g), _ & /*configuration*/
      1 && f !== (f = /*configuration*/
      v[0].size) && p(i, "width", f), _ & /*configuration*/
      1 && E !== (E = /*configuration*/
      v[0].size) && p(i, "height", E), _ & /*configuration*/
      1 && D !== (D = /*configuration*/
      v[0].class) && p(i, "class", D);
    },
    d(v) {
      v && O(i);
    }
  };
}
function lt(t) {
  let i, e = (
    /*loading*/
    t[1] && ve(t)
  );
  return {
    c() {
      e && e.c(), i = Je();
    },
    m(n, o) {
      e && e.m(n, o), B(n, i, o);
    },
    p(n, [o]) {
      n[1] ? e ? e.p(n, o) : (e = ve(n), e.c(), e.m(i.parentNode, i)) : e && (e.d(1), e = null);
    },
    i: N,
    o: N,
    d(n) {
      n && O(i), e && e.d(n);
    }
  };
}
function ht(t, i, e) {
  let { directions: n } = i, { configuration: o } = i, s;
  return n.on("fetchroutesstart", () => {
    e(1, s = true);
  }), n.on("fetchroutesend", () => {
    e(1, s = false);
  }), t.$$set = (r) => {
    "directions" in r && e(2, n = r.directions), "configuration" in r && e(0, o = r.configuration);
  }, [o, s, n];
}
var pt = class extends He {
  constructor(i) {
    super(), Ce(this, i, ht, lt, Ie, { directions: 2, configuration: 0 });
  }
};
var ct = {
  fill: "#6d26d7",
  size: "24px",
  class: ""
};
var wt = class {
  constructor(i, e) {
    u(this, "controlElement");
    u(this, "directions");
    u(this, "configuration");
    this.directions = i, this.configuration = Object.assign({}, ct, e);
  }
  /**
   * @private
   */
  onAdd() {
    return this.controlElement = document.createElement("div"), new pt({
      target: this.controlElement,
      props: {
        directions: this.directions,
        configuration: this.configuration
      }
    }), this.controlElement;
  }
  /**
   * @private
   */
  onRemove() {
    this.controlElement.remove();
  }
};
function be(t, i, e) {
  const n = t.slice();
  return n[16] = i[e], n[17] = i, n[18] = e, n;
}
function dt(t) {
  let i, e, n, o, s, r, a, h, c;
  function d() {
    t[11].call(
      i,
      /*each_value*/
      t[17],
      /*i*/
      t[18]
    );
  }
  return {
    c() {
      i = S("input"), r = k(), a = S("span"), a.textContent = "°", p(i, "type", "number"), i.disabled = e = !/*waypointBearing*/
      t[16].enabled, p(i, "min", n = /*configuration*/
      t[0].degreesMin), p(i, "max", o = /*configuration*/
      t[0].degreesMax), p(i, "step", s = /*configuration*/
      t[0].degreesStep), p(i, "class", "maplibre-gl-directions-bearings-control__input"), p(a, "class", "maplibre-gl-directions-bearings-control__text");
    },
    m(l, g) {
      B(l, i, g), Q(
        i,
        /*waypointBearing*/
        t[16].degrees
      ), B(l, r, g), B(l, a, g), h || (c = F(i, "input", d), h = true);
    },
    p(l, g) {
      t = l, g & /*waypointsBearings*/
      2 && e !== (e = !/*waypointBearing*/
      t[16].enabled) && (i.disabled = e), g & /*configuration*/
      1 && n !== (n = /*configuration*/
      t[0].degreesMin) && p(i, "min", n), g & /*configuration*/
      1 && o !== (o = /*configuration*/
      t[0].degreesMax) && p(i, "max", o), g & /*configuration*/
      1 && s !== (s = /*configuration*/
      t[0].degreesStep) && p(i, "step", s), g & /*waypointsBearings*/
      2 && K(i.value) !== /*waypointBearing*/
      t[16].degrees && Q(
        i,
        /*waypointBearing*/
        t[16].degrees
      );
    },
    d(l) {
      l && (O(i), O(r), O(a)), h = false, c();
    }
  };
}
function gt(t) {
  let i, e = (
    /*configuration*/
    t[0].fixedDegrees + ""
  ), n, o;
  return {
    c() {
      i = S("span"), n = X(e), o = X("°"), p(i, "class", "maplibre-gl-directions-bearings-control__text");
    },
    m(s, r) {
      B(s, i, r), w(i, n), w(i, o);
    },
    p(s, r) {
      r & /*configuration*/
      1 && e !== (e = /*configuration*/
      s[0].fixedDegrees + "") && Fe(n, e);
    },
    d(s) {
      s && O(i);
    }
  };
}
function _e(t) {
  let i, e, n, o, s, r, a, h, c, d, l, g = (
    /*i*/
    t[18]
  ), m, f, E, D, v, _, y, b, R, T, x, W, C, U, ne;
  function Oe() {
    t[7].call(
      o,
      /*each_value*/
      t[17],
      /*i*/
      t[18]
    );
  }
  const oe = () => (
    /*div0_binding*/
    t[8](r, g)
  ), se = () => (
    /*div0_binding*/
    t[8](null, g)
  );
  function ke(...H) {
    return (
      /*mousedown_handler*/
      t[9](
        /*i*/
        t[18],
        ...H
      )
    );
  }
  function Be() {
    t[10].call(
      f,
      /*each_value*/
      t[17],
      /*i*/
      t[18]
    );
  }
  function re(H, M) {
    return (
      /*configuration*/
      H[0].fixedDegrees ? gt : dt
    );
  }
  let Y = re(t), I = Y(t);
  return {
    c() {
      i = S("div"), e = S("span"), e.textContent = `${/*i*/
      t[18] + 1}.`, n = k(), o = S("input"), s = k(), r = S("div"), a = P("svg"), h = P("circle"), l = P("circle"), m = k(), f = S("input"), y = k(), b = S("span"), b.textContent = "°", R = k(), T = S("span"), T.textContent = "±", x = k(), I.c(), W = k(), p(e, "class", "maplibre-gl-directions-bearings-control__number text-slate-800"), p(o, "type", "checkbox"), p(o, "class", "maplibre-gl-directions-bearings-control__checkbox"), p(h, "r", "5"), p(h, "cx", "10"), p(h, "cy", "10"), p(h, "fill", "transparent"), p(h, "stroke", "rgba(109, 38, 215, 0.65)"), p(h, "stroke-width", "10"), p(h, "stroke-dasharray", c = /*waypointBearing*/
      t[16].degrees / 3.6 * 31.42 / 100 + " 31.42"), p(h, "transform", d = "rotate(" + (-90 - /*waypointBearing*/
      t[16].degrees / 2 + /*waypointBearing*/
      t[16].angle - /*angleAdjustment*/
      t[3]) + ")"), A(h, "transform-origin", "10px 10px"), p(l, "r", "6"), p(l, "cx", "10"), p(l, "cy", "10"), p(l, "fill", "rgb(109, 38, 215)"), p(a, "height", "20"), p(a, "width", "20"), p(a, "viewBox", "0 0 20 20"), p(a, "class", "maplibre-gl-directions-bearings-control__waypoint-image"), A(
        a,
        "width",
        /*configuration*/
        t[0].imageSize + "px"
      ), A(
        a,
        "height",
        /*configuration*/
        t[0].imageSize + "px"
      ), A(
        a,
        "opacity",
        /*waypointBearing*/
        t[16].enabled ? 1 : 0.25
      ), p(r, "role", "spinbutton"), p(r, "tabindex", "0"), p(f, "type", "number"), f.disabled = E = !/*waypointBearing*/
      t[16].enabled, p(f, "min", D = /*configuration*/
      t[0].angleMin), p(f, "max", v = /*configuration*/
      t[0].angleMax), p(f, "step", _ = /*configuration*/
      t[0].angleStep), p(f, "class", "maplibre-gl-directions-bearings-control__input"), p(b, "class", "maplibre-gl-directions-bearings-control__text"), p(T, "class", "maplibre-gl-directions-bearings-control__text"), p(i, "class", C = "maplibre-gl-directions-bearings-control__list-item " + /*waypointBearing*/
      (t[16].enabled ? "maplibre-gl-directions-bearings-control__list-item--enabled" : "maplibre-gl-directions-bearings-control__list-item--disabled") + " flex items-center gap-2 text-slate-800" + /*waypointBearing*/
      (t[16].enabled ? "" : "/50"));
    },
    m(H, M) {
      B(H, i, M), w(i, e), w(i, n), w(i, o), o.checked = /*waypointBearing*/
      t[16].enabled, w(i, s), w(i, r), w(r, a), w(a, h), w(a, l), oe(), w(i, m), w(i, f), Q(
        f,
        /*waypointBearing*/
        t[16].angle
      ), w(i, y), w(i, b), w(i, R), w(i, T), w(i, x), I.m(i, null), w(i, W), U || (ne = [
        F(o, "change", Oe),
        F(r, "mousedown", ke),
        F(f, "input", Be)
      ], U = true);
    },
    p(H, M) {
      t = H, M & /*waypointsBearings*/
      2 && (o.checked = /*waypointBearing*/
      t[16].enabled), M & /*waypointsBearings*/
      2 && c !== (c = /*waypointBearing*/
      t[16].degrees / 3.6 * 31.42 / 100 + " 31.42") && p(h, "stroke-dasharray", c), M & /*waypointsBearings, angleAdjustment*/
      10 && d !== (d = "rotate(" + (-90 - /*waypointBearing*/
      t[16].degrees / 2 + /*waypointBearing*/
      t[16].angle - /*angleAdjustment*/
      t[3]) + ")") && p(h, "transform", d), M & /*configuration*/
      1 && A(
        a,
        "width",
        /*configuration*/
        t[0].imageSize + "px"
      ), M & /*configuration*/
      1 && A(
        a,
        "height",
        /*configuration*/
        t[0].imageSize + "px"
      ), M & /*waypointsBearings*/
      2 && A(
        a,
        "opacity",
        /*waypointBearing*/
        t[16].enabled ? 1 : 0.25
      ), g !== /*i*/
      t[18] && (se(), g = /*i*/
      t[18], oe()), M & /*waypointsBearings*/
      2 && E !== (E = !/*waypointBearing*/
      t[16].enabled) && (f.disabled = E), M & /*configuration*/
      1 && D !== (D = /*configuration*/
      t[0].angleMin) && p(f, "min", D), M & /*configuration*/
      1 && v !== (v = /*configuration*/
      t[0].angleMax) && p(f, "max", v), M & /*configuration*/
      1 && _ !== (_ = /*configuration*/
      t[0].angleStep) && p(f, "step", _), M & /*waypointsBearings*/
      2 && K(f.value) !== /*waypointBearing*/
      t[16].angle && Q(
        f,
        /*waypointBearing*/
        t[16].angle
      ), Y === (Y = re(t)) && I ? I.p(t, M) : (I.d(1), I = Y(t), I && (I.c(), I.m(i, W))), M & /*waypointsBearings*/
      2 && C !== (C = "maplibre-gl-directions-bearings-control__list-item " + /*waypointBearing*/
      (t[16].enabled ? "maplibre-gl-directions-bearings-control__list-item--enabled" : "maplibre-gl-directions-bearings-control__list-item--disabled") + " flex items-center gap-2 text-slate-800" + /*waypointBearing*/
      (t[16].enabled ? "" : "/50")) && p(i, "class", C);
    },
    d(H) {
      H && O(i), se(), I.d(), U = false, J(ne);
    }
  };
}
function ut(t) {
  let i, e, n, o = ye(
    /*waypointsBearings*/
    t[1]
  ), s = [];
  for (let r = 0; r < o.length; r += 1)
    s[r] = _e(be(t, o, r));
  return {
    c() {
      i = S("div"), e = S("div");
      for (let r = 0; r < s.length; r += 1)
        s[r].c();
      p(e, "class", "maplibre-gl-directions-bearings-control__list flex flex-col max-h-96 overflow-y-auto"), p(i, "class", n = "maplibre-gl-directions-bearings-control maplibregl-ctrl maplibregl-ctrl-group p-4 " + /*waypointsBearings*/
      (t[1].length ? "block" : "hidden") + " bg-white text-base rounded");
    },
    m(r, a) {
      B(r, i, a), w(i, e);
      for (let h = 0; h < s.length; h += 1)
        s[h] && s[h].m(e, null);
    },
    p(r, [a]) {
      if (a & /*waypointsBearings, configuration, images, onImageMousedown, angleAdjustment*/
      31) {
        o = ye(
          /*waypointsBearings*/
          r[1]
        );
        let h;
        for (h = 0; h < o.length; h += 1) {
          const c = be(r, o, h);
          s[h] ? s[h].p(c, a) : (s[h] = _e(c), s[h].c(), s[h].m(e, null));
        }
        for (; h < s.length; h += 1)
          s[h].d(1);
        s.length = o.length;
      }
      a & /*waypointsBearings*/
      2 && n !== (n = "maplibre-gl-directions-bearings-control maplibregl-ctrl maplibregl-ctrl-group p-4 " + /*waypointsBearings*/
      (r[1].length ? "block" : "hidden") + " bg-white text-base rounded") && p(i, "class", n);
    },
    i: N,
    o: N,
    d(r) {
      r && O(i), Ge(s, r);
    }
  };
}
function ft(t, i, e) {
  let { directions: n } = i, { configuration: o } = i;
  n.configuration.bearings || console.warn("The Bearings Control is used, but the `bearings` configuration option is not enabled!");
  let s = [];
  n.on("addwaypoint", r), n.on("removewaypoint", r), n.on("movewaypoint", r), n.on("setwaypoints", r);
  function r() {
    e(1, s = n.waypointsBearings.map((y, b) => s[b] ? s[b] : {
      enabled: o.defaultEnabled || !!y,
      angle: y ? y[0] : o.angleDefault,
      degrees: y ? y[1] : o.fixedDegrees ? o.fixedDegrees : o.degreesDefault
    }));
  }
  r();
  let a;
  const h = [];
  let c = -1;
  function d(y, b) {
    var R;
    (R = s[b]) != null && R.enabled && (c = b, document.addEventListener("mouseup", l), document.addEventListener("mousemove", g));
  }
  function l() {
    c = -1, document.removeEventListener("mouseup", l), document.removeEventListener("mousemove", g);
  }
  function g(y) {
    const b = h[c];
    if (b) {
      const R = b.getBoundingClientRect().x + o.imageSize / 2, T = b.getBoundingClientRect().y + o.imageSize / 2, x = y.pageX, W = y.pageY, U = Math.atan2(x - R, W - T) * (180 / Math.PI) * -1 + 90;
      e(1, s[c].angle = 90 + U + m | 0, s);
    }
  }
  Ke(() => {
    document.removeEventListener("mouseup", l), document.removeEventListener("mousemove", g);
  });
  let m = 0;
  o.respectMapBearing && n.map.on("rotate", () => e(3, m = n.map.getBearing()));
  function f(y, b) {
    y[b].enabled = this.checked, e(1, s);
  }
  function E(y, b) {
    ee[y ? "unshift" : "push"](() => {
      h[b] = y, e(2, h);
    });
  }
  const D = (y, b) => d(b, y);
  function v(y, b) {
    y[b].angle = K(this.value), e(1, s);
  }
  function _(y, b) {
    y[b].degrees = K(this.value), e(1, s);
  }
  return t.$$set = (y) => {
    "directions" in y && e(5, n = y.directions), "configuration" in y && e(0, o = y.configuration);
  }, t.$$.update = () => {
    t.$$.dirty & /*timeout, waypointsBearings, configuration*/
    67 && (a && clearTimeout(a), e(6, a = setTimeout(
      () => {
        e(
          5,
          n.waypointsBearings = s.map((y) => y.enabled ? [y.angle, y.degrees] : void 0),
          n
        );
      },
      o.debounceTimeout
    )));
  }, [
    o,
    s,
    h,
    m,
    d,
    n,
    a,
    f,
    E,
    D,
    v,
    _
  ];
}
var mt = class extends He {
  constructor(i) {
    super(), Ce(this, i, ft, ut, Ie, { directions: 5, configuration: 0 });
  }
};
var yt = {
  defaultEnabled: false,
  debounceTimeout: 150,
  angleDefault: 0,
  angleMin: 0,
  angleMax: 359,
  angleStep: 1,
  fixedDegrees: 0,
  degreesDefault: 45,
  degreesMin: 15,
  degreesMax: 360,
  degreesStep: 15,
  respectMapBearing: false,
  imageSize: 50
};
var Et = class {
  constructor(i, e) {
    u(this, "controlElement");
    u(this, "directions");
    u(this, "configuration");
    this.directions = i, this.configuration = Object.assign({}, yt, e);
  }
  /**
   * @private
   */
  onAdd() {
    return this.controlElement = document.createElement("div"), new mt({
      target: this.controlElement,
      props: {
        directions: this.directions,
        configuration: this.configuration
      }
    }), this.controlElement;
  }
  /**
   * @private
   */
  onRemove() {
    this.controlElement.remove();
  }
};
export {
  Et as BearingsControl,
  wt as LoadingIndicatorControl,
  ae as MapLibreGlDirectionsRoutingEvent,
  $ as MapLibreGlDirectionsWaypointEvent,
  _t as default,
  $e as layersFactory,
  bt as utils
};
//# sourceMappingURL=@maplibre_maplibre-gl-directions.js.map
