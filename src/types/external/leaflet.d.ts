// This file provides TypeScript declarations for the leaflet.heat plugin

declare module "leaflet.heat" {
  import * as L from "leaflet";

  namespace HeatLayer {
    interface HeatLayerOptions {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: { [key: number]: string };
    }
  }

  class HeatLayer extends L.Layer {
    constructor(
      latlngs: L.LatLngExpression[],
      options?: HeatLayer.HeatLayerOptions,
    );
    setOptions(options: HeatLayer.HeatLayerOptions): this;
    addLatLng(latlng: L.LatLngExpression): this;
    setLatLngs(latlngs: L.LatLngExpression[]): this;
    redraw(): this;
  }

  namespace L {
    function heatLayer(
      latlngs: L.LatLngExpression[],
      options?: HeatLayer.HeatLayerOptions,
    ): HeatLayer;
  }
}
