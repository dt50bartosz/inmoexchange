// scripts/test-locations.mjs
// End-to-end tests for the location search: the import, the autocomplete API, and the property search.
//
//   npm run build && npm run start          (in another terminal; or npm run dev)
//   npm run test:locations                   (BASE_URL=http://localhost:3000 by default)
//
// Uses the database in .env.local (MONGODB_URI, MONGODB_DB). It creates its own throwaway agencies, logins
// and properties (tagged "test-locations") and always deletes them again, also when a test fails.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const { MongoClient, ObjectId } = require("mongodb");
const argon = require("@node-rs/argon2");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TAG = "test-locations";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")])
);
const client = await MongoClient.connect(process.env.MONGODB_URI ?? env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DB ?? env.MONGODB_DB ?? "inmoexchange");

let failures = 0;
let passes = 0;
const check = (ok, msg, detail) => {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}${!ok && detail !== undefined ? `\n      got: ${JSON.stringify(detail).slice(0, 400)}` : ""}`);
};
const section = (s) => console.log(`\n## ${s}`);

/* ---------- HTTP helpers ---------- */

async function api(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** Logs in through the real credentials flow; returns a fetch that sends the session cookies. */
async function login(email, password) {
  const jar = new Map();
  const store = (res) => {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const r1 = await fetch(`${BASE}/api/auth/csrf`);
  store(r1);
  const { csrfToken } = await r1.json();
  const r2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email, password }),
  });
  store(r2);
  return (path, init = {}) => fetch(`${BASE}${path}`, { redirect: "manual", ...init, headers: { ...(init.headers ?? {}), cookie: cookie() } });
}

/** Property codes shown on a public /listings page. */
const listingCodes = (html) => [...new Set([...html.matchAll(/href="\/en\/listings\/([A-Z]{2}-\d{4})"/g)].map((m) => m[1]))];
const listing = async (query) => listingCodes(await (await fetch(`${BASE}/en/listings${query}`)).text());

/* ---------- Fixtures ---------- */

const suffix = randomBytes(3).toString("hex");
const viewerId = new ObjectId();
const partnerId = new ObjectId();
const password = `Test-${randomBytes(6).toString("hex")}`;
const emails = { viewer: `${TAG}-viewer-${suffix}@example.invalid`, admin: `${TAG}-admin-${suffix}@example.invalid` };

// Town / province text as agencies (and XML feeds) type it; the expected ids come from the import's mapping.
// `place: true` = mapped to a place inside the municipality. `municipality` may be an id prefix.
const FIXTURES = [
  { town: "Torrevieja", province: "Alicante", beds: 3, municipality: "es-03-133" },
  { town: "La Mata", province: "Alicante", beds: 2, municipality: "es-03-133", place: true }, // curated urbanisation
  { town: "Cabo Roig", province: "Alicante", beds: 2, municipality: "es-03-099", place: true }, // GeoNames locality
  { town: "Orihuela", province: "", beds: 4, municipality: "es-03-099" }, // feed record with only a town
  { town: "Torre-Pacheco", province: "Murcia", beds: 3, municipality: "es-30-037" },
  { town: "Murcia", province: "Murcia", beds: 2, municipality: "es-30-030" },
  { town: "Madrid", province: "Madrid", beds: 2, municipality: "es-28-079" },
  { town: "Barcelona", province: "Barcelona", beds: 1, municipality: "es-08-019" },
  { town: "Marbella", province: "", beds: 3, municipality: "es-29-069" },
  { town: "Adeje", province: "Santa Cruz de Tenerife", beds: 2, municipality: "es-38-001" }, // Canary Islands
  { town: "Calpe", province: "Costa Blanca", beds: 3, municipality: "es-03-047" }, // Spanish name; a coast as province
  { town: "Elche", province: "Alicante/Alacant", beds: 3, municipality: "es-03-065" },
  { town: "Unknownville", province: "Alicante", beds: 2, municipality: null, provinceId: "es-03" }, // province only
  { town: "Torreivieja", province: "Alicante", beds: 2, municipality: "es-03-133" }, // typo: the one close town in the province
  { town: "Arroyomolinos", province: "", beds: 2, municipality: null, provinceId: null }, // in Cáceres and Madrid: no guess
  { town: "Arroyomolinos", province: "Madrid", beds: 2, municipality: "es-28-", provinceId: "es-28" }, // province decides
].map((f, i) => ({ ...f, code: `ZT-${8100 + i}`, price: 100000 + ((i * 37) % 13) * 10000 }));
const provinceOf = (f) => (f.provinceId !== undefined ? f.provinceId : f.municipality.slice(0, 5));
const codesOf = (pred) => new Set(FIXTURES.filter(pred).map((f) => f.code));
const ALICANTE = FIXTURES.filter((f) => provinceOf(f) === "es-03");

async function createFixtures() {
  const now = new Date();
  await db.collection("agencies").insertMany([
    { _id: viewerId, fixture: TAG, name: "Test Viewer", slug: `${TAG}-v-${suffix}`, email: emails.viewer, status: "active", createdAt: now, updatedAt: now },
    { _id: partnerId, fixture: TAG, name: "Test Partner", slug: `${TAG}-p-${suffix}`, email: `${TAG}-p-${suffix}@example.invalid`, status: "active", phone: "+34 600 000 000", createdAt: now, updatedAt: now },
  ]);
  const hash = await argon.hash(password);
  await db.collection("users").insertMany([
    { fixture: TAG, role: "agency", agencyId: viewerId.toHexString(), email: emails.viewer, passwordHash: hash, mustChangePassword: false, sessionVersion: 0, createdAt: now, updatedAt: now },
    { fixture: TAG, role: "admin", email: emails.admin, passwordHash: hash, mustChangePassword: false, sessionVersion: 0, createdAt: now, updatedAt: now },
  ]);
  // Inserted straight into the database without location ids, like properties saved before this feature
  await db.collection("properties").insertMany(
    FIXTURES.map((f, i) => ({
      agencyId: partnerId.toHexString(),
      fixture: TAG,
      code: f.code,
      reference: `${TAG}-${i}`,
      type: "apartment",
      condition: "resale",
      town: f.town,
      province: f.province,
      area: "costaBlancaSouth",
      address: "",
      hideAddress: true,
      price: f.price,
      bedrooms: f.beds,
      bathrooms: f.beds >= 3 ? 2 : 1,
      builtM2: 80,
      features: [],
      photos: [],
      description: { en: "", es: "", pl: "" },
      status: "active",
      shared: true,
      commission: "50/50",
      source: { kind: "manual" },
      hidden: false,
      moderation: null,
      priceHistory: [],
      createdAt: new Date(now.getTime() - i * 1000),
      updatedAt: now,
    }))
  );
}

async function cleanup() {
  const ids = [viewerId.toHexString(), partnerId.toHexString()];
  await db.collection("properties").deleteMany({ fixture: TAG });
  await db.collection("users").deleteMany({ fixture: TAG });
  await db.collection("agencies").deleteMany({ fixture: TAG });
  await db.collection("property_events").deleteMany({ $or: [{ viewerAgencyId: { $in: ids } }, { ownerAgencyId: { $in: ids } }] });
  await db.collection("rateLimits").deleteMany({ _id: { $regex: `^login:${TAG}` } });
}

/* ---------- Tests ---------- */

try {
  await createFixtures();
  const admin = await login(emails.admin, password);
  const viewer = await login(emails.viewer, password);

  section("8. Import — repeatable, no duplicates");
  check((await fetch(`${BASE}/api/admin/locations/import`, { method: "POST" })).status === 401, "import without login is refused (401)");
  check((await viewer("/api/admin/locations/import", { method: "POST" })).status === 401, "import as an agency is refused (401)");
  const first = await (await admin("/api/admin/locations/import", { method: "POST" })).json();
  check(
    first.ok && first.data.provinces === 52 && first.data.municipalities === 8132 && first.data.places > 20000,
    `import: ${first.data?.provinces} provinces, ${first.data?.municipalities} municipalities, ${first.data?.places} places inside them`,
    first
  );
  const count = async () => ({ p: await db.collection("location_provinces").countDocuments(), l: await db.collection("locations").countDocuments() });
  const counts1 = await count();
  const second = await (await admin("/api/admin/locations/import", { method: "POST" })).json();
  const counts2 = await count();
  check(second.ok && JSON.stringify(counts1) === JSON.stringify(counts2), `running it again changes no counts (${counts2.p} provinces, ${counts2.l} locations)`, { counts1, counts2 });
  check(second.ok && second.data.properties === 0, "running it again has no property left to re-map", second.data);
  check(second.ok && second.data.written === 0 && second.data.removed === 0, "running it again over unchanged data writes nothing", second.data);
  const distinctIne = (await db.collection("locations").distinct("ine", { type: "municipality" })).length;
  check(distinctIne === 8132, `each INE municipality code once (${distinctIne})`);
  const perProvince = await db.collection("locations").aggregate([{ $match: { type: "municipality" } }, { $group: { _id: "$provinceId", n: { $sum: 1 } } }]).toArray();
  check(perProvince.length === 52, "all 52 provinces have municipalities (incl. Balears, Canarias, Ceuta, Melilla)", perProvince.length);
  const placeTypes = await db.collection("locations").distinct("type", { type: { $ne: "municipality" } });
  check(["district", "locality", "urbanisation"].every((t) => placeTypes.includes(t)), `places keep their own type (${placeTypes.join(", ")})`, placeTypes);
  const orphans = await db.collection("locations").countDocuments({ type: { $ne: "municipality" }, municipalityName: null });
  check(orphans === 0, "every place belongs to an existing municipality", orphans);

  section("5. Existing properties (incl. feed records with only a town) mapped to ids");
  const mapped = await db
    .collection("properties")
    .find({ fixture: TAG }, { projection: { code: 1, town: 1, provinceId: 1, municipalityId: 1, locationId: 1 } })
    .toArray();
  for (const f of FIXTURES) {
    const d = mapped.find((m) => m.code === f.code);
    const okMunicipality = f.municipality === null ? d?.municipalityId === null : !!d?.municipalityId?.startsWith(f.municipality);
    const okPlace = f.place ? d?.locationId !== d?.municipalityId && !!d?.locationId?.startsWith(`${f.municipality}-`) : true;
    check(okMunicipality && okPlace && d?.provinceId === provinceOf(f), `"${f.town}" / "${f.province}" → ${f.municipality ?? "no town"}${f.place ? " (place inside)" : ""} in ${provinceOf(f) ?? "no province"}`, d);
  }
  const caboRoig = mapped.find((m) => m.town === "Cabo Roig").locationId;

  section("1–3. Autocomplete across Spain: partial names, accents, other names");
  const search = (q, extra = "") => api(`/api/locations/search?q=${encodeURIComponent(q)}${extra}`);
  const ids = (r) => (r.body?.data?.items ?? []).map((i) => i.id);
  let r = await search("tor");
  check(r.status === 200 && ids(r).includes("es-03-133"), '"tor" → Torrevieja on the first page', r.body?.data?.items.map((i) => i.name));
  check(new Set(r.body.data.items.map((i) => i.provinceName)).size > 2, '"tor" → towns from several provinces', r.body.data.items.map((i) => i.provinceName));
  r = await search("mad");
  check(ids(r)[0] === "es-28" && ids(r)[1] === "es-28-079", '"mad" → Madrid (province), then Madrid (town)', ids(r));
  r = await search("alic");
  check(ids(r)[0] === "es-03" && ids(r).includes("es-03-014"), '"alic" → Alicante (province) and Alicante (town)', ids(r));
  r = await search("barc");
  check(ids(r).slice(0, 2).join() === "es-08,es-08-019", '"barc" → Barcelona province and town first', ids(r));
  r = await search("malaga");
  const r2 = await search("Málaga");
  check(ids(r).includes("es-29-067") && ids(r).join() === ids(r2).join(), '"malaga" = "Málaga" (accents ignored)', [ids(r), ids(r2)]);
  r = await search("MURCIA");
  check(ids(r).slice(0, 2).join() === "es-30,es-30-030", '"MURCIA" (case ignored) → Murcia province and town', ids(r));
  r = await search("adeje");
  check(r.body.data.items[0]?.id === "es-38-001" && r.body.data.items[0].provinceName === "Santa Cruz de Tenerife", '"adeje" → Adeje, Santa Cruz de Tenerife (Canary Islands)', r.body.data.items[0]);
  r = await search("costa adeje");
  check(r.body.data.items[0]?.type === "locality" && r.body.data.items[0].municipalityName === "Adeje", '"costa adeje" → a locality inside Adeje', r.body.data.items[0]);
  r = await search("palma de mallorca");
  check(ids(r).includes("es-07-040"), '"palma de mallorca" (everyday name) → Palma, Illes Balears', ids(r));
  r = await search("alacant");
  check(ids(r)[0] === "es-03", '"alacant" (Valencian) → Alicante', ids(r));
  r = await search("gerona");
  check(ids(r)[0] === "es-17", '"gerona" (older Spanish name) → Girona', ids(r));
  r = await search("elche");
  check(ids(r).includes("es-03-065"), '"elche" → Elx / Elche', ids(r));
  r = await search("melilla");
  check(ids(r)[0] === "es-52", '"melilla" → Melilla', ids(r));
  r = await search("rrevieja");
  check(ids(r)[0] === "es-03-133", '"rrevieja" (inside a word) → Torrevieja', ids(r));
  r = await search("la mata");
  check(ids(r).includes("es-03-133-la-mata"), '"la mata" → La Mata (Torrevieja) on the first page', ids(r));
  r = await search("cabo roig");
  check(
    r.body.data.items[0]?.municipalityName === "Orihuela" && r.body.data.items[0]?.provinceName === "Alicante / Alacant",
    '"cabo roig" → shown with its town and province',
    r.body.data.items[0]
  );
  check(
    Object.keys(r.body.data.items[0]).sort().join() === "detail,id,municipalityName,name,provinceName,type",
    "only the fields the UI needs are returned",
    r.body.data.items[0]
  );

  section("4. Same name in different provinces");
  r = await search("arroyomolinos");
  const arroyo = r.body.data.items.filter((i) => i.name === "Arroyomolinos" && i.type === "municipality");
  check(arroyo.length === 2 && new Set(arroyo.map((i) => i.provinceName)).size === 2, "two Arroyomolinos, told apart by province", arroyo);

  section("5. Choosing locations filters real properties (by id, with the hierarchy)");
  const set = (codes) => new Set(codes.filter((c) => c.startsWith("ZT-")));
  const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  let got = set(await listing("?loc=es-03-133"));
  check(same(got, codesOf((f) => f.municipality === "es-03-133")), "Torrevieja → its properties incl. La Mata (urbanisation)", [...got]);
  got = set(await listing("?loc=es-03-099"));
  check(same(got, codesOf((f) => f.municipality === "es-03-099")), "Orihuela → incl. Cabo Roig (locality)", [...got]);
  got = set(await listing(`?loc=${caboRoig}`));
  check(same(got, codesOf((f) => f.town === "Cabo Roig")), "Cabo Roig alone → only Cabo Roig", [...got]);
  got = set(await listing("?loc=es-28"));
  check(same(got, codesOf((f) => provinceOf(f) === "es-28")), "Madrid province → Madrid and Arroyomolinos (Madrid)", [...got]);
  got = set(await listing("?loc=es-38,es-29-069"));
  check(same(got, codesOf((f) => f.town === "Adeje")), "one location per search: a second one in the URL is ignored", [...got]);

  section("5b. Within X km of a location (property coordinates, 2dsphere)");
  const near = (q) => fetch(`${BASE}/en/listings${q}`).then((r) => r.text());
  let html = await near("?loc=es-03-133&radiusKm=10");
  got = set(listingCodes(html));
  check(same(got, codesOf((f) => f.municipality === "es-03-133" || f.town === "Cabo Roig")), "Torrevieja + 10 km → also Cabo Roig (~8 km), not Orihuela town (~25 km)", [...got]);
  check(/\d+[.,]\d km from Torrevieja/.test(html), 'cards show "x km from Torrevieja"', html.match(/[^>]{0,30}km from[^<]{0,30}/)?.[0]);
  got = set(await listing("?loc=es-03-133&radiusKm=2"));
  check(same(got, codesOf((f) => f.municipality === "es-03-133")), "Torrevieja + 2 km → not Cabo Roig", [...got]);
  got = set(await listing("?loc=es-03&radiusKm=10"));
  check(same(got, new Set(ALICANTE.map((f) => f.code))), "a radius around a province is ignored (no single centre)", [...got]);
  got = set(await listing("?loc=es-03-133&radiusKm=7"));
  check(same(got, codesOf((f) => f.municipality === "es-03-133")), "a radius not offered (7 km) is ignored", [...got]);
  got = set(await listing("?loc=es-03-047"));
  check(same(got, codesOf((f) => f.town === "Calpe")), 'Calp → the property typed as "Calpe"', [...got]);
  got = set(await listing("?province=es-30&town=es-30-030"));
  check(same(got, codesOf((f) => f.municipality === "es-30-030")), "old ?province=&town= links still work", [...got]);

  section("6. Invalid location ids are rejected");
  const all = set(await listing(""));
  got = set(await listing("?loc=es-99,es-03-999,foo,es-03-133-g0"));
  check(same(got, all), "unknown / malformed ids are dropped (same as no filter)", [...got]);
  got = set(await listing("?loc=es-99,es-03-133"));
  check(same(got, codesOf((f) => f.municipality === "es-03-133")), "a bad id next to a good one: only the good one counts", [...got]);
  r = await search("x".repeat(61));
  check(r.status === 400 && r.body.error === "validation_error", "too long text → 400", r);

  section("7. Other filters, pagination, sorting, authentication");
  got = set(await listing("?loc=es-03-133&minBeds=3"));
  check(same(got, codesOf((f) => f.municipality === "es-03-133" && f.beds >= 3)), "location + bedrooms 3+", [...got]);
  got = set(await listing("?loc=es-03&minBaths=2"));
  check(same(got, new Set(ALICANTE.filter((f) => f.beds >= 3).map((f) => f.code))), "location + bathrooms 2+", [...got]);
  // Enough properties for two pages: every fixture (plus whatever else is on the network)
  const twoPages = "?sort=priceAsc";
  const inTwoPages = FIXTURES;
  const page1 = await listing(twoPages);
  const page2 = await listing(`${twoPages}&page=2`);
  const pages = [...page1, ...page2].filter((c) => c.startsWith("ZT-"));
  check(page1.length === 10, "page 1 shows 10 properties", page1.length);
  check(new Set(pages).size === pages.length && same(new Set(pages), new Set(inTwoPages.map((f) => f.code))), `pages 1 + 2 hold all ${inTwoPages.length} properties once`, pages);
  const prices = pages.map((c) => FIXTURES.find((f) => f.code === c).price);
  check(prices.every((p, i) => i === 0 || prices[i - 1] <= p), "sorted by price, low to high, across pages", prices);
  check([301, 302, 303, 307, 308].includes((await fetch(`${BASE}/en/panel/buscar?loc=es-03-133`, { redirect: "manual" })).status), "panel search without login → redirect to login");
  const panel = await (await viewer("/en/panel/buscar?loc=es-03-133")).text();
  // Only the test's own properties (real ones in Torrevieja may be listed too)
  const fixtureIds = new Set(mapped.map((m) => m._id.toHexString()));
  const panelIds = new Set([...panel.matchAll(/href="\/en\/panel\/buscar\/([a-f0-9]{24})/g)].map((m) => m[1]).filter((id) => fixtureIds.has(id)));
  const expectedIds = new Set(mapped.filter((m) => m.municipalityId === "es-03-133").map((m) => m._id.toHexString()));
  check(same(panelIds, expectedIds), "panel search (logged in) → the Torrevieja properties", [...panelIds]);

  section("9. Empty, short and paged queries");
  r = await search("");
  check(r.status === 200 && r.body.data.items.length === 0, "empty text → no items", r.body);
  r = await search("a");
  check(r.status === 200 && r.body.data.items.length === 0, "one letter → no items (2 needed)", r.body);
  r = await search("zzqx");
  check(r.status === 200 && r.body.data.items.length === 0, "no match → empty list", r.body);
  r = await search("^.*$");
  check(r.status === 200 && r.body.data.items.length === 0, "regex characters are treated as text", r.body);
  const p1 = await search("san", "&limit=8");
  const p2 = await search("san", "&limit=8&offset=8");
  check(p1.body.data.hasMore && p2.body.data.items.length === 8 && !ids(p2).some((id) => ids(p1).includes(id)), '"san": next page has 8 more, none repeated', [ids(p1), ids(p2)]);
} catch (err) {
  failures++;
  console.error("ERROR", err);
} finally {
  await cleanup();
  await client.close();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
