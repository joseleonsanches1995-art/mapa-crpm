-- Schema mapa_crpm (MVP BM / CRPM — sem PostGIS, sem DPR/PC)
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
