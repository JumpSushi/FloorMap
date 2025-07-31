import type { LayerSpecification } from "maplibre-gl";
export declare const colors: {
    snapline: string;
    altRouteline: string;
    routelineFoot: string;
    routelineBike: string;
    routeline: string;
    congestionLow: string;
    congestionHigh: string;
    hoverpoint: string;
    snappoint: string;
    snappointHighlight: string;
    waypointFoot: string;
    waypointFootHighlight: string;
    waypointBike: string;
    waypointBikeHighlight: string;
    waypoint: string;
    waypointHighlight: string;
};
/**
 * Builds the
 * {@link https://github.com/smellyshovel/maplibre-gl-directions/blob/main/src/directions/layers.ts#L3|standard
 * `MapLibreGlDirections` layers} with optionally scaled features.
 *
 * @param pointsScalingFactor A number to multiply the initial points' dimensions by
 * @param linesScalingFactor A number to multiply the initial lines' dimensions by
 * @param sourceName A name of the source used by the instance and layers names' prefix
 */
export default function layersFactory(pointsScalingFactor?: number, linesScalingFactor?: number, sourceName?: string): LayerSpecification[];
