package com.ecodeli.mobile.features.profile.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.models.User
import com.ecodeli.mobile.core.data.repository.AuthRepository
import com.ecodeli.mobile.core.data.repository.UserRepository
import com.ecodeli.mobile.core.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()
    
    private val _profileState = MutableStateFlow<ProfileState>(ProfileState.Idle)
    val profileState: StateFlow<ProfileState> = _profileState.asStateFlow()
    
    private val _showEditDialog = MutableStateFlow(false)
    val showEditDialog: StateFlow<Boolean> = _showEditDialog.asStateFlow()
    
    init {
        loadUserProfile()
    }
    
    fun loadUserProfile() {
        viewModelScope.launch {
            _profileState.value = ProfileState.Loading
            when (val result = userRepository.getCurrentUser()) {
                is Resource.Success -> {
                    _user.value = result.data
                    _profileState.value = ProfileState.Success
                }
                is Resource.Error -> {
                    _profileState.value = ProfileState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun showEditDialog() {
        _showEditDialog.value = true
    }
    
    fun hideEditDialog() {
        _showEditDialog.value = false
    }
    
    fun updateProfile(name: String, email: String, phone: String) {
        viewModelScope.launch {
            _profileState.value = ProfileState.Loading
            when (val result = userRepository.updateProfile(name, email, phone)) {
                is Resource.Success -> {
                    _user.value = result.data
                    _profileState.value = ProfileState.Success
                }
                is Resource.Error -> {
                    _profileState.value = ProfileState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            // Clear user data
            _user.value = null
            _profileState.value = ProfileState.Idle
        }
    }
}