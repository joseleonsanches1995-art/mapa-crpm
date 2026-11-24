"use client";

import type { UnidadeBm } from "@/lib/types";

type Props = {
  unidades: UnidadeBm[];
  selectedBm: string | null;
  search: string;
  onSelectBm: (sigla: string | null) => void;
  onSearchChange: (value: string) => void;
  onPickMunicipio: (ibgeCode: string, nome: string) => void;
  suggestions: { ibgeCode: string; nome: string; bmSiglaUi: string }[];
};

export function FilterPanel({
  unidades,
  selectedBm,
  search,
  onSelectBm,
  onSearchChange,
  onPickMunicipio,
  suggestions,
}: Props) {
  return (
    <aside className="panel">
      <header>
        <p className="eyebrow">Brigada Militar · RS</p>
        <h1>CRPM</h1>
        <p className="sub">
          Circunscrições territoriais — Decreto nº 57.060/2023
        </p>
      </header>

      <label className="field">
        <span>Unidade CRPM</span>
        <select
          value={selectedBm ?? "all"}
          onChange={(e) =>
            onSelectBm(e.target.value === "all" ? null : e.target.value)
          }
        >
          <option value="all">Todas ({unidades.length})</option>
          {unidades.map((u) => (
            <option key={u.sigla} value={u.sigla}>
              {u.siglaExibicao} — {u.sedeNome}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Buscar município</span>
        <input
          type="search"
          placeholder="Ex.: Gramado, Pelotas…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
      </label>

      {search.trim().length >= 2 && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.slice(0, 8).map((s) => (
            <li key={s.ibgeCode}>
              <button
                type="button"
                onClick={() => onPickMunicipio(s.ibgeCode, s.nome)}
              >
                <strong>{s.nome}</strong>
                <span>{s.bmSiglaUi}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        header h1 {
          margin: 2px 0 4px;
          font-size: 2rem;
          letter-spacing: 0.04em;
          font-weight: 700;
          line-height: 1;
        }
        .eyebrow {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
        }
        .sub {
          margin: 0;
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.35;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted);
        }
        select,
        input {
          width: 100%;
          padding: 9px 10px;
          border-radius: 8px;
          border: 1px solid var(--panel-border);
          background: var(--input-bg);
          color: var(--text);
          text-transform: none;
          letter-spacing: normal;
          font-size: 0.92rem;
        }
        select:focus,
        input:focus {
          outline: 2px solid rgba(111, 191, 115, 0.45);
          outline-offset: 1px;
        }
        .suggestions {
          list-style: none;
          margin: -4px 0 0;
          padding: 0;
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--suggestion-bg);
        }
        .suggestions button {
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--row-border);
          color: var(--text);
          cursor: pointer;
          text-align: left;
        }
        .suggestions li:last-child button {
          border-bottom: 0;
        }
        .suggestions button:hover {
          background: rgba(111, 191, 115, 0.12);
        }
        .suggestions span {
          color: var(--muted);
          font-size: 0.8rem;
        }
      `}</style>
    </aside>
  );
}
