/**
 * Gera seed JSON + SQL e GeoJSON enriquecido a partir do decreto estruturado + IBGE.
 *
 * Fontes:
 * - Decreto: ../../internal/decreto-57-060-structured.json (ou cópia em data/)
 * - Malha: IBGE API v3 (qualidade intermediária) — UF 43
 * - Nomes: IBGE localidades API
 */
import fs from "node:fs";
import path from "node:path";
import { CRPM_COLORS } from "../lib/colors";
import { NAME_ALIASES, normalizeName } from "../lib/normalize";
import type { CrpmSeed, MunicipioCrpm, UnidadeBm } from "../lib/types";

const ROOT = path.resolve(__dirname, "..");
const STORE_INTERNAL = path.resolve(ROOT, "../../internal");
const DECRETO_SRC = path.join(STORE_INTERNAL, "decreto-57-060-structured.json");
const OUT_SEED_JSON = path.join(ROOT, "data/seed/crpm-seed.json");
const OUT_SEED_SQL = path.join(ROOT, "data/seed/01_schema.sql");
const OUT_SEED_DATA = path.join(ROOT, "data/seed/02_seed.sql");
const OUT_GEO = path.join(ROOT, "public/geo/rs-municipios.geojson");
const OUT_IBGE_LIST = path.join(ROOT, "data/seed/ibge-municipios-rs.json");

type DecretoUnidade = {
  ordem: number;
  nome: string;
  sigla: string;
  sigla_moderna: string;
  sede: string;
  tipo: "CPC" | "CPM" | "CRPO";
  municipios: string[];
  qtd_municipios: number;
};

type DecretoJson = {
  unidades_bm: DecretoUnidade[];
};

type IbgeMun = { id: number; nome: string };

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

async function main() {
  if (!fs.existsSync(DECRETO_SRC)) {
    throw new Error(`Decreto JSON não encontrado: ${DECRETO_SRC}`);
  }
  const decreto = JSON.parse(fs.readFileSync(DECRETO_SRC, "utf8")) as DecretoJson;

  console.log("Baixando lista de municípios IBGE (UF 43)…");
  const ibgeList = await fetchJson<IbgeMun[]>(
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados/43/municipios"
  );
  fs.mkdirSync(path.dirname(OUT_IBGE_LIST), { recursive: true });
  fs.writeFileSync(OUT_IBGE_LIST, JSON.stringify(ibgeList, null, 2));

  type GeoFeature = {
    type: "Feature";
    properties: Record<string, unknown> | null;
    geometry: unknown;
  };
  type GeoFC = { type: "FeatureCollection"; features: GeoFeature[] };

  console.log("Baixando malha municipal IBGE (qualidade intermediária)…");
  const geo = await fetchJson<GeoFC>(
    "https://servicodados.ibge.gov.br/api/v3/malhas/estados/43?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio"
  );

  const byNorm = new Map<string, IbgeMun>();
  for (const m of ibgeList) {
    byNorm.set(normalizeName(m.nome), m);
  }

  const resolveIbge = (nomeDecreto: string): IbgeMun | undefined => {
    const n = normalizeName(nomeDecreto);
    const aliased = NAME_ALIASES[n] ?? n;
    return byNorm.get(aliased) ?? byNorm.get(n);
  };

  const unidadesBm: UnidadeBm[] = decreto.unidades_bm.map((u) => ({
    id: u.ordem,
    ordem: u.ordem,
    tipo: u.tipo,
    sigla: u.sigla,
    siglaExibicao: u.sigla_moderna.startsWith("CRPO/")
      ? u.sigla_moderna.replace("CRPO/", "CRPM/")
      : u.sigla_moderna.startsWith("CRPM/")
        ? u.sigla_moderna
        : u.tipo === "CRPO"
          ? u.sigla.replace("CRPO/", "CRPM/")
          : u.sigla,
    nome: u.nome.replace(
      "Comando Regional de Polícia Ostensiva",
      "Comando Regional de Polícia Militar"
    ),
    sedeNome: u.sede,
    corHex: CRPM_COLORS[u.sigla] ?? "#95A5A6",
    qtdMunicipios: u.qtd_municipios,
  }));

  // Fix siglaExibicao for CRPO units using sigla_moderna from source
  for (let i = 0; i < decreto.unidades_bm.length; i++) {
    const src = decreto.unidades_bm[i];
    const ui = src.sigla_moderna;
    unidadesBm[i].siglaExibicao = ui.startsWith("CRPO/")
      ? ui.replace(/^CRPO\//, "CRPM/")
      : ui;
  }

  const municipios: MunicipioCrpm[] = [];
  const unmatched: string[] = [];
  const seenIbge = new Set<string>();

  for (const u of decreto.unidades_bm) {
    const ub = unidadesBm.find((x) => x.ordem === u.ordem)!;
    for (const nome of u.municipios) {
      const ibge = resolveIbge(nome);
      if (!ibge) {
        unmatched.push(`${u.sigla}: ${nome}`);
        continue;
      }
      const code = String(ibge.id);
      if (seenIbge.has(code)) {
        console.warn(`Duplicata IBGE ${code} (${nome}) em ${u.sigla}`);
        continue;
      }
      seenIbge.add(code);
      municipios.push({
        ibgeCode: code,
        nome: ibge.nome,
        unidadeBmId: ub.id,
        bmSigla: ub.sigla,
        bmSiglaUi: ub.siglaExibicao,
        bmNome: ub.nome,
        bmSede: ub.sedeNome,
        bmCor: ub.corHex,
        bmTipo: ub.tipo,
      });
    }
  }

  if (unmatched.length) {
    console.error("Municípios sem match IBGE:", unmatched);
    throw new Error(`${unmatched.length} municípios sem match`);
  }

  const missingFromIbge = ibgeList.filter((m) => !seenIbge.has(String(m.id)));
  if (missingFromIbge.length) {
    console.warn(
      "Municípios IBGE sem vínculo no decreto:",
      missingFromIbge.map((m) => m.nome)
    );
  }

  console.log(
    `Match OK: ${municipios.length}/497 municípios, ${unidadesBm.length} unidades BM`
  );

  const seed: CrpmSeed = {
    decreto: {
      numero: "57.060",
      dataPublicacao: "2023-06-15",
      doeNumero: "115",
      doeData: "2023-06-16",
      titulo:
        "Institui as Regionais Integradas de Segurança Pública e republica as circunscrições territoriais da Polícia Civil e da Brigada Militar",
    },
    unidadesBm,
    municipios,
  };

  fs.mkdirSync(path.dirname(OUT_SEED_JSON), { recursive: true });
  fs.writeFileSync(OUT_SEED_JSON, JSON.stringify(seed, null, 2));
  console.log("Wrote", OUT_SEED_JSON);

  // Enrich GeoJSON
  const attrsByCode = new Map(municipios.map((m) => [m.ibgeCode, m]));
  const nameByCode = new Map(ibgeList.map((m) => [String(m.id), m.nome]));

  const enriched = {
    type: "FeatureCollection" as const,
    features: geo.features.map((f) => {
      const props = f.properties ?? {};
      const code = String(props.codarea ?? props.id ?? "");
      const attr = attrsByCode.get(code);
      const nome = nameByCode.get(code) ?? attr?.nome ?? code;
      return {
        type: "Feature" as const,
        id: code,
        properties: {
          id: code,
          ibge_code: code,
          name: nome,
          nome,
          bm_sigla: attr?.bmSigla ?? null,
          bm_sigla_ui: attr?.bmSiglaUi ?? null,
          bm_nome: attr?.bmNome ?? null,
          bm_sede: attr?.bmSede ?? null,
          bm_cor: attr?.bmCor ?? "#CCCCCC",
          bm_tipo: attr?.bmTipo ?? null,
          unidade_bm_id: attr?.unidadeBmId ?? null,
        },
        geometry: f.geometry,
      };
    }),
  };

  fs.mkdirSync(path.dirname(OUT_GEO), { recursive: true });
  fs.writeFileSync(OUT_GEO, JSON.stringify(enriched));
  console.log("Wrote", OUT_GEO, `(${enriched.features.length} features)`);

  writeSchemaSql(OUT_SEED_SQL);
  writeDataSql(OUT_SEED_DATA, seed);
  console.log("Wrote", OUT_SEED_SQL, "and", OUT_SEED_DATA);
}

function writeSchemaSql(outPath: string) {
  const sql = `-- Schema mapa_crpm (MVP BM / CRPM — sem PostGIS, sem DPR/PC)
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
`;
  fs.writeFileSync(outPath, sql);
}

function writeDataSql(outPath: string, seed: CrpmSeed) {
  const lines: string[] = [];
  lines.push("-- Seed BM/CRPM — Decreto 57.060/2023");
  lines.push("BEGIN;");
  lines.push("TRUNCATE municipio_unidade_bm, municipio, unidade_bm, decreto RESTART IDENTITY CASCADE;");
  lines.push("");
  lines.push(
    `INSERT INTO decreto (numero, data_publicacao, doe_numero, doe_data, titulo) VALUES ('${sqlEscape(seed.decreto.numero)}', '${seed.decreto.dataPublicacao}', '${sqlEscape(seed.decreto.doeNumero)}', '${seed.decreto.doeData}', '${sqlEscape(seed.decreto.titulo)}');`
  );
  lines.push("");

  for (const u of seed.unidadesBm) {
    lines.push(
      `INSERT INTO unidade_bm (id, decreto_id, ordem, tipo, sigla, sigla_exibicao, nome, sede_nome, cor_hex) VALUES (${u.id}, 1, ${u.ordem}, '${u.tipo}', '${sqlEscape(u.sigla)}', '${sqlEscape(u.siglaExibicao)}', '${sqlEscape(u.nome)}', '${sqlEscape(u.sedeNome)}', '${u.corHex}');`
    );
  }
  lines.push("");
  lines.push(
    `SELECT setval(pg_get_serial_sequence('unidade_bm','id'), (SELECT MAX(id) FROM unidade_bm));`
  );
  lines.push("");

  for (const m of seed.municipios) {
    const norm = normalizeName(m.nome);
    lines.push(
      `INSERT INTO municipio (ibge_code, nome, nome_normalizado, uf) VALUES ('${m.ibgeCode}', '${sqlEscape(m.nome)}', '${sqlEscape(norm)}', 'RS');`
    );
  }
  lines.push("");

  for (const m of seed.municipios) {
    lines.push(
      `INSERT INTO municipio_unidade_bm (municipio_ibge, unidade_bm_id, decreto_id) VALUES ('${m.ibgeCode}', ${m.unidadeBmId}, 1);`
    );
  }

  lines.push("COMMIT;");
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
