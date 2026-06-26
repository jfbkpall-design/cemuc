import React, { useState } from 'react';
import { CheckCircle, Send } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

export const Prayer: React.FC = () => {
  const page = useManagedPage('oracao', {
    headline: 'Pedidos de Oração',
    summary: 'Compartilhe sua petição ou agradecimento. Nossa equipe pastoral orará por você.'
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [request, setRequest] = useState('');
  const [isConfidential, setIsConfidential] = useState(true);
  const [spamAnswer, setSpamAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');

    if (spamAnswer.trim() !== '7') {
      setErrorMsg('Resposta anti-spam incorreta.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/oracao', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nome: name || 'Anônimo',
          email: email || null,
          telefone: phone || null,
          pedido: request,
          confidencial: isConfidential
        })
      });
      if (!response.ok) throw new Error('Não foi possível enviar o pedido.');
      setSubmitted(true);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container section" style={{ maxWidth: '700px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Cuidado & Intercessão</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8' }}>{page.summary}</p>
      </div>

      {submitted ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: 'var(--teal-light)', marginBottom: '20px' }}><CheckCircle size={64} /></div>
          <h2>Pedido recebido com sucesso!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Obrigado pela confiança. Estaremos orando por você.</p>
          <button onClick={() => setSubmitted(false)} className="btn btn-primary">Enviar outro pedido</button>
        </div>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {errorMsg && <div style={{ color: '#ef4444' }}>{errorMsg}</div>}
            <input className="form-control" placeholder="Nome" value={name} onChange={(event) => setName(event.target.value)} />
            <input className="form-control" type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="form-control" placeholder="Telefone/WhatsApp" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <textarea className="form-control" rows={5} placeholder="Seu pedido de oração" value={request} onChange={(event) => setRequest(event.target.value)} required />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={isConfidential} onChange={(event) => setIsConfidential(event.target.checked)} />
              <span>Pedido confidencial</span>
            </label>
            <input className="form-control" placeholder="Proteção anti-spam: quanto é 4 + 3?" value={spamAnswer} onChange={(event) => setSpamAnswer(event.target.value)} required />
            <button className="btn btn-primary" disabled={submitting}>
              <Send size={18} /> {submitting ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
};
