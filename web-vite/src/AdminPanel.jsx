import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'

const ADMIN_EMAIL = 'julio.ruiz.dev@gmail.com'
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function AdminPanel() {
    const [user, setUser] = useState(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUser(u)
            if (u && u.email === ADMIN_EMAIL) loadUsers(u)
        })
    }, [])

    async function login() {
        try {
            await signInWithEmailAndPassword(auth, email, password)
        } catch (e) {
            setMsg('❌ ' + e.message)
        }
    }

    async function loadUsers(u) {
        setLoading(true)
        try {
            const token = await (u || user).getIdToken()
            const res = await fetch(`${BASE_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            setUsers(data.users || [])
        } catch (e) {
            setMsg('❌ Error cargando usuarios')
        }
        setLoading(false)
    }

    async function resetPassword(userEmail) {
        try {
            const token = await user.getIdToken()
            const res = await fetch(`${BASE_URL}/api/admin/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: userEmail })
            })
            const data = await res.json()
            setMsg(data.message || '✅ Email enviado')
        } catch (e) {
            setMsg('❌ Error: ' + e.message)
        }
    }

    if (!user) return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>🛡️ Admin SafeGuard</h2>
                <input style={styles.input} placeholder="Correo" value={email}
                    onChange={e => setEmail(e.target.value)} type="email" />
                <input style={styles.input} placeholder="Contraseña" value={password}
                    onChange={e => setPassword(e.target.value)} type="password" />
                <button style={styles.btn} onClick={login}>Ingresar</button>
                {msg && <p style={styles.msg}>{msg}</p>}
            </div>
        </div>
    )

    if (user.email !== ADMIN_EMAIL) return (
        <div style={styles.page}>
            <div style={styles.card}>
                <p style={{ color: '#f87171' }}>❌ No tienes permisos de administrador.</p>
                <button style={styles.btn} onClick={() => signOut(auth)}>Salir</button>
            </div>
        </div>
    )

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>🛡️ Panel Administrador</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button style={{ ...styles.btn, background: '#374151', padding: '8px 16px' }}
                        onClick={() => loadUsers()}>🔄 Recargar</button>
                    <button style={{ ...styles.btn, background: '#ef4444', padding: '8px 16px' }}
                        onClick={() => signOut(auth)}>Salir</button>
                </div>
            </div>

            {msg && <div style={styles.msgBar}>{msg}</div>}

            {loading ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>Cargando usuarios...</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            {['Email', 'UID', 'Creado', 'Último acceso', 'Dispositivos', 'Acciones'].map(h => (
                                <th key={h} style={styles.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                                No hay usuarios registrados
                            </td></tr>
                        ) : users.map(u => (
                            <tr key={u.uid} style={styles.tr}>
                                <td style={styles.td}>{u.email}</td>
                                <td style={{ ...styles.td, color: '#64748b', fontSize: 12 }}>{u.uid.slice(0, 12)}...</td>
                                <td style={styles.td}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-PE') : '—'}</td>
                                <td style={styles.td}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es-PE') : '—'}</td>
                                <td style={styles.td}>
                                    {u.devices && u.devices.length > 0 ? (
                                        u.devices.map((d, i) => (
                                            <div key={i} style={styles.deviceBadge}>
                                                📱 {d.model} (SDK {d.sdk})
                                            </div>
                                        ))
                                    ) : (
                                        <span style={{ color: '#64748b', fontSize: 13 }}>Sin dispositivos</span>
                                    )}
                                </td>
                                <td style={styles.td}>
                                    <button style={styles.resetBtn} onClick={() => resetPassword(u.email)}>
                                        🔑 Reset contraseña
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

const styles = {
    page: { minHeight: '100vh', background: '#0f172a', padding: 24, fontFamily: 'Arial, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    card: { maxWidth: 400, margin: '100px auto', background: '#1e293b', padding: 32, borderRadius: 12 },
    title: { color: '#60a5fa', marginBottom: 24, fontSize: 22 },
    input: {
        width: '100%', padding: 12, marginBottom: 12, background: '#0f172a', border: '1px solid #334155',
        borderRadius: 6, color: '#fff', fontSize: 14, boxSizing: 'border-box'
    },
    btn: {
        width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none',
        borderRadius: 6, fontSize: 14, cursor: 'pointer'
    },
    msg: { color: '#f87171', marginTop: 12, fontSize: 13 },
    msgBar: {
        background: '#1e293b', color: '#60a5fa', padding: '10px 16px', borderRadius: 6,
        marginBottom: 16, fontSize: 14
    },
    table: { width: '100%', borderCollapse: 'collapse', background: '#1e293b', borderRadius: 8 },
    th: {
        background: '#0f172a', color: '#94a3b8', padding: '12px 16px', textAlign: 'left',
        fontSize: 13, fontWeight: 600
    },
    td: { padding: '12px 16px', color: '#e2e8f0', fontSize: 14, borderBottom: '1px solid #334155' },
    tr: { transition: 'background 0.2s' },
    deviceBadge: {
        background: '#0f172a', color: '#34d399', padding: '3px 8px', borderRadius: 4,
        fontSize: 12, marginBottom: 4, display: 'inline-block'
    },
    resetBtn: {
        background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 12px',
        borderRadius: 6, fontSize: 12, cursor: 'pointer'
    }
}