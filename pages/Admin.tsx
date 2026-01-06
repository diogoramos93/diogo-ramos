
import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Upload, Plus, X, Calendar, Lock, Image as ImageIcon, CheckCircle, User, Key, LogIn, Users, Settings, Database, Download, LogOut, Save, BrainCircuit, Server, Activity, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
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

  // Form States Eventos
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventPassword, setEventPassword] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Form States Usuários
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

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
    
    const loadConfig = async () => {
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
    loadConfig();
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
        const data = await getUsers();
        setUsersList(data || []);
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
      if (loginUserField === 'admin' && loginPassField === '123') {
        finishLogin({ id: 'master', name: 'Admin Master', role: 'master' });
        return;
      }
      const dbUser = await loginUser(loginUserField, loginPassField);
      if (dbUser) finishLogin({ id: dbUser.id, name: dbUser.name, role: 'user' });
      else setLoginError(true);
    } catch (err: any) { 
        setLoginError(true); 
    }
    finally { setLoginLoading(false); }
  };

  const finishLogin = (user: any) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    sessionStorage.setItem('facefind_auth', JSON.stringify(user));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword) return;
    setLoading(true);
    try {
      await createUser({
        id: uuidv4(),
        name: newUserName,
        username: newUserUsername,
        password: newUserPassword
      });
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setIsCreatingUser(false);
      refreshData();
      alert('Usuário criado com sucesso!');
    } catch (e: any) {
      alert("Erro ao criar usuário: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fotógrafo? Todos os eventos dele permanecerão, mas ele perderá o acesso.')) {
      try {
        await deleteUser(id);
        refreshData();
      } catch (e: any) {
        alert("Erro ao excluir: " + e.message);
      }
    }
  };

  const testAIConnection = async () => {
    if (!aiApiUrl || !aiApiKey) return alert("Preencha URL e Key.");
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
    } catch (e) { setTestStatus('error'); }
  };

  const testDBConnection = async () => {
    setDbTestStatus('testing');
    try {
      const { error } = await supabase.from('events').select('count', { count: 'exact', head: true });
      if (error) throw error;
      setDbTestStatus('success');
    } catch (e) { setDbTestStatus('error'); }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
        await saveGlobalSetting('facefind_ai_config', JSON.stringify({ provider: aiProvider, apiUrl: aiApiUrl, apiKey: aiApiKey }));
        localStorage.setItem('facefind_db_config', JSON.stringify({ url: dbUrl, key: dbKey }));
        alert("Configurações salvas!");
        window.location.reload();
    } catch (e: any) { alert("Erro ao salvar: " + e.message); }
    finally { setLoading(false); }
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
    } catch (err: any) { alert('Erro: ' + err.message); }
    finally { setLoading(false); setUploadProgress(''); }
  };

  if (!isAuthenticated) return (
    <Layout>
      <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-900">Acesso Administrativo</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Usuário" value={loginUserField} onChange={e => setLoginUserField(e.target.value)} />
          <input className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Senha" value={loginPassField} onChange={e => setLoginPassField(e.target.value)} />
          {loginError && <p className="text-red-500 text-sm">Credenciais inválidas.</p>}
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
            <p className="text-slate-500 text-sm">{currentUser?.role === 'master' ? 'Administrador do Sistema' : 'Painel do Fotógrafo'}</p>
        </div>
        <Button variant="secondary" onClick={() => { sessionStorage.removeItem('facefind_auth'); window.location.reload(); }}>
            <LogOut className="w-4 h-4"/> Sair
        </Button>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('events')} className={`px-4 py-3 whitespace-nowrap font-medium transition-all ${activeTab === 'events' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Eventos</button>
        {currentUser?.role === 'master' && <button onClick={() => setActiveTab('users')} className={`px-4 py-3 whitespace-nowrap font-medium transition-all ${activeTab === 'users' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Fotógrafos</button>}
        {currentUser?.role === 'master' && <button onClick={() => setActiveTab('settings')} className={`px-4 py-3 whitespace-nowrap font-medium transition-all ${activeTab === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Infraestrutura</button>}
      </div>

      {activeTab === 'events' && (
        <>
            <div className="flex justify-end mb-4">
                {!isCreatingEvent && <Button onClick={() => setIsCreatingEvent(true)}><Plus className="w-4 h-4"/> Criar Novo Evento</Button>}
            </div>
            {isCreatingEvent ? (
                <form onSubmit={handleCreateEvent} className="bg-white p-6 border rounded-xl space-y-4 mb-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="border p-2 rounded" placeholder="Nome do Evento" value={eventName} onChange={e => setEventName(e.target.value)} required />
                        <input className="border p-2 rounded" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                    </div>
                    <input className="w-full border p-2 rounded" type="password" placeholder="Senha Opcional" value={eventPassword} onChange={e => setEventPassword(e.target.value)} />
                    <div className="border-2 border-dashed p-4 text-center cursor-pointer rounded-lg hover:bg-slate-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        {coverImage ? <img src={coverImage} className="h-32 mx-auto rounded shadow-sm"/> : <div className="text-slate-400 py-4"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20"/><p>Clique para capa</p></div>}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async e => e.target.files && setCoverImage(await processImage(e.target.files[0]))} />
                    </div>
                    <input type="file" multiple accept="image/*" className="w-full text-sm text-slate-500" onChange={e => e.target.files && setEventPhotos(Array.from(e.target.files))} />
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={() => setIsCreatingEvent(false)}>Cancelar</Button><Button type="submit" isLoading={loading}>{uploadProgress || "Publicar Evento"}</Button></div>
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
                                        <button onClick={async () => { if(confirm('Excluir evento?')) { await deleteEvent(ev.id); refreshData(); }}} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}

      {activeTab === 'users' && currentUser?.role === 'master' && (
        <div className="space-y-6">
            <div className="flex justify-end">
                {!isCreatingUser && <Button onClick={() => setIsCreatingUser(true)}><UserPlus className="w-4 h-4"/> Adicionar Fotógrafo</Button>}
            </div>

            {isCreatingUser && (
                <form onSubmit={handleCreateUser} className="bg-white p-6 border rounded-xl space-y-4 mb-6 shadow-sm">
                    <h3 className="font-bold">Novo Cadastro de Fotógrafo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input className="border p-2 rounded" placeholder="Nome Completo" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                        <input className="border p-2 rounded" placeholder="Usuário (login)" value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} required />
                        <input className="border p-2 rounded" type="password" placeholder="Senha" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setIsCreatingUser(false)}>Cancelar</Button>
                        <Button type="submit" isLoading={loading}>Cadastrar Fotógrafo</Button>
                    </div>
                </form>
            )}

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr><th className="p-4 font-semibold">Nome</th><th className="p-4 font-semibold">Usuário</th><th className="p-4 font-semibold text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {usersList.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-900 font-medium">{u.name}</td>
                                <td className="p-4 text-slate-500">{u.username}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        ))}
                        {usersList.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhum fotógrafo cadastrado.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'settings' && currentUser?.role === 'master' && (
        <div className="max-w-xl mx-auto space-y-8">
            <div className="bg-white p-6 border rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900"><BrainCircuit className="text-indigo-600"/> IA de Reconhecimento</h3>
                <div className="space-y-4">
                    <select className="w-full border p-2 rounded" value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)}>
                        <option value="browser">Processamento Local (Navegador)</option>
                        <option value="compre-face">Servidor Remoto (CompreFace)</option>
                    </select>
                    {aiProvider === 'compre-face' && (
                        <>
                            <input className="w-full border p-2 rounded" value={aiApiUrl} onChange={e => setAiApiUrl(e.target.value)} placeholder="URL da API (ex: http://ip:8000)" />
                            <input className="w-full border p-2 rounded" type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="API Key do Verification Service" />
                            <button onClick={testAIConnection} className="text-xs font-bold text-indigo-600 underline">Testar Conexão IA</button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 border rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900"><Database className="text-indigo-600"/> Banco de Dados (Supabase)</h3>
                <div className="space-y-4">
                    <input className="w-full border p-2 rounded" value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="Supabase URL" />
                    <input className="w-full border p-2 rounded" type="password" value={dbKey} onChange={e => setDbKey(e.target.value)} placeholder="Supabase Anon Key" />
                    <div className="flex gap-2 text-xs font-bold">
                        <button onClick={testDBConnection} className="text-indigo-600 underline">Testar Banco</button>
                        <button onClick={() => { localStorage.removeItem('facefind_db_config'); window.location.reload(); }} className="text-red-600 underline">Resetar p/ Padrão</button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end"><Button onClick={saveSettings} isLoading={loading} className="px-10"><Save className="w-4 h-4"/> Salvar Infraestrutura</Button></div>
        </div>
      )}
    </Layout>
  );
};

export default Admin;
