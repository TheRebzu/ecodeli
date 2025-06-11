package com.ecodeli.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.data.api.Result
import com.ecodeli.domain.usecases.auth.LoginUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel pour l'écran de connexion
 */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()
    
    fun onEmailChange(email: String) {
        _uiState.value = _uiState.value.copy(email = email)
    }
    
    fun onPasswordChange(password: String) {
        _uiState.value = _uiState.value.copy(password = password)
    }
    
    fun onTwoFactorCodeChange(code: String) {
        _uiState.value = _uiState.value.copy(twoFactorCode = code)
    }
    
    fun login() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            val result = loginUseCase(
                email = _uiState.value.email,
                password = _uiState.value.password,
                twoFactorCode = _uiState.value.twoFactorCode.ifEmpty { null }
            )
            
            when (result) {
                is Result.Success -> {
                    if (result.data.requiresTwoFactor) {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            showTwoFactorInput = true
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            loginSuccess = true
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.exception.message
                    )
                }
                else -> Unit
            }
        }
    }
}

/**
 * État UI pour l'écran de connexion
 */
data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val twoFactorCode: String = "",
    val showTwoFactorInput: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val loginSuccess: Boolean = false
)