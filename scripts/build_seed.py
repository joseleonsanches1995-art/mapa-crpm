#!/usr/bin/env python3
"""Gera seed JSON + SQL e GeoJSON enriquecido (decreto + IBGE)."""
from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DECRETO_SRC = ROOT.parents[1] / "internal" / "decreto-57-060-structured.json"
OUT_SEED_JSON = ROOT / "data" / "seed" / "crpm-seed.json"
OUT_SCHEMA = ROOT / "data" / "seed" / "01_schema.sql"
OUT_DATA = ROOT / "data" / "seed" / "02_seed.sql"
OUT_GEO = ROOT / "public" / "geo" / "rs-municipios.geojson"
OUT_IBGE = ROOT / "data" / "seed" / "ibge-municipios-rs.json"

CRPM_COLORS = {
    "CPC": "#1B4F72",
    "CPM": "#2874A6",
    "CRPO/VRS": "#117A65",
    "CRPO/CS": "#1E8449",
    "CRPO/C": "#196F3D",
    "CRPO/Ser": "#7D3C98",
    "CRPO/P": "#6C3483",
    "CRPO/FN": "#A04000",
    "CRPO/FO": "#935116",
    "CRPO/S": "#1A5276",
    "CRPO/N": "#148F77",
    "CRPO/NE": "#B9770E",
    "CRPO/L": "#1ABC9C",
    "CRPO/EO": "#922B21",
    "CRPO/Mis": "#C0392B",
    "CRPO/H": "#8E44AD",
    "CRPO/VC": "#2980B9",
    "CRPO/VRP": "#27AE60",
    "CRPO/VT": "#D68910",
    "CRPO/AJ": "#5D6D7E",
    "CRPO/DJ": "#E67E22",
}

NAME_ALIASES = {
    # normalize(decreto) -> normalize(ibge)
}


def normalize_name(name: str) -> str:
    n = unicodedata.normalize("NFD", name)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = n.lower()
    n = n.replace("'", "").replace("`", "").replace("'", "")
    n = re.sub(r"[^a-z0-9]+", " ", n)
    return re.sub(r"\s+", " ", n).strip()


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "mapa-crpm-seed/0.1"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def sigla_ui(sigla: str, sigla_moderna: str) -> str:
    ui = sigla_moderna or sigla
    if ui.startswith("CRPO/"):
        return "CRPM/" + ui[len("CRPO/") :]
    return ui


def write_schema(path: Path) -> None:
    path.write_text(
        """-- Schema mapa_crpm (MVP BM / CRPM — sem PostGIS, sem DPR/PC)
-- Decreto 57.060/2023

CREATE TABLE IF NOT EXISTS decreto (
  id              smallserial PRIMARY KEY,
  numero          text NOT NULL UNIQUE,
  data_publicacao date NOT NULL,
  doe_numero      text,
  doe_data        date,
  titulo          text NOT NULL
);

CREATE TABLE IF NOT EXISTS unidade_bm (
  id              serial PRIMARY KEY,
  decreto_id      smallint NOT NULL REFERENCES decreto(id),
  ordem           smallint NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('CPC','CPM','CRPO')),
  sigla           text NOT NULL UNIQUE,
  sigla_exibicao  text NOT NULL,
  nome            text NOT NULL,
  sede_nome       text NOT NULL,
  cor_hex         char(7) NOT NULL,
  UNIQUE (decreto_id, ordem)
);

CREATE TABLE IF NOT EXISTS municipio (
  ibge_code        char(7) PRIMARY KEY,
  nome             text NOT NULL,
  nome_normalizado text NOT NULL,
  uf               char(2) NOT NULL DEFAULT 'RS'
);

CREATE INDEX IF NOT EXISTS municipio_nome_norm_idx ON municipio (nome_normalizado);

CREATE TABLE IF NOT EXISTS municipio_unidade_bm (
  municipio_ibge  char(7) NOT NULL REFERENCES municipio(ibge_code),
  unidade_bm_id   int NOT NULL REFERENCES unidade_bm(id),
  decreto_id      smallint NOT NULL REFERENCES decreto(id),
  PRIMARY KEY (decreto_id, municipio_ibge)
);

CREATE OR REPLACE VIEW v_municipio_crpm AS
SELECT
  m.ibge_code,
  m.nome,
  ub.sigla            AS bm_sigla,
  ub.sigla_exibicao   AS bm_sigla_ui,
  ub.nome             AS bm_nome,
  ub.tipo             AS bm_tipo,
  ub.sede_nome        AS bm_sede,
  ub.cor_hex          AS bm_cor,
  ub.id               AS unidade_bm_id
FROM municipio m
JOIN municipio_unidade_bm mub ON mub.municipio_ibge = m.ibge_code
JOIN unidade_bm ub ON ub.id = mub.unidade_bm_id;
""",
        encoding="utf-8",
    )


def main() -> None:
    if not DECRETO_SRC.exists():
        raise SystemExit(f"Decreto JSON não encontrado: {DECRETO_SRC}")

    decreto = json.loads(DECRETO_SRC.read_text(encoding="utf-8"))

    print("Baixando lista de municípios IBGE (UF 43)…")
    ibge_list = fetch_json(
        "https://servicodados.ibge.gov.br/api/v1/localidades/estados/43/municipios"
    )
    OUT_IBGE.parent.mkdir(parents=True, exist_ok=True)
    OUT_IBGE.write_text(json.dumps(ibge_list, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Baixando malha municipal IBGE (qualidade intermediária)…")
    geo = fetch_json(
        "https://servicodados.ibge.gov.br/api/v3/malhas/estados/43"
        "?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio"
    )

    by_norm = {normalize_name(m["nome"]): m for m in ibge_list}

    unidades_bm = []
    for u in decreto["unidades_bm"]:
        nome = u["nome"].replace(
            "Comando Regional de Polícia Ostensiva",
            "Comando Regional de Polícia Militar",
        )
        unidades_bm.append(
            {
                "id": u["ordem"],
                "ordem": u["ordem"],
                "tipo": u["tipo"],
                "sigla": u["sigla"],
                "siglaExibicao": sigla_ui(u["sigla"], u.get("sigla_moderna", u["sigla"])),
                "nome": nome,
                "sedeNome": u["sede"],
                "corHex": CRPM_COLORS.get(u["sigla"], "#95A5A6"),
                "qtdMunicipios": u["qtd_municipios"],
            }
        )

    municipios = []
    unmatched = []
    seen = set()

    for u in decreto["unidades_bm"]:
        ub = next(x for x in unidades_bm if x["ordem"] == u["ordem"])
        for nome in u["municipios"]:
            key = normalize_name(nome)
            key = NAME_ALIASES.get(key, key)
            ibge = by_norm.get(key)
            if not ibge:
                unmatched.append(f"{u['sigla']}: {nome}")
                continue
            code = str(ibge["id"])
            if code in seen:
                print(f"Aviso: duplicata IBGE {code} ({nome}) em {u['sigla']}")
                continue
            seen.add(code)
            municipios.append(
                {
                    "ibgeCode": code,
                    "nome": ibge["nome"],
                    "unidadeBmId": ub["id"],
                    "bmSigla": ub["sigla"],
                    "bmSiglaUi": ub["siglaExibicao"],
                    "bmNome": ub["nome"],
                    "bmSede": ub["sedeNome"],
                    "bmCor": ub["corHex"],
                    "bmTipo": ub["tipo"],
                }
            )

    if unmatched:
        raise SystemExit(f"Municípios sem match IBGE ({len(unmatched)}): {unmatched}")

    missing = [m for m in ibge_list if str(m["id"]) not in seen]
    if missing:
        print("Municípios IBGE sem vínculo:", [m["nome"] for m in missing])

    print(f"Match OK: {len(municipios)}/497 municípios, {len(unidades_bm)} unidades BM")

    seed = {
        "decreto": {
            "numero": "57.060",
            "dataPublicacao": "2023-06-15",
            "doeNumero": "115",
            "doeData": "2023-06-16",
            "titulo": (
                "Institui as Regionais Integradas de Segurança Pública e republica "
                "as circunscrições territoriais da Polícia Civil e da Brigada Militar"
            ),
        },
        "unidadesBm": unidades_bm,
        "municipios": municipios,
    }

    OUT_SEED_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_SEED_JSON.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", OUT_SEED_JSON)

    attrs = {m["ibgeCode"]: m for m in municipios}
    names = {str(m["id"]): m["nome"] for m in ibge_list}
    enriched = {"type": "FeatureCollection", "features": []}
    for f in geo["features"]:
        props = f.get("properties") or {}
        code = str(props.get("codarea") or props.get("id") or "")
        attr = attrs.get(code)
        nome = names.get(code) or (attr["nome"] if attr else code)
        enriched["features"].append(
            {
                "type": "Feature",
                "id": code,
                "properties": {
                    "id": code,
                    "ibge_code": code,
                    "name": nome,
                    "nome": nome,
                    "bm_sigla": attr["bmSigla"] if attr else None,
                    "bm_sigla_ui": attr["bmSiglaUi"] if attr else None,
                    "bm_nome": attr["bmNome"] if attr else None,
                    "bm_sede": attr["bmSede"] if attr else None,
                    "bm_cor": attr["bmCor"] if attr else "#CCCCCC",
                    "bm_tipo": attr["bmTipo"] if attr else None,
                    "unidade_bm_id": attr["unidadeBmId"] if attr else None,
                },
                "geometry": f["geometry"],
            }
        )

    OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEO.write_text(json.dumps(enriched, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Wrote", OUT_GEO, f"({len(enriched['features'])} features)")

    write_schema(OUT_SCHEMA)

    lines = [
        "-- Seed BM/CRPM — Decreto 57.060/2023",
        "BEGIN;",
        "TRUNCATE municipio_unidade_bm, municipio, unidade_bm, decreto RESTART IDENTITY CASCADE;",
        "",
        (
            "INSERT INTO decreto (numero, data_publicacao, doe_numero, doe_data, titulo) VALUES "
            f"('{sql_escape(seed['decreto']['numero'])}', '{seed['decreto']['dataPublicacao']}', "
            f"'{sql_escape(seed['decreto']['doeNumero'])}', '{seed['decreto']['doeData']}', "
            f"'{sql_escape(seed['decreto']['titulo'])}');"
        ),
        "",
    ]
    for u in unidades_bm:
        lines.append(
            "INSERT INTO unidade_bm (id, decreto_id, ordem, tipo, sigla, sigla_exibicao, nome, sede_nome, cor_hex) "
            f"VALUES ({u['id']}, 1, {u['ordem']}, '{u['tipo']}', '{sql_escape(u['sigla'])}', "
            f"'{sql_escape(u['siglaExibicao'])}', '{sql_escape(u['nome'])}', "
            f"'{sql_escape(u['sedeNome'])}', '{u['corHex']}');"
        )
    lines += [
        "",
        "SELECT setval(pg_get_serial_sequence('unidade_bm','id'), (SELECT MAX(id) FROM unidade_bm));",
        "",
    ]
    for m in municipios:
        lines.append(
            "INSERT INTO municipio (ibge_code, nome, nome_normalizado, uf) VALUES "
            f"('{m['ibgeCode']}', '{sql_escape(m['nome'])}', '{sql_escape(normalize_name(m['nome']))}', 'RS');"
        )
    lines.append("")
    for m in municipios:
        lines.append(
            "INSERT INTO municipio_unidade_bm (municipio_ibge, unidade_bm_id, decreto_id) VALUES "
            f"('{m['ibgeCode']}', {m['unidadeBmId']}, 1);"
        )
    lines.append("COMMIT;")
    OUT_DATA.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote", OUT_SCHEMA, "and", OUT_DATA)


if __name__ == "__main__":
    main()
