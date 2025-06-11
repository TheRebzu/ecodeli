package com.ecodeli.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.data.api.Result
import com.ecodeli.data.models.Delivery
import com.ecodeli.data.models.DeliveryStatus
import com.ecodeli.data.models.ServiceBooking
import com.ecodeli.data.repositories.AuthRepository
import com.ecodeli.data.repositories.DeliveryRepository
import com.ecodeli.data.repositories.PaymentRepository
import com.ecodeli.data.repositories.ServiceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel pour le dashboard
 */
@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val deliveryRepository: DeliveryRepository,
    private val serviceRepository: ServiceRepository,
    private val paymentRepository: PaymentRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()
    
    init {
        loadDashboardData()
    }
    
    private fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            // Charger le profil utilisateur
            loadUserProfile()
            
            // Charger les données en parallèle
            launch { loadActiveDeliveries() }
            launch { loadUpcomingServices() }
            launch { loadWalletBalance() }
            
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }
    
    private suspend fun loadUserProfile() {
        when (val result = authRepository.getProfile()) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    userName = result.data.firstName
                )
            }
            else -> Unit
        }
    }
    
    private suspend fun loadActiveDeliveries() {
        when (val result = deliveryRepository.getDeliveries(
            status = DeliveryStatus.IN_TRANSIT,
            limit = 5
        )) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    activeDeliveries = result.data.total,
                    recentDeliveries = result.data.deliveries
                )
            }
            else -> Unit
        }
    }
    
    private suspend fun loadUpcomingServices() {
        // TODO: Implémenter quand l'API sera prête
        _uiState.value = _uiState.value.copy(
            upcomingServices = 0,
            upcomingBookings = emptyList()
        )
    }
    
    private suspend fun loadWalletBalance() {
        when (val result = paymentRepository.getWalletBalance()) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    walletBalance = result.data.balance
                )
            }
            else -> Unit
        }
    }
    
    fun refresh() {
        loadDashboardData()
    }
}

/**
 * État UI pour le dashboard
 */
data class DashboardUiState(
    val userName: String = "",
    val activeDeliveries: Int = 0,
    val upcomingServices: Int = 0,
    val walletBalance: Double = 0.0,
    val recentDeliveries: List<Delivery> = emptyList(),
    val upcomingBookings: List<ServiceBooking> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)