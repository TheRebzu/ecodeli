package com.ecodeli.mobile.features.delivery.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.models.Delivery
import com.ecodeli.mobile.core.data.repository.DeliveryRepository
import com.ecodeli.mobile.core.utils.Resource
import com.ecodeli.mobile.features.nfc.DelivererCard
import com.ecodeli.mobile.features.nfc.NfcManager
import com.ecodeli.mobile.features.nfc.NfcState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DeliveryTrackingViewModel @Inject constructor(
    private val deliveryRepository: DeliveryRepository,
    private val nfcManager: NfcManager
) : ViewModel() {
    
    private val _deliveries = MutableStateFlow<List<Delivery>>(emptyList())
    val deliveries: StateFlow<List<Delivery>> = _deliveries.asStateFlow()
    
    private val _selectedDelivery = MutableStateFlow<Delivery?>(null)
    val selectedDelivery: StateFlow<Delivery?> = _selectedDelivery.asStateFlow()
    
    private val _trackingState = MutableStateFlow<TrackingState>(TrackingState.Idle)
    val trackingState: StateFlow<TrackingState> = _trackingState.asStateFlow()
    
    private val _validationState = MutableStateFlow<ValidationState>(ValidationState.Idle)
    val validationState: StateFlow<ValidationState> = _validationState.asStateFlow()
    
    val nfcState = nfcManager.nfcState
    val delivererCard = nfcManager.delivererCard
    
    init {
        loadDeliveries()
        observeNfcState()
    }
    
    private fun observeNfcState() {
        viewModelScope.launch {
            nfcManager.nfcState.collect { state ->
                when (state) {
                    is NfcState.Success -> {
                        handleDelivererCardScanned(state.delivererCard)
                    }
                    is NfcState.Error -> {
                        _validationState.value = ValidationState.Error(state.message)
                    }
                    else -> {}
                }
            }
        }
    }
    
    fun loadDeliveries() {
        viewModelScope.launch {
            _trackingState.value = TrackingState.Loading
            when (val result = deliveryRepository.getClientDeliveries()) {
                is Resource.Success -> {
                    _deliveries.value = result.data
                    _trackingState.value = TrackingState.Success
                }
                is Resource.Error -> {
                    _trackingState.value = TrackingState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun trackDelivery(deliveryId: String) {
        viewModelScope.launch {
            _trackingState.value = TrackingState.Loading
            when (val result = deliveryRepository.getDeliveryTracking(deliveryId)) {
                is Resource.Success -> {
                    _selectedDelivery.value = result.data
                    _trackingState.value = TrackingState.Tracking(result.data)
                }
                is Resource.Error -> {
                    _trackingState.value = TrackingState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun validateDelivery(deliveryId: String, validationCode: String) {
        viewModelScope.launch {
            _validationState.value = ValidationState.Validating
            when (val result = deliveryRepository.validateDeliveryWithCode(deliveryId, validationCode)) {
                is Resource.Success -> {
                    _validationState.value = ValidationState.Validated
                    loadDeliveries() // Refresh list
                }
                is Resource.Error -> {
                    _validationState.value = ValidationState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    private fun handleDelivererCardScanned(card: DelivererCard) {
        _selectedDelivery.value?.let { delivery ->
            if (delivery.announcement?.author?.id == card.delivererId) {
                _validationState.value = ValidationState.DelivererVerified(card)
            } else {
                _validationState.value = ValidationState.Error("This is not the assigned deliverer")
            }
        }
    }
    
    fun resetValidationState() {
        _validationState.value = ValidationState.Idle
        nfcManager.clearState()
    }
}

sealed class TrackingState {
    object Idle : TrackingState()
    object Loading : TrackingState()
    object Success : TrackingState()
    data class Tracking(val delivery: Delivery) : TrackingState()
    data class Error(val message: String) : TrackingState()
}

sealed class ValidationState {
    object Idle : ValidationState()
    object Validating : ValidationState()
    object Validated : ValidationState()
    data class DelivererVerified(val card: DelivererCard) : ValidationState()
    data class Error(val message: String) : ValidationState()
}