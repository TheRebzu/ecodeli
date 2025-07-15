package com.ecodeli.mobile.core.config

import com.ecodeli.mobile.BuildConfig

object AppConfig {
    // Informations de l'application
    const val APP_NAME = "EcoDeli"
    const val APP_VERSION = BuildConfig.VERSION_NAME
    const val APP_VERSION_CODE = BuildConfig.VERSION_CODE
    
    // Configuration API
    const val API_BASE_URL = "https://ecodeli.me/"
    const val WEB_BASE_URL = "https://ecodeli.me/"
    
    // Services externes
    object ExternalServices {
        const val STRIPE_PUBLIC_KEY = "pk_live_51..." // À remplacer par la vraie clé
        const val ONESIGNAL_APP_ID = "your-onesignal-app-id" // À remplacer
        const val GOOGLE_MAPS_API_KEY = "your-google-maps-key" // À remplacer
    }
    
    // Configuration OneSignal
    object OneSignal {
        const val APP_ID = "your-onesignal-app-id"
        const val REST_API_KEY = "your-rest-api-key"
        
        // Tags OneSignal
        const val TAG_USER_ROLE = "user_role"
        const val TAG_USER_ID = "user_id"
        const val TAG_CITY = "city"
        const val TAG_LANGUAGE = "language"
        
        // Notification Types
        const val NOTIFICATION_TYPE_DELIVERY = "delivery_update"
        const val NOTIFICATION_TYPE_OPPORTUNITY = "new_opportunity"
        const val NOTIFICATION_TYPE_PAYMENT = "payment_received"
        const val NOTIFICATION_TYPE_VALIDATION = "validation_required"
        const val NOTIFICATION_TYPE_MESSAGE = "new_message"
    }
    
    // Configuration Stripe
    object Stripe {
        const val PUBLIC_KEY = ExternalServices.STRIPE_PUBLIC_KEY
        const val MERCHANT_ID = "merchant.com.ecodeli.mobile"
        const val CURRENCY = "EUR"
        const val COUNTRY_CODE = "FR"
    }
    
    // Configuration NFC
    object NFC {
        const val CARD_TYPE = "application/vnd.ecodeli.deliverer"
        const val CARD_PREFIX = "ECODELI:DELIVERER:"
        const val MAX_CARD_SIZE = 8192 // bytes
        const val CARD_TIMEOUT = 5000 // ms
    }
    
    // Configuration géolocalisation
    object Location {
        const val MIN_TIME_BETWEEN_UPDATES = 30000L // 30 secondes
        const val MIN_DISTANCE_FOR_UPDATES = 100f // 100 mètres
        const val LOCATION_TIMEOUT = 60000L // 1 minute
    }
    
    // Configuration cache
    object Cache {
        const val MAX_SIZE = 50 * 1024 * 1024L // 50MB
        const val MAX_AGE_SECONDS = 300 // 5 minutes
        const val MAX_STALE_SECONDS = 86400 // 24 heures
    }
    
    // Configuration debug
    object Debug {
        const val ENABLE_LOGGING = BuildConfig.DEBUG
        const val ENABLE_NETWORK_LOGGING = BuildConfig.DEBUG
        const val ENABLE_CRASH_REPORTING = !BuildConfig.DEBUG
    }
    
    // URLs importantes
    object Urls {
        const val TERMS_OF_SERVICE = "${WEB_BASE_URL}legal/cgu"
        const val PRIVACY_POLICY = "${WEB_BASE_URL}privacy"
        const val HELP_CENTER = "${WEB_BASE_URL}faq"
        const val CONTACT = "${WEB_BASE_URL}contact"
        const val ABOUT = "${WEB_BASE_URL}about"
    }
    
    // Configurations régionales
    object Regional {
        const val DEFAULT_COUNTRY = "France"
        const val DEFAULT_CURRENCY = "EUR"
        const val DEFAULT_LANGUAGE = "fr"
        const val SUPPORTED_COUNTRIES = "FR,BE,CH,LU"
    }
    
    // Limites de l'application
    object Limits {
        const val MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
        const val MAX_DESCRIPTION_LENGTH = 500
        const val MAX_TITLE_LENGTH = 100
        const val MIN_PRICE = 5.0
        const val MAX_PRICE = 1000.0
        const val MAX_WEIGHT = 30.0 // kg
    }
    
    // Configuration sécurité
    object Security {
        const val SESSION_TIMEOUT = 30 * 60 * 1000L // 30 minutes
        const val MAX_LOGIN_ATTEMPTS = 5
        const val LOCKOUT_DURATION = 15 * 60 * 1000L // 15 minutes
        const val PIN_CODE_LENGTH = 6
    }
}