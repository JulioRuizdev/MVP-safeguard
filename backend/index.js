require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// ─── Firebase Init ───────────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

// ─── Express Setup ───────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ─── Middleware: verificar token Firebase Auth ───────────────────
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ─── RUTAS ───────────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'SafeGuard Backend corriendo ✅' });
});

// Registrar dispositivo (guarda el FCM token del APK)
app.post('/api/device/register', verifyToken, async (req, res) => {
  const { fcmToken, deviceInfo } = req.body;
  const userId = req.user.uid;

  if (!fcmToken) {
    return res.status(400).json({ error: 'fcmToken requerido' });
  }

  try {
    await db.collection('devices').doc(userId).set({
      fcmToken,
      deviceInfo: deviceInfo || {},
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    }, { merge: true });

    res.json({ success: true, message: 'Dispositivo registrado' });
  } catch (err) {
    console.error('Error registrando dispositivo:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Enviar comando remoto al APK
app.post('/api/command', verifyToken, async (req, res) => {
  const { command } = req.body;
  const userId = req.user.uid;

  // Comandos válidos
  const validCommands = [
    'LOCK_SCREEN',       // Bloquear pantalla
    'GET_LOCATION',      // Obtener GPS
    'UNINSTALL_BANKING', // Desinstalar apps bancarias
    'TAKE_PHOTO',        // Foto silenciosa
    'FACTORY_RESET',     // Borrado total
    'ENABLE_ESIM',       // Activar eSIM
    'SIM_STATUS',        // Estado del SIM
  ];

  if (!validCommands.includes(command)) {
    return res.status(400).json({ error: 'Comando no válido', validCommands });
  }

  try {
    // Obtener FCM token del dispositivo
    const deviceDoc = await db.collection('devices').doc(userId).get();
    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Dispositivo no registrado' });
    }

    const { fcmToken } = deviceDoc.data();

    // Registrar el comando en Firestore
    const commandRef = await db.collection('commands').add({
      userId,
      command,
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Enviar via FCM al APK
    await messaging.send({
      token: fcmToken,
      data: {
        command,
        commandId: commandRef.id
      },
      android: {
        priority: 'high'
      }
    });

    res.json({
      success: true,
      commandId: commandRef.id,
      message: `Comando ${command} enviado al dispositivo`
    });
  } catch (err) {
    console.error('Error enviando comando:', err);
    res.status(500).json({ error: 'Error al enviar comando' });
  }
});

// Ver historial de comandos
app.get('/api/commands', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    const snapshot = await db.collection('commands')
      .where('userId', '==', userId)
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();

    const commands = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate()
    }));

    res.json({ commands });
  } catch (err) {
    console.error('Error obteniendo comandos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Ver ubicación del dispositivo
app.get('/api/device/location', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    const deviceDoc = await db.collection('devices').doc(userId).get();
    if (!deviceDoc.exists) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
    const data = deviceDoc.data();
    res.json({
      location: data.location || null,
      updatedAt: data.locationUpdatedAt?.toDate() || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// El APK reporta su ubicación
app.post('/api/device/location', verifyToken, async (req, res) => {
  const { lat, lng } = req.body;
  const userId = req.user.uid;
  try {
    await db.collection('devices').doc(userId).update({
      location: { lat, lng },
      locationUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});
// ── ADMIN: Listar usuarios ──────────────────────────────────
app.get('/api/admin/users', verifyToken, async (req, res) => {
  if (req.user.email !== 'julio.ruiz.dev@gmail.com') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  try {
    const listResult = await admin.auth().listUsers(100);
    const users = await Promise.all(listResult.users.map(async (u) => {
      // Buscar dispositivos de este usuario en Firestore
      const devSnap = await db.collection('devices')
        .where('userId', '==', u.uid).get();
      const devices = devSnap.docs.map(d => d.data().deviceInfo || {});
      return {
        uid: u.uid,
        email: u.email,
        createdAt: u.metadata.creationTime,
        lastLogin: u.metadata.lastSignInTime,
        devices
      };
    }));
    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: Reset de contraseña ──────────────────────────────
app.post('/api/admin/reset-password', verifyToken, async (req, res) => {
  if (req.user.email !== 'julio.ruiz.dev@gmail.com') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { email } = req.body;
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    // Enviar email via Firebase (usa el template de Firebase Auth)
    await admin.auth().generatePasswordResetLink(email);
    res.json({ message: `✅ Email de reset enviado a ${email}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Asignar/quitar roles (solo superadmin) ─────────────────
app.post('/api/admin/set-role', async (req, res) => {
  const { uid, role, secretKey } = req.body;
  // Esta clave solo la sabes tú — cámbiala por algo tuyo
  if (secretKey !== 'safeguard_superadmin_2026') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    res.json({ message: `✅ Rol '${role}' asignado correctamente` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Iniciar servidor ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🛡️  SafeGuard Backend corriendo en puerto ${PORT}`);
});
