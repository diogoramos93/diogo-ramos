
import { supabase } from './supabase';
import { EventData, PhotoData, UserData } from '../types';

const base64ToBlob = async (base64: string): Promise<Blob> => {
  try {
    const res = await fetch(base64);
    return await res.blob();
  } catch (e) {
    console.error("Erro ao converter base64 para Blob:", e);
    throw new Error("Falha ao processar imagem (base64 inválido ou corrompido).");
  }
};

/**
 * Helper para lidar com erros do Supabase de forma consistente
 */
const handleSupabaseError = (error: any, context: string) => {
  if (error) {
    console.error(`Erro no Supabase (${context}):`, error);
    // Se for um erro de rede/CORS, o Supabase SDK às vezes não preenche a mensagem corretamente
    throw new Error(error.message || `Erro de conexão com o banco de dados (${context}). Verifique sua internet e configurações.`);
  }
};

// --- Settings Operations (Global Config) ---

export const getGlobalSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle(); // maybeSingle evita erro de 0 linhas
    
    if (error) return null;
    return data?.value || null;
  } catch (e) {
    console.warn("Falha ao buscar configuração global:", key);
    return null;
  }
};

export const saveGlobalSetting = async (key: string, value: string) => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value });
    
    handleSupabaseError(error, 'saveGlobalSetting');
  } catch (e: any) {
    throw new Error(e.message || "Falha ao salvar configuração.");
  }
};

// --- User Operations ---

export const createUser = async (user: Omit<UserData, 'createdAt'>) => {
  try {
    const { error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        "createdAt": Date.now()
      });

    handleSupabaseError(error, 'createUser');
    return true;
  } catch (e: any) {
    throw new Error(e.message || "Erro ao criar usuário.");
  }
};

export const getUsers = async (): Promise<UserData[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, createdAt')
      .order('createdAt', { ascending: false });

    handleSupabaseError(error, 'getUsers');
    return (data as UserData[]) || [];
  } catch (e: any) {
    throw new Error(e.message || "Falha ao carregar lista de usuários.");
  }
};

export const loginUser = async (username: string, password: string): Promise<UserData | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error) return null;
    if (!data) return null;
    
    return {
      id: data.id,
      username: data.username,
      name: data.name,
      createdAt: data.createdAt
    };
  } catch (e) {
    return null;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    handleSupabaseError(error, 'deleteUser');
  } catch (e: any) {
    throw new Error(e.message || "Erro ao excluir usuário.");
  }
};

// --- Event Operations ---

export const createEvent = async (event: EventData) => {
  try {
    let coverUrl = event.coverImage;
    
    if (event.coverImage.startsWith('data:')) {
      const blob = await base64ToBlob(event.coverImage);
      const fileName = `covers/${event.id}_${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, blob);

      if (uploadError) throw new Error("Erro no upload da capa: " + uploadError.message);
      
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      coverUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from('events')
      .insert({
        id: event.id,
        name: event.name,
        date: event.date,
        password: event.password || null,
        "coverImage": coverUrl,
        "createdAt": event.createdAt,
        "createdBy": event.createdBy
      });

    handleSupabaseError(error, 'createEvent');
    return true;
  } catch (e: any) {
    throw new Error(e.message || "Erro ao criar evento.");
  }
};

export const getEvents = async (): Promise<EventData[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
       handleSupabaseError(error, 'getEvents');
    }
    return data || [];
  } catch (e: any) {
    // Captura o erro 'Failed to fetch' e provê um contexto melhor
    if (e instanceof TypeError && e.message === 'Failed to fetch') {
      throw new Error("Não foi possível conectar ao servidor Supabase. Verifique a URL do banco e se você tem acesso à internet.");
    }
    throw new Error(e.message || "Erro inesperado ao carregar eventos.");
  }
};

export const getEventById = async (id: string): Promise<EventData | undefined> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return undefined;
    return data || undefined;
  } catch (e) {
    return undefined;
  }
};

export const deleteEvent = async (id: string) => {
  try {
    const { error } = await supabase.from('events').delete().eq('id', id);
    handleSupabaseError(error, 'deleteEvent');
  } catch (e: any) {
    throw new Error(e.message || "Erro ao excluir evento.");
  }
};

// --- Photo Operations ---

export const addPhotos = async (photos: PhotoData[]) => {
  try {
    const uploadPromises = photos.map(async (photo) => {
      let srcUrl = photo.src;
      let originalUrl = '';

      if (photo.src.startsWith('data:')) {
        const blob = await base64ToBlob(photo.src);
        const fileName = `photos/${photo.eventId}/thumb_${photo.id}.jpg`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob);
        
        if (uploadError) {
          console.error("Upload error thumb:", uploadError);
        } else {
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          srcUrl = data.publicUrl;
        }
      }

      if (photo.original && photo.original instanceof Blob) {
        const fileName = `photos/${photo.eventId}/orig_${photo.id}.jpg`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, photo.original);
        if (uploadError) {
          console.error("Upload error orig:", uploadError);
          originalUrl = srcUrl;
        } else {
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          originalUrl = data.publicUrl;
        }
      } else {
        originalUrl = srcUrl;
      }

      const { error: insertError } = await supabase.from('photos').insert({
        id: photo.id,
        "eventId": photo.eventId,
        src: srcUrl,
        original: originalUrl,
        "createdAt": photo.createdAt
      });
      
      if (insertError) throw new Error("Erro ao registrar foto no banco: " + insertError.message);
    });

    await Promise.all(uploadPromises);
  } catch (e: any) {
    throw new Error(e.message || "Falha no upload das fotos.");
  }
};

export const getEventPhotos = async (eventId: string): Promise<PhotoData[]> => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('eventId', eventId);

    handleSupabaseError(error, 'getEventPhotos');
    return data || [];
  } catch (e: any) {
    throw new Error(e.message || "Erro ao carregar fotos do evento.");
  }
};
