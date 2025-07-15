package com.ecodeli.mobile.features.client.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.models.Announcement
import com.ecodeli.mobile.core.data.models.PaymentIntent
import com.ecodeli.mobile.core.data.repository.AnnouncementRepository
import com.ecodeli.mobile.core.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ClientAnnouncementViewModel @Inject constructor(
    private val announcementRepository: AnnouncementRepository
) : ViewModel() {
    
    private val _announcements = MutableStateFlow<List<Announcement>>(emptyList())
    val announcements: StateFlow<List<Announcement>> = _announcements.asStateFlow()
    
    private val _uiState = MutableStateFlow<AnnouncementUiState>(AnnouncementUiState.Idle)
    val uiState: StateFlow<AnnouncementUiState> = _uiState.asStateFlow()
    
    private val _selectedAnnouncement = MutableStateFlow<Announcement?>(null)
    val selectedAnnouncement: StateFlow<Announcement?> = _selectedAnnouncement.asStateFlow()
    
    init {
        loadAnnouncements()
    }
    
    fun loadAnnouncements() {
        viewModelScope.launch {
            _uiState.value = AnnouncementUiState.Loading
            when (val result = announcementRepository.getClientAnnouncements()) {
                is Resource.Success -> {
                    _announcements.value = result.data
                    _uiState.value = AnnouncementUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = AnnouncementUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun createAnnouncement(announcement: Announcement) {
        viewModelScope.launch {
            _uiState.value = AnnouncementUiState.Loading
            when (val result = announcementRepository.createAnnouncement(announcement)) {
                is Resource.Success -> {
                    loadAnnouncements() // Reload list
                    _uiState.value = AnnouncementUiState.Created(result.data)
                }
                is Resource.Error -> {
                    _uiState.value = AnnouncementUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun selectAnnouncement(announcementId: String) {
        viewModelScope.launch {
            when (val result = announcementRepository.getAnnouncement(announcementId)) {
                is Resource.Success -> {
                    _selectedAnnouncement.value = result.data
                }
                is Resource.Error -> {
                    _uiState.value = AnnouncementUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun createPaymentIntent(announcementId: String) {
        viewModelScope.launch {
            _uiState.value = AnnouncementUiState.Loading
            when (val result = announcementRepository.createPaymentIntent(announcementId)) {
                is Resource.Success -> {
                    _uiState.value = AnnouncementUiState.PaymentIntentCreated(result.data)
                }
                is Resource.Error -> {
                    _uiState.value = AnnouncementUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun resetState() {
        _uiState.value = AnnouncementUiState.Idle
    }
}

sealed class AnnouncementUiState {
    object Idle : AnnouncementUiState()
    object Loading : AnnouncementUiState()
    object Success : AnnouncementUiState()
    data class Created(val announcement: Announcement) : AnnouncementUiState()
    data class PaymentIntentCreated(val paymentIntent: PaymentIntent) : AnnouncementUiState()
    data class Error(val message: String) : AnnouncementUiState()
}