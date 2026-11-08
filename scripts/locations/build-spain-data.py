# Builds lib/locations/data/spain-ine-2025.json: every Spanish province and municipality, from two INE files.
#
#   python -I scripts/locations/build-spain-data.py <25codmun.xlsx> <cod_provincia.htm> lib/locations/data/spain-ine-2025.json
#
# Sources (download them first; both are official INE publications):
#   https://www.ine.es/daco/daco42/codmun/25codmun.xlsx    Relación de municipios y códigos a 1 de enero de 2025
#   https://www.ine.es/daco/daco42/codmun/cod_provincia.htm Relación de provincias con sus códigos
# Names and codes are copied as INE writes them; only the display form is derived ("Coruña, A" -> "A Coruña").
# Alicante's richer data (aliases, urbanisations, Costa Blanca areas) is in lib/locations/data/alicante.ts.
import html, json, re, sys, zipfile
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8")
xlsx_path, provinces_path, out_path = sys.argv[1:4]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# --- Municipalities: every sheet of the xlsx that has the CPRO / CMUN / DC / NOMBRE table ---
def cell_value(c, shared):
    v = c.find("m:v", NS)
    if v is None:
        t = c.find("m:is/m:t", NS)
        return t.text if t is not None else ""
    return shared[int(v.text)] if c.get("t") == "s" else v.text

municipality_rows = {}
with zipfile.ZipFile(xlsx_path) as z:
    shared = [
        "".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)
    ]
    for sheet_name in sorted(n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)):
        sheet = ET.fromstring(z.read(sheet_name))
        columns = None  # header text -> column letter
        for row in sheet.findall("m:sheetData/m:row", NS):
            cells = {re.sub(r"\d", "", c.get("r")): (cell_value(c, shared) or "").strip() for c in row.findall("m:c", NS)}
            if columns is None:
                if "CPRO" in [v.upper() for v in cells.values()]:
                    columns = {v.upper(): k for k, v in cells.items()}
                continue
            cpro, cmun, name = (cells.get(columns.get(h, "?"), "") for h in ("CPRO", "CMUN", "NOMBRE"))
            if re.fullmatch(r"\d{1,2}", cpro) and re.fullmatch(r"\d{1,3}", cmun) and name:
                ine = cpro.zfill(2) + cmun.zfill(3)
                assert municipality_rows.get(ine, name) == name, f"{ine} has two names"
                municipality_rows[ine] = name

# --- Provinces: the table in cod_provincia.htm (Código, Literal) ---
page = open(provinces_path, encoding="latin1").read()
provinces = {}
for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S):
    cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
    if len(cells) == 2 and re.fullmatch(r"\d{2}", cells[0]):
        provinces[cells[0]] = cells[1]

# "Coruña, A" -> "A Coruña", "Alfàs del Pi, l'" -> "L'Alfàs del Pi"; each language of "A/B" separately
ARTICLE = re.compile(r"^(.*), (el|la|los|las|l'|els|les|lo|a|o|os|as|es|sa|ses|s'|illes|the)$", re.I)
def display_part(part):
    m = ARTICLE.match(part.strip())
    if not m:
        return part.strip()
    article = m.group(2)
    article = article[0].upper() + article[1:]
    return f"{article}{m.group(1)}" if article.endswith("'") else f"{article} {m.group(1)}"

def names(official):
    parts = [display_part(p) for p in official.split("/")]
    return " / ".join(parts), (parts if len(parts) > 1 else [])

# Coastal tourism regions (not administrative units), so "Costa Blanca" finds the province it lies in
COASTS = {"03": ["Costa Blanca"], "30": ["Costa Cálida"], "29": ["Costa del Sol"], "04": ["Costa de Almería"]}

# Spanish names still in everyday use for provinces whose official name is in another language
EXONYMS = {"48": ["Vizcaya"], "20": ["Guipúzcoa"], "07": ["Baleares", "Islas Baleares"], "17": ["Gerona"], "25": ["Lérida"], "32": ["Orense"], "15": ["La Coruña"]}

out_provinces = []
for code, official in sorted(provinces.items()):
    name, aliases = names(official)
    aliases = aliases + EXONYMS.get(code, [])
    out_provinces.append({"id": f"es-{code}", "ine": code, "officialName": official, "name": name, "aliases": aliases, "coasts": COASTS.get(code, [])})

out_municipalities = []
for ine, official in sorted(municipality_rows.items()):
    cpro, cmun = ine[:2], ine[2:]
    assert cpro in provinces, f"unknown province {cpro}"
    name, aliases = names(official)
    out_municipalities.append({"id": f"es-{cpro}-{cmun}", "ine": cpro + cmun, "provinceId": f"es-{cpro}", "officialName": official.strip(), "name": name, "aliases": aliases})

ids = [m["id"] for m in out_municipalities]
assert len(ids) == len(set(ids)), "duplicate municipality ids"
data = {
    "source": {
        "municipalities": "INE, Relación de municipios y códigos a 1 de enero de 2025 (https://www.ine.es/daco/daco42/codmun/25codmun.xlsx)",
        "provinces": "INE, Relación de provincias con sus códigos (https://www.ine.es/daco/daco42/codmun/cod_provincia.htm)",
    },
    "provinces": out_provinces,
    "municipalities": out_municipalities,
}
with open(out_path, "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write("\n")
per = {}
for m in out_municipalities:
    per[m["provinceId"]] = per.get(m["provinceId"], 0) + 1
print(f"{len(out_provinces)} provinces, {len(out_municipalities)} municipalities; Alicante (es-03): {per.get('es-03')}")
