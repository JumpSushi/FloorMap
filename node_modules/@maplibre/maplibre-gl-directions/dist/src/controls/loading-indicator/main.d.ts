import type { IControl } from "maplibre-gl";
import type { LoadingIndicatorControlConfiguration } from "./types";
import type MapLibreGlDirections from "../../directions/main";
/**
 * Creates an instance of LoadingControl that could be added to the map using the
 * {@link https://maplibre.org/maplibre-gl-js-docs/api/map/#map#addcontrol|`addControl`} method.
 *
 * @example
 * ```typescript
 * import MapLibreGlDirections, { LoadingControl } from "@maplibre/maplibre-gl-directions";
 * map.addControl(new LoadingControl(new MapLibreGlDirections(map)));
 * ```
 */
export default class LoadingControl implements IControl {
    constructor(directions: MapLibreGlDirections, configuration?: Partial<LoadingIndicatorControlConfiguration>);
    private controlElement;
    private readonly directions;
    private readonly configuration;
    /**
     * @private
     */
    onAdd(): HTMLElement;
    /**
     * @private
     */
    onRemove(): void;
}
