-- Create help_articles table for Copilot knowledge base
CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  module TEXT,
  keywords TEXT[],
  is_public BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Policy for reading public articles (anyone can read)
CREATE POLICY "Anyone can read public help articles" 
ON public.help_articles 
FOR SELECT 
USING (is_public = true);

-- Policy for company-specific articles using existing company_users table
CREATE POLICY "Users can read their company help articles" 
ON public.help_articles 
FOR SELECT 
USING (company_id IS NULL OR public.user_belongs_to_company(company_id));

-- Policy for admins to manage articles
CREATE POLICY "Admins can manage help articles" 
ON public.help_articles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_module ON public.help_articles(module);
CREATE INDEX IF NOT EXISTS idx_help_articles_keywords ON public.help_articles USING GIN(keywords);

-- Insert some default help articles
INSERT INTO public.help_articles (title, content, category, module, keywords, is_public) VALUES
('Como cadastrar um produto', 'Para cadastrar um novo produto, acesse Cadastros > Produtos e clique em "Novo Produto". Preencha os campos obrigatórios como nome, código e preço.', 'cadastros', 'produtos', ARRAY['produto', 'cadastro', 'novo'], true),
('Como emitir uma nota fiscal', 'Para emitir uma NF-e, acesse Fiscal > NF-e e clique em "Emitir NF-e". Selecione o cliente, adicione os produtos e confirme a emissão.', 'fiscal', 'nfe', ARRAY['nota fiscal', 'nfe', 'emissão'], true),
('Como registrar uma venda', 'Para registrar uma venda, acesse Vendas > Nova Venda. Selecione o cliente, adicione os produtos, escolha a forma de pagamento e finalize.', 'vendas', 'pdv', ARRAY['venda', 'pdv', 'registro'], true),
('Como conciliar extratos bancários', 'Para conciliar extratos, acesse Conciliação > Importar e faça upload do arquivo OFX ou CSV do seu banco. O sistema identificará automaticamente as transações.', 'financeiro', 'conciliacao', ARRAY['conciliação', 'extrato', 'banco'], true),
('Como configurar integrações', 'Para configurar integrações, acesse Integrações > Conexões. Selecione o sistema que deseja integrar e siga as instruções de autenticação.', 'integracoes', 'conexoes', ARRAY['integração', 'api', 'conexão'], true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_help_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_help_articles_updated_at();