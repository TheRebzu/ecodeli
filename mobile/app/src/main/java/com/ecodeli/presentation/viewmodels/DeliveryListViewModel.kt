package me.ecodeli.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import me.ecodeli.data.api.Result
import me.ecodeli.data.models.Delivery
import me.ecodeli.data.models.DeliveryStatus
import me.ecodeli.data.repositories.DeliveryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel pour la liste des livraisons
 */
@HiltViewModel
class DeliveryListViewModel @Inject constructor(
    private val deliveryRepository: DeliveryRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(DeliveryListUiState())
    val uiState: StateFlow<DeliveryListUiState> = _uiState.asStateFlow()
    
    init {
        loadDeliveries()
    }
    
    fun loadDeliveries(status: DeliveryStatus? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            when (val result = deliveryRepository.getDeliveries(status)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        deliveries = result.data.deliveries,
                        isLoading = false,
                        selectedStatus = status
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
    
    fun refresh() {
        loadDeliveries(_uiState.value.selectedStatus)
    }
    
    fun selectDelivery(delivery: Delivery) {
        _uiState.value = _uiState.value.copy(selectedDelivery = delivery)
    }
}

/**
 * État UI pour la liste des livraisons
 */
data class DeliveryListUiState(
    val deliveries: List<Delivery> = emptyList(),
    val selectedDelivery: Delivery? = null,
    val selectedStatus: DeliveryStatus? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)