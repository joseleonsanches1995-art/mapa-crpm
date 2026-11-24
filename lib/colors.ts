/** 21 cores distintas para as unidades BM (CRPM). */
export const CRPM_COLORS: Record<string, string> = {
  CPC: "#1B4F72",
  CPM: "#2874A6",
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
};

export function colorForSigla(sigla: string): string {
  return CRPM_COLORS[sigla] ?? "#95A5A6";
}
