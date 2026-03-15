package com.safeguard.android.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessaging
import com.safeguard.android.R
import com.safeguard.android.services.DeviceAdminReceiver
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    private val DEVICE_ADMIN_REQUEST = 1001
    private val BACKEND_URL = "http://192.168.18.224:3001"
    private val TAG = "SafeGuard_Main"

    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var auth: FirebaseAuth

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dpm = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, DeviceAdminReceiver::class.java)
        auth = FirebaseAuth.getInstance()

        setupUI()
        checkStatus()
    }

    private fun setupUI() {
        findViewById<Button>(R.id.btn_login).setOnClickListener {
            val email = findViewById<EditText>(R.id.et_email).text.toString().trim()
            val password = findViewById<EditText>(R.id.et_password).text.toString()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Ingresa correo y contraseña", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            login(email, password)
        }

        findViewById<Button>(R.id.btn_activate_register).setOnClickListener {
            activateAndRegister()
        }
    }

    private fun checkStatus() {
        val isAdmin = dpm.isAdminActive(adminComponent)
        val isLoggedIn = auth.currentUser != null

        // Mostrar/ocultar secciones según estado
        val loginSection = findViewById<LinearLayout>(R.id.layout_login)
        val protectSection = findViewById<LinearLayout>(R.id.layout_protect)

        if (isLoggedIn) {
            loginSection.visibility = android.view.View.GONE
            protectSection.visibility = android.view.View.VISIBLE
        } else {
            loginSection.visibility = android.view.View.VISIBLE
            protectSection.visibility = android.view.View.GONE
        }

        findViewById<TextView>(R.id.tv_status).text = buildString {
            appendLine("Estado de SafeGuard:")
            appendLine("Device Admin: ${if (isAdmin) "✅ Activo" else "❌ Inactivo"}")
            appendLine("Sesión: ${if (isLoggedIn) "✅ ${auth.currentUser?.email}" else "❌ Sin sesión"}")
        }
    }

    private fun login(email: String, password: String) {
        auth.signInWithEmailAndPassword(email, password)
            .addOnSuccessListener {
                Toast.makeText(this, "✅ Sesión iniciada", Toast.LENGTH_SHORT).show()
                checkStatus()
            }
            .addOnFailureListener {
                Toast.makeText(this, "❌ Error: ${it.message}", Toast.LENGTH_LONG).show()
            }
    }

    private fun activateAndRegister() {
        // Paso 1: activar Device Admin si no está activo
        if (!dpm.isAdminActive(adminComponent)) {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "SafeGuard necesita este permiso para bloquear tu celular en caso de robo.")
            }
            startActivityForResult(intent, DEVICE_ADMIN_REQUEST)
            // El registro se hace en onActivityResult
        } else {
            // Ya es admin, solo registrar
            registerDevice()
        }
    }

    private fun registerDevice() {
        val user = auth.currentUser ?: return

        FirebaseMessaging.getInstance().token.addOnSuccessListener { fcmToken ->
            user.getIdToken(false).addOnSuccessListener { tokenResult ->
                val idToken = tokenResult.token ?: return@addOnSuccessListener

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val body = JSONObject().apply {
                            put("fcmToken", fcmToken)
                            put("deviceInfo", JSONObject().apply {
                                put("model", android.os.Build.MODEL)
                                put("sdk", android.os.Build.VERSION.SDK_INT)
                            })
                        }.toString()

                        val request = Request.Builder()
                            .url("$BACKEND_URL/api/device/register")
                            .addHeader("Authorization", "Bearer $idToken")
                            .post(body.toRequestBody("application/json".toMediaType()))
                            .build()

                        OkHttpClient().newCall(request).execute()

                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@MainActivity, "✅ Dispositivo registrado", Toast.LENGTH_SHORT).show()
                            checkStatus()
                        }
                    } catch (e: Exception) {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@MainActivity, "❌ Error: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == DEVICE_ADMIN_REQUEST) {
            if (dpm.isAdminActive(adminComponent)) {
                Toast.makeText(this, "✅ Protección activada", Toast.LENGTH_SHORT).show()
                registerDevice() // Ahora sí registrar
            } else {
                Toast.makeText(this, "⚠️ Debes activar el permiso para proteger tu celular", Toast.LENGTH_LONG).show()
            }
            checkStatus()
        }
    }
}