export interface ModelPricing {
  inputRate: number;  
  outputRate: number; 
}

export interface OpenAIPricingConfig {
  [modelName: string]: ModelPricing;
}

export const OPENAI_PRICING: OpenAIPricingConfig = {
  'gpt-4': {
    inputRate: 2.00,   
    outputRate: 8.00,  
  },

  'gpt-4o': {
    inputRate: 2.50,    
    outputRate: 10.00, 
  },
  
  'gpt-4o-mini': {
    inputRate: 0.15,    
    outputRate: 0.60,  
  },

  'text-embedding-ada-002': {
    inputRate: 0.10,    
    outputRate: 0.05,  
  },
};


export const MODEL_USAGE = {
  SUMMARY: 'gpt-4',           
  QUESTIONS: 'gpt-4o-mini',  
  EMBEDDINGS: 'text-embedding-ada-002',
} as const;


export function calculateOpenAICost(
  modelName: string,
  inputTokens: number,
  outputTokens: number = 0
): number {
  const pricing = OPENAI_PRICING[modelName];
  
  if (!pricing) {
    console.warn(`Unknown model pricing for: ${modelName}. Using GPT-4 pricing as fallback.`);
    const fallbackPricing = OPENAI_PRICING['gpt-4'];
    return (inputTokens / 1_000_000) * fallbackPricing.inputRate + 
           (outputTokens / 1_000_000) * fallbackPricing.outputRate;
  }
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputRate;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputRate;
  
  return inputCost + outputCost;
}


export function getCostBreakdown(
  modelName: string,
  inputTokens: number,
  outputTokens: number = 0
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
} {
  const pricing = OPENAI_PRICING[modelName] || OPENAI_PRICING['gpt-4'];
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputRate;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputRate;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model: modelName,
  };
}


export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(cost);
}


export function getEstimatedCost(
  useCase: keyof typeof MODEL_USAGE,
  inputTokens: number,
  outputTokens: number = 0
): number {
  const modelName = MODEL_USAGE[useCase];
  return calculateOpenAICost(modelName, inputTokens, outputTokens);
}
