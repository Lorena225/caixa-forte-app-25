import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface Departamento {
  id: string;
  company_id: string;
  nome: string;
  responsavel_id: string | null;
  centro_custo_id: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  responsavel?: Funcionario;
}

export interface Cargo {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  nivel: number;
  salario_minimo: number | null;
  salario_maximo: number | null;
  cbo: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Funcionario {
  id: string;
  company_id: string;
  matricula: string;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  sexo: 'M' | 'F' | 'O' | null;
  estado_civil: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel' | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  data_admissao: string;
  data_demissao: string | null;
  cargo_id: string | null;
  departamento_id: string | null;
  centro_custo_id: string | null;
  superior_id: string | null;
  tipo_contrato: 'clt' | 'pj' | 'estagiario' | 'temporario' | 'autonomo';
  salario_base: number;
  jornada_semanal: number;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  pix_chave: string | null;
  pix_tipo: string | null;
  status: 'ativo' | 'ferias' | 'afastado' | 'demitido' | 'suspenso';
  foto_url: string | null;
  observacoes: string | null;
  created_at: string;
  cargo?: Cargo;
  departamento?: Departamento;
}

export interface FolhaPagamento {
  id: string;
  company_id: string;
  mes_referencia: number;
  ano_referencia: number;
  tipo: 'mensal' | 'decimo_terceiro' | 'ferias' | 'rescisao' | 'adiantamento';
  data_processamento: string | null;
  data_pagamento: string | null;
  status: 'rascunho' | 'processando' | 'processada' | 'aprovada' | 'paga' | 'cancelada';
  total_proventos: number;
  total_descontos: number;
  total_liquido: number;
  total_encargos: number;
  total_fgts: number;
  total_inss_empresa: number;
  quantidade_funcionarios: number;
  observacoes: string | null;
  created_at: string;
}

export interface Ferias {
  id: string;
  funcionario_id: string;
  periodo_aquisitivo_id: string | null;
  data_inicio: string;
  data_fim: string;
  dias: number;
  tipo: 'integral' | 'parcelada_1' | 'parcelada_2' | 'parcelada_3' | 'abono_pecuniario';
  abono_pecuniario: boolean;
  dias_abono: number;
  valor_ferias: number;
  valor_abono: number;
  valor_terco: number;
  valor_total: number;
  status: 'programada' | 'solicitada' | 'aprovada' | 'rejeitada' | 'em_gozo' | 'concluida' | 'cancelada';
  observacoes: string | null;
  created_at: string;
  funcionario?: { id: string; nome_completo: string; matricula?: string };
}

export interface Beneficio {
  id: string;
  company_id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  valor_padrao: number;
  desconto_funcionario_percentual: number;
  desconto_funcionario_fixo: number;
  fornecedor: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Afastamento {
  id: string;
  funcionario_id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string | null;
  dias: number | null;
  cid: string | null;
  motivo: string | null;
  aprovado: boolean;
  created_at: string;
  funcionario?: { id: string; nome_completo: string };
}

export interface RegistroPonto {
  id: string;
  funcionario_id: string;
  data: string;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  horas_trabalhadas: string | null;
  horas_extras: string | null;
  aprovado: boolean;
  funcionario?: { id: string; nome_completo: string; matricula?: string };
}
}

// Hook principal
export function useRH() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  // ========== FUNCIONÁRIOS ==========
  const funcionariosQuery = useQuery({
    queryKey: ['funcionarios', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('funcionarios')
        .select(`
          *,
          cargo:cargos(*),
          departamento:departamentos(*)
        `)
        .eq('company_id', companyId)
        .order('nome_completo');
      if (error) throw error;
      return data as Funcionario[];
    },
    enabled: !!companyId,
  });

  const createFuncionario = useMutation({
    mutationFn: async (data: Partial<Funcionario>) => {
      if (!companyId) throw new Error('Company required');
      const { data: result, error } = await supabase
        .from('funcionarios')
        .insert({ ...data, company_id: companyId } as never)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Funcionário cadastrado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFuncionario = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Funcionario> & { id: string }) => {
      const { error } = await supabase.from('funcionarios').update(data as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Funcionário atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== DEPARTAMENTOS ==========
  const departamentosQuery = useQuery({
    queryKey: ['departamentos', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('departamentos')
        .select('*')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as Departamento[];
    },
    enabled: !!companyId,
  });

  const createDepartamento = useMutation({
    mutationFn: async (data: Partial<Departamento>) => {
      if (!companyId) throw new Error('Company required');
      const { error } = await supabase
        .from('departamentos')
        .insert({ ...data, company_id: companyId } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      toast.success('Departamento criado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== CARGOS ==========
  const cargosQuery = useQuery({
    queryKey: ['cargos', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as Cargo[];
    },
    enabled: !!companyId,
  });

  const createCargo = useMutation({
    mutationFn: async (data: Partial<Cargo>) => {
      if (!companyId) throw new Error('Company required');
      const { error } = await supabase
        .from('cargos')
        .insert({ ...data, company_id: companyId } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo criado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== FOLHAS DE PAGAMENTO ==========
  const folhasQuery = useQuery({
    queryKey: ['folhas_pagamento', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('folhas_pagamento')
        .select('*')
        .eq('company_id', companyId)
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false });
      if (error) throw error;
      return data as FolhaPagamento[];
    },
    enabled: !!companyId,
  });

  const createFolha = useMutation({
    mutationFn: async (data: Partial<FolhaPagamento>) => {
      if (!companyId) throw new Error('Company required');
      const { data: result, error } = await supabase
        .from('folhas_pagamento')
        .insert({ ...data, company_id: companyId } as never)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folhas_pagamento'] });
      toast.success('Folha de pagamento criada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== FÉRIAS ==========
  const feriasQuery = useQuery({
    queryKey: ['ferias', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('ferias')
        .select(`
          *,
          funcionario:funcionarios(id, nome_completo, matricula)
        `)
        .in('funcionario_id', 
          supabase
            .from('funcionarios')
            .select('id')
            .eq('company_id', companyId)
        )
        .order('data_inicio', { ascending: false });
      
      // Fallback query without subquery filter
      if (error) {
        const { data: funcs } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('company_id', companyId);
        
        if (funcs && funcs.length > 0) {
          const funcIds = funcs.map(f => f.id);
          const { data: feriasData, error: fErr } = await supabase
            .from('ferias')
            .select(`*, funcionario:funcionarios(id, nome_completo, matricula)`)
            .in('funcionario_id', funcIds)
            .order('data_inicio', { ascending: false });
          if (fErr) throw fErr;
          return feriasData as Ferias[];
        }
        return [];
      }
      return data as Ferias[];
    },
    enabled: !!companyId,
  });

  const createFerias = useMutation({
    mutationFn: async (data: Partial<Ferias>) => {
      const { error } = await supabase.from('ferias').insert(data as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias'] });
      toast.success('Férias programadas!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== BENEFÍCIOS ==========
  const beneficiosQuery = useQuery({
    queryKey: ['beneficios', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('beneficios')
        .select('*')
        .eq('company_id', companyId)
        .order('nome');
      if (error) throw error;
      return data as Beneficio[];
    },
    enabled: !!companyId,
  });

  const createBeneficio = useMutation({
    mutationFn: async (data: Partial<Beneficio>) => {
      if (!companyId) throw new Error('Company required');
      const { error } = await supabase
        .from('beneficios')
        .insert({ ...data, company_id: companyId } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficios'] });
      toast.success('Benefício criado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== AFASTAMENTOS ==========
  const afastamentosQuery = useQuery({
    queryKey: ['afastamentos', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('company_id', companyId);
      
      if (!funcs || funcs.length === 0) return [];
      
      const funcIds = funcs.map(f => f.id);
      const { data, error } = await supabase
        .from('afastamentos')
        .select(`*, funcionario:funcionarios(id, nome_completo)`)
        .in('funcionario_id', funcIds)
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as Afastamento[];
    },
    enabled: !!companyId,
  });

  // ========== PONTO ==========
  const pontoQuery = useQuery({
    queryKey: ['registros_ponto', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('company_id', companyId);
      
      if (!funcs || funcs.length === 0) return [];
      
      const funcIds = funcs.map(f => f.id);
      const { data, error } = await supabase
        .from('registros_ponto')
        .select(`*, funcionario:funcionarios(id, nome_completo, matricula)`)
        .in('funcionario_id', funcIds)
        .order('data', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as RegistroPonto[];
    },
    enabled: !!companyId,
  });

  // ========== KPIs ==========
  const kpisQuery = useQuery({
    queryKey: ['rh_kpis', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth() + 1;
      
      // Total ativos
      const { count: totalAtivos } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'ativo');

      // Total em férias
      const { count: emFerias } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'ferias');

      // Afastados
      const { count: afastados } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'afastado');

      // Aniversariantes do mês
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('data_nascimento')
        .eq('company_id', companyId)
        .eq('status', 'ativo');
      
      const aniversariantes = funcs?.filter(f => {
        if (!f.data_nascimento) return false;
        const month = new Date(f.data_nascimento).getMonth() + 1;
        return month === currentMonth;
      }).length || 0;

      // Última folha
      const { data: ultimaFolha } = await supabase
        .from('folhas_pagamento')
        .select('total_liquido, mes_referencia, ano_referencia')
        .eq('company_id', companyId)
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        totalAtivos: totalAtivos || 0,
        emFerias: emFerias || 0,
        afastados: afastados || 0,
        aniversariantes,
        ultimaFolha: ultimaFolha?.total_liquido || 0,
        mesReferencia: ultimaFolha ? `${ultimaFolha.mes_referencia}/${ultimaFolha.ano_referencia}` : '-',
      };
    },
    enabled: !!companyId,
  });

  return {
    // Funcionários
    funcionarios: funcionariosQuery.data || [],
    funcionariosLoading: funcionariosQuery.isLoading,
    createFuncionario,
    updateFuncionario,
    
    // Departamentos
    departamentos: departamentosQuery.data || [],
    departamentosLoading: departamentosQuery.isLoading,
    createDepartamento,
    
    // Cargos
    cargos: cargosQuery.data || [],
    cargosLoading: cargosQuery.isLoading,
    createCargo,
    
    // Folhas
    folhas: folhasQuery.data || [],
    folhasLoading: folhasQuery.isLoading,
    createFolha,
    
    // Férias
    ferias: feriasQuery.data || [],
    feriasLoading: feriasQuery.isLoading,
    createFerias,
    
    // Benefícios
    beneficios: beneficiosQuery.data || [],
    beneficiosLoading: beneficiosQuery.isLoading,
    createBeneficio,
    
    // Afastamentos
    afastamentos: afastamentosQuery.data || [],
    afastamentosLoading: afastamentosQuery.isLoading,
    
    // Ponto
    registrosPonto: pontoQuery.data || [],
    pontoLoading: pontoQuery.isLoading,
    
    // KPIs
    kpis: kpisQuery.data,
    kpisLoading: kpisQuery.isLoading,
  };
}
