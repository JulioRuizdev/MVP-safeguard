// BootReceiver.kt
// Se ejecuta automáticamente cuando el celular se reinicia
// Importante para que SafeGuard siempre esté activo
package com.safeguard.android.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("SafeGuard_Boot", "Dispositivo reiniciado — SafeGuard activo ✅")
            // Aquí podrías iniciar un servicio en foreground si lo necesitas
        }
    }
}
