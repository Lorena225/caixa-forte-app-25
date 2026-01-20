import { LucideIcon } from 'lucide-react';

export type KPIStatus = 'success' | 'warning' | 'danger';
export type AlertUrgency = 'alta' | 'media' | 'baixa';
export type AlertType = 
  | 'contas_vencidas_tesouraria'
  | 'contas_receber_vencidas'
  | 'contas_pagar_vencidas'
  | 'orcamento_estourado'
  | 'fluxo_negativo'
  | 'permissoes_pendentes';

export interface KPICard {
  titulo: string;
  valor: number;
  valorFormatado: string;
  variacao: number; // percentual de variação vs período anterior
  variacaoLabel?: string;
  status: KPIStatus;
  cor: string;
  icon?: LucideIcon;
}

export interface ContasResumo {
  total: number;
  vencidoPercentual: number;
  vencidoValor: number;
  aVencerPercentual: number;
  aVencerValor: number;
  quantidade: number;
  quantidadeVencida: number;
}

export interface ExecucaoOrcamentaria {
  orcado: number;
  realizado: number;
  percentual: number;
  variacao: number;
  status: KPIStatus;
}

export interface DashboardMetrics {
  saldoCaixa: KPICard;
  contasReceber: KPICard & { detalhe: ContasResumo };
  contasPagar: KPICard & { detalhe: ContasResumo };
  execucaoOrcamento: KPICard & { detalhe: ExecucaoOrcamentaria };
  lucroMes: KPICard;
  margemLiquida: KPICard;
}

export interface FluxoProjetado {
  data: string; // ISO date string
  dataFormatada: string;
  inflow: number;
  outflow: number;
  saldo: number;
  saldoAcumulado: number;
}

export interface AlertaDashboard {
  id: string;
  tipo: AlertType;
  titulo: string;
  mensagem: string;
  urgencia: AlertUrgency;
  valor?: number;
  quantidade?: number;
  actionLabel?: string;
  actionRoute?: string;
  actionCallback?: () => void;
  createdAt: Date;
}

export interface DashboardFilters {
  periodoInicio: Date;
  periodoFim: Date;
  branchIds?: string[];
  costCenterIds?: string[];
}
