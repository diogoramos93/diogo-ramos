
import * as faceapi from 'face-api.js';
import { PhotoData, AIConfig } from '../types';
import { getGlobalSetting } from './db';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const BROWSER_MATCH_THRESHOLD = 0.45;
const COMPREFACE_SIMILARITY_THRESHOLD = 0.80; // Ajuste entre 0.0 e 1.0

let cachedConfig: AIConfig | null = null;
let modelsLoaded = false;

/**
 * Garante que a configuração de IA (Provedor, URL, Key) seja carregada do Supabase
 */
const ensureConfigLoaded = async () => {
  if (cachedConfig) return cachedConfig;

  // 1. Tenta buscar no banco de dados (Supabase)
  const dbConfigRaw = await getGlobalSetting('facefind_ai_config');
  if (dbConfigRaw) {
    cachedConfig = JSON.parse(dbConfigRaw);
    return cachedConfig!;
  }

  // 2. Fallback para localStorage (Cache local)
  const localSaved = localStorage.getItem('facefind_ai_config');
  if (localSaved) {
    cachedConfig = JSON.parse(localSaved);
    return cachedConfig!;
  }

  // 3. Padrão: Processamento no Navegador
  cachedConfig = { provider: 'browser' };
  return cachedConfig;
};

export const getCurrentAIProvider = async () => {
  const config = await ensureConfigLoaded();
  return config.provider;
};

/**
 * Carrega modelos do Face-API.js para processamento local
 */
const loadFaceModels = async () => {
  if (modelsLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error("Failed to load Face API models:", error);
    throw new Error("Erro ao carregar modelos locais do navegador.");
  }
};

export const initAI = async () => {
  const config = await ensureConfigLoaded();
  if (config.provider === 'browser') {
    await loadFaceModels();
  }
};

/**
 * Helper para converter URL de imagem em Blob para envio via FormData
 */
const urlToBlob = async (url: string): Promise<Blob> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao baixar imagem para comparação.");
    return res.blob();
};

/**
 * Chama a API de Verificação do Exadel CompreFace
 */
const verifyCompreFace = async (selfieBlob: Blob, targetUrl: string, apiUrl: string, apiKey: string): Promise<boolean> => {
    try {
        const targetBlob = await urlToBlob(targetUrl);
        const formData = new FormData();
        formData.append('source_image', selfieBlob);
        formData.append('target_image', targetBlob);

        // Endpoint padrão do CompreFace Verification Service
        const cleanUrl = apiUrl.replace(/\/$/, "");
        const response = await fetch(`${cleanUrl}/api/v1/verification/verify`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro na API CompreFace:", errorData);
            return false;
        }

        const data = await response.json();
        
        /**
         * Estrutura de resposta do CompreFace Verification:
         * {
         *   "result": [
         *     {
         *       "source_image_face": { ... },
         *       "face_matches": [
         *         { "similarity": 0.99, ... }
         *       ]
         *     }
         *   ]
         * }
         */
        const hasMatch = data.result?.some((res: any) => 
            res.face_matches?.some((match: any) => match.similarity >= COMPREFACE_SIMILARITY_THRESHOLD)
        );

        return !!hasMatch;
    } catch (e) {
        console.error("Erro na verificação CompreFace:", e);
        return false;
    }
}

/**
 * Função principal de busca facial
 */
export const processSearch = async (
  selfieBase64: string,
  photos: PhotoData[],
  onProgress: (current: number, total: number, status: string) => void
): Promise<PhotoData[]> => {
  
  const config = await ensureConfigLoaded();

  // --- MODO EXADEL COMPREFACE ---
  if (config.provider === 'compre-face' && config.apiUrl && config.apiKey) {
    onProgress(0, photos.length, 'Iniciando busca no CompreFace...');
    
    const selfieBlob = await (await fetch(selfieBase64)).blob();
    const matches: PhotoData[] = [];
    
    // Processamento em lotes paralelos (Batching) para performance
    const BATCH_SIZE = 3; 
    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
        const batch = photos.slice(i, i + BATCH_SIZE);
        const currentBatchIndex = Math.ceil(i/BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(photos.length/BATCH_SIZE);
        
        onProgress(i, photos.length, `Analisando fotos (${currentBatchIndex}/${totalBatches})...`);
        
        const results = await Promise.all(batch.map(async (photo) => {
            const isMatch = await verifyCompreFace(selfieBlob, photo.src, config.apiUrl!, config.apiKey!);
            return isMatch ? photo : null;
        }));

        matches.push(...results.filter((p): p is PhotoData => p !== null));
    }

    onProgress(photos.length, photos.length, 'Busca finalizada!');
    return matches;
  }

  // --- MODO NAVEGADOR (FACE-API.JS) ---
  else {
    onProgress(0, photos.length, 'Preparando motor local...');
    await loadFaceModels();
    
    const img = await faceapi.fetchImage(selfieBase64);
    const selfieDetection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!selfieDetection) throw new Error("NO_FACE_IN_SELFIE");

    const matches: PhotoData[] = [];
    for (let i = 0; i < photos.length; i++) {
      onProgress(i, photos.length, `Analisando foto ${i + 1} de ${photos.length}...`);
      try {
        const targetImg = await faceapi.fetchImage(photos[i].src);
        const detections = await faceapi.detectAllFaces(targetImg).withFaceLandmarks().withFaceDescriptors();
        
        const isMatch = detections.some(d => faceapi.euclideanDistance(selfieDetection.descriptor, d.descriptor) < BROWSER_MATCH_THRESHOLD);
        if (isMatch) matches.push(photos[i]);
      } catch (err) {
        console.warn("Erro ao processar foto localmente:", photos[i].id);
      }
      // Pequena pausa para não travar a UI em processamento local pesado
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    return matches;
  }
};
