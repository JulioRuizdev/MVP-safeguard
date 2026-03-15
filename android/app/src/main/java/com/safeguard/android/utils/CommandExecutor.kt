// CommandExecutor.kt
// Ejecuta cada comando que llega del backend
package com.safeguard.android.utils

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.util.Log
import com.google.android.gms.location.LocationServices
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import com.safeguard.android.services.DeviceAdminReceiver

class CommandExecutor(private val context: Context) {

    private val TAG = "SafeGuard_CMD"
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val http = OkHttpClient()

    // ─── URL de tu backend ────────────────────────────────────────
    // Cambia esto por tu URL real cuando despliegues el backend
    private val BACKEND_URL = "http://192.168.18.224:3001 "

    suspend fun execute(command: String, commandId: String) {
        Log.d(TAG, "Ejecutando: $command")

        try {
            when (command) {
                "LOCK_SCREEN"       -> lockScreen()
                "GET_LOCATION"      -> sendLocation()
                "UNINSTALL_BANKING" -> uninstallBankingApps()
                "TAKE_PHOTO"        -> takePhoto()
                "FACTORY_RESET"     -> factoryReset()
                "SIM_STATUS"        -> checkSimStatus()
                else -> Log.w(TAG, "Comando desconocido: $command")
            }
            // Confirmar ejecución en Firestore
            updateCommandStatus(commandId, "executed")
        } catch (e: Exception) {
            Log.e(TAG, "Error ejecutando $command: ${e.message}")
            updateCommandStatus(commandId, "error")
        }
    }

    // ─── BLOQUEAR PANTALLA ────────────────────────────────────────
    private fun lockScreen() {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, DeviceAdminReceiver::class.java)

        if (dpm.isAdminActive(adminComponent)) {
            dpm.lockNow()
            Log.d(TAG, "Pantalla bloqueada ✅")
        } else {
            Log.e(TAG, "No tiene permisos de Device Admin")
        }
    }

    // ─── OBTENER Y ENVIAR UBICACIÓN ───────────────────────────────
    private suspend fun sendLocation() {
        try {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            val location = fusedClient.lastLocation.await()

            if (location != null) {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return
                val body = JSONObject().apply {
                    put("lat", location.latitude)
                    put("lng", location.longitude)
                }.toString()

                val request = Request.Builder()
                    .url("$BACKEND_URL/api/device/location")
                    .addHeader("Authorization", "Bearer $token")
                    .post(body.toRequestBody("application/json".toMediaType()))
                    .build()

                http.newCall(request).execute()
                Log.d(TAG, "Ubicación enviada: ${location.latitude}, ${location.longitude} ✅")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Sin permiso de ubicación: ${e.message}")
        }
    }

    // ─── DESINSTALAR APPS BANCARIAS ───────────────────────────────
    private fun uninstallBankingApps() {
        // Lista de package names de apps bancarias peruanas comunes
        val bankingApps = listOf(
            "com.bcp.innovacxion.yapeapp",     // Yape
            "pe.com.interbank.mobilebanking",   // Interbank
            "com.bcp.bank.bcp",                 // BCP
            "com.scotiabank.mobile",             // Scotiabank
            "pe.bbva.nxt.android",              // BBVA
            "com.bn.banbif",                    // Banbif
            "com.pichincha.banca_movil",        // Pichincha
            "com.tunki.app",                    // Tunki
            "com.plin.app"                      // Plin
        )

        val pm = context.packageManager
        var desinstaladas = 0

        for (packageName in bankingApps) {
            try {
                pm.getPackageInfo(packageName, 0) // Verifica que esté instalada
                // Para desinstalar se necesita Device Owner o confirmación del usuario
                // Con Device Admin podemos lanzar el intent de desinstalación
                val intent = android.content.Intent(android.content.Intent.ACTION_DELETE)
                intent.data = android.net.Uri.parse("package:$packageName")
                intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                desinstaladas++
                Log.d(TAG, "Desinstalando: $packageName")
                Thread.sleep(1000) // Espera entre desinstalaciones
            } catch (e: PackageManager.NameNotFoundException) {
                // App no instalada, continuar
            } catch (e: Exception) {
                Log.e(TAG, "Error desinstalando $packageName: ${e.message}")
            }
        }
        Log.d(TAG, "Apps bancarias procesadas: $desinstaladas ✅")
    }

    // ─── FOTO SILENCIOSA ──────────────────────────────────────────
    private fun takePhoto() {
        // TODO: Implementar CameraX para foto silenciosa con cámara frontal
        // Requiere CameraX dependency y Surface para preview oculto
        Log.d(TAG, "Foto silenciosa - pendiente de implementar CameraX")
    }

    // ─── FACTORY RESET ────────────────────────────────────────────
    private fun factoryReset() {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, DeviceAdminReceiver::class.java)

        if (dpm.isAdminActive(adminComponent)) {
            Log.d(TAG, "Ejecutando factory reset...")
            dpm.wipeData(0)
        } else {
            Log.e(TAG, "No tiene permisos para factory reset")
        }
    }

    // ─── ESTADO DEL SIM ───────────────────────────────────────────
    private fun checkSimStatus() {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as android.telephony.TelephonyManager
        val simState = tm.simState
        val hasSimCard = simState == android.telephony.TelephonyManager.SIM_STATE_READY
        Log.d(TAG, "Estado SIM: ${if (hasSimCard) "Presente" else "Removido o no disponible"}")
    }

    // ─── ACTUALIZAR TOKEN FCM ─────────────────────────────────────
    suspend fun updateFcmToken(token: String) {
        val userId = auth.currentUser?.uid ?: return
        db.collection("devices").document(userId)
            .update("fcmToken", token)
            .await()
        Log.d(TAG, "FCM token actualizado ✅")
    }

    // ─── ACTUALIZAR ESTADO DEL COMANDO ───────────────────────────
    private suspend fun updateCommandStatus(commandId: String, status: String) {
        if (commandId.isEmpty()) return
        try {
            db.collection("commands").document(commandId)
                .update("status", status)
                .await()
        } catch (e: Exception) {
            Log.e(TAG, "Error actualizando status del comando: ${e.message}")
        }
    }
}
