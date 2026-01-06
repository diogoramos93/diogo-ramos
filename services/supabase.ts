
import { createClient } from '@supabase/supabase-js';

// 1. Tenta configurações dinâmicas salvas no LocalStorage (painel Admin)
const localConfig = localStorage.getItem('facefind_db_config');
let customUrl = '';
let customKey = '';

if (localConfig) {
  try {
    const parsed = JSON.parse(localConfig);
    customUrl = parsed.url?.trim() || '';
    customKey = parsed.key?.trim() || '';
  } catch (e) {
    console.error("Erro ao ler config do banco", e);
  }
}

// 2. Variáveis de ambiente (Vite)
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// 3. Fallback Hardcoded (Segurança de último caso)
const FALLBACK_URL = 'https://yzuahgbgzfdzvigesbtl.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWFoZ2JnemZkenZpZ2VzYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTU2NTAsImV4cCI6MjA3OTY5MTY1MH0.thj8G3HX39eRHifqH8mGZ6IAerzm4qJ2_OcL8uW3iSU';

// Prioridade: Custom (Painel) > Env (Build) > Fallback
let finalUrl = customUrl || envUrl || FALLBACK_URL;
let finalKey = customKey || envKey || FALLBACK_KEY;

// Normalização da URL para evitar erros de fetch se o usuário esquecer o protocolo
if (finalUrl && !finalUrl.startsWith('http')) {
  finalUrl = `https://${finalUrl}`;
}

// Garante que a URL não termine com barra, o que pode quebrar algumas chamadas internas do SDK
finalUrl = finalUrl?.replace(/\/$/, '');

if (!finalUrl || !finalKey) {
  console.warn('CRITICAL: Supabase URL or Key is missing. The app may not function correctly.');
}

// Inicialização segura
export const supabase = createClient(finalUrl, finalKey);

// Helper para saber se estamos usando config customizada
export const isUsingCustomConfig = !!customUrl;

// Helper para pegar a config atual (útil para debug no console)
export const getCurrentConfig = () => ({
  url: finalUrl,
  key: finalKey,
  source: customUrl ? 'local_storage' : (envUrl ? 'env_vars' : 'fallback')
});
