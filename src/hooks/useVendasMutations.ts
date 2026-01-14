import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ItemVendaInput {
  ordem: number;
  tipo_item: string;
  produto_id?: string;
  codigo?: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  preco_unitario: number;
  valor_desconto?: number;
  valor_total: number;
  ncm?: string;
  cfop?: string;
}

interface PagamentoInput {
  sequencia: number;
  forma_pagamento: string;
  valor: number;
  percentual: number;
  numero_parcelas?: number;
}

interface CreateVendaInput {
  tipo: 'V' | 'O' | 'P'; // Venda, Orçamento, Pedido
  cliente_id: string;
  cliente_nome?: string;
  cliente_cpf_cnpj?: string;
  valor_produtos: number;
  valor_desconto?: number;
  valor_frete?: number;
  valor_total: number;
  observacoes?: string;
  itens: ItemVendaInput[];
  pagamentos: PagamentoInput[];
}

export function useCreateVenda() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVendaInput) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // 1. Gera o próximo número de venda
      const { data: ultimaVenda } = await supabase
        .from("vendas")
        .select("numero")
        .eq("empresa_id", currentCompany.id)
        .eq("tipo", input.tipo)
        .order("numero", { ascending: false })
        .limit(1)
        .single();

      const proximoNumero = ultimaVenda 
        ? String(Number(ultimaVenda.numero) + 1).padStart(6, '0')
        : '000001';

      // 2. Cria a venda
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          empresa_id: currentCompany.id,
          numero: proximoNumero,
          tipo: input.tipo,
          situacao: 'A', // Aberto
          cliente_id: input.cliente_id,
          cliente_nome: input.cliente_nome,
          cliente_cpf_cnpj: input.cliente_cpf_cnpj,
          valor_produtos: input.valor_produtos,
          valor_desconto: input.valor_desconto || 0,
          valor_frete: input.valor_frete || 0,
          valor_total: input.valor_total,
          observacoes: input.observacoes,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (vendaError) throw vendaError;

      // 3. Insere os itens
      if (input.itens.length > 0) {
        const itensComVendaId = input.itens.map(item => ({
          venda_id: venda.id,
          ordem: item.ordem,
          tipo_item: item.tipo_item,
          produto_id: item.produto_id,
          codigo: item.codigo,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade || 'UN',
          preco_unitario: item.preco_unitario,
          valor_desconto: item.valor_desconto || 0,
          valor_total: item.valor_total,
          ncm: item.ncm,
          cfop: item.cfop,
        }));

        const { error: itensError } = await supabase
          .from("vendas_itens")
          .insert(itensComVendaId as any);

        if (itensError) throw itensError;
      }

      // 4. Insere os pagamentos
      if (input.pagamentos.length > 0) {
        const pagamentosComVendaId = input.pagamentos.map(pag => ({
          venda_id: venda.id,
          sequencia: pag.sequencia,
          forma_pagamento: pag.forma_pagamento,
          valor: pag.valor,
          percentual: pag.percentual,
          numero_parcelas: pag.numero_parcelas,
        }));

        const { error: pagamentosError } = await supabase
          .from("vendas_pagamentos")
          .insert(pagamentosComVendaId as any);

        if (pagamentosError) throw pagamentosError;
      }

      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar venda: ${error.message}`);
    },
  });
}

export function useUpdateVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("vendas")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar venda: ${error.message}`);
    },
  });
}

export function useCancelarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendaId: string) => {
      const { data, error } = await supabase
        .from("vendas")
        .update({ situacao: 'C' } as any)
        .eq("id", vendaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-stats"] });
      toast.success("Venda cancelada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar venda: ${error.message}`);
    },
  });
}
