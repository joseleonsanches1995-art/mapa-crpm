# Mapa CRPM — Brigada Militar (RS)

Mapa interativo das **21 circunscrições CRPM** (Brigada Militar) do Rio Grande do Sul, conforme o **Decreto nº 57.060/2023**.

- Rótulo de UI: **CRPM** (no decreto a sigla é CRPO; fica só em metadados)
- MVP: só BM (sem PC/DPR, sem AISP, sem PostGIS)
- Geometria: GeoJSON estático no front (IBGE)

## Pré-requisitos

- Node.js 18+
- (Opcional) PostgreSQL em `localhost:5432`, user `postgres`, senha `1234`

> **Nota:** rode `npm install` em disco local (não copie `node_modules` para o Project store em FUSE — o `rename` do npm pode falhar com `ENOSYS`).

## Como rodar (modo offline / sem Postgres)

O app já traz `data/seed/crpm-seed.json` e `public/geo/rs-municipios.geojson`. As APIs leem o JSON se o banco não estiver disponível.

```bash
cd apps/mapa-crpm   # ou copie a pasta para um disco local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Banco Postgres (opcional)

```bash
# criar banco
createdb -h localhost -U postgres mapa_crpm
# ou:
psql -h localhost -U postgres -c "CREATE DATABASE mapa_crpm;"

# schema + seed
psql -h localhost -U postgres -d mapa_crpm -f data/seed/01_schema.sql
psql -h localhost -U postgres -d mapa_crpm -f data/seed/02_seed.sql

# ou via script Node (DATABASE_URL opcional)
npm run seed:db
```

Variável padrão:

```
DATABASE_URL=postgres://postgres:1234@localhost:5432/mapa_crpm
```

## Regenerar seed / GeoJSON

Requer rede (APIs do IBGE):

```bash
python3 scripts/build_seed.py
# ou, com deps instaladas:
npm run seed:json
```

Fontes IBGE usadas:

- Nomes/códigos: `https://servicodados.ibge.gov.br/api/v1/localidades/estados/43/municipios`
- Malha municipal (UF 43, qualidade intermediária): `https://servicodados.ibge.gov.br/api/v3/malhas/estados/43?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio`
- Circunscrições: `internal/decreto-57-060-structured.json` (Project store)

## Funcionalidades do MVP

1. Mapa MapLibre com 497 municípios coloridos por CRPM  
2. Filtro por unidade (ou “Todas”)  
3. Legenda clicável (21 cores)  
4. Busca de município + zoom  
5. Tooltip no hover: nome + CRPM (+ sede)

## Estrutura

```
app/                 # Next.js App Router + APIs
components/          # MapView, FilterPanel, Legend
data/seed/           # schema SQL, seed SQL, JSON offline
lib/                 # cores, tipos, leitura seed/DB
public/geo/          # rs-municipios.geojson enriquecido
scripts/             # build_seed.py / build-seed.ts / seed-db.ts
```
