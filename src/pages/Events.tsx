import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { MapPin, Clock, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

interface EventType {
  id: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  category: 'culto' | 'conferencia' | 'acao_social' | 'outro';
  banner_url?: string;
}

const DEFAULT_EVENTS: EventType[] = [
  {
    id: '1',
    title: 'Culto de Celebração de Domingo',
    description: 'Celebre o amor de Jesus Cristo em comunidade com adoração, oração e uma mensagem bíblica especial.',
    start_date: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()) % 7)).toISOString().split('T')[0] + 'T18:00:00Z',
    location: 'Templo CEMUC - Estr. Gen. Canrobert Pereira da Costa, 485',
    category: 'culto',
    banner_url: 'https://lh3.googleusercontent.com/sitesv/AA5AbUAeVwnUys4Z_59FJb0wNfTJuD3KKCBIiTSZTrmKD0aS-V_5VK91hO8zI9OEz6Hi24CUy_ojpZdgvK6w-VKcNiJWNEuoRiK1h_-rh0NQDk0QpHsXtqaShixrjQZ_TKreghCx5f4tFAM9p8F4D7-BkZsCJhnxjpUWcLVhbB6DsTlFfe019JE-7v_TPtA=w1280'
  },
  {
    id: '2',
    title: 'Escola Bíblica Dominical (EBD)',
    description: 'Estudos aprofundados da Bíblia divididos em classes para crianças e adolescentes.',
    start_date: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()) % 7)).toISOString().split('T')[0] + 'T09:00:00Z',
    location: 'Templo CEMUC - Estr. Gen. Canrobert Pereira da Costa, 485',
    category: 'culto',
    banner_url: 'https://lh3.googleusercontent.com/sitesv/AA5AbUA9MeOp94yd0SZRgd5nCKc3mKc5XzBtGnLZ1ZJeCZG7g07e2YA76KDIvjznZ0FqBdSv5M4VSAdK3mSI2ej5UPvCH00OYJa31laP0-lWDUfI_b2m4Th7Gq0S6CR8iT3UCDxyqEgZ0solUsw4ApOTc4yhc8ZzpIMTxAFJ3d522e5oTzz1ayx3bcZC=w1280'
  },
  {
    id: '3',
    title: 'Ação Social - Entrega de Cestas Básicas',
    description: 'Campanha de acolhimento social e doações de alimentos para as famílias carentes de Magalhães Bastos.',
    start_date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
    location: 'Secretaria CEMUC',
    category: 'acao_social',
    banner_url: 'https://lh3.googleusercontent.com/sitesv/AA5AbUDzKxI6_At2nlEIweY4LzjZBCd4cmdf8Xd4e-8KTNMHJwzhbp2L2Kwfn-_LCeGsiAHaNjqNWMp1c9eAdnqXAESINYPdTRrxmWpJovaJMKB7WIup1bQIVEXTYBPcmI-JXLP8vEkz8CJvnsHNcQUGjioUxFhi4WOKHgp-F5RmFehjg2aRmP64ErBwwJk=w1280'
  }
];

export const Events: React.FC = () => {
  const page = useManagedPage('eventos', {
    headline: 'Agenda & Eventos',
    summary: 'Confira o que está acontecendo na CEMUC e participe conosco das nossas atividades.'
  });
  const [events, setEvents] = useState<EventType[]>(() => {
    try {
      const cached = localStorage.getItem('cemuc_events');
      // Mostra cache ou os eventos padrão de imediato, sem prender a tela no spinner.
      return cached ? JSON.parse(cached) : DEFAULT_EVENTS;
    } catch {
      return DEFAULT_EVENTS;
    }
  });
  // Como já há conteúdo (cache ou padrão), o Supabase atualiza em segundo plano.
  const [loading] = useState(false);
  const [filter, setFilter] = useState<string>('todos');

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })
        .abortSignal(AbortSignal.timeout(10000)); // evita requisição pendurada se o Supabase estiver "frio"

      if (error || !data || data.length === 0) {
        setEvents(DEFAULT_EVENTS);
      } else {
        setEvents(data as EventType[]);
        localStorage.setItem('cemuc_events', JSON.stringify(data));
      }
    } catch {
      setEvents(DEFAULT_EVENTS);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const handleAddToCalendar = (event: EventType) => {
    const startDate = new Date(event.start_date);
    const startStr = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // assume 2 horas
    const endStr = endDate.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CEMUC//Plataforma Digital//PT',
      'BEGIN:VEVENT',
      `UID:${event.id}@cemuc.com`,
      `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEvents = filter === 'todos' 
    ? events 
    : events.filter(e => e.category === filter);

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Programação</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
          {page.summary}
        </p>
      </div>

      {/* Filter Menu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '40px'
      }}>
        <button 
          onClick={() => setFilter('todos')} 
          className={`btn ${filter === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          Todos
        </button>
        <button 
          onClick={() => setFilter('culto')} 
          className={`btn ${filter === 'culto' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          Cultos
        </button>
        <button 
          onClick={() => setFilter('conferencia')} 
          className={`btn ${filter === 'conferencia' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          Conferências
        </button>
        <button 
          onClick={() => setFilter('acao_social')} 
          className={`btn ${filter === 'acao_social' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          Ação Social
        </button>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando eventos...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: '#64748b' }}>Nenhum evento agendado para esta categoria no momento.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
          {filteredEvents.map(event => (
            <Card 
              key={event.id} 
              title={event.title}
              subtitle={event.category.toUpperCase().replace('_', ' ')}
            >
              {event.banner_url && (
                <div style={{
                  height: '180px',
                  backgroundImage: `url('${event.banner_url}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}></div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>{event.description}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} style={{ color: 'var(--gold)' }} />
                    <span>
                      {new Date(event.start_date).toLocaleString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: 'var(--gold)' }} />
                    <span>{event.location}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', marginTop: '8px' }}>
                  <button 
                    onClick={() => handleAddToCalendar(event)} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px' }}
                  >
                    <Plus size={14} /> Adicionar ao meu Calendário
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
