
import * as faceapi from 'face-api.js';
import { PhotoData, AIConfig } from '../types';
import { getGlobalSetting } from './db';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const BROWSER_MATCH_THRESHOLD = 0.45;
const COMPREFACE_SIMILARITY_THRESHOLD = 0.85; 

let cachedConfig: AIConfig | null = null;
let modelsLoaded = false;

const ensureConfigLoaded = async () => {
  if (cachedConfig) return cachedConfig;
  const dbConfigRaw = await getGlobalSetting('facefind_ai_config');
  if (dbConfigRaw) {
    cachedConfig = JSON.parse(dbConfigRaw);
    return cachedConfig!;
  }
  const localSaved = localStorage.getItem('facefind_ai_config');
  if (localSaved) {
    cachedConfig = JSON.parse(localSaved);
    return cachedConfig!;
  }
  cachedConfig = { provider: 'browser' };
  return cachedConfig;
};

export const getCurrentAIProvider = async () => {
  const config = await ensureConfigLoaded();
  return config.provider;
};

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
    throw new Error("Erro ao carregar modelos locais.");
  }
};

export const initAI = async () => {
  const config = await ensureConfigLoaded();
  if (config.provider === 'browser') {
    await loadFaceModels();
  }
};

const urlToBlob = async (url: string): Promise<Blob> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao baixar imagem.");
    return res.blob();
};

const verifyCompreFace = async (selfieBlob: Blob, targetUrl: string, apiUrl: string, apiKey: string): Promise<boolean> => {
    try {
        const targetBlob = await urlToBlob(targetUrl);
        const formData = new FormData();
        formData.append('source_image', selfieBlob);
        formData.append('target_image', targetBlob);

        const cleanUrl = apiUrl.replace(/\/$/, "");
        const response = await fetch(`${cleanUrl}/api/v1/verification/verify`, {
            method: 'POST',
            headers: { 'x-api-key': apiKey },
            body: formData
        });

        if (!response.ok) return false;
        const data = await response.json();
        return data.result?.some((res: any) => 
            res.face_matches?.some((match: any) => match.similarity >= COMPREFACE_SIMILARITY_THRESHOLD)
        );
    } catch (e) {
        console.error("CompreFace Error:", e);
        return false;
    }
}

export const processSearch = async (
  selfieBase64: string,
  photos: PhotoData[],
  onProgress: (current: number, total: number, status: string) => void
): Promise<PhotoData[]> => {
  
  const config = await ensureConfigLoaded();

  if (config.provider === 'compre-face' && config.apiUrl && config.apiKey) {
    onProgress(0, photos.length, 'Iniciando busca em servidor VPS...');
    const selfieBlob = await (await fetch(selfieBase64)).blob();
    const matches: PhotoData[] = [];
    
    // Batch de 4 fotos simultâneas para máxima performance na VPS
    const BATCH_SIZE = 4; 
    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
        const batch = photos.slice(i, i + BATCH_SIZE);
        onProgress(i, photos.length, `Analisando fotos (${i + 1}/${photos.length})...`);
        
        const results = await Promise.all(batch.map(async (photo) => {
            const isMatch = await verifyCompreFace(selfieBlob, photo.src, config.apiUrl!, config.apiKey!);
            return isMatch ? photo : null;
        }));

        matches.push(...results.filter((p): p is PhotoData => p !== null));
    }

    onProgress(photos.length, photos.length, 'Busca profissional finalizada!');
    return matches;
  } else {
    onProgress(0, photos.length, 'Preparando motor local...');
    await loadFaceModels();
    const img = await faceapi.fetchImage(selfieBase64);
    const selfieDetection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!selfieDetection) throw new Error("NO_FACE_IN_SELFIE");

    const matches: PhotoData[] = [];
    for (let i = 0; i < photos.length; i++) {
      onProgress(i, photos.length, `Analisando localmente ${i + 1}/${photos.length}...`);
      try {
        const targetImg = await faceapi.fetchImage(photos[i].src);
        const detections = await faceapi.detectAllFaces(targetImg).withFaceLandmarks().withFaceDescriptors();
        const isMatch = detections.some(d => faceapi.euclideanDistance(selfieDetection.descriptor, d.descriptor) < BROWSER_MATCH_THRESHOLD);
        if (isMatch) matches.push(photos[i]);
      } catch (err) { console.warn("Erro na foto:", photos[i].id); }
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return matches;
  }
};
