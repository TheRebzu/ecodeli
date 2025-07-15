package com.ecodeli.mobile.core.config

object ApiConfig {
    // URLs de base
    const val BASE_URL = "https://ecodeli.me/"
    const val WS_URL = "wss://ecodeli.me/ws"
    const val API_VERSION = "v1"
    
    // Endpoints principaux
    object Endpoints {
        // Auth
        const val LOGIN = "api/auth/login"
        const val REGISTER = "api/auth/register"
        const val SESSION = "api/auth/session"
        const val LOGOUT = "api/auth/logout"
        
        // Client
        const val CLIENT_ANNOUNCEMENTS = "api/client/announcements"
        const val CLIENT_DELIVERIES = "api/client/deliveries"
        const val CLIENT_NOTIFICATIONS = "api/client/notifications"
        const val CLIENT_PAYMENTS = "api/client/payments"
        const val CLIENT_PROFILE = "api/client/profile"
        const val CLIENT_WALLET = "api/client/wallet"
        
        // Deliverer
        const val DELIVERER_ANNOUNCEMENTS = "api/deliverer/announcements"
        const val DELIVERER_DELIVERIES = "api/deliverer/deliveries"
        const val DELIVERER_OPPORTUNITIES = "api/deliverer/opportunities"
        const val DELIVERER_PROFILE = "api/deliverer/profile"
        const val DELIVERER_WALLET = "api/deliverer/wallet"
        
        // Shared
        const val SHARED_ANALYTICS = "api/shared/analytics"
        const val SHARED_PAYMENTS = "api/shared/payments"
        const val SHARED_NOTIFICATIONS = "api/shared/notifications"
        
        // Push Notifications
        const val PUSH_SUBSCRIBE = "api/push/subscribe"
        const val PUSH_UNSUBSCRIBE = "api/push/unsubscribe"
        
        // Upload
        const val UPLOAD = "api/upload"
        
        // Public
        const val PUBLIC_STATUS = "api/public/status"
        const val PUBLIC_ZONES = "api/public/zones"
    }
    
    // Configuration réseau
    object Network {
        const val CONNECT_TIMEOUT = 30L // secondes
        const val READ_TIMEOUT = 30L // secondes
        const val WRITE_TIMEOUT = 30L // secondes
        const val RETRY_COUNT = 3
    }
    
    // Configuration cache
    object Cache {
        const val CACHE_SIZE = 10 * 1024 * 1024L // 10MB
        const val CACHE_MAX_AGE = 5 * 60 // 5 minutes
        const val CACHE_MAX_STALE = 7 * 24 * 60 * 60 // 1 semaine
    }
    
    // Headers personnalisés
    object Headers {
        const val API_KEY = "X-API-Key"
        const val APP_VERSION = "X-App-Version"
        const val PLATFORM = "X-Platform"
        const val DEVICE_ID = "X-Device-ID"
        const val USER_AGENT = "EcoDeli-Mobile-Android"
    }
    
    // Environnements
    enum class Environment {
        DEV, STAGING, PRODUCTION
    }
    
    // Configuration actuelle
    val currentEnvironment = Environment.PRODUCTION
    
    fun getFullUrl(endpoint: String): String {
        return BASE_URL + endpoint
    }
    
    fun getWebSocketUrl(path: String): String {
        return WS_URL + path
    }
}