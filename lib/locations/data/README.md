# Location data

The location search (`/api/locations/search`, `lib/server/locations.ts`) is backed by MongoDB collections that
are imported from the files in this folder.

| File | What | Source | Licence |
|---|---|---|---|
| `spain-ine-2025.json` | 52 provinces, 8,132 municipalities (official names and INE codes) | INE, [Relación de municipios y códigos a 1 de enero de 2025](https://www.ine.es/daco/daco42/codmun/25codmun.xlsx) and [Relación de provincias](https://www.ine.es/daco/daco42/codmun/cod_provincia.htm) | INE data may be reused with attribution (INE, Aviso legal) |
| `spain-localities-geonames.json` | ~23,000 villages, population centres and neighbourhoods inside municipalities; population figures used for ranking; some everyday municipality names | [GeoNames](https://www.geonames.org) Spain extract, [ES.zip](https://download.geonames.org/export/dump/ES.zip) | **CC BY 4.0 — attribution required:** "Contains data from GeoNames (https://www.geonames.org)" |
| `alicante.ts` | Costa Blanca: everyday / Valencian names, North / South / inland areas, 92 curated urbanisations | Curated for this project; ids are INE's | — |

## Collections

- `location_provinces`: `_id` `"es-03"`.
- `locations`: municipalities (`"es-03-133"`, `type: "municipality"`, `source: "ine"`) and places inside them
  (`"es-03-133-la-mata"` curated, `"es-03-099-g2511758"` GeoNames; `type` locality / district / urbanisation / village).
  Every place has `municipalityId` and `provinceId`.
- `meta` (`_id: "locations"`): version and counts of the last import.
- Properties get `provinceId`, `municipalityId` and `locationId`, worked out from their town / province text
  (on save, on feed import, and for all properties after each import). The text itself is never changed.

## Updating

1. Download the new source files (INE publishes municipalities every 1 January; GeoNames daily).
2. Rebuild the JSON files:
   ```
   python -I scripts/locations/build-spain-data.py <NNcodmun.xlsx> <cod_provincia.htm> lib/locations/data/spain-ine-2025.json
   python -I scripts/locations/build-localities.py <ES.txt> lib/locations/data/spain-ine-2025.json lib/locations/data/spain-localities-geonames.json
   ```
3. Raise `LOCATION_DATA_VERSION` in `lib/server/locations.ts` and deploy. The first request that needs locations
   imports the new data; or run it at once as an admin: `POST /api/admin/locations/import`.

The import writes only new and changed records (each has a content hash) and removes records no longer in the
sources, so it can be run any number of times without duplicates, and an interrupted import continues where it
stopped. Ids stay the same across updates (INE codes, GeoNames ids), so properties keep their locations.

## Gaps

- GeoNames covers populated places well but not every hamlet, and many places have no population figure
  (they rank below the ones that do).
- Neighbourhoods (`district`) are mostly in big cities (Madrid, Barcelona, Valencia, Sevilla…).
- Urbanisations are curated for the Costa Blanca only; elsewhere an urbanisation is found only if GeoNames lists it.
- A property whose town text is misspelled, or names a place in several municipalities without a province, keeps
  only its province (or nothing) until the text is corrected — it is never guessed.
