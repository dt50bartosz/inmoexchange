// scripts/migrate-property-events.mjs
// One-off: brings "property_events" documents from before views were tracked on client pages and public listings
// up to the new shape (types/property-events.ts). Safe to run more than once: it only touches documents without visitorKey.
//
//   node scripts/migrate-property-events.mjs            (dry run: only counts)
//   node scripts/migrate-property-events.mjs --apply    (writes)
//
// Uses the database in .env.local (MONGODB_URI, MONGODB_DB), or MONGODB_DB from the environment.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { MongoClient } = require("mongodb");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const apply = process.argv.includes("--apply");
const client = await MongoClient.connect(process.env.MONGODB_URI ?? env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DB ?? env.MONGODB_DB);
const events = db.collection("property_events");

try {
  // Every older document is a logged-in agency in the network search
  const old = { visitorKey: { $exists: false } };
  const count = await events.countDocuments(old);
  console.log(`${db.databaseName}.property_events: ${count} document(s) to update`);

  if (apply && count > 0) {
    const res = await events.updateMany(old, [
      {
        $set: {
          source: "network",
          micrositeAgencyId: null,
          visitorKey: { $concat: ["a:", { $toString: "$viewerAgencyId" }] },
        },
      },
    ]);
    console.log(`updated ${res.modifiedCount}`);
  }

  // The old unique key (one per agency) refuses a second anonymous visitor on the same day
  // A database where nothing was ever recorded has no collection (and no indexes) yet
  const names = (await events.indexes().catch((err) => (err.codeName === "NamespaceNotFound" ? [] : Promise.reject(err)))).map((i) => i.name);
  if (names.includes("one_per_agency_per_day")) {
    if (apply) {
      await events.dropIndex("one_per_agency_per_day");
      console.log("dropped index one_per_agency_per_day");
    } else console.log("index one_per_agency_per_day will be dropped");
  }
  if (!apply) console.log("dry run: nothing written. Run again with --apply.");
} finally {
  await client.close();
}
