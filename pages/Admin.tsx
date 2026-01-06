
import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Upload, Plus, X, Calendar, Lock, Image as ImageIcon, CheckCircle, User, Key, LogIn, Users, Settings, Database, Download, LogOut, Save, BrainCircuit, Server, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createEvent, deleteEvent, getEvents, addPhotos, loginUser, getUsers, createUser, deleteUser, getGlobalSetting, saveGlobalSetting } from '../services/db';
import { supabase } from '../services/supabase';
import { EventData, UserData, AIProvider } from '../types';
import Layout from '../components/Layout';
import Button from '../components/Button';

const processImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        const finalWidth = img.width > maxWidth ? maxWidth : img.width;
        const finalHeight = img.width > maxWidth ? img.height * scaleSize : img.height;
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string, role: 'master' | 'user' } | null>(null);
  const [loginUserField, setLoginUserField] = useState('');
  const [loginPassField, setLoginPassField] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'users' | 'settings'>('events');
  const [events, setEvents] = useState<EventData[]>([]);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventPassword, setEventPassword] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // AI Settings
  const [aiProvider, setAiProvider] = useState<AIProvider>('browser');
  const [aiApiUrl, setAiApiUrl] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // DB Settings
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [dbTestStatus, setDbTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('facefind_auth');
    if (sessionAuth) {
      const user = JSON.parse(sessionAuth);
      setIsAuthenticated(true);
      setCurrentUser(user);
    }
    
    // Load Saved AI Config
    const loadAIConfig = async () => {
        const saved = await getGlobalSetting('facefind_ai_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            setAiProvider(parsed.provider);
            setAiApiUrl(parsed.apiUrl || '');
            setAiApiKey(parsed.apiKey || '');
        }
    };

    // Load DB Config from LocalStorage
    const loadDBConfig = () => {
      const local = localStorage.getItem('facefind_db_config');
      if (local) {
        const parsed = JSON.parse(local);
        setDbUrl(parsed.url || '');
        setDbKey(parsed.key || '');
      }
    };

    loadAIConfig();
    loadDBConfig();
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshData();
  }, [isAuthenticated, activeTab]);

  const refreshData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'events') {
        const data = await getEvents();
        setEvents(currentUser?.role === 'master' ? (data || []) : (data || []).filter(e => e.createdBy === currentUser?.id));
      } else if (activeTab === 'users' && currentUser?.role === 'master') {
        setUsersList(await getUsers());
      }
    } catch (err: any) { 
        console.error("Admin refresh error:", err?.message || err); 
    }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(false);
    try {
      // Credenciais Master Padrão
      if (loginUserField === 'admin' && loginPassField === '123') {
        finishLogin({ id: 'master', name: 'Admin Master', role: 'master' });
        return;
      }
      const dbUser = await loginUser(loginUserField, loginPassField);
      if (dbUser) finishLogin({ id: dbUser.id, name: dbUser.name, role: 'user' });
      else setLoginError(true);
    } catch (err: any) { 
        console.error("Login error:", err?.message || err);
        setLoginError(true); 
    }
    finally { setLoginLoading(false); }
  };

  const finishLogin = (user: any) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    sessionStorage.setItem('facefind_auth', JSON.stringify(user));
  };

  const testAIConnection = async () => {
    if (!aiApiUrl || !aiApiKey) {
        alert("Preencha a URL e a API Key antes de testar.");
        return;
    }
    setTestStatus('testing');
    try {
        const cleanUrl = aiApiUrl.replace(/\/$/, "");
        const response = await fetch(`${cleanUrl}/api/v1/verification/verify`, {
            method: 'POST',
            headers: { 'x-api-key': aiApiKey },
            body: new FormData()
        });
        if (response.status === 400 || response.ok) setTestStatus('success');
        else setTestStatus('error');
    } catch (e) {
        setTestStatus('error');
    }
  };

  const testDBConnection = async () => {
    setDbTestStatus('testing');
    try {
      // Tenta uma consulta simples para validar a conexão
      const { error } = await supabase.from('events').select('count', { count: 'exact', head: true });
      if (error) throw error;
      setDbTestStatus('success');
    } catch (e) {
      console.error(e);
      setDbTestStatus('error');
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
        // Save AI
        const aiConfig = { provider: aiProvider, apiUrl: aiApiUrl, apiKey: aiApiKey };
        await saveGlobalSetting('facefind_ai_config', JSON.stringify(aiConfig));
        
        // Save DB to LocalStorage
        const dbConfig = { url: dbUrl, key: dbKey };
        localStorage.setItem('facefind_db_config', JSON.stringify(dbConfig));
        
        alert("Todas as configurações salvas! A página será recarregada para aplicar as mudanças de banco.");
        window.location.reload();
    } catch (e: any) {
        alert("Erro ao salvar: " + (e?.message || "Erro desconhecido"));
    } finally {
        setLoading(false);
    }
  };

  const resetDB = () => {
    if (confirm("Resetar para as configurações de banco padrão do sistema?")) {
      localStorage.removeItem('facefind_db_config');
      window.location.reload();
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !coverImage) return;
    setLoading(true);
    setUploadProgress('Processando...');
    try {
      const newEvent = { id: uuidv4(), name: eventName, date: eventDate, coverImage, password: eventPassword || undefined, createdAt: Date.now(), createdBy: currentUser?.id };
      await createEvent(newEvent);
      if (eventPhotos.length > 0) {
        const photosToSave = await Promise.all(eventPhotos.map(async (file) => ({
            id: uuidv4(), eventId: newEvent.id, src: await processImage(file), original: file, createdAt: Date.now()
        })));
        await addPhotos(photosToSave as any);
      }
      setIsCreatingEvent(false);
      refreshData();
      alert('Evento criado com sucesso!');
    } catch (err: any) { 
        alert('Erro ao criar evento: ' + (err?.message || "Erro desconhecido")); 
    }
    finally { setLoading(false); setUploadProgress(''); }
  };

  if (!isAuthenticated) return (
    <Layout>
      <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-900">Acesso Administrativo</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Usuário" value={loginUserField} onChange={e => setLoginUserField(e.target.value)} />
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Senha" value={loginPassField} onChange={e => setLoginPassField(e.target.value)} />
          {loginError && <p className="text-red-500 text-sm">Credenciais inválidas. Tente admin / 123</p>}
          <Button type="submit" className="w-full" isLoading={loginLoading}>Entrar</Button>
        </form>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Olá, {currentUser?.name}</h1>
            <p className="text-slate-500 text-sm">Gerencie seus eventos e infraestrutura.</p>
        </div>
        <Button variant="secondary" onClick={() => { sessionStorage.removeItem('facefind_auth'); window.location.reload(); }}>
            <LogOut className="w-4 h-4"/> Sair
        </Button>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('events')} className={`px-4 py-3 whitespace-nowrap font-medium transition-all ${activeTab === 'events' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Eventos</button>
        {currentUser?.role === 'master' && <button onClick={() => setActiveTab('users')} className={`px-4 py-3 whitespace-nowrap font-medium transition-all ${activeTab === 'users' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Usuários</button>}
        {currentUser?.role === 'master' && <button onClick={() => setActiveTab('settings')} className={`px-4 py-3 whitespace-nowrap font-medium transition-all ${activeTab === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Configurações Técnicas</button>}
      </div>

      {activeTab === 'events' && (
        <>
            <div className="flex justify-end mb-4">
                {!isCreatingEvent && <Button onClick={() => setIsCreatingEvent(true)}><Plus className="w-4 h-4"/> Novo Evento</Button>}
            </div>
            {isCreatingEvent ? (
                <form onSubmit={handleCreateEvent} className="bg-white p-6 border rounded-xl space-y-4 mb-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="border p-2 rounded" placeholder="Nome do Evento" value={eventName} onChange={e => setEventName(e.target.value)} required />
                        <input className="border p-2 rounded" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                    </div>
                    <input className="w-full border p-2 rounded" type="password" placeholder="Senha da Galeria (opcional)" value={eventPassword} onChange={e => setEventPassword(e.target.value)} />
                    
                    <div className="border-2 border-dashed p-4 text-center cursor-pointer rounded-lg hover:bg-slate-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        {coverImage ? <img src={coverImage} className="h-32 mx-auto rounded shadow-sm"/> : (
                            <div className="text-slate-400 py-4">
                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                                <p>Clique para selecionar a Capa</p>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async e => e.target.files && setCoverImage(await processImage(e.target.files[0]))} />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Fotos do Evento</label>
                        <input type="file" multiple accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" onChange={e => e.target.files && setEventPhotos(Array.from(e.target.files))} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsCreatingEvent(false)}>Cancelar</Button>
                        <Button type="submit" isLoading={loading}>{uploadProgress || "Criar Evento"}</Button>
                    </div>
                </form>
            ) : (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr><th className="p-4 font-semibold">Evento</th><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold text-right">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {events.map(ev => (
                                <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-900">{ev.name}</td>
                                    <td className="p-4 text-slate-500 text-sm">{new Date(ev.date + 'T00:00:00').toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={async () => { if(confirm('Excluir evento?')) { await deleteEvent(ev.id); refreshData(); }}} className="text-slate-400 hover:text-red-500 p-2">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* AI Config */}
            <div className="bg-white p-6 border rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900"><BrainCircuit className="text-indigo-600"/> Motor de Reconhecimento</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Provedor</label>
                        <select className="w-full border p-2 rounded" value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)}>
                            <option value="browser">Navegador (Lento, Grátis)</option>
                            <option value="compre-face">Exadel CompreFace (Rápido, Profissional)</option>
                        </select>
                    </div>
                    {aiProvider === 'compre-face' && (
                        <>
                            <input className="w-full border p-2 rounded" value={aiApiUrl} onChange={e => setAiApiUrl(e.target.value)} placeholder="URL do CompreFace (ex: http://62.72.11.108:8000)" />
                            <input className="w-full border p-2 rounded" type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="API Key do Verification Service" />
                            <div className="flex items-center justify-between p-2 bg-slate-50 rounded border text-xs">
                                <span className="flex items-center gap-2">
                                    {testStatus === 'success' ? <CheckCircle className="text-green-500 w-4 h-4"/> : <Activity className="w-4 h-4"/>}
                                    Status: {testStatus}
                                </span>
                                <button onClick={testAIConnection} className="text-indigo-600 font-bold">Testar IA</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* DB Config */}
            <div className="bg-white p-6 border rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900"><Database className="text-indigo-600"/> Banco de Dados (Supabase)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Supabase URL</label>
                        <input className="w-full border p-2 rounded" value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="https://xyz.supabase.co" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Supabase Anon Key</label>
                        <input className="w-full border p-2 rounded" type="password" value={dbKey} onChange={e => setDbKey(e.target.value)} placeholder="Sua chave pública anon" />
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 p-2 bg-slate-50 rounded border text-xs">
                            {dbTestStatus === 'success' ? <CheckCircle className="text-green-500 w-4 h-4"/> : <RefreshCw className={`w-4 h-4 ${dbTestStatus === 'testing' ? 'animate-spin' : ''}`}/>}
                            Conexão: {dbTestStatus}
                        </div>
                        <button onClick={testDBConnection} className="px-3 py-1 bg-slate-100 rounded text-xs font-bold hover:bg-slate-200">Testar Banco</button>
                        <button onClick={resetDB} className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100">Resetar p/ Padrão</button>
                    </div>
                    <p className="text-[10px] text-slate-400">Nota: Ao alterar o banco, você precisa recarregar a página para que as fotos e eventos do novo banco apareçam.</p>
                </div>
            </div>
            
            <div className="flex justify-end">
                <Button onClick={saveSettings} isLoading={loading} className="px-10"><Save className="w-4 h-4"/> Salvar Tudo</Button>
            </div>
        </div>
      )}
    </Layout>
  );
};

export default Admin;
