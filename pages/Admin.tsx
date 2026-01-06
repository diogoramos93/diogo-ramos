
import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Plus, X, Image as ImageIcon, CheckCircle, Database, LogOut, Save, BrainCircuit, Server, Activity, AlertCircle, RefreshCw, UserPlus, Copy, Terminal, ExternalLink, Cpu, Globe, ShieldCheck, Box, Settings, User, Key, Mail, LayoutDashboard, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createEvent, deleteEvent, getEvents, addPhotos, loginUser, getUsers, createUser, deleteUser, getGlobalSetting, saveGlobalSetting } from '../services/db';
import { supabase } from '../services/supabase';
import { EventData, UserData, AIProvider } from '../types';
import Layout from '../components/Layout';
import Button from '../components/Button';

const processImage = (file: File, maxWidth = 1000): Promise<string> => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
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
  const [activeTab, setActiveTab] = useState<'events' | 'users' | 'infra' | 'vps'>('events');
  const [events, setEvents] = useState<EventData[]>([]);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  // User Management
  const [newUserName, setNewUserName] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPass, setNewUserPass] = useState('');

  // Event Form
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventPassword, setEventPassword] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  // Configs
  const [aiProvider, setAiProvider] = useState<AIProvider>('browser');
  const [aiApiUrl, setAiApiUrl] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedAI = await getGlobalSetting('facefind_ai_config');
    if (savedAI) {
        const parsed = JSON.parse(savedAI);
        setAiProvider(parsed.provider);
        setAiApiUrl(parsed.apiUrl || '');
        setAiApiKey(parsed.apiKey || '');
    }
    const localDB = localStorage.getItem('facefind_db_config');
    if (localDB) {
      const parsed = JSON.parse(localDB);
      setDbUrl(parsed.url || '');
      setDbKey(parsed.key || '');
    }
  };

  useEffect(() => {
    if (isAuthenticated) refreshData();
  }, [isAuthenticated, activeTab]);

  const refreshData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'events') {
        const data = await getEvents();
        setEvents(currentUser?.role === 'master' ? (data || []) : (data || []).filter(e => e.createdBy === currentUser?.id));
      } else if (activeTab === 'users') {
        const data = await getUsers();
        setUsersList(data || []);
      }
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (loginUserField === 'admin' && loginPassField === '123') {
        const user = { id: 'master', name: 'Admin Master', role: 'master' };
        setCurrentUser(user as any);
        setIsAuthenticated(true);
        sessionStorage.setItem('facefind_auth', JSON.stringify(user));
    } else {
        const dbUser = await loginUser(loginUserField, loginPassField);
        if (dbUser) {
            const user = { id: dbUser.id, name: dbUser.name, role: 'user' };
            setCurrentUser(user as any);
            setIsAuthenticated(true);
            sessionStorage.setItem('facefind_auth', JSON.stringify(user));
        } else setLoginError(true);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserLogin || !newUserPass) return;
    setLoading(true);
    try {
        await createUser({
            id: uuidv4(),
            name: newUserName,
            username: newUserLogin,
            password: newUserPass,
            createdAt: Date.now()
        });
        setNewUserName(''); setNewUserLogin(''); setNewUserPass('');
        refreshData();
        alert('Fotógrafo cadastrado com sucesso!');
    } catch (e: any) { alert("Erro ao criar fotógrafo: " + e.message); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (id: string) => {
      if (!confirm('Deseja excluir este fotógrafo permanentemente?')) return;
      setLoading(true);
      try { 
        await deleteUser(id); 
        setUsersList(prev => prev.filter(u => u.id !== id));
        alert('Fotógrafo removido.');
      } catch (e: any) { alert(e.message); }
      finally { setLoading(false); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !coverImage) return;
    setLoading(true);
    setUploadProgress('Processando Imagens...');
    try {
      const eventId = uuidv4();
      const newEvent = { id: eventId, name: eventName, date: eventDate, coverImage, password: eventPassword || undefined, createdAt: Date.now(), createdBy: currentUser?.id };
      await createEvent(newEvent);
      if (eventPhotos.length > 0) {
        setUploadProgress(`Enviando ${eventPhotos.length} fotos...`);
        const photosToSave = await Promise.all(eventPhotos.map(async (file) => ({
            id: uuidv4(), eventId, src: await processImage(file, 800), original: file, createdAt: Date.now()
        })));
        await addPhotos(photosToSave as any);
      }
      setIsCreatingEvent(false); refreshData();
      alert('Evento publicado com sucesso!');
    } catch (err: any) { alert('Erro: ' + err.message); }
    finally { setLoading(false); setUploadProgress(''); }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Excluir este evento permanentemente?')) return;
    setLoading(true);
    try { await deleteEvent(id); refreshData(); } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const saveAllConfigs = async () => {
    setLoading(true);
    try {
        await saveGlobalSetting('facefind_ai_config', JSON.stringify({ provider: aiProvider, apiUrl: aiApiUrl, apiKey: aiApiKey }));
        localStorage.setItem('facefind_db_config', JSON.stringify({ url: dbUrl, key: dbKey }));
        alert("Configurações salvas no servidor!");
        window.location.reload();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const testDB = async () => {
      setDbTestStatus('testing');
      try {
          const { error } = await supabase.from('events').select('count', { count: 'exact', head: true });
          if (error) throw error;
          setDbTestStatus('success');
      } catch (e) { setDbTestStatus('error'); }
  };

  if (!isAuthenticated) return (
    <Layout>
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-2xl border border-slate-100">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm">Entre para gerenciar suas galerias</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Usuário</label>
              <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Digite seu login" value={loginUserField} onChange={e => setLoginUserField(e.target.value)} />
          </div>
          <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Senha</label>
              <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" type="password" placeholder="Digite sua senha" value={loginPassField} onChange={e => setLoginPassField(e.target.value)} />
          </div>
          {loginError && <p className="text-red-500 text-xs text-center font-bold animate-pulse">Usuário ou senha inválidos.</p>}
          <Button type="submit" className="w-full h-12 shadow-lg shadow-indigo-100" isLoading={loading}>Entrar no Sistema</Button>
        </form>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><LayoutDashboard className="text-indigo-600"/> Dashboard Admin</h1>
            <p className="text-slate-500 text-sm">Operando como: <span className="font-bold text-indigo-600">{currentUser?.name}</span></p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { sessionStorage.removeItem('facefind_auth'); window.location.reload(); }}><LogOut className="w-4 h-4"/> Sair</Button>
        </div>
      </div>

      <div className="flex border-b mb-8 overflow-x-auto no-scrollbar gap-2 scroll-smooth">
        <button onClick={() => setActiveTab('events')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all flex items-center gap-2 ${activeTab === 'events' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><ImageIcon className="w-4 h-4"/> Galerias</button>
        {currentUser?.role === 'master' && (
            <>
                <button onClick={() => setActiveTab('users')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><UserPlus className="w-4 h-4"/> Fotógrafos</button>
                <button onClick={() => setActiveTab('infra')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all flex items-center gap-2 ${activeTab === 'infra' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Settings className="w-4 h-4"/> Configurações</button>
                <button onClick={() => setActiveTab('vps')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all flex items-center gap-2 ${activeTab === 'vps' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Terminal className="w-4 h-4"/> Guia VPS</button>
            </>
        )}
      </div>

      {activeTab === 'events' && (
          <div className="animate-in fade-in duration-500">
             {!isCreatingEvent ? (
                 <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-700">Minhas Galerias</h2>
                        <Button onClick={() => setIsCreatingEvent(true)}><Plus className="w-4 h-4"/> Nova Galeria</Button>
                    </div>
                    {events.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                            <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Você ainda não publicou nenhum evento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map(ev => (
                                <div key={ev.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all">
                                    <div className="aspect-video relative">
                                        <img src={ev.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => window.open(`#/event/${ev.id}`, '_blank')} className="bg-white p-3 rounded-full text-indigo-600 shadow-lg hover:scale-110 transition-transform" title="Ver Galeria"><ExternalLink className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteEvent(ev.id)} className="bg-red-500 p-3 rounded-full text-white shadow-lg hover:scale-110 transition-transform" title="Excluir"><Trash2 className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{ev.name}</h3>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(ev.date + 'T00:00:00').toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </>
             ) : (
                <form onSubmit={handleCreateEvent} className="bg-white p-8 rounded-3xl border shadow-2xl max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-black text-slate-900">Nova Galeria Fotográfica</h2>
                        <button type="button" onClick={() => setIsCreatingEvent(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="text-slate-400"/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">NOME DO EVENTO</label>
                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Casamento Luiza & Marcos" value={eventName} onChange={e => setEventName(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">DATA</label>
                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">SENHA DA GALERIA (DEIXE EM BRANCO SE PÚBLICO)</label>
                        <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Opcional" value={eventPassword} onChange={e => setEventPassword(e.target.value)} />
                    </div>
                    <div className="border-2 border-dashed border-indigo-100 rounded-3xl p-8 text-center cursor-pointer hover:bg-indigo-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        {coverImage ? <img src={coverImage} className="h-48 mx-auto rounded-2xl shadow-xl" /> : <div className="py-6 text-slate-400"><ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-20 text-indigo-600"/><p className="font-medium">Toque para escolher a Foto de Capa</p></div>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async e => e.target.files && setCoverImage(await processImage(e.target.files[0], 1200))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">IMPORTAR FOTOS DO EVENTO</label>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <input type="file" multiple accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" onChange={e => e.target.files && setEventPhotos(Array.from(e.target.files))} />
                             {eventPhotos.length > 0 && <p className="text-[10px] mt-2 font-bold text-indigo-600 uppercase tracking-widest">{eventPhotos.length} fotos selecionadas para upload</p>}
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-14 text-lg shadow-xl" isLoading={loading}>{uploadProgress || "Publicar Evento Agora"}</Button>
                </form>
             )}
          </div>
      )}

      {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
              <div className="md:col-span-1">
                  <form onSubmit={handleCreateUser} className="bg-white p-8 rounded-3xl border shadow-sm space-y-5">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><UserPlus className="w-5 h-5"/></div>
                          <h3 className="font-bold text-slate-800">Novo Fotógrafo</h3>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1">NOME COMPLETO</label>
                          <input className="w-full border p-3 rounded-xl text-sm" placeholder="Nome do profissional" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1">LOGIN DE ACESSO</label>
                          <input className="w-full border p-3 rounded-xl text-sm font-mono" placeholder="Ex: joao_fotos" value={newUserLogin} onChange={e => setNewUserLogin(e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1">SENHA</label>
                          <input className="w-full border p-3 rounded-xl text-sm" type="password" placeholder="Crie uma senha forte" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" isLoading={loading}>Criar Conta</Button>
                  </form>
              </div>
              <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between px-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-indigo-600"/> Lista de Profissionais</h3>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{usersList.length} usuários</span>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                              <tr>
                                  <th className="px-6 py-4">Nome</th>
                                  <th className="px-6 py-4">Login</th>
                                  <th className="px-6 py-4 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {usersList.length === 0 ? (
                                  <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-sm">Nenhum fotógrafo cadastrado além do master.</td></tr>
                              ) : (
                                  usersList.map(u => (
                                      <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                          <td className="px-6 py-4 font-bold text-slate-700">{u.name}</td>
                                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{u.username}</td>
                                          <td className="px-6 py-4 text-center">
                                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"><Trash2 className="w-5 h-5"/></button>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'infra' && (
          <div className="max-w-2xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-900"><Database className="w-5 h-5 text-indigo-600"/> Banco de Dados (Supabase)</h3>
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1">SUPABASE URL</label>
                          <input className="w-full border p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://seu-id.supabase.co" value={dbUrl} onChange={e => setDbUrl(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1">SUPABASE ANON KEY</label>
                          <input className="w-full border p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Cole a Anon Key aqui" type="password" value={dbKey} onChange={e => setDbKey(e.target.value)} />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <button onClick={testDB} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><RefreshCw className={`w-3 h-3 ${dbTestStatus === 'testing' ? 'animate-spin' : ''}`}/> Testar Conexão</button>
                        {dbTestStatus === 'success' && <p className="text-green-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Banco Online</p>}
                        {dbTestStatus === 'error' && <p className="text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Erro de Config</p>}
                      </div>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-900"><BrainCircuit className="w-5 h-5 text-indigo-600"/> Motor de Reconhecimento Facial</h3>
                  <div className="space-y-5">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1">MODO DE PROCESSAMENTO</label>
                          <select className="w-full border p-3 rounded-xl font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)}>
                              <option value="browser">Processamento no Navegador (Grátis & Offline)</option>
                              <option value="compre-face">Exadel CompreFace (Alta Velocidade VPS)</option>
                          </select>
                      </div>
                      {aiProvider === 'compre-face' && (
                          <div className="space-y-4 animate-in fade-in">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 ml-1">URL DO SERVIDOR DE IA</label>
                                  <input className="w-full border p-3 rounded-xl text-sm font-mono" placeholder="Ex: http://seu-ip:8000" value={aiApiUrl} onChange={e => setAiApiUrl(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 ml-1">API KEY (VERIFICATION SERVICE)</label>
                                  <input className="w-full border p-3 rounded-xl text-sm font-mono" placeholder="Chave de verificação" type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} />
                              </div>
                          </div>
                      )}
                  </div>
              </div>
              <Button onClick={saveAllConfigs} className="w-full h-14 text-lg shadow-xl" isLoading={loading}><Save className="w-5 h-5"/> Salvar Infraestrutura</Button>
          </div>
      )}

      {activeTab === 'vps' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
              <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Server className="w-64 h-64" /></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-green-500 rounded-2xl shadow-lg shadow-green-500/20"><Terminal className="w-8 h-8 text-slate-900" /></div>
                        <div>
                            <h2 className="text-3xl font-black italic">DEPLOY MASTER</h2>
                            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Manual SSH / Git Clone</p>
                        </div>
                    </div>
                    
                    <div className="space-y-10">
                        <div className="bg-indigo-600/10 p-6 rounded-2xl border border-indigo-500/20 flex items-start gap-4">
                            <FileText className="w-10 h-10 text-indigo-400 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-lg text-indigo-100">Manual Completo Gerado</h4>
                                <p className="text-slate-400 text-sm leading-relaxed mb-4">Você encontrará o arquivo <b>MANUAL_VPS_COMPLETO.md</b> na raiz do projeto após clonar. Ele contém todos os comandos necessários para subir o servidor do zero.</p>
                                <a href="https://github.com/exadel-inc/CompreFace" target="_blank" className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1">Docs CompreFace <ExternalLink className="w-3 h-3"/></a>
                            </div>
                        </div>

                        <section className="space-y-4">
                            <h3 className="text-green-400 font-black flex items-center gap-2 text-sm uppercase tracking-tighter italic">Step 01: Instalar Docker na VPS</h3>
                            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 font-mono text-xs text-green-300 relative group">
                                <button onClick={() => { navigator.clipboard.writeText("curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"); alert('Copiado!'); }} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><Copy className="w-4 h-4"/></button>
                                <code>curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh</code>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-green-400 font-black flex items-center gap-2 text-sm uppercase tracking-tighter italic">Step 02: Rodar Motor Facial</h3>
                            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 font-mono text-xs text-slate-300 relative group">
                                <button onClick={() => { navigator.clipboard.writeText("mkdir compreface && cd compreface && wget -qO- https://raw.githubusercontent.com/exadel-inc/CompreFace/master/install.sh | bash"); alert('Copiado!'); }} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><Copy className="w-4 h-4"/></button>
                                <code>mkdir compreface && cd compreface<br/>wget -qO- https://raw.githubusercontent.com/exadel-inc/CompreFace/master/install.sh | bash</code>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-green-400 font-black flex items-center gap-2 text-sm uppercase tracking-tighter italic">Step 03: Firewall e Portas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                    <p className="text-[10px] text-slate-500 font-bold mb-1">HTTP</p>
                                    <p className="text-lg font-black text-white">80</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                    <p className="text-[10px] text-slate-500 font-bold mb-1">HTTPS</p>
                                    <p className="text-lg font-black text-white">443</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                    <p className="text-[10px] text-slate-500 font-bold mb-1">IA API</p>
                                    <p className="text-lg font-black text-indigo-400">8000</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                    <p className="text-[10px] text-slate-500 font-bold mb-1">IA ADMIN</p>
                                    <p className="text-lg font-black text-indigo-400">8001</p>
                                </div>
                            </div>
                        </section>
                    </div>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default Admin;
