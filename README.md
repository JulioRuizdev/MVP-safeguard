# 🛡️ SafeGuard Peru — Guía de Setup Completo

## Estructura del Proyecto

```
safeguard/
├── backend/          → Servidor Node.js + Firebase Admin
├── web/              → Panel de control React
└── android/          → APK Kotlin
```

---

## PASO 1 — Crear proyecto en Firebase (5 minutos)

1. Ve a https://console.firebase.google.com
2. Clic en **"Crear proyecto"**
3. Nombre: `safeguard-peru`
4. Desactiva Google Analytics (no lo necesitas ahora)
5. Clic en **"Crear proyecto"**

### Dentro de Firebase activa estos servicios:

| Servicio | Cómo activarlo |
|---|---|
| **Authentication** | Build → Authentication → Get started → Email/Password → Enable |
| **Firestore** | Build → Firestore Database → Create database → Start in test mode |
| **Cloud Messaging** | Ya viene activado por defecto |

---

## PASO 2 — Obtener credenciales

### Para el Backend (Node.js):
1. Firebase Console → Configuración del proyecto (⚙️)
2. Cuentas de servicio → Generar nueva clave privada
3. Guarda el archivo como `backend/serviceAccountKey.json`

### Para el APK (Android):
1. Firebase Console → Agregar app → Android
2. Package name: `com.safeguard.android`
3. Descarga `google-services.json`
4. Colócalo en `android/app/google-services.json`

### Para la Web (React):
1. Firebase Console → Agregar app → Web
2. Copia las credenciales (apiKey, authDomain, etc.)
3. Pégalas en `web/src/firebase.js`

---

## PASO 3 — Instalar y correr cada parte

### Backend:
```bash
cd backend
npm install
node index.js
# Corre en http://localhost:3001
```

### Web:
```bash
cd web
npm install
npm start
# Abre http://localhost:3000
```

### Android:
- Abre la carpeta `android/` en Android Studio
- Sync Gradle
- Run en emulador o dispositivo físico

---

## Flujo de datos

```
Panel Web → POST /api/command → Backend → Firebase FCM → APK Android
    ↑                                                         ↓
    └──────────── Firebase Firestore (confirmación) ──────────┘
```
"# MVP-safeguard" 
