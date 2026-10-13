/**
 * Pre-run the agent on a deployed Headliner so judges get instant, cached answers.
 *   npx tsx scripts/warm-cache.ts https://headliner-qloo.fly.dev ["Artist|region" ...]
 * Default list: the three samples plus a spread of artists judges might type.
 */
const base = (process.argv[2] ?? "http://127.0.0.1:3077").replace(/\/$/, "");
const DEFAULT = [
  "Noah Kahan|north-america", "Tyler Childers|north-america", "Fontaines D.C.|uk-europe",
  "Taylor Swift|north-america", "Bad Bunny|north-america", "Zach Bryan|north-america", "Billie Eilish|north-america",
  "Khruangbin|north-america", "Chappell Roan|north-america", "Olivia Rodrigo|north-america", "Morgan Wallen|north-america",
  "Coldplay|uk-europe", "Arctic Monkeys|uk-europe", "Dua Lipa|uk-europe",
];
const list = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT;

async function main() {
  for (const item of list) {
    const [artist, region = "north-america"] = item.split("|");
    const t0 = Date.now();
    const res = await fetch(`${base}/api/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artist, region, dates: 8 }) });
    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => JSON.parse(l));
    const done = lines.find((e) => e.type === "done");
    const err = lines.find((e) => e.type === "error")?.message ?? done?.result?.error;
    const replay = lines[0]?.replay ? " (already cached)" : "";
    console.log(`${artist.padEnd(18)} ${err ? `ERROR ${err}` : `ok ${done.result.calls.length} Qloo calls, route ${done.result.plan.route.order.slice(0, 3).join(" > ")}…`} ${((Date.now() - t0) / 1000).toFixed(1)}s${replay}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
