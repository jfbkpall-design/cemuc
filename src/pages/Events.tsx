import React, { useCallback, useEffect, useState } from 'react';
import { Clock, MapPin, Plus } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

interface EventType {
  id: string;
  title: string;
  description: string;
  start_date: string;
  location: string;
  category: string;
  banner_url?: string;
}

const DEFAULT_EVENTS: EventType[] = [
  {
    id: 'default-1',
    title: 'Culto de Celebração de Domingo',
    description: 'Celebre o amor de Jesus Cristo em comunidade com adoração, oração e uma mensagem bíblica especial.',
    start_date: new Date().toISOString(),
    location: 'Templo CEMUC',
    category: 'culto'
  }
];

export const Events: React.FC = () => {
  const page = useManagedPage('eventos', {
    headline: 'Agenda & Eventos',
    summary: 'Confira o que está acontecendo na CEMUC e participe conosco das nossas atividades.'
  });
  const [events, setEvents] = useState<EventType[]>(DEFAULT_EVENTS);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/eventos', { headers: { accept: 'application/json' } });
      const payload = await response.json();
      const items = (payload.data || []).map((event: any) => ({
        id: String(event.id),
        title: event.titulo,
        description: event.descricao || '',
        start_date: event.inicio_em,
        location: event.local || '',
        category: event.apenas_membros ? 'membros' : 'publico',
        banner_url: event.imagem_capa_url || ''
      }));
      setEvents(items.length ? items : DEFAULT_EVENTS);
    } catch {
      setEvents(DEFAULT_EVENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleAddToCalendar = (event: EventType) => {
    const startDate = new Date(event.start_date);
    const startStr = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const endStr = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CEMUC//Cloudflare//PT',
      'BEGIN:VEVENT',
      `UID:${event.id}@cemuc`,
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
    link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Programação</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>{page.summary}</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Carregando eventos...</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          {events.map((event) => (
            <Card key={event.id} title={event.title} subtitle={event.category.toUpperCase()}>
              {event.banner_url && <div style={{ height: '180px', backgroundImage: `url('${event.banner_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-sm)', marginTop: '10px' }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <p style={{ color: '#94a3b8' }}>{event.description}</p>
                <span style={{ color: '#cbd5e1', display: 'inline-flex', gap: '8px', alignItems: 'center' }}><Clock size={16} /> {new Date(event.start_date).toLocaleString('pt-BR')}</span>
                <span style={{ color: '#cbd5e1', display: 'inline-flex', gap: '8px', alignItems: 'center' }}><MapPin size={16} /> {event.location}</span>
                <button onClick={() => handleAddToCalendar(event)} className="btn btn-secondary"><Plus size={14} /> Adicionar ao calendário</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
