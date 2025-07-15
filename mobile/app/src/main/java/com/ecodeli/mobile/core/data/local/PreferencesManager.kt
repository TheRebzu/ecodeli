package com.ecodeli.mobile.core.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.ecodeli.mobile.core.data.models.User
import com.ecodeli.mobile.core.data.models.UserRole
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "ecodeli_prefs")

@Singleton
class PreferencesManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    
    companion object {
        private val AUTH_TOKEN = stringPreferencesKey("auth_token")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val USER_DATA = stringPreferencesKey("user_data")
        private val USER_ROLE = stringPreferencesKey("user_role")
    }
    
    val authToken: Flow<String?> = context.dataStore.data
        .map { preferences -> preferences[AUTH_TOKEN] }
    
    val refreshToken: Flow<String?> = context.dataStore.data
        .map { preferences -> preferences[REFRESH_TOKEN] }
    
    val userData: Flow<User?> = context.dataStore.data
        .map { preferences ->
            preferences[USER_DATA]?.let { json ->
                gson.fromJson(json, User::class.java)
            }
        }
    
    val userRole: Flow<UserRole?> = context.dataStore.data
        .map { preferences ->
            preferences[USER_ROLE]?.let { role ->
                UserRole.valueOf(role)
            }
        }
    
    suspend fun saveAuthData(token: String, refreshToken: String, user: User) {
        context.dataStore.edit { preferences ->
            preferences[AUTH_TOKEN] = token
            preferences[REFRESH_TOKEN] = refreshToken
            preferences[USER_DATA] = gson.toJson(user)
            preferences[USER_ROLE] = user.role.name
        }
    }
    
    suspend fun clearAuthData() {
        context.dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN)
            preferences.remove(REFRESH_TOKEN)
            preferences.remove(USER_DATA)
            preferences.remove(USER_ROLE)
        }
    }
    
    suspend fun updateUser(user: User) {
        context.dataStore.edit { preferences ->
            preferences[USER_DATA] = gson.toJson(user)
            preferences[USER_ROLE] = user.role.name
        }
    }
}