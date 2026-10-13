/**
 * Geography only: region outlines and a gazetteer of touring cities (name + coordinates)
 * used to (a) send WKT shapes to Qloo, (b) label heatmap points, (c) draw the map and
 * order the route. No taste data lives here: every affinity number comes from Qloo.
 */

export interface City {
  name: string;
  admin: string; // state / province / country
  country: string; // ISO-2
  lat: number;
  lon: number;
}

export type RegionId = "north-america" | "us-east" | "us-west" | "uk-europe";

export interface Region {
  id: RegionId;
  label: string;
  /** WKT polygon, longitude first, as the Qloo docs require. */
  wkt: string;
  center: [number, number];
  zoom: number;
  countries: string[];
}

const box = (w: number, s: number, e: number, n: number) =>
  `POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))`;

export const REGIONS: Record<RegionId, Region> = {
  "north-america": { id: "north-america", label: "US & Canada", wkt: box(-125, 24, -66, 50), center: [39.5, -96], zoom: 4, countries: ["US", "CA"] },
  "us-east": { id: "us-east", label: "US East & Midwest", wkt: box(-97, 24, -66, 48), center: [38.5, -82], zoom: 5, countries: ["US", "CA"] },
  "us-west": { id: "us-west", label: "US West", wkt: box(-125, 30, -100, 49.5), center: [40, -113], zoom: 5, countries: ["US", "CA"] },
  "uk-europe": { id: "uk-europe", label: "UK & Europe", wkt: box(-10.5, 36, 24, 60), center: [50, 6], zoom: 4, countries: ["GB", "IE", "FR", "DE", "NL", "BE", "ES", "PT", "IT", "DK", "SE", "NO", "CH", "AT", "CZ", "PL"] },
};

const c = (name: string, admin: string, country: string, lat: number, lon: number): City => ({ name, admin, country, lat, lon });

export const CITIES: City[] = [
  // United States
  c("New York", "NY", "US", 40.7128, -74.006), c("Brooklyn", "NY", "US", 40.6782, -73.9442), c("Los Angeles", "CA", "US", 34.0522, -118.2437),
  c("Chicago", "IL", "US", 41.8781, -87.6298), c("Houston", "TX", "US", 29.7604, -95.3698), c("Phoenix", "AZ", "US", 33.4484, -112.074),
  c("Philadelphia", "PA", "US", 39.9526, -75.1652), c("San Antonio", "TX", "US", 29.4241, -98.4936), c("San Diego", "CA", "US", 32.7157, -117.1611),
  c("Dallas", "TX", "US", 32.7767, -96.797), c("Austin", "TX", "US", 30.2672, -97.7431), c("San Francisco", "CA", "US", 37.7749, -122.4194),
  c("Oakland", "CA", "US", 37.8044, -122.2712), c("Seattle", "WA", "US", 47.6062, -122.3321), c("Denver", "CO", "US", 39.7392, -104.9903),
  c("Boulder", "CO", "US", 40.015, -105.2705), c("Washington", "DC", "US", 38.9072, -77.0369), c("Boston", "MA", "US", 42.3601, -71.0589),
  c("Nashville", "TN", "US", 36.1627, -86.7816), c("Memphis", "TN", "US", 35.1495, -90.049), c("Knoxville", "TN", "US", 35.9606, -83.9207),
  c("Detroit", "MI", "US", 42.3314, -83.0458), c("Grand Rapids", "MI", "US", 42.9634, -85.6681), c("Ann Arbor", "MI", "US", 42.2808, -83.743),
  c("Portland", "OR", "US", 45.5152, -122.6784), c("Portland", "ME", "US", 43.6591, -70.2568), c("Las Vegas", "NV", "US", 36.1699, -115.1398),
  c("Louisville", "KY", "US", 38.2527, -85.7585), c("Lexington", "KY", "US", 38.0406, -84.5037), c("Baltimore", "MD", "US", 39.2904, -76.6122),
  c("Milwaukee", "WI", "US", 43.0389, -87.9065), c("Madison", "WI", "US", 43.0731, -89.4012), c("Albuquerque", "NM", "US", 35.0844, -106.6504),
  c("Tucson", "AZ", "US", 32.2226, -110.9747), c("Sacramento", "CA", "US", 38.5816, -121.4944), c("Kansas City", "MO", "US", 39.0997, -94.5786),
  c("St. Louis", "MO", "US", 38.627, -90.1994), c("Atlanta", "GA", "US", 33.749, -84.388), c("Athens", "GA", "US", 33.9519, -83.3576),
  c("Savannah", "GA", "US", 32.0809, -81.0912), c("Miami", "FL", "US", 25.7617, -80.1918), c("Orlando", "FL", "US", 28.5383, -81.3792),
  c("Tampa", "FL", "US", 27.9506, -82.4572), c("Jacksonville", "FL", "US", 30.3322, -81.6557), c("New Orleans", "LA", "US", 29.9511, -90.0715),
  c("Minneapolis", "MN", "US", 44.9778, -93.265), c("Cleveland", "OH", "US", 41.4993, -81.6944), c("Columbus", "OH", "US", 39.9612, -82.9988),
  c("Cincinnati", "OH", "US", 39.1031, -84.512), c("Pittsburgh", "PA", "US", 40.4406, -79.9959), c("Raleigh", "NC", "US", 35.7796, -78.6382),
  c("Durham", "NC", "US", 35.994, -78.8986), c("Charlotte", "NC", "US", 35.2271, -80.8431), c("Asheville", "NC", "US", 35.5951, -82.5515),
  c("Richmond", "VA", "US", 37.5407, -77.436), c("Charlottesville", "VA", "US", 38.0293, -78.4767), c("Salt Lake City", "UT", "US", 40.7608, -111.891),
  c("Boise", "ID", "US", 43.615, -116.2023), c("Spokane", "WA", "US", 47.6588, -117.426), c("Missoula", "MT", "US", 46.8721, -113.994),
  c("Omaha", "NE", "US", 41.2565, -95.9345), c("Des Moines", "IA", "US", 41.5868, -93.625), c("Indianapolis", "IN", "US", 39.7684, -86.1581),
  c("Oklahoma City", "OK", "US", 35.4676, -97.5164), c("Tulsa", "OK", "US", 36.154, -95.9928), c("Birmingham", "AL", "US", 33.5186, -86.8104),
  c("Burlington", "VT", "US", 44.4759, -73.2121), c("Providence", "RI", "US", 41.824, -71.4128), c("Hartford", "CT", "US", 41.7658, -72.6734),
  c("New Haven", "CT", "US", 41.3083, -72.9279), c("Albany", "NY", "US", 42.6526, -73.7562), c("Buffalo", "NY", "US", 42.8864, -78.8784),
  c("Rochester", "NY", "US", 43.1566, -77.6088), c("Syracuse", "NY", "US", 43.0481, -76.1474), c("Portsmouth", "NH", "US", 43.0718, -70.7626),
  c("Charleston", "SC", "US", 32.7765, -79.9311), c("Greenville", "SC", "US", 34.8526, -82.394), c("Fort Worth", "TX", "US", 32.7555, -97.3308),
  c("El Paso", "TX", "US", 31.7619, -106.485), c("Santa Barbara", "CA", "US", 34.4208, -119.6982), c("San Jose", "CA", "US", 37.3382, -121.8863),
  c("Eugene", "OR", "US", 44.0521, -123.0868), c("Bend", "OR", "US", 44.0582, -121.3153), c("Fort Collins", "CO", "US", 40.5853, -105.0844),
  c("Honolulu", "HI", "US", 21.3069, -157.8583), c("Anchorage", "AK", "US", 61.2181, -149.9003),
  // Canada
  c("Toronto", "ON", "CA", 43.6532, -79.3832), c("Montreal", "QC", "CA", 45.5017, -73.5673), c("Vancouver", "BC", "CA", 49.2827, -123.1207),
  c("Ottawa", "ON", "CA", 45.4215, -75.6972), c("Calgary", "AB", "CA", 51.0447, -114.0719), c("Edmonton", "AB", "CA", 53.5461, -113.4938),
  c("Winnipeg", "MB", "CA", 49.8951, -97.1384), c("Halifax", "NS", "CA", 44.6488, -63.5752), c("Quebec City", "QC", "CA", 46.8139, -71.208),
  // UK & Ireland
  c("London", "England", "GB", 51.5074, -0.1278), c("Manchester", "England", "GB", 53.4808, -2.2426), c("Birmingham", "England", "GB", 52.4862, -1.8904),
  c("Leeds", "England", "GB", 53.8008, -1.5491), c("Glasgow", "Scotland", "GB", 55.8642, -4.2518), c("Edinburgh", "Scotland", "GB", 55.9533, -3.1883),
  c("Bristol", "England", "GB", 51.4545, -2.5879), c("Liverpool", "England", "GB", 53.4084, -2.9916), c("Newcastle", "England", "GB", 54.9783, -1.6178),
  c("Nottingham", "England", "GB", 52.9548, -1.1581), c("Brighton", "England", "GB", 50.8225, -0.1372), c("Sheffield", "England", "GB", 53.3811, -1.4701),
  c("Cardiff", "Wales", "GB", 51.4816, -3.1791), c("Belfast", "Northern Ireland", "GB", 54.5973, -5.9301), c("Dublin", "Ireland", "IE", 53.3498, -6.2603),
  // Continental Europe
  c("Paris", "France", "FR", 48.8566, 2.3522), c("Lyon", "France", "FR", 45.764, 4.8357), c("Amsterdam", "Netherlands", "NL", 52.3676, 4.9041),
  c("Utrecht", "Netherlands", "NL", 52.0907, 5.1214), c("Brussels", "Belgium", "BE", 50.8503, 4.3517), c("Antwerp", "Belgium", "BE", 51.2194, 4.4025),
  c("Berlin", "Germany", "DE", 52.52, 13.405), c("Hamburg", "Germany", "DE", 53.5511, 9.9937), c("Cologne", "Germany", "DE", 50.9375, 6.9603),
  c("Munich", "Germany", "DE", 48.1351, 11.582), c("Frankfurt", "Germany", "DE", 50.1109, 8.6821), c("Copenhagen", "Denmark", "DK", 55.6761, 12.5683),
  c("Stockholm", "Sweden", "SE", 59.3293, 18.0686), c("Oslo", "Norway", "NO", 59.9139, 10.7522), c("Zurich", "Switzerland", "CH", 47.3769, 8.5417),
  c("Vienna", "Austria", "AT", 48.2082, 16.3738), c("Prague", "Czechia", "CZ", 50.0755, 14.4378), c("Warsaw", "Poland", "PL", 52.2297, 21.0122),
  c("Madrid", "Spain", "ES", 40.4168, -3.7038), c("Barcelona", "Spain", "ES", 41.3874, 2.1686), c("Lisbon", "Portugal", "PT", 38.7223, -9.1393),
  c("Milan", "Italy", "IT", 45.4642, 9.19), c("Rome", "Italy", "IT", 41.9028, 12.4964),
];

export function cityLabel(city: Pick<City, "name" | "admin" | "country">): string {
  return city.country === "US" || city.country === "CA" ? `${city.name}, ${city.admin}` : `${city.name}, ${city.country === "GB" ? "UK" : city.admin}`;
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest gazetteer city to a point, if within maxKm (used to label heatmap points). */
export function nearestCity(lat: number, lon: number, maxKm = 60, pool: City[] = CITIES): City | undefined {
  let best: City | undefined;
  let bestD = Infinity;
  for (const city of pool) {
    const d = distanceKm({ lat, lon }, city);
    if (d < bestD) {
      bestD = d;
      best = city;
    }
  }
  return bestD <= maxKm ? best : undefined;
}

/** Resolve a free-text city ("Austin", "Portland, ME", "Glasgow UK") against the gazetteer. */
export function findCity(text: string, preferCountries: string[] = []): City | undefined {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return undefined;
  const [namePart, qualifier] = t.split(/\s*,\s*/);
  const matches = CITIES.filter((ct) => ct.name.toLowerCase() === namePart);
  if (matches.length === 0) return undefined;
  if (qualifier) {
    const q = qualifier.replace(/\./g, "");
    const exact = matches.find(
      (ct) => ct.admin.toLowerCase() === q || ct.country.toLowerCase() === q || (q === "uk" && ct.country === "GB"),
    );
    if (exact) return exact;
  }
  return matches.find((ct) => preferCountries.includes(ct.country)) ?? matches[0];
}

export function citiesInRegion(region: Region): City[] {
  return CITIES.filter((ct) => region.countries.includes(ct.country) && inWktBox(region.wkt, ct.lat, ct.lon));
}

function inWktBox(wkt: string, lat: number, lon: number): boolean {
  const nums = wkt.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const lons = nums.filter((_, i) => i % 2 === 0);
  const lats = nums.filter((_, i) => i % 2 === 1);
  return lon >= Math.min(...lons) && lon <= Math.max(...lons) && lat >= Math.min(...lats) && lat <= Math.max(...lats);
}

/** Order stops with nearest-neighbour from the first stop, then 2-opt. Returns the ordered list and total km. */
export function orderRoute<T extends { lat: number; lon: number }>(stops: T[]): { order: T[]; km: number } {
  if (stops.length <= 2) return { order: [...stops], km: stops.length === 2 ? distanceKm(stops[0], stops[1]) : 0 };
  const rest = stops.slice(1);
  const order = [stops[0]];
  while (rest.length) {
    const last = order[order.length - 1];
    let bi = 0;
    for (let i = 1; i < rest.length; i++) if (distanceKm(last, rest[i]) < distanceKm(last, rest[bi])) bi = i;
    order.push(rest.splice(bi, 1)[0]);
  }
  const len = (o: T[]) => o.slice(1).reduce((s, p, i) => s + distanceKm(o[i], p), 0);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (len(cand) + 1e-6 < len(order)) {
          order.splice(0, order.length, ...cand);
          improved = true;
        }
      }
    }
  }
  return { order, km: Math.round(len(order)) };
}
