
import { supabase } from './supabase';
import { EventData, PhotoData, UserData } from '../types';

const base64ToBlob = async (base64: string): Promise<Blob> => {
  try {
    const res = await fetch(base64);
    return await res.blob();
  } catch (e) {
    throw new Error("Falha ao processar imagem.");
  }
};

const handleSupabaseError = (error: any, context: string) => {
  if (error) {
    console.error(`Erro no Supabase (${context}):`, error);
    if (error.code === '42501') throw new Error("Erro de Permissão (RLS).");
    throw new Error(error.message || `Erro no banco de dados (${context}).`);
  }
};

// --- Settings ---

export const getGlobalSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle(); 
    return error ? null : data?.value || null;
  } catch (e) { return null; }
};

export const saveGlobalSetting = async (key: string, value: string) => {
  try {
    const { error } = await supabase.from('settings').upsert({ key, value });
    handleSupabaseError(error, 'saveGlobalSetting');
  } catch (e: any) { throw new Error(e.message); }
};

// --- Users (Fotógrafos) ---

export const createUser = async (user: UserData) => {
  try {
    const { error } = await supabase.from('users').insert({ ...user, createdAt: Date.now() });
    handleSupabaseError(error, 'createUser');
  } catch (e: any) { throw new Error(e.message); }
};

export const getUsers = async (): Promise<UserData[]> => {
  try {
    const { data, error } = await supabase.from('users').select('*').order('createdAt', { ascending: false });
    handleSupabaseError(error, 'getUsers');
    return (data as UserData[]) || [];
  } catch (e: any) { throw new Error(e.message); }
};

export const loginUser = async (username: string, password: string): Promise<UserData | null> => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).maybeSingle();
    return error ? null : data as UserData || null;
  } catch (e) { return null; }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    handleSupabaseError(error, 'deleteUser');
  } catch (e: any) { throw new Error(e.message); }
};

// --- Events ---

export const createEvent = async (event: EventData) => {
  try {
    let coverUrl = event.coverImage;
    if (event.coverImage.startsWith('data:')) {
      const blob = await base64ToBlob(event.coverImage);
      const fileName = `covers/${event.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      coverUrl = data.publicUrl;
    }
    const { error } = await supabase.from('events').insert({ ...event, coverImage: coverUrl });
    handleSupabaseError(error, 'createEvent');
  } catch (e: any) { throw new Error(e.message); }
};

export const getEvents = async (): Promise<EventData[]> => {
  try {
    const { data, error } = await supabase.from('events').select('*').order('createdAt', { ascending: false });
    if (error) handleSupabaseError(error, 'getEvents');
    return data || [];
  } catch (e: any) { throw new Error(e.message); }
};

export const getEventById = async (id: string) => {
  try {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
    return error ? undefined : data as EventData || undefined;
  } catch (e) { return undefined; }
};

export const deleteEvent = async (id: string) => {
  try {
    const { error } = await supabase.from('events').delete().eq('id', id);
    handleSupabaseError(error, 'deleteEvent');
  } catch (e: any) { throw new Error(e.message); }
};

// --- Photos ---

export const addPhotos = async (photos: PhotoData[]) => {
  try {
    for (const photo of photos) {
      let srcUrl = photo.src;
      if (photo.src.startsWith('data:')) {
        const blob = await base64ToBlob(photo.src);
        const fileName = `photos/${photo.eventId}/p_${photo.id}.jpg`;
        await supabase.storage.from('images').upload(fileName, blob);
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        srcUrl = data.publicUrl;
      }
      await supabase.from('photos').insert({ ...photo, src: srcUrl, original: srcUrl });
    }
  } catch (e: any) { throw new Error(e.message); }
};

export const getEventPhotos = async (eventId: string): Promise<PhotoData[]> => {
  try {
    const { data, error } = await supabase.from('photos').select('*').eq('eventId', eventId);
    handleSupabaseError(error, 'getEventPhotos');
    return data || [];
  } catch (e: any) { throw new Error(e.message); }
};
