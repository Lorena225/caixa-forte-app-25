import { useMemo, useCallback } from 'react';

interface CategorySuggestion {
  categoryId: string;
  confidence: number;
  reason: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  category_type: string;
}

// Keywords mapping for AI simulation
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Transportation
  transporte: ['uber', 'taxi', '99', 'cabify', 'combustível', 'gasolina', 'diesel', 'álcool', 'estacionamento', 'pedágio', 'ônibus', 'metrô', 'passagem', 'viagem', 'frete', 'correios', 'sedex'],
  
  // Food & Restaurants
  alimentacao: ['almoço', 'jantar', 'café', 'restaurante', 'lanche', 'ifood', 'rappi', 'delivery', 'mercado', 'supermercado', 'padaria', 'açougue', 'feira', 'hortifruti'],
  
  // Technology & Software
  tecnologia: ['software', 'licença', 'saas', 'cloud', 'aws', 'google', 'microsoft', 'adobe', 'zoom', 'slack', 'hosting', 'domínio', 'internet', 'telefone', 'celular'],
  
  // Marketing & Advertising
  marketing: ['google ads', 'facebook', 'instagram', 'tiktok', 'publicidade', 'propaganda', 'mídia', 'campanha', 'anúncio', 'banner', 'outdoor'],
  
  // Office & Supplies
  escritorio: ['material', 'papelaria', 'impressão', 'toner', 'cartucho', 'móveis', 'cadeira', 'mesa', 'monitor', 'teclado', 'mouse'],
  
  // Utilities
  utilidades: ['luz', 'energia', 'água', 'esgoto', 'gás', 'condomínio', 'iptu', 'aluguel'],
  
  // Services
  servicos: ['consultoria', 'advogado', 'contador', 'contabilidade', 'manutenção', 'limpeza', 'segurança', 'jardinagem'],
  
  // Sales Revenue
  vendas: ['venda', 'faturamento', 'receita', 'cliente', 'pedido', 'nota fiscal', 'nfe'],
  
  // Financial Services
  financeiro: ['juros', 'multa', 'tarifa', 'iof', 'taxa', 'banco', 'cartão', 'empréstimo', 'financiamento'],
  
  // Payroll
  pessoal: ['salário', 'folha', 'férias', '13º', 'fgts', 'inss', 'vale', 'benefício', 'plano de saúde', 'odontológico'],
};

// Map keywords to category types
const KEYWORD_TO_TYPE: Record<string, string> = {
  transporte: 'despesa',
  alimentacao: 'despesa',
  tecnologia: 'despesa',
  marketing: 'despesa',
  escritorio: 'despesa',
  utilidades: 'despesa',
  servicos: 'despesa',
  vendas: 'receita',
  financeiro: 'despesa',
  pessoal: 'despesa',
};

export function useAICategorySuggestion(categories: Category[], direction: 'entrada' | 'saida') {
  const suggestCategory = useCallback((description: string): CategorySuggestion | null => {
    if (!description || description.length < 3) return null;

    const normalizedDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    let bestMatch: { category: string; keyword: string; confidence: number } | null = null;

    // Find the best matching keyword
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        if (normalizedDesc.includes(normalizedKeyword)) {
          // Calculate confidence based on keyword match quality
          const matchRatio = normalizedKeyword.length / normalizedDesc.length;
          const confidence = Math.min(0.95, 0.7 + matchRatio * 0.3);
          
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { category, keyword, confidence };
          }
        }
      }
    }

    if (!bestMatch) return null;

    // Filter categories based on direction
    const expectedType = direction === 'entrada' ? 'receita' : ['custo', 'despesa'];
    const matchingCategories = categories.filter(c => 
      Array.isArray(expectedType) 
        ? expectedType.includes(c.category_type)
        : c.category_type === expectedType
    );

    // Find the best matching category from available ones
    const categoryNames: Record<string, string[]> = {
      transporte: ['transporte', 'veículo', 'deslocamento', 'logística'],
      alimentacao: ['alimentação', 'refeição', 'copa', 'cozinha'],
      tecnologia: ['tecnologia', 'informática', 'ti', 'software', 'sistemas'],
      marketing: ['marketing', 'publicidade', 'propaganda', 'comunicação'],
      escritorio: ['escritório', 'administrativo', 'material', 'expediente'],
      utilidades: ['utilidades', 'serviços públicos', 'concessionárias'],
      servicos: ['serviços', 'terceiros', 'prestação'],
      vendas: ['venda', 'receita', 'faturamento', 'comercial'],
      financeiro: ['financeiro', 'bancário', 'despesas bancárias', 'juros'],
      pessoal: ['pessoal', 'folha', 'salário', 'rh', 'recursos humanos'],
    };

    const possibleNames = categoryNames[bestMatch.category] || [bestMatch.category];
    
    let matchedCategory = matchingCategories.find(c => {
      const catName = c.name.toLowerCase();
      return possibleNames.some(name => catName.includes(name.toLowerCase()));
    });

    // If no exact match, try to find any category of the right type
    if (!matchedCategory && matchingCategories.length > 0) {
      matchedCategory = matchingCategories[0];
      bestMatch.confidence = Math.max(0.5, bestMatch.confidence - 0.2);
    }

    if (!matchedCategory) return null;

    return {
      categoryId: matchedCategory.id,
      confidence: bestMatch.confidence,
      reason: `Identificado "${bestMatch.keyword}" na descrição`,
    };
  }, [categories, direction]);

  return { suggestCategory };
}
