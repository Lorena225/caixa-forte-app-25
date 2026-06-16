-- Cleanup de legado: remove 44 tabelas dos módulos extintos
-- (CRM/Compras/Estoque/Produção/Vendas-comissão). Todas com 0 linhas e 0 uso
-- no frontend (hooks órfãos removidos no mesmo commit). CASCADE resolve FKs.
DROP TABLE IF EXISTS
  public.crm_activities, public.crm_inbox_messages, public.crm_inbox_conversations,
  public.crm_inbox_channels, public.crm_stages, public.crm_pipelines,
  public.lead_distribution_queue, public.lead_distribution_config, public.leads,
  public.opportunities, public.pipeline_stages,
  public.commissions, public.commission_rules, public.sales_goals,
  public.seller_territories, public.sellers, public.quotes,
  public.compras_itens, public.compras, public.pedidos_compra_itens, public.pedidos_compra,
  public.recebimentos_compra, public.purchase_order_items, public.purchase_orders,
  public.purchase_receipt_items, public.purchase_receipts, public.purchase_entry_items,
  public.purchase_entries, public.purchase_requisitions, public.purchase_recommendations,
  public.movimentacoes_estoque, public.stock_movements, public.stock_forecasts,
  public.inventory_items, public.estoque,
  public.production_cost_variances, public.production_material_consumption,
  public.production_order_operations, public.production_appointments, public.production_orders,
  public.mrp_requirements, public.industrial_routings, public.industrial_boms, public.bom_components
CASCADE;

-- Resíduo do cleanup: tabelas-filhas órfãs (RLS sem policy após CASCADE remover as mães)
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.routing_operations CASCADE;
