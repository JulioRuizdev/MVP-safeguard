// DeviceAdminReceiver.kt
package com.safeguard.android.services

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast

class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        Log.d("SafeGuard_Admin", "Device Admin activado ✅")
        Toast.makeText(context, "🛡️ SafeGuard: Protección activada", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.d("SafeGuard_Admin", "Device Admin desactivado ⚠️")
        Toast.makeText(context, "⚠️ SafeGuard: Protección desactivada", Toast.LENGTH_SHORT).show()
    }

    // Alerta cuando alguien intenta hacer factory reset desde ajustes
    override fun onPasswordFailed(context: Context, intent: Intent) {
        Log.w("SafeGuard_Admin", "Intento de contraseña fallido detectado")
        // Aquí podrías tomar una foto silenciosa del ladrón
    }
}
