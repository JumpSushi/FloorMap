import type { IControl } from "maplibre-gl";
import type { BearingsControlConfiguration } from "./types";
import type MapLibreGlDirections from "../../directions/main";
/**
 * Creates an instance of BearingsControl that could be added to the map using the
 * {@link https://maplibre.org/maplibre-gl-js-docs/api/map/#map#addcontrol|`addControl`} method.
 *
 * @example
 * ```typescript
 * import MapLibreGlDirections, { BearingsControl } from "@maplibre/maplibre-gl-directions";
 * map.addControl(new BearingsControl(new MapLibreGlDirections(map)));
 * ```
 */
export default class BearingsControl implements IControl {
    constructor(directions: MapLibreGlDirections, configuration?: Partial<BearingsControlConfiguration>);
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
