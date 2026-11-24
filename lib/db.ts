import pg from "pg";
import type { MunicipioCrpm, UnidadeBm } from "./types";
import { listMunicipios, listUnidadesBm } from "./data";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:1234@localhost:5432/mapa_crpm";

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 1500,
    });
  }
  return pool;
}

/** Tenta Postgres; se falhar, usa seed JSON commitado (modo offline). */
export async function fetchUnidadesBm(): Promise<UnidadeBm[]> {
  try {
    const { rows } = await getPool().query<{
      id: number;
      ordem: number;
      tipo: "CPC" | "CPM" | "CRPO";
      sigla: string;
      sigla_exibicao: string;
      nome: string;
      sede_nome: string;
      cor_hex: string;
      qtd: string;
    }>(`
      SELECT ub.id, ub.ordem, ub.tipo, ub.sigla, ub.sigla_exibicao,
             ub.nome, ub.sede_nome, ub.cor_hex,
             COUNT(mub.*)::text AS qtd
      FROM unidade_bm ub
      LEFT JOIN municipio_unidade_bm mub ON mub.unidade_bm_id = ub.id
      GROUP BY ub.id
      ORDER BY ub.ordem
    `);
    return rows.map((r) => ({
      id: r.id,
      ordem: r.ordem,
      tipo: r.tipo,
      sigla: r.sigla,
      siglaExibicao: r.sigla_exibicao,
      nome: r.nome,
      sedeNome: r.sede_nome,
      corHex: r.cor_hex,
      qtdMunicipios: Number(r.qtd),
    }));
  } catch {
    return listUnidadesBm();
  }
}

export async function fetchMunicipios(
  bmSigla?: string | null
): Promise<MunicipioCrpm[]> {
  try {
    const params: string[] = [];
    let where = "";
    if (bmSigla && bmSigla !== "all") {
      params.push(bmSigla);
      where = `WHERE bm_sigla = $1 OR bm_sigla_ui = $1`;
    }
    const { rows } = await getPool().query<{
      ibge_code: string;
      nome: string;
      bm_sigla: string;
      bm_sigla_ui: string;
      bm_nome: string;
      bm_sede: string;
      bm_cor: string;
      bm_tipo: string;
      unidade_bm_id: number;
    }>(
      `SELECT ibge_code, nome, bm_sigla, bm_sigla_ui, bm_nome, bm_sede, bm_cor, bm_tipo, unidade_bm_id
       FROM v_municipio_crpm ${where}
       ORDER BY nome`,
      params
    );
    return rows.map((r) => ({
      ibgeCode: r.ibge_code,
      nome: r.nome,
      unidadeBmId: r.unidade_bm_id,
      bmSigla: r.bm_sigla,
      bmSiglaUi: r.bm_sigla_ui,
      bmNome: r.bm_nome,
      bmSede: r.bm_sede,
      bmCor: r.bm_cor,
      bmTipo: r.bm_tipo,
    }));
  } catch {
    return listMunicipios(bmSigla);
  }
}
