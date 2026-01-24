import { useMemo, useCallback, useRef } from 'react';

interface CategorySuggestion {
  categoryId: string;
  confidence: number;
  reason: string;
  isLearned?: boolean;
}

interface Category {
  id: string;
  name: string;
  code: string;
  category_type: string;
}

// Keywords mapping for AI simulation - expanded with user-requested categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Transportation
  transporte: [
    'uber', 'taxi', '99', 'cabify', 'combustível', 'gasolina', 'diesel', 'álcool', 
    'estacionamento', 'pedágio', 'ônibus', 'metrô', 'passagem', 'viagem', 'frete', 
    'correios', 'sedex', 'posto', 'ipva', 'multa trânsito', 'seguro veículo'
  ],
  
  // Food & Restaurants
  alimentacao: [
    'almoço', 'jantar', 'café', 'restaurante', 'lanche', 'ifood', 'rappi', 'delivery', 
    'mercado', 'supermercado', 'padaria', 'açougue', 'feira', 'hortifruti', 'pizza',
    'hambúrguer', 'sushi', 'churrasco', 'bar', 'cerveja', 'bebida'
  ],
  
  // Entertainment & Leisure (NEW - user requested)
  lazer: [
    'netflix', 'spotify', 'cinema', 'show', 'teatro', 'museu', 'parque', 'viagem lazer',
    'hotel', 'pousada', 'airbnb', 'amazon prime', 'disney+', 'hbo', 'youtube premium',
    'playstation', 'xbox', 'nintendo', 'jogos', 'games', 'livro', 'revista', 'ingresso',
    'festa', 'balada', 'clube', 'academia', 'esporte', 'futebol'
  ],
  
  // Housing & Utilities (NEW - user requested)
  moradia: [
    'aluguel', 'condomínio', 'luz', 'água', 'internet', 'gás', 'iptu', 'seguro residencial',
    'manutenção casa', 'eletricista', 'encanador', 'pintor', 'reforma', 'móveis casa',
    'decoração', 'limpeza', 'faxina', 'diarista', 'jardineiro', 'piscina'
  ],
  
  // Technology & Software
  tecnologia: [
    'software', 'licença', 'saas', 'cloud', 'aws', 'google cloud', 'microsoft', 'adobe', 
    'zoom', 'slack', 'hosting', 'domínio', 'telefone', 'celular', 'plano celular',
    'computador', 'notebook', 'tablet', 'impressora'
  ],
  
  // Marketing & Advertising
  marketing: [
    'google ads', 'facebook ads', 'instagram', 'tiktok', 'publicidade', 'propaganda', 
    'mídia', 'campanha', 'anúncio', 'banner', 'outdoor', 'influencer', 'agência marketing'
  ],
  
  // Office & Supplies
  escritorio: [
    'material escritório', 'papelaria', 'impressão', 'toner', 'cartucho', 'móveis escritório', 
    'cadeira', 'mesa', 'monitor', 'teclado', 'mouse', 'webcam', 'headset'
  ],
  
  // Utilities (Business)
  utilidades: [
    'energia empresa', 'água empresa', 'esgoto', 'gás empresa', 'lixo', 'taxa lixo'
  ],
  
  // Services
  servicos: [
    'consultoria', 'advogado', 'contador', 'contabilidade', 'manutenção', 'limpeza empresa', 
    'segurança', 'jardinagem', 'terceirizado', 'freelancer'
  ],
  
  // Sales Revenue
  vendas: [
    'venda', 'faturamento', 'receita', 'cliente', 'pedido', 'nota fiscal', 'nfe', 
    'produto vendido', 'serviço prestado', 'comissão', 'royalties'
  ],
  
  // Financial Services
  financeiro: [
    'juros', 'multa', 'tarifa bancária', 'iof', 'taxa', 'banco', 'cartão', 'empréstimo', 
    'financiamento', 'rendimento', 'aplicação', 'investimento', 'dividendo'
  ],
  
  // Payroll
  pessoal: [
    'salário', 'folha pagamento', 'férias', '13º', 'fgts', 'inss', 'vale transporte', 
    'vale refeição', 'benefício', 'plano de saúde', 'odontológico', 'bônus', 'PLR'
  ],
  
  // Healthcare
  saude: [
    'médico', 'hospital', 'consulta', 'exame', 'farmácia', 'remédio', 'medicamento',
    'dentista', 'psicólogo', 'fisioterapia', 'academia', 'nutricionista'
  ],
  
  // Education
  educacao: [
    'curso', 'escola', 'faculdade', 'universidade', 'livro didático', 'mensalidade',
    'material escolar', 'uniforme', 'apostila', 'treinamento', 'capacitação', 'workshop'
  ],
};

// Map keywords to category types
const KEYWORD_TO_TYPE: Record<string, string> = {
  transporte: 'despesa',
  alimentacao: 'despesa',
  lazer: 'despesa',
  moradia: 'despesa',
  tecnologia: 'despesa',
  marketing: 'despesa',
  escritorio: 'despesa',
  utilidades: 'despesa',
  servicos: 'despesa',
  vendas: 'receita',
  financeiro: 'despesa',
  pessoal: 'despesa',
  saude: 'despesa',
  educacao: 'despesa',
};

// Session-based learning storage
interface LearnedPattern {
  keyword: string;
  categoryId: string;
  categoryName: string;
  count: number;
}

export function useAICategorySuggestion(categories: Category[], direction: 'entrada' | 'saida') {
  // Session learning - persists within the current browser session
  const learnedPatterns = useRef<Map<string, LearnedPattern>>(new Map());
  
  // Learn from user's manual category selections
  const learnFromSelection = useCallback((description: string, categoryId: string) => {
    if (!description || description.length < 3) return;
    
    const normalizedDesc = description.toLowerCase().trim();
    const words = normalizedDesc.split(/\s+/);
    
    // Learn significant words (3+ chars, not common)
    const commonWords = ['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'com', 'para', 'por'];
    const significantWords = words.filter(w => w.length >= 3 && !commonWords.includes(w));
    
    if (significantWords.length > 0) {
      const keyWord = significantWords[0];
      const category = categories.find(c => c.id === categoryId);
      
      if (category) {
        const existing = learnedPatterns.current.get(keyWord);
        if (existing) {
          existing.count++;
          existing.categoryId = categoryId;
          existing.categoryName = category.name;
        } else {
          learnedPatterns.current.set(keyWord, {
            keyword: keyWord,
            categoryId,
            categoryName: category.name,
            count: 1,
          });
        }
      }
    }
  }, [categories]);
  
  const suggestCategory = useCallback((description: string): CategorySuggestion | null => {
    if (!description || description.length < 3) return null;

    const normalizedDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // First, check learned patterns from this session
    const words = normalizedDesc.split(/\s+/);
    for (const word of words) {
      const learned = learnedPatterns.current.get(word);
      if (learned && learned.count >= 1) {
        // Verify the category still exists and matches direction
        const category = categories.find(c => c.id === learned.categoryId);
        if (category) {
          const expectedType = direction === 'entrada' ? 'receita' : ['custo', 'despesa'];
          const typeMatches = Array.isArray(expectedType) 
            ? expectedType.includes(category.category_type)
            : category.category_type === expectedType;
          
          if (typeMatches) {
            return {
              categoryId: learned.categoryId,
              confidence: Math.min(0.98, 0.85 + (learned.count * 0.03)),
              reason: `Aprendido: "${learned.keyword}" → ${learned.categoryName}`,
              isLearned: true,
            };
          }
        }
      }
    }
    
    // Then check predefined keywords
    let bestMatch: { category: string; keyword: string; confidence: number } | null = null;

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
      transporte: ['transporte', 'veículo', 'deslocamento', 'logística', 'mobilidade'],
      alimentacao: ['alimentação', 'refeição', 'copa', 'cozinha', 'comida'],
      lazer: ['lazer', 'entretenimento', 'diversão', 'recreação', 'hobby'],
      moradia: ['moradia', 'habitação', 'residência', 'casa', 'apartamento', 'imóvel'],
      tecnologia: ['tecnologia', 'informática', 'ti', 'software', 'sistemas'],
      marketing: ['marketing', 'publicidade', 'propaganda', 'comunicação'],
      escritorio: ['escritório', 'administrativo', 'material', 'expediente'],
      utilidades: ['utilidades', 'serviços públicos', 'concessionárias'],
      servicos: ['serviços', 'terceiros', 'prestação'],
      vendas: ['venda', 'receita', 'faturamento', 'comercial'],
      financeiro: ['financeiro', 'bancário', 'despesas bancárias', 'juros'],
      pessoal: ['pessoal', 'folha', 'salário', 'rh', 'recursos humanos'],
      saude: ['saúde', 'médico', 'hospital', 'farmácia', 'bem-estar'],
      educacao: ['educação', 'ensino', 'curso', 'treinamento', 'capacitação'],
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
      isLearned: false,
    };
  }, [categories, direction]);
  
  // Get learned patterns count for UI feedback
  const getLearnedPatternsCount = useCallback(() => {
    return learnedPatterns.current.size;
  }, []);

  return { 
    suggestCategory, 
    learnFromSelection,
    getLearnedPatternsCount,
  };
}
