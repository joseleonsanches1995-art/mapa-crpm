import fs from "node:fs";
import path from "node:path";
import type { CrpmSeed, MunicipioCrpm, UnidadeBm } from "./types";

const SEED_PATH = path.join(process.cwd(), "data/seed/crpm-seed.json");

let cached: CrpmSeed | null = null;

export function loadSeed(): CrpmSeed {
  if (cached) return cached;
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  cached = JSON.parse(raw) as CrpmSeed;
  return cached;
}

export function listUnidadesBm(): UnidadeBm[] {
  return loadSeed().unidadesBm;
}

export function listMunicipios(bmSigla?: string | null): MunicipioCrpm[] {
  const all = loadSeed().municipios;
  if (!bmSigla || bmSigla === "all") return all;
  return all.filter((m) => m.bmSigla === bmSigla || m.bmSiglaUi === bmSigla);
}

export function getMunicipio(ibgeCode: string): MunicipioCrpm | undefined {
  return loadSeed().municipios.find((m) => m.ibgeCode === ibgeCode);
}
