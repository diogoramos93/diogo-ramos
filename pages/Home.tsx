
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Lock, Unlock, Image as ImageIcon, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { getEvents } from '../services/db';
import { EventData } from '../types';
import Layout from '../components/Layout';

const Home: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getEvents();
      if (Array.isArray(data)) {
        setEvents([...data].sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setEvents([]);
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      console.error("Error loading events:", message);
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
    if (confirm("Deseja resetar as configurações do banco de dados (Supabase)? Isso voltará para as configurações padrão.")) {
      localStorage.removeItem('facefind_db_config');
      window.location.reload();
    }
  };

  return (
    <Layout>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Eventos Públicos</h1>
        <p className="text-slate-500">Veja fotos ou encontre-se usando Inteligência Artificial.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-200 h-64 rounded-xl"></div>
          ))}
        </div>
      ) : errorMsg ? (
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12 px-6 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Erro de Conexão</h3>
            <p className="text-red-600/80 mb-8 text-sm leading-relaxed max-w-md mx-auto">
              {errorMsg}
              <br /><br />
              Se este erro persistir, verifique se as chaves do Supabase no painel Admin ou variáveis de ambiente estão corretas.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={loadEvents}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Tentar Novamente
              </button>
              
              <button 
                onClick={handleResetConfig}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4" /> Resetar Banco
              </button>
            </div>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhum evento encontrado</h3>
          <p className="text-slate-500 mt-1">Volte mais tarde ou peça a um admin para criar um evento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link 
              key={event.id} 
              to={`/event/${event.id}`}
              className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="aspect-[3/2] overflow-hidden relative bg-slate-100">
                <img 
                  src={event.coverImage} 
                  alt={event.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3">
                  {event.password ? (
                    <span className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Privado
                    </span>
                  ) : (
                    <span className="bg-green-500/80 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Público
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-1">{event.name}</h3>
                <div className="flex items-center text-slate-500 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Home;
