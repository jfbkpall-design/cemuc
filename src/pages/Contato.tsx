import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, ExternalLink, Send, MessageCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

interface ContatoConfig {
  email_contato: string;
  whatsapp: string;
  endereco: string;
  google_maps_url: string;
  email_destino: string;
}

const DEFAULT_CONFIG: ContatoConfig = {
  email_contato: 'contato@cemuc.com',
  whatsapp: '5521975259839',
  endereco: 'Estrada General Canrobert Pereira da Costa, 485 – Magalhães Bastos, Rio de Janeiro/RJ',
  google_maps_url: 'https://maps.google.com/?q=Estrada+General+Canrobert+Pereira+da+Costa,+485+Magalhaes+Bastos+Rio+de+Janeiro',
  email_destino: 'contato@cemuc.com',
};

export const Contato: React.FC = () => {
  const page = useManagedPage('contato', {
    headline: 'Fale Conosco',
    summary: 'Precisa de orientação pastoral, informações sobre cultos ou quer apenas nos fazer uma visita? Estamos aqui para te ouvir.'
  });

  const [cfg, setCfg] = useState<ContatoConfig>(DEFAULT_CONFIG);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/configuracoes', { credentials: 'include' })
      .then((r) => r.json())
      .then((payload) => {
        if (payload?.data) {
          setCfg({ ...DEFAULT_CONFIG, ...payload.data });
        }
      })
      .catch(() => { /* usa padrão */ });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const destino = cfg.email_destino || cfg.email_contato;
    const mailtoUrl = `mailto:${destino}?subject=${encodeURIComponent(
      `[Site-MUC] ${subject}`
    )}&body=${encodeURIComponent(
      `Nome: ${name}\nE-mail de Contato: ${email}\n\nMensagem:\n${message}`
    )}`;
    window.location.href = mailtoUrl;
    setSubmitted(true);
  };

  const whatsappNumber = cfg.whatsapp.replace(/\D/g, '');

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Contato & Localização</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
          {page.summary}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'start' }}>
        {/* Formulário de Contato */}
        <Card title="Envie uma Mensagem">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '10px' }}>Mensagem Enviada!</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Agradecemos o contato. Nossa equipe de secretaria responderá o mais breve possível.</p>
              <button onClick={() => setSubmitted(false)} className="btn btn-secondary" style={{ marginTop: '20px' }}>Enviar nova mensagem</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name">Nome</label>
                <input type="text" id="contact-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-email">E-mail</label>
                <input type="email" id="contact-email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-subj">Assunto</label>
                <input type="text" id="contact-subj" className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-msg">Mensagem</label>
                <textarea id="contact-msg" className="form-control" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Send size={16} /> Enviar Mensagem
              </button>
            </form>
          )}
        </Card>

        {/* Informações & Mapa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Informações da Secretaria</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ color: 'var(--gold)' }}><Phone size={20} /></div>
                <div>
                  <h5 style={{ color: '#ffffff' }}>Telefone & WhatsApp</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    {whatsappNumber
                      ? `+${whatsappNumber.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}`
                      : '—'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ color: 'var(--gold)' }}><Mail size={20} /></div>
                <div>
                  <h5 style={{ color: '#ffffff' }}>E-mail Oficial</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{cfg.email_contato}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ color: 'var(--gold)' }}><MapPin size={20} /></div>
                <div>
                  <h5 style={{ color: '#ffffff' }}>Nosso Endereço</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{cfg.endereco}</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-teal"
                  style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                >
                  <MessageCircle size={16} /> Conversar no WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Mapa */}
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <h4 style={{ marginBottom: '12px' }}>Visite-nos no Mapa</h4>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
              Clique no botão abaixo para abrir a localização exata no Google Maps e traçar sua rota de navegação.
            </p>
            <a
              href={cfg.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              Abrir no Google Maps <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
