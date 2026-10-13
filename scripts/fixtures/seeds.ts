/**
 * ILLUSTRATIVE SEEDS FOR FIXTURE MODE. NOT QLOO DATA.
 *
 * These hand-written placeholders let Headliner run end to end before the Qloo hackathon key
 * arrives. They exist only to generate fixtures/qloo/*.json in the documented response shapes.
 * The app's runtime code never reads this file. Once QLOO_API_KEY is set, the app uses live
 * Qloo responses, and scripts/qloo-smoke.sh re-records real fixtures into fixtures/live/.
 */
export interface ArtistSeed {
  name: string;
  slug: string;
  region: "north-america" | "uk-europe";
  popularity: number;
  description: string;
  /** City-level fan concentration (0-1). Unlisted cities get a low hashed value. */
  hot: Record<string, number>;
  tasteTags: string[];
  demographics: { age: Record<string, number>; gender: Record<string, number> };
  support: Array<{ name: string; popularity: number; affinity: number; strongIn?: string[] }>;
  sharedTags: Record<string, string[]>;
  /** Names the plain LLM tends to suggest, with the overlap Qloo would give them. */
  llmActs: Record<string, number>;
  brands: Record<string, string[]>;
  localBrands: Record<string, Record<string, string[]>>;
  venues: Record<string, string[]>;
  bars: Record<string, string[]>;
  trend: number[];
  baseline: { cities: string[]; support_acts: string[]; sponsors: string[]; reasoning: string };
}

export const SEEDS: ArtistSeed[] = [
  {
    name: "Noah Kahan",
    slug: "noah-kahan",
    region: "north-america",
    popularity: 0.962,
    description: "American singer-songwriter from Strafford, Vermont",
    hot: {
      "Burlington, VT": 0.99, "Portland, ME": 0.97, "Portsmouth, NH": 0.95, "Boston, MA": 0.94, "Albany, NY": 0.9,
      "Providence, RI": 0.89, "Hartford, CT": 0.86, "Syracuse, NY": 0.85, "Minneapolis, MN": 0.83, "Madison, WI": 0.84,
      "Grand Rapids, MI": 0.82, "Denver, CO": 0.8, "Columbus, OH": 0.78, "Nashville, TN": 0.74, "Philadelphia, PA": 0.76,
      "New York, NY": 0.7, "Chicago, IL": 0.72, "Toronto, ON": 0.71, "Montreal, QC": 0.66, "Seattle, WA": 0.69,
      "Los Angeles, CA": 0.55, "Miami, FL": 0.38, "Houston, TX": 0.42, "Las Vegas, NV": 0.4, "Atlanta, GA": 0.5,
    },
    tasteTags: ["Indie Folk", "Singer-Songwriter", "Folk Pop", "Americana", "Acoustic", "Heartland Rock", "New England", "Storytelling"],
    demographics: { age: { "24_and_younger": 0.38, "25_to_29": 0.31, "30_to_34": 0.08, "35_to_44": -0.12, "45_to_54": -0.29, "55_and_older": -0.36 }, gender: { female: 0.22, male: -0.22 } },
    support: [
      { name: "Gracie Abrams", popularity: 0.94, affinity: 0.83, strongIn: ["Boston, MA", "New York, NY"] },
      { name: "Lizzy McAlpine", popularity: 0.9, affinity: 0.81, strongIn: ["Boston, MA", "Burlington, VT"] },
      { name: "Gregory Alan Isakov", popularity: 0.86, affinity: 0.86, strongIn: ["Denver, CO", "Burlington, VT", "Portland, ME"] },
      { name: "The Paper Kites", popularity: 0.85, affinity: 0.78 },
      { name: "Wild Rivers", popularity: 0.8, affinity: 0.8, strongIn: ["Portland, ME", "Albany, NY"] },
      { name: "Del Water Gap", popularity: 0.82, affinity: 0.77 },
      { name: "Hozier", popularity: 0.95, affinity: 0.74 },
      { name: "Caamp", popularity: 0.87, affinity: 0.84, strongIn: ["Columbus, OH", "Portsmouth, NH"] },
    ],
    sharedTags: { "Gregory Alan Isakov": ["Indie Folk", "Rural Nostalgia", "Acoustic", "Storytelling"], "Caamp": ["Folk Pop", "Banjo", "Singalong", "Road Trip"], "Lizzy McAlpine": ["Confessional", "Singer-Songwriter", "Bedroom Pop"] },
    llmActs: { "Jesse Jo Stark": 0.34 },
    brands: {
      "Food & drink": ["Cabot Creamery", "Ben & Jerry's", "Liquid Death", "Trader Joe's", "Dunkin'"],
      "Fashion & apparel": ["L.L.Bean", "Patagonia", "Carhartt", "Blundstone", "Duck Head"],
      "Beer, wine & spirits": ["Heady Topper", "Allagash Brewing", "Two Roads Brewing", "Athletic Brewing", "White Claw"],
    },
    localBrands: {
      "Food & drink": { "Burlington, VT": ["King Arthur Baking", "Cabot Creamery"], "Portland, ME": ["Holy Donut", "Ben & Jerry's"] },
      "Beer, wine & spirits": { "Burlington, VT": ["Zero Gravity Craft Brewery"], "Portland, ME": ["Bissell Brothers", "Allagash Brewing"] },
      "Fashion & apparel": { "Boston, MA": ["Ministry of Supply"] },
    },
    venues: {
      "Burlington, VT": ["Higher Ground", "Waterfront Park", "Flynn Theatre"], "Portland, ME": ["Thompson's Point", "State Theatre", "Cross Insurance Arena"],
      "Portsmouth, NH": ["The Music Hall", "Prescott Park Arts Festival"], "Boston, MA": ["MGM Music Hall at Fenway", "Leader Bank Pavilion", "House of Blues Boston"],
      "Albany, NY": ["MVP Arena", "Palace Theatre"], "Providence, RI": ["The Strand", "Providence Performing Arts Center"],
    },
    bars: { "Burlington, VT": ["Radio Bean", "Foam Brewers"], "Portland, ME": ["Oxbow Blending & Bottling", "Novare Res"], "Portsmouth, NH": ["The Press Room", "Earth Eagle Brewings"] },
    trend: [86, 87, 87, 88, 89, 90, 90, 91, 92, 92, 93, 94],
    baseline: { cities: [], support_acts: [], sponsors: [], reasoning: "" },
  },
  {
    name: "Tyler Childers",
    slug: "tyler-childers",
    region: "north-america",
    popularity: 0.951,
    description: "American country singer-songwriter from Lawrence County, Kentucky",
    hot: {
      "Lexington, KY": 0.99, "Louisville, KY": 0.96, "Knoxville, TN": 0.95, "Asheville, NC": 0.93, "Nashville, TN": 0.92,
      "Columbus, OH": 0.88, "Cincinnati, OH": 0.89, "Richmond, VA": 0.85, "Charlottesville, VA": 0.86, "Indianapolis, IN": 0.84,
      "Pittsburgh, PA": 0.8, "Raleigh, NC": 0.81, "Birmingham, AL": 0.78, "Denver, CO": 0.79, "Missoula, MT": 0.82,
      "St. Louis, MO": 0.77, "Austin, TX": 0.75, "Atlanta, GA": 0.7, "Chicago, IL": 0.62, "New York, NY": 0.48,
      "Los Angeles, CA": 0.45, "Boston, MA": 0.52, "Miami, FL": 0.33, "San Francisco, CA": 0.41,
    },
    tasteTags: ["Country", "Bluegrass", "Americana", "Appalachian", "Outlaw Country", "Honky Tonk", "Fiddle", "Southern Rock"],
    demographics: { age: { "24_and_younger": 0.12, "25_to_29": 0.34, "30_to_34": 0.29, "35_to_44": 0.06, "45_to_54": -0.21, "55_and_older": -0.3 }, gender: { male: 0.18, female: -0.18 } },
    support: [
      { name: "Charles Wesley Godwin", popularity: 0.8, affinity: 0.89, strongIn: ["Lexington, KY", "Knoxville, TN", "Pittsburgh, PA"] },
      { name: "Colter Wall", popularity: 0.88, affinity: 0.86, strongIn: ["Missoula, MT", "Denver, CO"] },
      { name: "Sierra Ferrell", popularity: 0.84, affinity: 0.85, strongIn: ["Asheville, NC", "Nashville, TN"] },
      { name: "Billy Strings", popularity: 0.93, affinity: 0.84 },
      { name: "Vincent Neil Emerson", popularity: 0.72, affinity: 0.8 },
      { name: "Ian Noe", popularity: 0.7, affinity: 0.83, strongIn: ["Lexington, KY", "Louisville, KY"] },
      { name: "Turnpike Troubadours", popularity: 0.9, affinity: 0.81 },
      { name: "49 Winchester", popularity: 0.74, affinity: 0.82, strongIn: ["Richmond, VA", "Charlottesville, VA"] },
    ],
    sharedTags: { "Charles Wesley Godwin": ["Appalachian", "Coal Country", "Americana", "Storytelling"], "Sierra Ferrell": ["Bluegrass", "Old-Time", "Fiddle"], "Ian Noe": ["Appalachian", "Folk", "Kentucky"] },
    llmActs: { "Margo Price": 0.71, "Kacey Musgraves": 0.55, "Lil Nas X": 0.18 },
    brands: {
      "Food & drink": ["Duke's Mayonnaise", "Cracker Barrel", "Waffle House", "Grippo's", "Ale-8-One"],
      "Fashion & apparel": ["Carhartt", "Wrangler", "Ariat", "Filson", "Red Wing Shoes"],
      "Beer, wine & spirits": ["Buffalo Trace", "Wild Turkey", "Ale-8-One", "Busch Light", "West Sixth Brewing"],
    },
    localBrands: {
      "Food & drink": { "Lexington, KY": ["Ale-8-One", "Grippo's"], "Knoxville, TN": ["Bush's Beans"] },
      "Beer, wine & spirits": { "Lexington, KY": ["West Sixth Brewing", "Town Branch"], "Louisville, KY": ["Rabbit Hole Distillery"] },
      "Fashion & apparel": { "Knoxville, TN": ["Volunteer Traditions"] },
    },
    venues: {
      "Lexington, KY": ["Rupp Arena", "The Burl", "Lexington Opera House"], "Louisville, KY": ["Louisville Palace", "Iroquois Amphitheater", "KFC Yum! Center"],
      "Knoxville, TN": ["Thompson-Boling Arena", "Tennessee Theatre", "The Mill & Mine"], "Asheville, NC": ["ExploreAsheville.com Arena", "The Orange Peel"],
      "Nashville, TN": ["Ryman Auditorium", "Bridgestone Arena"],
    },
    bars: { "Lexington, KY": ["Willie's Locally Known", "The Green Lantern"], "Louisville, KY": ["Zanzabar", "Mag Bar"], "Knoxville, TN": ["Barley's Taproom", "Pretentious Beer Co."] },
    trend: [88, 88, 89, 89, 88, 89, 90, 90, 90, 91, 91, 91],
    baseline: { cities: [], support_acts: [], sponsors: [], reasoning: "" },
  },
  {
    name: "Fontaines D.C.",
    slug: "fontaines-dc",
    region: "uk-europe",
    popularity: 0.931,
    description: "Irish post-punk band from Dublin",
    hot: {
      "Dublin, Ireland": 0.99, "Glasgow, Scotland": 0.95, "Manchester, England": 0.94, "Leeds, England": 0.9, "Bristol, England": 0.91,
      "Belfast, Northern Ireland": 0.92, "Liverpool, England": 0.88, "London, England": 0.86, "Newcastle, England": 0.87, "Nottingham, England": 0.85,
      "Brighton, England": 0.84, "Amsterdam, Netherlands": 0.82, "Antwerp, Belgium": 0.8, "Utrecht, Netherlands": 0.81, "Berlin, Germany": 0.79,
      "Hamburg, Germany": 0.78, "Paris, France": 0.74, "Copenhagen, Denmark": 0.77, "Madrid, Spain": 0.55, "Rome, Italy": 0.48, "Milan, Italy": 0.58,
    },
    tasteTags: ["Post-Punk", "Indie Rock", "Irish Rock", "Post-Punk Revival", "Alternative", "Garage Rock", "Poetry", "Noise Rock"],
    demographics: { age: { "24_and_younger": 0.21, "25_to_29": 0.33, "30_to_34": 0.24, "35_to_44": 0.02, "45_to_54": -0.24, "55_and_older": -0.31 }, gender: { male: 0.26, female: -0.26 } },
    support: [
      { name: "English Teacher", popularity: 0.74, affinity: 0.87, strongIn: ["Leeds, England", "Manchester, England"] },
      { name: "Kneecap", popularity: 0.82, affinity: 0.84, strongIn: ["Belfast, Northern Ireland", "Dublin, Ireland", "Glasgow, Scotland"] },
      { name: "Sprints", popularity: 0.66, affinity: 0.85, strongIn: ["Dublin, Ireland"] },
      { name: "Wet Leg", popularity: 0.86, affinity: 0.8 },
      { name: "Shame", popularity: 0.78, affinity: 0.83, strongIn: ["London, England", "Brighton, England"] },
      { name: "The Murder Capital", popularity: 0.72, affinity: 0.86, strongIn: ["Dublin, Ireland", "Glasgow, Scotland"] },
      { name: "Squid", popularity: 0.73, affinity: 0.79 },
      { name: "Black Country, New Road", popularity: 0.76, affinity: 0.78 },
    ],
    sharedTags: { "The Murder Capital": ["Post-Punk", "Irish Rock", "Dublin"], "English Teacher": ["Post-Punk Revival", "Art Rock", "Spoken Word"], "Kneecap": ["Irish Language", "Rebel", "Belfast"] },
    llmActs: { "Thee Oh Sees": 0.58, "The Men They Couldn’t Hang": 0.31 },
    brands: {
      "Food & drink": ["Tayto", "Barry's Tea", "Monster Energy", "Greggs", "Club Orange"],
      "Fashion & apparel": ["Dr. Martens", "Fred Perry", "Stone Island", "Carhartt WIP", "Adidas Originals"],
      "Beer, wine & spirits": ["Guinness", "Jameson", "Rockshore", "Beavertown", "Camden Town Brewery"],
    },
    localBrands: {
      "Food & drink": { "Dublin, Ireland": ["Tayto", "Club Orange"], "Glasgow, Scotland": ["Irn-Bru", "Tunnock's"] },
      "Beer, wine & spirits": { "Dublin, Ireland": ["Rockshore", "Teeling Whiskey"], "Glasgow, Scotland": ["Tennent's Lager", "Drygate"] },
      "Fashion & apparel": { "Manchester, England": ["Private White V.C."] },
    },
    venues: {
      "Dublin, Ireland": ["3Arena", "Vicar Street", "Olympia Theatre"], "Glasgow, Scotland": ["Barrowland Ballroom", "O2 Academy Glasgow", "OVO Hydro"],
      "Manchester, England": ["O2 Victoria Warehouse", "Albert Hall", "Co-op Live"], "Belfast, Northern Ireland": ["Ulster Hall", "SSE Arena Belfast"],
      "Bristol, England": ["Bristol Beacon", "O2 Academy Bristol"],
    },
    bars: { "Dublin, Ireland": ["The Workman's Club", "Whelan's"], "Glasgow, Scotland": ["Nice N Sleazy", "The Hug and Pint"], "Manchester, England": ["Night & Day Café", "Gullivers"] },
    trend: [80, 81, 83, 84, 86, 86, 87, 88, 88, 89, 89, 90],
    baseline: { cities: [], support_acts: [], sponsors: [], reasoning: "" },
  },
];
