package com.ecodeli.mobile

import android.app.Application
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
import com.stripe.android.PaymentConfiguration
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class EcoDeliApplication : Application() {
    
    companion object {
        const val ONESIGNAL_APP_ID = "your-onesignal-app-id" // À configurer
        const val STRIPE_PUBLIC_KEY = "pk_live_51..." // À configurer avec la vraie clé
    }
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize OneSignal
        OneSignal.Debug.logLevel = LogLevel.VERBOSE
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID)
        
        // Initialize Stripe
        PaymentConfiguration.init(
            applicationContext,
            STRIPE_PUBLIC_KEY
        )
    }
}