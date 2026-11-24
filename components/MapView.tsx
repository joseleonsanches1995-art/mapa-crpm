"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { UnidadeBm } from "@/lib/types";

type FeatureProps = {
  ibge_code?: string;
  nome?: string;
  name?: string;
  bm_sigla?: string | null;
  bm_sigla_ui?: string | null;
  bm_nome?: string | null;
  bm_sede?: string | null;
  bm_cor?: string | null;
};

type HoverInfo = {
  longitude: number;
  latitude: number;
  props: FeatureProps;
};

type Props = {
  selectedBm: string | null;
  unidades: UnidadeBm[];
  focusIbge: string | null;
  onFocusHandled: () => void;
  theme: "dark" | "light";
};

const MAP_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

const RS_BOUNDS: [[number, number], [number, number]] = [
  [-57.8, -33.9],
  [-49.5, -27.0],
];

export function MapView({
  selectedBm,
  unidades,
  focusIbge,
  onFocusHandled,
  theme,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/rs-municipios.geojson")
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        if (!cancelled) setGeojson(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  const colorMatch = useMemo(() => {
    if (unidades.length === 0) return "#CCCCCC";
    const expr: unknown[] = ["match", ["get", "bm_sigla"]];
    for (const u of unidades) {
      expr.push(u.sigla, u.corHex);
    }
    expr.push("#CCCCCC");
    return expr;
  }, [unidades]);

  const fillOpacity = useMemo(() => {
    if (!selectedBm) return 0.72;
    return [
      "case",
      ["==", ["get", "bm_sigla"], selectedBm],
      0.88,
      0.12,
    ] as unknown[];
  }, [selectedBm]);

  const onMove = useCallback((e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f || !f.properties) {
      setHover(null);
      return;
    }
    setHover({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      props: f.properties as FeatureProps,
    });
  }, []);

  useEffect(() => {
    if (!focusIbge || !geojson || !mapRef.current) return;
    const feature = geojson.features.find(
      (f) => String(f.properties?.ibge_code) === focusIbge
    );
    if (!feature || !feature.geometry) {
      onFocusHandled();
      return;
    }
    const coords = collectCoords(feature.geometry);
    if (!coords.length) {
      onFocusHandled();
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [x, y] of coords) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    mapRef.current.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 80, duration: 800, maxZoom: 10 }
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const props = (feature.properties ?? {}) as FeatureProps;
    setHover({ longitude: cx, latitude: cy, props });
    onFocusHandled();
  }, [focusIbge, geojson, onFocusHandled]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: -53.5,
        latitude: -30.5,
        zoom: 6.2,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLES[theme]}
      interactiveLayerIds={["mun-fill"]}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      maxBounds={[
        [RS_BOUNDS[0][0] - 2, RS_BOUNDS[0][1] - 2],
        [RS_BOUNDS[1][0] + 2, RS_BOUNDS[1][1] + 2],
      ]}
      attributionControl
    >
      <NavigationControl position="top-right" />
      {geojson && (
        <Source id="municipios" type="geojson" data={geojson}>
          <Layer
            id="mun-fill"
            type="fill"
            paint={{
              "fill-color": colorMatch as never,
              "fill-opacity": fillOpacity as never,
            }}
          />
          <Layer
            id="mun-line"
            type="line"
            paint={{
              "line-color": theme === "light" ? "#243028" : "#0b140e",
              "line-width": 0.4,
              "line-opacity": 0.7,
            }}
          />
          <Layer
            id="mun-highlight"
            type="line"
            paint={{
              "line-color": theme === "light" ? "#102016" : "#ffffff",
              "line-width": 1.6,
            }}
            filter={
              hover?.props.ibge_code
                ? ["==", ["get", "ibge_code"], hover.props.ibge_code]
                : ["==", ["get", "ibge_code"], ""]
            }
          />
        </Source>
      )}
      {hover && (
        <Popup
          longitude={hover.longitude}
          latitude={hover.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={12}
        >
          <div>
            <strong>{hover.props.nome ?? hover.props.name}</strong>
            <div style={{ marginTop: 4, color: "var(--muted)" }}>
              {hover.props.bm_sigla_ui ?? "—"}
              {hover.props.bm_sede ? ` · sede ${hover.props.bm_sede}` : ""}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}

function collectCoords(geometry: GeoJSON.Geometry): [number, number][] {
  const out: [number, number][] = [];
  const walk = (g: GeoJSON.Geometry) => {
    if (g.type === "Polygon") {
      for (const ring of g.coordinates) {
        for (const c of ring) out.push([c[0], c[1]]);
      }
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) {
        for (const ring of poly) {
          for (const c of ring) out.push([c[0], c[1]]);
        }
      }
    } else if (g.type === "GeometryCollection") {
      for (const child of g.geometries) walk(child);
    }
  };
  walk(geometry);
  return out;
}
