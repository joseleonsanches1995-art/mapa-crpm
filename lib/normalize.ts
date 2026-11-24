/** Normaliza nome de município para match decreto ↔ IBGE. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Aliases conhecidos (ortografia do PDF vs IBGE). */
export const NAME_ALIASES: Record<string, string> = {
  // chave = normalizeName(nome no decreto) → valor = normalizeName(nome IBGE)
  tamadare: "tamandare", // se aparecer no PDF
  "santana do livramento": "santana do livramento",
  "nao me toque": "nao me toque",
};
