package com.ecodeli.presentation.viewmodels

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.data.api.Result
import com.ecodeli.data.models.Delivery
import com.ecodeli.data.repositories.DeliveryRepository
import com.ecodeli.domain.usecases.delivery.ValidateDeliveryUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel pour le détail d'une livraison
 */
@HiltViewModel
class DeliveryDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val deliveryRepository: DeliveryRepository,
    private val validateDeliveryUseCase: ValidateDeliveryUseCase
) : ViewModel() {
    
    private val deliveryId: String = checkNotNull(savedStateHandle["deliveryId"])
    
    private val _uiState = MutableStateFlow(DeliveryDetailUiState())
    val uiState: StateFlow<DeliveryDetailUiState> = _uiState.asStateFlow()
    
    init {
        loadDelivery()
    }
    
    private fun loadDelivery() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            when (val result = deliveryRepository.getDeliveryById(deliveryId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        delivery = result.data,
                        isLoading = false
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
    
    fun onValidationCodeChange(code: String) {
        _uiState.value = _uiState.value.copy(validationCode = code)
    }
    
    fun validateWithCode() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isValidating = true, validationError = null)
            
            val result = validateDeliveryUseCase.validateWithCode(
                deliveryId,
                _uiState.value.validationCode
            )
            
            when (result) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        delivery = result.data,
                        isValidating = false,
                        validationSuccess = true
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isValidating = false,
                        validationError = result.exception.message
                    )
                }
                else -> Unit
            }
        }
    }
    
    fun validateWithNfc(nfcCardId: String, nfcSignature: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isValidating = true, validationError = null)
            
            val result = validateDeliveryUseCase.validateWithNfc(
                deliveryId,
                nfcCardId,
                nfcSignature
            )
            
            when (result) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        delivery = result.data,
                        isValidating = false,
                        validationSuccess = true
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isValidating = false,
                        validationError = result.exception.message
                    )
                }
                else -> Unit
            }
        }
    }
    
    fun onRatingChange(rating: Int) {
        _uiState.value = _uiState.value.copy(rating = rating)
    }
    
    fun onCommentChange(comment: String) {
        _uiState.value = _uiState.value.copy(comment = comment)
    }
    
    fun submitRating() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingRating = true)
            
            val result = deliveryRepository.rateDelivery(
                deliveryId,
                _uiState.value.rating,
                _uiState.value.comment.ifEmpty { null }
            )
            
            when (result) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmittingRating = false,
                        ratingSubmitted = true
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmittingRating = false,
                        error = result.exception.message
                    )
                }
                else -> Unit
            }
        }
    }
}

/**
 * État UI pour le détail d'une livraison
 */
data class DeliveryDetailUiState(
    val delivery: Delivery? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    
    // Validation
    val validationCode: String = "",
    val isValidating: Boolean = false,
    val validationSuccess: Boolean = false,
    val validationError: String? = null,
    
    // Évaluation
    val rating: Int = 0,
    val comment: String = "",
    val isSubmittingRating: Boolean = false,
    val ratingSubmitted: Boolean = false
)