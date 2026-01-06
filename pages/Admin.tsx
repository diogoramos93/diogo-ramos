
import React, { useEffect, useState, useRef } from 'react';
/* Added LayoutDashboard to the imports from lucide-react */
import { Trash2, Plus, X, Image as ImageIcon, CheckCircle, Database, LogOut, Save, BrainCircuit, Server, Activity, AlertCircle, RefreshCw, UserPlus, Copy, Terminal, ExternalLink, Cpu, Globe, ShieldCheck, Box, Settings, User, Key, Mail, LayoutDashboard } from 'lucide-react';
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
        /* Added missing createdAt property to satisfy UserData interface */
        await createUser({
            id: uuidv4(),
            name: newUserName,
            username: newUserLogin,
            password: newUserPass,
            createdAt: Date.now()
        });
        setNewUserName(''); setNewUserLogin(''); setNewUserPass('');
        refreshData();
        alert('Fotógrafo cadastrado!');
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (id: string) => {
      if (!confirm('Excluir este fotógrafo? Ele perderá acesso ao painel.')) return;
      setLoading(true);
      try { await deleteUser(id); refreshData(); } catch (e: any) { alert(e.message); }
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
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-2xl border">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm">Painel de Fotógrafos</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Usuário" value={loginUserField} onChange={e => setLoginUserField(e.target.value)} />
          <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Senha" value={loginPassField} onChange={e => setLoginPassField(e.target.value)} />
          {loginError && <p className="text-red-500 text-xs text-center font-bold">Acesso negado.</p>}
          <Button type="submit" className="w-full h-12" isLoading={loading}>Entrar</Button>
        </form>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><LayoutDashboard className="text-indigo-600"/> Dashboard</h1>
            <p className="text-slate-500 text-sm">Olá, <b>{currentUser?.name}</b></p>
        </div>
        <Button variant="secondary" onClick={() => { sessionStorage.removeItem('facefind_auth'); window.location.reload(); }}><LogOut className="w-4 h-4"/> Sair</Button>
      </div>

      <div className="flex border-b mb-8 overflow-x-auto no-scrollbar gap-2">
        <button onClick={() => setActiveTab('events')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all ${activeTab === 'events' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Eventos</button>
        {currentUser?.role === 'master' && (
            <>
                <button onClick={() => setActiveTab('users')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all ${activeTab === 'users' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Fotógrafos</button>
                <button onClick={() => setActiveTab('infra')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all ${activeTab === 'infra' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Configurações</button>
                <button onClick={() => setActiveTab('vps')} className={`px-6 py-3 whitespace-nowrap font-bold transition-all ${activeTab === 'vps' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Guia VPS</button>
            </>
        )}
      </div>

      {activeTab === 'events' && (
          <div>
             {!isCreatingEvent ? (
                 <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold">Galerias Publicadas</h2>
                        <Button onClick={() => setIsCreatingEvent(true)}><Plus className="w-4 h-4"/> Novo Evento</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {events.map(ev => (
                            <div key={ev.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden group">
                                <div className="aspect-video relative">
                                    <img src={ev.coverImage} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => window.open(`#/event/${ev.id}`, '_blank')} className="bg-white p-2 rounded-full text-indigo-600"><ExternalLink className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteEvent(ev.id)} className="bg-red-500 p-2 rounded-full text-white"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <div className="p-4"><h3 className="font-bold">{ev.name}</h3></div>
                            </div>
                        ))}
                    </div>
                 </>
             ) : (
                <form onSubmit={handleCreateEvent} className="bg-white p-8 rounded-2xl border shadow-lg max-w-2xl mx-auto space-y-6">
                    <h2 className="text-xl font-bold">Criar Nova Galeria</h2>
                    <input className="w-full border p-3 rounded-xl" placeholder="Nome do Evento" value={eventName} onChange={e => setEventName(e.target.value)} required />
                    <input className="w-full border p-3 rounded-xl" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                    <input className="w-full border p-3 rounded-xl" placeholder="Senha da Galeria (Opcional)" value={eventPassword} onChange={e => setEventPassword(e.target.value)} />
                    <div className="border-2 border-dashed rounded-2xl p-6 text-center" onClick={() => fileInputRef.current?.click()}>
                        {coverImage ? <img src={coverImage} className="h-32 mx-auto rounded-xl" /> : <p className="text-slate-400">Clique para selecionar a Capa</p>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async e => e.target.files && setCoverImage(await processImage(e.target.files[0], 1200))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">SELECIONAR FOTOS DO EVENTO</label>
                        <input type="file" multiple accept="image/*" className="w-full text-sm" onChange={e => e.target.files && setEventPhotos(Array.from(e.target.files))} />
                    </div>
                    <Button type="submit" className="w-full" isLoading={loading}>{uploadProgress || "Publicar Evento"}</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setIsCreatingEvent(false)}>Cancelar</Button>
                </form>
             )}
          </div>
      )}

      {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                  <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                      <h3 className="font-bold text-indigo-600 flex items-center gap-2"><UserPlus className="w-4 h-4"/> Novo Fotógrafo</h3>
                      <input className="w-full border p-2 rounded-lg text-sm" placeholder="Nome Completo" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                      <input className="w-full border p-2 rounded-lg text-sm" placeholder="Login (Usuário)" value={newUserLogin} onChange={e => setNewUserLogin(e.target.value)} required />
                      <input className="w-full border p-2 rounded-lg text-sm" type="password" placeholder="Senha" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required />
                      <Button type="submit" className="w-full" isLoading={loading}>Cadastrar</Button>
                  </form>
              </div>
              <div className="md:col-span-2 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><User className="w-4 h-4"/> Fotógrafos Cadastrados</h3>
                  <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                              <tr>
                                  <th className="px-4 py-3">Nome</th>
                                  <th className="px-4 py-3">Login</th>
                                  <th className="px-4 py-3">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {usersList.map(u => (
                                  <tr key={u.id} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-medium">{u.name}</td>
                                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.username}</td>
                                      <td className="px-4 py-3">
                                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'infra' && (
          <div className="max-w-2xl mx-auto space-y-8 pb-10">
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-indigo-600"/> Banco de Dados</h3>
                  <div className="space-y-4">
                      <input className="w-full border p-2 rounded-lg text-sm font-mono" placeholder="Supabase URL" value={dbUrl} onChange={e => setDbUrl(e.target.value)} />
                      <input className="w-full border p-2 rounded-lg text-sm font-mono" placeholder="Supabase Anon Key" type="password" value={dbKey} onChange={e => setDbKey(e.target.value)} />
                      <button onClick={testDB} className="text-xs font-bold text-indigo-600 hover:underline">Testar Conexão</button>
                      {dbTestStatus === 'success' && <p className="text-green-600 text-xs font-bold">Conectado!</p>}
                  </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-indigo-600"/> Motor de IA</h3>
                  <select className="w-full border p-2 rounded-lg mb-4" value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)}>
                      <option value="browser">Navegador (Grátis - Mais Lento)</option>
                      <option value="compre-face">CompreFace (VPS - Alta Performance)</option>
                  </select>
                  {aiProvider === 'compre-face' && (
                      <div className="space-y-4">
                          <input className="w-full border p-2 rounded-lg text-sm font-mono" placeholder="URL da IA (Ex: http://seu-ip:8000)" value={aiApiUrl} onChange={e => setAiApiUrl(e.target.value)} />
                          <input className="w-full border p-2 rounded-lg text-sm font-mono" placeholder="API Key da IA" type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} />
                      </div>
                  )}
              </div>
              <Button onClick={saveAllConfigs} className="w-full h-12" isLoading={loading}><Save className="w-4 h-4"/> Salvar Tudo</Button>
          </div>
      )}

      {activeTab === 'vps' && (
          <div className="max-w-3xl mx-auto bg-slate-900 text-white p-8 rounded-3xl shadow-2xl space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-3"><Terminal className="text-green-400"/> Guia de Instalação SSH</h2>
              
              <section className="space-y-4">
                  <h3 className="text-indigo-400 font-bold">1. Instalar Requisitos</h3>
                  <div className="bg-black/50 p-4 rounded-xl border border-white/10 relative">
                      <code className="text-xs text-green-400">
                        sudo apt update && sudo apt upgrade -y<br/>
                        curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
                      </code>
                  </div>
              </section>

              <section className="space-y-4">
                  <h3 className="text-indigo-400 font-bold">2. Rodar CompreFace (IA)</h3>
                  <div className="bg-black/50 p-4 rounded-xl border border-white/10 text-xs font-mono text-slate-300">
                      mkdir compreface && cd compreface<br/>
                      wget -qO- https://raw.githubusercontent.com/exadel-inc/CompreFace/master/install.sh | bash
                  </div>
              </section>

              <section className="space-y-4">
                  <h3 className="text-indigo-400 font-bold">3. Subir o Site (Frontend)</h3>
                  <p className="text-sm text-slate-400">Instale o Nginx e aponte para a sua pasta <code className="bg-black/40 px-1">dist</code>:</p>
                  <div className="bg-black/50 p-4 rounded-xl border border-white/10 text-xs font-mono text-slate-300">
                      sudo apt install nginx -y<br/>
                      # Copie sua pasta dist para /var/www/html/facefind<br/>
                      # Configure o Nginx para apontar para lá.
                  </div>
              </section>

              <div className="p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl">
                  <p className="text-sm">⚠️ <b>Dica:</b> Lembre de abrir as portas <b>80, 443 e 8000</b> no Firewall da sua VPS.</p>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default Admin;
