"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { REGIONS, findCity, type RegionId } from "@/lib/geo";
import type { TourPlan } from "@/lib/plan";
import type { CityCheck } from "@/lib/contrast";

let basemap: Promise<[GeoJSON.GeoJsonObject, GeoJSON.GeoJsonObject]> | null = null;
function loadBasemap() {
  basemap ??= Promise.all([fetch("/geo/countries.json").then((r) => r.json()), fetch("/geo/states.json").then((r) => r.json())]);
  return basemap;
}

const TIER_HEX = { anchor: "#3987e5", sleeper: "#199e70", volume: "#c98500", skip: "#6b6a65" } as const;

/** Leaflet map: Qloo heatmap cities (faint), scored markets (by tier), the routed tour, and optionally the plain LLM's picks. */
export default function TourMap({ plan, llmCities, regionId }: { plan: TourPlan; llmCities: CityCheck[]; regionId: RegionId }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const region = REGIONS[regionId];
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(region.center, region.zoom);
    map.createPane("base").style.zIndex = "200";
    // Self-hosted Natural Earth basemap (public domain): no third-party tile service to rate-limit or expire during judging.
    map.attributionControl.addAttribution("Basemap: Natural Earth");
    void loadBasemap().then(([countries, states]) => {
      if (mapRef.current !== map) return;
      L.geoJSON(countries, { pane: "base", interactive: false, style: { color: "#3a3a36", weight: 0.8, fillColor: "#1d1d1b", fillOpacity: 1 } }).addTo(map);
      L.geoJSON(states, { pane: "base", interactive: false, style: { color: "#2e2e2b", weight: 0.5, fill: false } }).addTo(map);
    });
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [regionId]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // 1. Every heatmap city Qloo returned: faint sequential-blue discs sized by affinity.
    for (const h of plan.heat) {
      L.circleMarker([h.lat, h.lon], { radius: 3 + h.affinity * 9, stroke: false, fillColor: "#6da7ec", fillOpacity: 0.08 + h.affinity * 0.25 })
        .bindTooltip(`${h.key} · heatmap affinity ${Math.round(h.affinity * 100)}`, { className: "hl-tip" })
        .addTo(layer);
    }
    // 2. The route.
    const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)).filter((m): m is NonNullable<typeof m> => !!m);
    if (route.length > 1) L.polyline(route.map((m) => [m.lat, m.lon] as [number, number]), { color: "#f2c14e", weight: 2, opacity: 0.9, dashArray: "6 6" }).addTo(layer);
    // 3. Scored markets by tier.
    for (const m of plan.markets) {
      const onTour = plan.route.order.includes(m.key);
      L.circleMarker([m.lat, m.lon], { radius: 5 + (m.score / 100) * 9, color: onTour ? "#f2c14e" : "#1a1a19", weight: 2, fillColor: TIER_HEX[m.tier], fillOpacity: 0.9 })
        .bindTooltip(`<b>${m.key}</b><br/>fan score ${m.score} · ${m.tier}${m.venues[0] ? `<br/>venue: ${m.venues[0].name}` : ""}`, { className: "hl-tip" })
        .addTo(layer);
    }
    // 4. Stop numbers.
    route.forEach((m, i) => {
      L.marker([m.lat, m.lon], { icon: L.divIcon({ className: "", html: `<div class="stop-label">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [-6, 24] }), interactive: false }).addTo(layer);
    });
    // 5. The plain LLM's cities: orange rings.
    for (const c of llmCities) {
      const m = plan.markets.find((x) => x.key === c.market);
      const city = m ?? findCity(c.input);
      if (!city) continue;
      L.circleMarker([city.lat, city.lon], { radius: 14, color: "#d95926", weight: 2, fill: false, dashArray: "3 3" })
        .bindTooltip(`Plain LLM pick: ${c.input}${c.score !== undefined ? ` · Qloo fan score ${c.score}` : ""}`, { className: "hl-tip" })
        .addTo(layer);
    }
    if (route.length) map.fitBounds(L.latLngBounds(route.map((m) => [m.lat, m.lon] as [number, number])).pad(0.35), { maxZoom: 7 });
  }, [plan, llmCities]);

  return <div className="map" ref={ref} role="img" aria-label="Map of the routed tour, scored markets and Qloo heatmap" />;
}
