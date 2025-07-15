package com.ecodeli.mobile.features.nfc

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.repository.DeliveryRepository
import com.ecodeli.mobile.core.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NfcValidationViewModel @Inject constructor(
    private val nfcManager: NfcManager,
    private val deliveryRepository: DeliveryRepository
) : ViewModel() {
    
    private val _deliveryId = MutableStateFlow("")
    private val _isNfcAvailable = MutableStateFlow(false)
    val isNfcAvailable: StateFlow<Boolean> = _isNfcAvailable.asStateFlow()
    
    private val _validationState = MutableStateFlow<NfcValidationState>(NfcValidationState.Idle)
    val validationState: StateFlow<NfcValidationState> = _validationState.asStateFlow()
    
    val nfcState = nfcManager.nfcState
    val delivererCard = nfcManager.delivererCard
    
    init {
        observeNfcState()
    }
    
    private fun observeNfcState() {
        viewModelScope.launch {
            nfcManager.nfcState.collect { state ->
                when (state) {
                    is NfcState.Success -> {
                        validateDelivererCard(state.delivererCard)
                    }
                    is NfcState.Error -> {
                        _validationState.value = NfcValidationState.ValidationError(state.message)
                    }
                    else -> {}
                }
            }
        }
    }
    
    fun initializeForDelivery(deliveryId: String, context: Context) {
        _deliveryId.value = deliveryId
        _isNfcAvailable.value = nfcManager.isNfcAvailable(context as android.app.Activity)
    }
    
    fun startScanning() {
        nfcManager.clearState()
        _validationState.value = NfcValidationState.Idle
    }
    
    fun retry() {
        nfcManager.clearState()
        _validationState.value = NfcValidationState.Idle
    }
    
    fun simulateTestScan() {
        val testCard = DelivererCard(
            delivererId = "DELIV001",
            delivererName = "Test Livreur",
            validUntil = (System.currentTimeMillis() + 86400000).toString(), // Valid for 24h
            cardId = "TEST_CARD_001"
        )
        
        nfcManager.simulateNfcScan(testCard)
    }
    
    private fun validateDelivererCard(card: DelivererCard) {
        viewModelScope.launch {
            _validationState.value = NfcValidationState.Validating
            
            // Validate card format and expiry
            if (!nfcManager.validateDelivererCard(card)) {
                _validationState.value = NfcValidationState.ValidationError("Carte expirée ou invalide")
                return@launch
            }
            
            // Validate with backend
            when (val result = deliveryRepository.validateDeliveryWithNfc(_deliveryId.value, card)) {
                is Resource.Success -> {
                    _validationState.value = NfcValidationState.ValidationComplete
                }
                is Resource.Error -> {
                    _validationState.value = NfcValidationState.ValidationError(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
}