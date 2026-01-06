
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

// 3. Fallback Hardcoded (Segurança de último caso - nuvem padrão)
const FALLBACK_URL = 'https://yzuahgbgzfdzvigesbtl.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dWFoZ2JnemZkenZpZ2VzYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTU2NTAsImV4cCI6MjA3OTY5MTY1MH0.thj8G3HX39eRHifqH8mGZ6IAerzm4qJ2_OcL8uW3iSU';

// Prioridade: Custom (Painel) > Env (Build) > Fallback
let finalUrl = customUrl || envUrl || FALLBACK_URL;
let finalKey = customKey || envKey || FALLBACK_KEY;

// Normalização inteligente da URL
if (finalUrl) {
    // Se for um IP ou localhost sem protocolo, adiciona http (comum em VPS local)
    if (!finalUrl.startsWith('http')) {
        const isLocal = finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(finalUrl);
        finalUrl = isLocal ? `http://${finalUrl}` : `https://${finalUrl}`;
    }
    // Remove barra final
    finalUrl = finalUrl.replace(/\/$/, '');
}

// Inicialização segura com suporte a instâncias Self-Hosted (pode requerer configurações adicionais de CORS no servidor)
export const supabase = createClient(finalUrl, finalKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

export const isUsingCustomConfig = !!customUrl;
