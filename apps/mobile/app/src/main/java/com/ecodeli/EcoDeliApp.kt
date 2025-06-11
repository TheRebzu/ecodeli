package com.ecodeli

import android.app.Application
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Classe Application principale d'EcoDeli
 * Gère l'initialisation de l'application et des services tiers
 */
@HiltAndroidApp
class EcoDeliApp : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Initialisation OneSignal pour les notifications
        initializeOneSignal()
        
        // Autres initialisations si nécessaire
        setupAppComponents()
    }
    
    /**
     * Initialise OneSignal pour les notifications push
     */
    private fun initializeOneSignal() {
        // Configuration du niveau de log (debug uniquement en développement)
        if (BuildConfig.DEBUG) {
            OneSignal.Debug.logLevel = LogLevel.VERBOSE
        }
        
        // Initialisation OneSignal
        OneSignal.initWithContext(this, BuildConfig.ONESIGNAL_APP_ID)
        
        // Demander la permission pour les notifications au lancement
        CoroutineScope(Dispatchers.IO).launch {
            OneSignal.Notifications.requestPermission(true)
        }
    }
    
    /**
     * Configure les composants de l'application
     */
    private fun setupAppComponents() {
        // Configuration du handler d'exceptions global si nécessaire
        Thread.setDefaultUncaughtExceptionHandler { thread, exception ->
            // Log l'exception avant le crash
            exception.printStackTrace()
            
            // Relancer l'exception pour le comportement par défaut
            throw exception
        }
    }
}