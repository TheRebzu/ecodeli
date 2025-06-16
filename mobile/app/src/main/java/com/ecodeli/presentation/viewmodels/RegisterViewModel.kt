package me.ecodeli.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import me.ecodeli.data.api.Result
import me.ecodeli.domain.usecases.auth.RegisterUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel pour l'écran d'inscription
 */
@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val registerUseCase: RegisterUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()
    
    fun onFirstNameChange(firstName: String) {
        _uiState.value = _uiState.value.copy(firstName = firstName)
    }
    
    fun onLastNameChange(lastName: String) {
        _uiState.value = _uiState.value.copy(lastName = lastName)
    }
    
    fun onEmailChange(email: String) {
        _uiState.value = _uiState.value.copy(email = email)
    }
    
    fun onPhoneChange(phone: String) {
        _uiState.value = _uiState.value.copy(phone = phone)
    }
    
    fun onPasswordChange(password: String) {
        _uiState.value = _uiState.value.copy(password = password)
    }
    
    fun onConfirmPasswordChange(confirmPassword: String) {
        _uiState.value = _uiState.value.copy(confirmPassword = confirmPassword)
    }
    
    fun onAcceptTermsChange(acceptTerms: Boolean) {
        _uiState.value = _uiState.value.copy(acceptTerms = acceptTerms)
    }
    
    fun register() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            val result = registerUseCase(
                email = _uiState.value.email,
                password = _uiState.value.password,
                confirmPassword = _uiState.value.confirmPassword,
                firstName = _uiState.value.firstName,
                lastName = _uiState.value.lastName,
                phone = _uiState.value.phone,
                acceptTerms = _uiState.value.acceptTerms
            )
            
            when (result) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        registerSuccess = true
                    )
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
 * État UI pour l'écran d'inscription
 */
data class RegisterUiState(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val phone: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val acceptTerms: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val registerSuccess: Boolean = false
)