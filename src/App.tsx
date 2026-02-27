import { useState, useCallback } from 'react';
import { useDropzone, type DropzoneOptions, type FileRejection, type DropEvent } from 'react-dropzone';
import Countdown from 'react-countdown';
import { GoogleGenAI } from '@google/genai';

import { RiskProfile, AnalysisResult } from './types';
import { UploadCloud, BarChart, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// Configure o Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface RiskProfileSelectorProps {
  selectedProfile: RiskProfile;
  onSelectProfile: (profile: RiskProfile) => void;
}

const RiskProfileSelector = ({ selectedProfile, onSelectProfile }: RiskProfileSelectorProps) => (
  <div className="flex justify-center bg-card-bg/50 rounded-lg p-2 backdrop-blur-sm">
    {Object.values(RiskProfile).map((profile) => (
      <button
        key={profile}
        onClick={() => onSelectProfile(profile)}
        className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-opacity-50 ${
          selectedProfile === profile
            ? 'bg-accent-color text-card-bg shadow-lg'
            : 'text-text-secondary hover:bg-card-bg/80'
        }`}>
        {profile}
      </button>
    ))}
  </div>
);

interface ImageUploaderProps {
  onDrop: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  imagePreview: string | null;
}

const ImageUploader = ({ onDrop, imagePreview }: ImageUploaderProps) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    multiple: false,
  } as unknown as DropzoneOptions);

  return (
    <div {...getRootProps()} className="mt-6 border-2 border-dashed border-text-secondary/30 rounded-2xl p-8 text-center cursor-pointer hover:border-accent-color transition-all duration-200 bg-card-bg/50 backdrop-blur-sm">
      <input {...getInputProps()} />
      {imagePreview ? (
        <img src={imagePreview} alt="Preview" className="mx-auto max-h-60 rounded-lg object-contain" />
      ) : (
        <div className="flex flex-col items-center text-text-secondary">
          <UploadCloud className="w-12 h-12 mb-4" />
          <p className="font-semibold">Arraste e solte o gráfico aqui</p>
          <p className="text-xs mt-1">ou clique para selecionar o arquivo</p>
        </div>
      )}
    </div>
  );
};

interface AnalysisResultCardProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

const AnalysisResultCard = ({ result, isLoading }: AnalysisResultCardProps) => {
  if (isLoading) {
    return (
      <div className="mt-8 bg-card-bg p-6 rounded-2xl shadow-2xl text-center animate-pulse">
        <p className="text-text-primary font-mono">Analisando...</p>
      </div>
    );
  }

  if (!result) return null;

  const getActionIcon = () => {
    switch (result.action) {
      case 'COMPRA': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'VENDA': return <AlertTriangle className="w-6 h-6 text-red-400" />;
      default: return <Clock className="w-6 h-6 text-yellow-400" />;
    }
  };

  return (
    <div className="mt-8 bg-card-bg p-6 rounded-2xl shadow-2xl font-mono text-text-primary">
      <h2 className="text-lg font-semibold text-center mb-4 border-b border-text-secondary/20 pb-2">💳 ORÁCULO VISION: DECISÃO</h2>
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <p><span className="text-text-secondary">ATIVO:</span> {result.asset}</p>
        <p><span className="text-text-secondary">TIMEFRAME:</span> {result.timeframe}</p>
      </div>
      <div className="flex items-center justify-center bg-black/20 p-4 rounded-lg mb-4">
        {getActionIcon()}
        <p className="text-2xl font-bold ml-3">{result.action}</p>
      </div>
      <div className="text-center mb-4">
        <p className="text-text-secondary text-xs">CONFIANÇA</p>
        <p className="text-3xl font-bold text-accent-color">{result.confidence}%</p>
      </div>
      <div>
        <p className="text-text-secondary text-xs mb-2">JUSTIFICATIVA:</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          {result.justification.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
      <div className="mt-6 text-center bg-accent-color text-card-bg p-3 rounded-lg">
        <p className="text-sm">⏱️ CLIQUE EM:</p>
        <div className="text-2xl font-bold">
          <Countdown date={Date.now() + result.clickAt * 1000} />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(RiskProfile.Moderado);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
    const file = acceptedFiles[0];
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!image) {
      setError('Por favor, carregue uma imagem do gráfico.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const prompt = `Analise a imagem do gráfico financeiro com o perfil de risco "${riskProfile}" e retorne um JSON no seguinte formato: ${JSON.stringify({
        asset: 'string',
        timeframe: 'string',
        action: 'COMPRA | VENDA | AGUARDAR',
        confidence: 'number (0-100)',
        justification: 'string[]',
        clickAt: 'number (30-48)',
      })}`;

      const response = await ai.models.generateContent({
        model: 'gemini-pro-vision',
        contents: {
          parts: [
            { inlineData: { mimeType: image.type, data: imageBase64 } },
            { text: prompt },
          ],
        },
      });
      
      const text = response.text.replace(/```json|```/g, '').trim();
      const parsedResult: AnalysisResult = JSON.parse(text);
      setResult(parsedResult);

    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao analisar a imagem. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-color">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-card-bg flex items-center justify-center">
            <BarChart className="w-8 h-8 mr-2 text-accent-color" />
            Oráculo Vision
          </h1>
          <p className="text-sm text-card-bg/70 mt-1 font-mono">Análise de Gráficos com IA</p>
        </div>

        <div className="bg-card-bg p-6 rounded-2xl shadow-2xl">
          <RiskProfileSelector selectedProfile={riskProfile} onSelectProfile={setRiskProfile} />
          <ImageUploader onDrop={onDrop} imagePreview={imagePreview} />
          
          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}

          <button 
            onClick={handleAnalyze}
            disabled={!image || isLoading}
            className="w-full mt-6 bg-accent-color text-card-bg font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
            {isLoading ? 'Analisando...' : 'Analisar Imagem'}
          </button>
        </div>

        <AnalysisResultCard result={result} isLoading={isLoading} />

      </div>
    </div>
  );
}
