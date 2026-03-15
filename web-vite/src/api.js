// web/src/api.js
// Todas las llamadas al backend en un solo lugar

import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa');
  return user.getIdToken();
}

async function request(method, path, body = null) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

// Comandos remotos
export const sendCommand = (command) =>
  request('POST', '/api/command', { command });

// Historial
export const getCommandHistory = () =>
  request('GET', '/api/commands');

// Ubicación
export const getDeviceLocation = () =>
  request('GET', '/api/device/location');
