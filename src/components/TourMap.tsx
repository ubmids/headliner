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

/** Map colours come from the design tokens in globals.css (design/DESIGN.md), read once per render so light and dark both work. */
function tokens() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    ink: v("--ink"),
    paper: v("--paper"),
    qloo: v("--qloo"),
    llm: v("--llm"),
    neutral: v("--neutral"),
    skip: v("--skip"),
    land: v("--map-land"),
    border: v("--map-border"),
    state: v("--map-state"),
  };
}

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
      const t = tokens();
      L.geoJSON(countries, { pane: "base", interactive: false, style: { color: t.border, weight: 0.8, fillColor: t.land, fillOpacity: 1 } }).addTo(map);
      L.geoJSON(states, { pane: "base", interactive: false, style: { color: t.state, weight: 0.6, fill: false } }).addTo(map);
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
    const t = tokens();
    const tierFill = { anchor: t.ink, sleeper: t.qloo, volume: t.neutral, skip: t.paper } as const;

    // 1. Every heatmap city Qloo returned: faint ink discs sized by affinity (context, not signal).
    for (const h of plan.heat) {
      L.circleMarker([h.lat, h.lon], { radius: 3 + h.affinity * 9, stroke: false, fillColor: t.ink, fillOpacity: 0.05 + h.affinity * 0.12 })
        .bindTooltip(`${h.key} · heatmap affinity ${Math.round(h.affinity * 100)}`, { className: "hl-tip" })
        .addTo(layer);
    }
    // 2. The route.
    const route = plan.route.order.map((k) => plan.markets.find((m) => m.key === k)).filter((m): m is NonNullable<typeof m> => !!m);
    if (route.length > 1) L.polyline(route.map((m) => [m.lat, m.lon] as [number, number]), { color: t.ink, weight: 2.5, opacity: 0.9 }).addTo(layer);
    // 3. Scored markets by tier.
    for (const m of plan.markets) {
      const onTour = plan.route.order.includes(m.key);
      L.circleMarker([m.lat, m.lon], { radius: 5 + (m.score / 100) * 9, color: m.tier === "skip" ? t.skip : onTour ? t.ink : t.paper, weight: 2, fillColor: tierFill[m.tier], fillOpacity: m.tier === "skip" ? 0.6 : onTour ? 1 : 0.55 })
        .bindTooltip(`<b>${m.key}</b><br/>fan score ${m.score} · ${m.tier}${m.venues[0] ? `<br/>venue: ${m.venues[0].name}` : ""}`, { className: "hl-tip" })
        .addTo(layer);
    }
    // 4. Stop numbers.
    route.forEach((m, i) => {
      L.marker([m.lat, m.lon], { icon: L.divIcon({ className: "", html: `<div class="stop-label">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [-6, 24] }), interactive: false }).addTo(layer);
    });
    // 5. The plain LLM's cities: blue dashed rings.
    for (const c of llmCities) {
      const m = plan.markets.find((x) => x.key === c.market);
      const city = m ?? findCity(c.input);
      if (!city) continue;
      L.circleMarker([city.lat, city.lon], { radius: 14, color: t.llm, weight: 2.5, fill: false, dashArray: "4 3" })
        .bindTooltip(`Plain LLM pick: ${c.input}${c.score !== undefined ? ` · Qloo fan score ${c.score}` : ""}`, { className: "hl-tip" })
        .addTo(layer);
    }
    if (route.length) map.fitBounds(L.latLngBounds(route.map((m) => [m.lat, m.lon] as [number, number])).pad(0.35), { maxZoom: 7 });
  }, [plan, llmCities]);

  return <div className="map" ref={ref} role="img" aria-label="Map of the routed tour, scored markets and Qloo heatmap" />;
}
