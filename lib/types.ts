export type UnidadeBm = {
  id: number;
  ordem: number;
  tipo: "CPC" | "CPM" | "CRPO";
  /** Sigla canônica do decreto (CRPO/…). */
  sigla: string;
  /** Rótulo de UI (CRPM/…). */
  siglaExibicao: string;
  nome: string;
  sedeNome: string;
  corHex: string;
  qtdMunicipios: number;
};

export type MunicipioCrpm = {
  ibgeCode: string;
  nome: string;
  unidadeBmId: number;
  bmSigla: string;
  bmSiglaUi: string;
  bmNome: string;
  bmSede: string;
  bmCor: string;
  bmTipo: string;
};

export type CrpmSeed = {
  decreto: {
    numero: string;
    dataPublicacao: string;
    doeNumero: string;
    doeData: string;
    titulo: string;
  };
  unidadesBm: UnidadeBm[];
  municipios: MunicipioCrpm[];
};
