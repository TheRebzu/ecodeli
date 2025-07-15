package com.ecodeli.mobile.features.auth.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.models.User
import com.ecodeli.mobile.core.data.models.UserRole
import com.ecodeli.mobile.core.data.repository.AuthRepository
import com.ecodeli.mobile.core.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()
    
    val currentUser = authRepository.currentUser
    val isAuthenticated = authRepository.isAuthenticated
    
    fun login(email: String, password: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            when (val result = authRepository.login(email, password)) {
                is Resource.Success -> {
                    _authState.value = AuthState.Success(result.data.user)
                }
                is Resource.Error -> {
                    _authState.value = AuthState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String,
        role: UserRole,
        referralCode: String? = null
    ) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            when (val result = authRepository.register(
                email, password, firstName, lastName, phone, role, referralCode
            )) {
                is Resource.Success -> {
                    _authState.value = AuthState.Registered(result.data)
                }
                is Resource.Error -> {
                    _authState.value = AuthState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _authState.value = AuthState.LoggedOut
        }
    }
    
    fun resetState() {
        _authState.value = AuthState.Idle
    }
}

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Registered(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
    object LoggedOut : AuthState()
}