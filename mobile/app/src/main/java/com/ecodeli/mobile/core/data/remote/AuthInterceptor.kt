package com.ecodeli.mobile.core.data.remote

import com.ecodeli.mobile.core.data.local.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val preferencesManager: PreferencesManager
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking {
            preferencesManager.authToken.first()
        }
        
        val request = chain.request().newBuilder()
        
        token?.let {
            request.addHeader("Authorization", "Bearer $it")
        }
        
        return chain.proceed(request.build())
    }
}