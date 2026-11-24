"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterPanel } from "@/components/FilterPanel";
import { Legend } from "@/components/Legend";
import type { MunicipioCrpm, UnidadeBm } from "@/lib/types";

type Theme = "dark" | "light";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <div className="map-loading">Carregando mapa…</div>,
  }
);

export default function HomePage() {
  const [unidades, setUnidades] = useState<UnidadeBm[]>([]);
  const [municipios, setMunicipios] = useState<MunicipioCrpm[]>([]);
  const [selectedBm, setSelectedBm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [focusIbge, setFocusIbge] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("mapa-crpm-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("mapa-crpm-theme", next);
      return next;
    });
  };

  useEffect(() => {
    fetch("/api/unidades-bm")
      .then((r) => r.json())
      .then((d: { unidades: UnidadeBm[] }) => setUnidades(d.unidades))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const q = selectedBm ? `?bm=${encodeURIComponent(selectedBm)}` : "";
    fetch(`/api/municipios${q}`)
      .then((r) => r.json())
      .then((d: { municipios: MunicipioCrpm[] }) => setMunicipios(d.municipios))
      .catch(console.error);
  }, [selectedBm]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return municipios
      .filter((m) => m.nome.toLowerCase().includes(q))
      .map((m) => ({
        ibgeCode: m.ibgeCode,
        nome: m.nome,
        bmSiglaUi: m.bmSiglaUi,
      }));
  }, [municipios, search]);

  const onFocusHandled = useCallback(() => setFocusIbge(null), []);

  return (
    <main className="shell">
      <div className="sidebar">
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={theme === "light"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
        <FilterPanel
          unidades={unidades}
          selectedBm={selectedBm}
          search={search}
          onSelectBm={setSelectedBm}
          onSearchChange={setSearch}
          suggestions={suggestions}
          onPickMunicipio={(ibge) => {
            setFocusIbge(ibge);
            setSearch("");
          }}
        />
        <Legend
          unidades={unidades}
          municipios={municipios}
          selected={selectedBm}
          onSelect={setSelectedBm}
          onPickMunicipio={(ibge) => setFocusIbge(ibge)}
        />
        <footer className="meta">
          {municipios.length} municípios
          {selectedBm ? " no filtro" : ""} · sigla decreto CRPO em metadados
        </footer>
      </div>
      <div className="map-wrap">
          <MapView
          selectedBm={selectedBm}
          unidades={unidades}
          focusIbge={focusIbge}
          onFocusHandled={onFocusHandled}
          theme={theme}
        />
      </div>
      <style jsx>{`
        .shell {
          display: grid;
          grid-template-columns: minmax(280px, 340px) 1fr;
          height: 100vh;
          background:
            radial-gradient(
              1200px 600px at 10% -10%,
              var(--glow-a),
              transparent 55%
            ),
            radial-gradient(
              900px 500px at 90% 110%,
              var(--glow-b),
              transparent 50%
            ),
            var(--bg);
        }
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px 16px 14px;
          border-right: 1px solid var(--panel-border);
          background: var(--panel);
          backdrop-filter: blur(10px);
          min-height: 0;
          z-index: 2;
        }
        .map-wrap {
          position: relative;
          min-height: 0;
        }
        .theme-toggle {
          align-self: flex-start;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--panel-border);
          background: var(--input-bg);
          color: var(--text);
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          cursor: pointer;
        }
        .theme-toggle:hover {
          background: var(--hover);
        }
        .meta {
          font-size: 0.72rem;
          color: var(--muted);
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid var(--panel-border);
        }
        :global(.map-loading) {
          display: grid;
          place-items: center;
          height: 100%;
          color: var(--muted);
        }
        @media (max-width: 820px) {
          .shell {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            height: 100dvh;
          }
          .sidebar {
            max-height: 46vh;
            border-right: 0;
            border-bottom: 1px solid var(--panel-border);
          }
        }
      `}</style>
    </main>
  );
}
