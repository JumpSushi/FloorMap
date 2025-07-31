import type { Geometry, Leg, MapLibreGlDirectionsConfiguration } from "./types";
import type { Position, Feature, Point } from "geojson";
/**
 * Decodes the geometry of a route to the form of a coordinates array.
 */
export declare function geometryDecoder(requestOptions: MapLibreGlDirectionsConfiguration["requestOptions"], geometry: Geometry): Position[];
/**
 * Decodes the congestion level of a specific segment of a route leg.
 */
export declare function congestionLevelDecoder(requestOptions: MapLibreGlDirectionsConfiguration["requestOptions"], annotation: Leg["annotation"] | undefined, segmentIndex: number): number;
/**
 * Compares two coordinates and returns `true` if they are equal taking into account that there's an allowable error in
 * 0.00001 degree when using "polyline" geometries (5 fractional-digits precision).
 */
export declare function coordinatesComparator(requestOptions: MapLibreGlDirectionsConfiguration["requestOptions"], a: Position, b: Position): boolean;
/**
 * Gets coordinates of a point feature
 */
export declare function getWaypointsCoordinates(waypoints: Feature<Point>[]): [number, number][];
/**
 * Gets bearings out of properties of point features
 */
export declare function getWaypointsBearings(waypoints: Feature<Point>[]): ([number, number] | undefined)[];
