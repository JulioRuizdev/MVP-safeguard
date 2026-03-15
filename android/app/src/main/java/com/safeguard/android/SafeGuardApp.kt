package com.safeguard.android

import android.app.Application
import com.google.firebase.FirebaseApp

class SafeGuardApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}