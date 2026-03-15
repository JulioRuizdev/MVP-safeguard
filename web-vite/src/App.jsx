// web/src/App.js
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { sendCommand, getDeviceLocation, getCommandHistory } from './api';
import './App.css';

// ─── Pantalla de Login ────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">🛡️</div>
        <h1>SafeGuard Peru</h1>
        <p className="subtitle">Panel de Control</p>
        {error && <div className="error-box">{error}</div>}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}

// ─── Botón de comando ─────────────────────────────────────────────
function CommandButton({ command, label, icon, description, danger, onSend }) {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  async function handleClick() {
    if (danger && !window.confirm(`⚠️ ¿Estás seguro de ejecutar "${label}"? Esta acción no se puede deshacer.`)) return;
    setStatus('loading');
    try {
      await onSend(command);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const statusLabel = {
    idle: label,
    loading: 'Enviando...',
    done: '✅ Enviado',
    error: '❌ Error'
  };

  return (
    <button
      className={`command-btn ${danger ? 'danger' : ''} ${status}`}
      onClick={handleClick}
      disabled={status === 'loading'}
    >
      <span className="cmd-icon">{icon}</span>
      <span className="cmd-label">{statusLabel[status]}</span>
      <span className="cmd-desc">{description}</span>
    </button>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────
function Dashboard({ user }) {
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await getCommandHistory();
      setHistory(data.commands || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  }

  async function handleCommand(command) {
    await sendCommand(command);
    if (command === 'GET_LOCATION') {
      setLoadingLocation(true);
      setTimeout(async () => {
        try {
          const data = await getDeviceLocation();
          setLocation(data.location);
        } catch { }
        setLoadingLocation(false);
      }, 3000);
    }
    await loadHistory();
  }

  const commands = [
    { command: 'GET_LOCATION', label: 'Ver Ubicación', icon: '📍', description: 'Obtener GPS en tiempo real', danger: false },
    { command: 'LOCK_SCREEN', label: 'Bloquear Pantalla', icon: '🔒', description: 'Bloquea el dispositivo ahora', danger: false },
    { command: 'UNINSTALL_BANKING', label: 'Borrar Apps Bancarias', icon: '🏦', description: 'Desinstala Yape, BCP, etc.', danger: false },
    { command: 'TAKE_PHOTO', label: 'Foto Silenciosa', icon: '📷', description: 'Foto con cámara frontal', danger: false },
    { command: 'ENABLE_ESIM', label: 'Activar eSIM', icon: '📡', description: 'Activar internet de respaldo', danger: false },
    { command: 'FACTORY_RESET', label: 'Borrado Total', icon: '💥', description: 'Factory reset remoto', danger: true },
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo-small">🛡️</span>
          <span className="app-name">SafeGuard Peru</span>
        </div>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <main className="main">
        {/* Status bar */}
        <div className="status-bar">
          <div className="status-dot active"></div>
          <span>Dispositivo conectado</span>
        </div>

        {/* Comandos */}
        <section className="section">
          <h2>Control Remoto</h2>
          <div className="commands-grid">
            {commands.map(cmd => (
              <CommandButton key={cmd.command} {...cmd} onSend={handleCommand} />
            ))}
          </div>
        </section>

        {/* Ubicación */}
        {(location || loadingLocation) && (
          <section className="section">
            <h2>📍 Última Ubicación</h2>
            <div className="location-card">
              {loadingLocation ? (
                <p>Obteniendo ubicación...</p>
              ) : (
                <>
                  <p>Lat: {location?.lat} | Lng: {location?.lng}</p>
                  <a
                    href={`https://www.google.com/maps?q=${location?.lat},${location?.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-maps"
                  >
                    Ver en Google Maps →
                  </a>
                </>
              )}
            </div>
          </section>
        )}

        {/* Historial */}
        <section className="section">
          <h2>Historial de Comandos</h2>
          {history.length === 0 ? (
            <p className="empty">Aún no hay comandos enviados.</p>
          ) : (
            <div className="history-list">
              {history.map(item => (
                <div key={item.id} className="history-item">
                  <span className="history-cmd">{item.command}</span>
                  <span className={`history-status ${item.status}`}>{item.status}</span>
                  <span className="history-date">
                    {item.sentAt ? new Date(item.sentAt).toLocaleString('es-PE') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div className="splash">🛡️ Cargando...</div>;
  if (!user) return <Login />;
  return <Dashboard user={user} />;
}
