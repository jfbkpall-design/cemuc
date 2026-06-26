import { json } from './http.js';

export async function readJson(request) {
  return request.json().catch(() => ({}));
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  return missing.length ? `Campos obrigatórios ausentes: ${missing.join(', ')}` : null;
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function notFound(message = 'Registro não encontrado') {
  return json({ error: message }, { status: 404 });
}

export function badRequest(message) {
  return json({ error: message }, { status: 400 });
}
