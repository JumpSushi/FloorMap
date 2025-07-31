import type { MapLibreGlDirectionsConfiguration, PointType, Route } from "./types";
import type { Feature, LineString, Point } from "geojson";
/**
 * @protected
 *
 * Takes a missing or an incomplete {@link MapLibreGlDirectionsConfiguration|configuration object}, augments it with the
 * default values and returns the complete configuration object.
 */
export declare function buildConfiguration(customConfiguration?: Partial<MapLibreGlDirectionsConfiguration>): MapLibreGlDirectionsConfiguration;
export type RequestData = {
    method: "get" | "post";
    url: string;
    payload: URLSearchParams;
};
/**
 * @protected
 *
 * Builds the routing-request method, URL and payload based on the provided
 * {@link MapLibreGlDirectionsConfiguration|configuration} and the waypoints' coordinates.
 */
export declare function buildRequest(configuration: MapLibreGlDirectionsConfiguration, waypointsCoordinates: [number, number][], waypointsBearings?: ([number, number] | undefined)[]): RequestData;
/**
 * @protected
 *
 * Creates a {@link Feature<Point>|GeoJSON Point Feature} of one of the ${@link PointType|known types} with a given
 * coordinate.
 */
export declare function buildPoint(coordinate: [number, number], type: PointType, properties?: Record<string, unknown>): Feature<Point>;
/**
 * @protected
 *
 * Creates a ${@link Feature<LineString>|GeoJSON LineString Features} array where each feature represents a
 * line connecting a waypoint with its respective snappoint and the hoverpoint with its respective snappoints.
 */
export declare function buildSnaplines(waypointsCoordinates: [number, number][], snappointsCoordinates: [number, number][], hoverpointCoordinates: [number, number] | undefined, departSnappointIndex: number, // might be -1
showHoverpointSnaplines?: boolean): Feature<LineString>[];
/**
 * @protected
 *
 * Creates route lines from the server response.
 *
 * Each route line is an array of legs, where each leg is an array of segments. A segment is a
 * {@link Feature<LineString>|GeoJSON LineString Feature}. Route legs are divided into segments by their congestion
 * levels. If there's no congestions, each route leg consists of a single segment.
 */
export declare function buildRoutelines(requestOptions: MapLibreGlDirectionsConfiguration["requestOptions"], routes: Route[], selectedRouteIndex: number, snappoints: Feature<Point>[]): Feature<LineString>[][];
