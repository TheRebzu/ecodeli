package com.ecodeli.mobile.core.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import com.ecodeli.mobile.core.config.ApiConfig
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkUtils @Inject constructor(
    private val context: Context
) {
    
    /**
     * Vérifie si l'appareil est connecté à Internet
     */
    fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
                else -> false
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            networkInfo?.isConnected == true
        }
    }
    
    /**
     * Vérifie si l'API EcoDeli est accessible
     */
    suspend fun isApiReachable(): Boolean {
        return try {
            val url = URL(ApiConfig.Endpoints.PUBLIC_STATUS)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.connect()
            
            val responseCode = connection.responseCode
            connection.disconnect()
            
            responseCode in 200..299
        } catch (e: IOException) {
            false
        }
    }
    
    /**
     * Obtient le type de connexion réseau
     */
    fun getNetworkType(): NetworkType {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return NetworkType.NONE
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return NetworkType.NONE
            
            when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkType.MOBILE
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
                else -> NetworkType.OTHER
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            when (networkInfo?.type) {
                ConnectivityManager.TYPE_WIFI -> NetworkType.WIFI
                ConnectivityManager.TYPE_MOBILE -> NetworkType.MOBILE
                ConnectivityManager.TYPE_ETHERNET -> NetworkType.ETHERNET
                else -> NetworkType.NONE
            }
        }
    }
    
    /**
     * Vérifie si la connexion est rapide
     */
    fun isConnectionFast(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    // Vérifier si c'est de la 4G/5G
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
                }
                else -> false
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            when (networkInfo?.type) {
                ConnectivityManager.TYPE_WIFI -> true
                ConnectivityManager.TYPE_ETHERNET -> true
                ConnectivityManager.TYPE_MOBILE -> {
                    when (networkInfo.subtype) {
                        android.telephony.TelephonyManager.NETWORK_TYPE_LTE,
                        android.telephony.TelephonyManager.NETWORK_TYPE_HSPAP,
                        android.telephony.TelephonyManager.NETWORK_TYPE_EHRPD -> true
                        else -> false
                    }
                }
                else -> false
            }
        }
    }
    
    /**
     * Obtient l'URL complète pour un endpoint
     */
    fun getFullApiUrl(endpoint: String): String {
        return ApiConfig.BASE_URL + endpoint.removePrefix("/")
    }
    
    /**
     * Vérifie si une URL est valide
     */
    fun isValidUrl(url: String): Boolean {
        return try {
            URL(url)
            true
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Convertit les erreurs HTTP en messages utilisateur
     */
    fun getErrorMessage(httpCode: Int): String {
        return when (httpCode) {
            400 -> "Requête invalide"
            401 -> "Session expirée, veuillez vous reconnecter"
            403 -> "Accès non autorisé"
            404 -> "Ressource non trouvée"
            408 -> "Délai d'attente dépassé"
            429 -> "Trop de requêtes, veuillez patienter"
            500 -> "Erreur serveur, veuillez réessayer"
            502 -> "Service temporairement indisponible"
            503 -> "Service en maintenance"
            else -> "Erreur de connexion (Code: $httpCode)"
        }
    }
}

enum class NetworkType {
    NONE,
    WIFI,
    MOBILE,
    ETHERNET,
    OTHER
}