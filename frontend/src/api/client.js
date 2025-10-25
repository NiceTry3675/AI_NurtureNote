// Simple API client for the FastAPI backend
// Dev: CRA proxy to http://localhost:8000 handles same-origin
// Prod: set REACT_APP_API_BASE to the backend origin

const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');

function buildUrl(path) {
  if (!path.startsWith('/')) path = '/' + path;
  return `${API_BASE}${path}`;
}

async function jsonFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson && data && data.detail ? data.detail : res.statusText;
    throw new Error(msg || 'Request failed');
  }
  return data;
}

export function postEntry({ mood, body }) {
  return jsonFetch('/entries', { method: 'POST', body: { mood, body } });
}

export function getEntries({ limit = 20 } = {}) {
  return jsonFetch(`/entries?limit=${encodeURIComponent(limit)}`);
}

export function analyze({ rangeDays = 14, question } = {}) {
  const payload = { range_days: rangeDays };
  if (question && question.trim()) payload.question = question.trim();
  return jsonFetch('/analyze', { method: 'POST', body: payload });
}

export function health() {
  return jsonFetch('/health');
}

