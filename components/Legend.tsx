"use client";

import { useEffect, useRef } from "react";
import type { MunicipioCrpm, UnidadeBm } from "@/lib/types";

type Props = {
  unidades: UnidadeBm[];
  municipios: MunicipioCrpm[];
  selected: string | null;
  onSelect: (sigla: string | null) => void;
  onPickMunicipio: (ibgeCode: string) => void;
};

export function Legend({
  unidades,
  municipios,
  selected,
  onSelect,
  onPickMunicipio,
}: Props) {
  const activeRef = useRef<HTMLLIElement>(null);
  const cidades = municipios.filter(
    (m) => m.bmSigla === selected || m.bmSiglaUi === selected
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="legend">
      <h2>Legenda CRPM</h2>
      <ul>
        {unidades.map((u) => {
          const active = selected === u.sigla;
          const dimmed = selected !== null && !active;
          return (
            <li key={u.sigla} ref={active ? activeRef : undefined}>
              <button
                type="button"
                className={active ? "active" : dimmed ? "dimmed" : ""}
                aria-expanded={active}
                onClick={() => onSelect(active ? null : u.sigla)}
                title={`${u.nome} — sede: ${u.sedeNome}`}
              >
                <span
                  className="swatch"
                  style={{ background: u.corHex }}
                  aria-hidden
                />
                <span className="label">{u.siglaExibicao}</span>
                <span className="count">{u.qtdMunicipios}</span>
              </button>
              {active && (
                <ul className="cities" aria-label={`Municípios de ${u.siglaExibicao}`}>
                  {cidades.length === 0 ? (
                    <li className="empty">Carregando municípios…</li>
                  ) : (
                    cidades.map((m) => (
                      <li key={m.ibgeCode}>
                        <button
                          type="button"
                          onClick={() => onPickMunicipio(m.ibgeCode)}
                        >
                          {m.nome}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <style jsx>{`
        .legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
          flex: 1;
        }
        h2 {
          margin: 0;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 600;
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-height: 0;
        }
        button {
          width: 100%;
          display: grid;
          grid-template-columns: 14px 1fr auto;
          gap: 8px;
          align-items: center;
          background: transparent;
          border: 0;
          color: var(--text);
          padding: 5px 6px;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
        }
        button:hover {
          background: var(--hover);
        }
        button.active {
          background: rgba(111, 191, 115, 0.16);
        }
        button.dimmed {
          opacity: 0.38;
        }
        .swatch {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid var(--swatch-border);
        }
        .label {
          font-size: 0.82rem;
          font-weight: 560;
        }
        .count {
          font-size: 0.72rem;
          color: var(--muted);
        }
        .cities {
          list-style: none;
          margin: 2px 0 6px 20px;
          padding: 4px 0;
          max-height: 240px;
          overflow: auto;
          border-left: 2px solid var(--panel-border);
        }
        .cities button {
          display: block;
          width: 100%;
          grid-template-columns: none;
          padding: 4px 8px;
          font-size: 0.8rem;
          font-weight: 450;
        }
        .empty {
          padding: 4px 8px;
          font-size: 0.78rem;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
