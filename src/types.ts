export enum RiskProfile {
  Conservador = 'Conservador',
  Moderado = 'Moderado',
  Agressivo = 'Agressivo',
}

export interface AnalysisResult {
  asset: string;
  timeframe: string;
  action: 'COMPRA' | 'VENDA' | 'AGUARDAR';
  confidence: number;
  justification: string[];
  clickAt: number;
}
