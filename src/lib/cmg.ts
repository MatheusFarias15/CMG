export const AREAS = {
  climatizacao: "Climatização (HVAC)",
  eletrica: "Elétrica",
  manutencao_predial: "Manutenção predial",
  operacao_sistemas: "Operação de sistemas",
} as const;

export const TYPES = {
  ronda_pavimentos: "Ronda de Pavimentos",
  ajuste_vag: "Ajuste de VAG",
  manutencao_preventiva: "Manutenção Preventiva",
} as const;

export const STATUS = {
  em_andamento: "Em andamento",
  concluida: "Concluída",
} as const;

export type AreaKey = keyof typeof AREAS;
export type TypeKey = keyof typeof TYPES;
export type StatusKey = keyof typeof STATUS;

export type Activity = {
  id: string;
  title: string;
  area: AreaKey;
  activity_type: TypeKey;
  location: string | null;
  description: string | null;
  scheduled_date: string;
  status: StatusKey;
  assigned_to: string;
  created_by: string | null;
  form_data: Record<string, string>;
  completed_at: string | null;
  created_at: string;
};

export type ActivityPhoto = {
  id: string;
  activity_id: string;
  storage_path: string;
  caption: string | null;
  section: string | null;
  created_at: string;
};

export const PHOTO_MAX_BYTES = 50 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"];

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return date.toLocaleDateString("pt-BR");
};

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

export const FORM_FIELDS: Record<
  TypeKey,
  { key: string; label: string; hint?: string; long?: boolean }[]
> = {
  ronda_pavimentos: [
    { key: "pavimento", label: "Pavimento / andar" },
    { key: "temperatura", label: "Temperatura registrada (°C)" },
    { key: "lado_a", label: "Condições do Lado A", long: true },
    { key: "lado_b", label: "Condições do Lado B", long: true },
    { key: "observacoes", label: "Observações gerais", long: true },
  ],
  ajuste_vag: [
    { key: "equipamento", label: "Equipamento / VAG" },
    { key: "antes", label: "Antes — situação encontrada", long: true },
    { key: "acao", label: "Ação realizada", long: true },
    { key: "depois", label: "Depois — resultado obtido", long: true },
  ],
  manutencao_preventiva: [
    { key: "introducao", label: "Introdução", long: true },
    { key: "situacao_problema", label: "Situação-problema", long: true },
    { key: "acoes", label: "Ações realizadas", long: true },
    { key: "conclusao", label: "Conclusão", long: true },
  ],
};
