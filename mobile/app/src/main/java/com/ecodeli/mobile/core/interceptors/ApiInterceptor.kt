package com.ecodeli.mobile.core.interceptors

import com.ecodeli.mobile.core.config.AppConfig
import com.ecodeli.mobile.core.data.local.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class ApiInterceptor @Inject constructor(
    private val preferencesManager: PreferencesManager
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Ajouter les headers personnalisés
        val requestBuilder = originalRequest.newBuilder()
            .addHeader("User-Agent", "EcoDeli-Mobile-Android")
            .addHeader("X-App-Version", "1.0")
            .addHeader("X-Platform", "Android")
            .addHeader("Accept", "application/json")
            .addHeader("Content-Type", "application/json")
            .addHeader("X-Requested-With", "XMLHttpRequest")
        
        // Ajouter le token d'authentification si disponible
        val token = runBlocking {
            preferencesManager.authToken.first()
        }
        
        token?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
        }
        
        // Ajouter l'ID du device si disponible
        val deviceId = android.provider.Settings.Secure.getString(
            null, // Context non disponible ici
            android.provider.Settings.Secure.ANDROID_ID
        )
        
        deviceId?.let {
            requestBuilder.addHeader("X-Device-ID", it)
        }
        
        val request = requestBuilder.build()
        
        // Exécuter la requête
        val response = chain.proceed(request)
        
        // Gérer les réponses d'authentification
        if (response.code == 401) {
            // Token expiré, nettoyer les données d'auth
            runBlocking {
                preferencesManager.clearAuthData()
            }
        }
        
        return response
    }
}