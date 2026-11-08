# Builds lib/locations/data/spain-localities-geonames.json: populated places below municipality level
# (villages, localities, neighbourhoods), plus population figures used to rank search results.
#
#   python -I scripts/locations/build-localities.py <ES.txt> lib/locations/data/spain-ine-2025.json lib/locations/data/spain-localities-geonames.json
#
# Source: GeoNames gazetteer extract for Spain, https://download.geonames.org/export/dump/ES.zip (unzip ES.txt).
# Licence: Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Attribution:
# "Contains data from GeoNames (https://www.geonames.org)". Shown in lib/server/locations.ts and the README of this folder.
#
# GeoNames' admin3 code for Spain is the INE municipality code, so every place hangs under the INE municipality
# from spain-ine-2025.json (names and ids there stay authoritative). Places whose name is their municipality's
# own name (the municipal seat) are skipped: the municipality already covers them.
import json, re, sys, unicodedata

sys.stdout.reconfigure(encoding="utf-8")
geonames_path, ine_path, out_path = sys.argv[1:4]

ine = json.load(open(ine_path, encoding="utf-8"))
municipalities = {m["ine"]: m for m in ine["municipalities"]}

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"['’`´/\-.,()]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

ARTICLE = re.compile(r"^(l|el|la|els|les|los|las|a|o|os|as|es|sa|ses|s) ")
def keys(name):
    n = norm(name)
    return {n, ARTICLE.sub("", n)}

def municipality_keys(m):
    out = set()
    for n in [m["name"], m["officialName"], *m["aliases"], *m["name"].split(" / ")]:
        out |= keys(n)
    return out

# Kept: populated places that exist today. Skipped: abandoned (PPLQ), historical (PPLH, PPLCH), destroyed (PPLW),
# religious (PPLR) and judicial districts (PPLS).
LOCALITY_CODES = {"PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC", "PPLL", "PPLF", "PPLX"}

municipality_population = {}
# Town centre: the municipal seat's point (the town itself), else the municipality's admin point
seat_point = {}  # ine -> (population, lat, lon)
admin_point = {}
municipality_alias = {}  # GeoNames' own name for the municipality, when INE writes it differently ("Valencia" for "València")
province_population = {}
province_of_a2 = {}
places = []
skipped = {"no_municipality": 0, "seat": 0}

rows = [line.rstrip("\n").split("\t") for line in open(geonames_path, encoding="utf-8")]
for f in rows:
    if f[11] and re.fullmatch(r"\d{5}", f[12]):
        province_of_a2[f[11]] = f[12][:2]

for f in rows:
    gid, name, fclass, fcode, a2, a3, pop = f[0], f[1], f[6], f[7], f[11], f[12], int(f[14] or 0)
    lat, lon = round(float(f[4]), 5), round(float(f[5]), 5)
    if fclass == "A" and fcode == "ADM3" and a3 in municipalities:
        admin_point[a3] = (lat, lon)
        municipality_population[a3] = max(municipality_population.get(a3, 0), pop)
        if not keys(name) & municipality_keys(municipalities[a3]):
            municipality_alias.setdefault(a3, set()).add(name)
    elif fclass == "A" and fcode == "ADM2" and a2 in province_of_a2:
        province_population[province_of_a2[a2]] = pop
    elif fclass == "P" and fcode in LOCALITY_CODES:
        if a3 not in municipalities:
            skipped["no_municipality"] += 1
            continue
        if keys(name) & municipality_keys(municipalities[a3]):
            # The municipal seat: same place as the municipality. Its population helps if INE's ADM3 had none.
            municipality_population[a3] = max(municipality_population.get(a3, 0), pop)
            if a3 not in seat_point or pop > seat_point[a3][0]:
                seat_point[a3] = (pop, lat, lon)
            skipped["seat"] += 1
            continue
        places.append({"gid": gid, "name": name, "ine": a3, "type": "district" if fcode == "PPLX" else "locality", "pop": pop, "lat": lat, "lon": lon})

# One place per name within a municipality (GeoNames sometimes lists a place twice): keep the most populated
best = {}
for p in places:
    k = (p["ine"], norm(p["name"]))
    if k not in best or p["pop"] > best[k]["pop"]:
        best[k] = p
places = sorted(best.values(), key=lambda p: (p["ine"], norm(p["name"])))

data = {
    "source": "GeoNames gazetteer, Spain extract (https://download.geonames.org/export/dump/ES.zip)",
    "licence": "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — Contains data from GeoNames (https://www.geonames.org)",
    "provincePopulation": {f"es-{k}": v for k, v in sorted(province_population.items())},
    "municipalityPopulation": {f"es-{k[:2]}-{k[2:]}": v for k, v in sorted(municipality_population.items())},
    "municipalityAliases": {f"es-{k[:2]}-{k[2:]}": sorted(v) for k, v in sorted(municipality_alias.items())},
    # Town centre [lat, lon] per municipality (WGS84 degrees)
    "municipalityCentre": {
        f"es-{k[:2]}-{k[2:]}": list(seat_point[k][1:]) if k in seat_point else list(admin_point[k])
        for k in sorted(set(seat_point) | set(admin_point))
    },
    # [geonameId, name, municipality id, type, population, lat, lon]
    "places": [[p["gid"], p["name"], f"es-{p['ine'][:2]}-{p['ine'][2:]}", p["type"], p["pop"], p["lat"], p["lon"]] for p in places],
}
with open(out_path, "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write("\n")

types = {}
for p in places:
    types[p["type"]] = types.get(p["type"], 0) + 1
print(
    f"{len(places)} places ({types}); populations for {len(municipality_population)} municipalities, "
    f"centres for {len(set(seat_point) | set(admin_point))} ({len(seat_point)} from the town itself), "
    f"{len(province_population)} provinces; {len(municipality_alias)} municipalities with an extra common name; skipped {skipped}"
)
