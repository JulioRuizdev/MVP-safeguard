// SafeGuardMessagingService.kt
// Este es el corazón del APK: recibe comandos del backend via Firebase FCM
package com.safeguard.android.services

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.location.Location
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.safeguard.android.utils.CommandExecutor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SafeGuardMessagingService : FirebaseMessagingService() {

    private val TAG = "SafeGuard_FCM"

    // Se llama cuando llega un mensaje del backend
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val command = message.data["command"] ?: return
        val commandId = message.data["commandId"] ?: ""

        Log.d(TAG, "Comando recibido: $command (id: $commandId)")

        // Ejecutar en coroutine para no bloquear el hilo principal
        CoroutineScope(Dispatchers.IO).launch {
            CommandExecutor(applicationContext).execute(command, commandId)
        }
    }

    // Se llama cuando Firebase renueva el token del dispositivo
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Nuevo FCM token: $token")
        // Guardar el nuevo token en el backend
        CoroutineScope(Dispatchers.IO).launch {
            CommandExecutor(applicationContext).updateFcmToken(token)
        }
    }
}
