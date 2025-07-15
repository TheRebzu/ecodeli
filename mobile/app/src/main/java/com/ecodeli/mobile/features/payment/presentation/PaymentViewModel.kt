package com.ecodeli.mobile.features.payment.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.models.Payment
import com.ecodeli.mobile.core.data.models.Wallet
import com.ecodeli.mobile.core.data.repository.PaymentRepository
import com.ecodeli.mobile.core.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository
) : ViewModel() {
    
    private val _payments = MutableStateFlow<List<Payment>>(emptyList())
    val payments: StateFlow<List<Payment>> = _payments.asStateFlow()
    
    private val _wallet = MutableStateFlow<Wallet?>(null)
    val wallet: StateFlow<Wallet?> = _wallet.asStateFlow()
    
    private val _paymentState = MutableStateFlow<PaymentState>(PaymentState.Idle)
    val paymentState: StateFlow<PaymentState> = _paymentState.asStateFlow()
    
    private val _showAddPaymentMethod = MutableStateFlow(false)
    val showAddPaymentMethod: StateFlow<Boolean> = _showAddPaymentMethod.asStateFlow()
    
    private val _showRechargeDialog = MutableStateFlow(false)
    val showRechargeDialog: StateFlow<Boolean> = _showRechargeDialog.asStateFlow()
    
    private val _showWithdrawDialog = MutableStateFlow(false)
    val showWithdrawDialog: StateFlow<Boolean> = _showWithdrawDialog.asStateFlow()
    
    init {
        loadPayments()
        loadWallet()
    }
    
    fun loadPayments() {
        viewModelScope.launch {
            _paymentState.value = PaymentState.Loading
            when (val result = paymentRepository.getUserPayments()) {
                is Resource.Success -> {
                    _payments.value = result.data
                    _paymentState.value = PaymentState.Success
                }
                is Resource.Error -> {
                    _paymentState.value = PaymentState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun loadWallet() {
        viewModelScope.launch {
            when (val result = paymentRepository.getUserWallet()) {
                is Resource.Success -> {
                    _wallet.value = result.data
                }
                is Resource.Error -> {
                    // Handle error silently for wallet
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun showAddPaymentMethod() {
        _showAddPaymentMethod.value = true
    }
    
    fun hideAddPaymentMethod() {
        _showAddPaymentMethod.value = false
    }
    
    fun showRechargeDialog() {
        _showRechargeDialog.value = true
    }
    
    fun hideRechargeDialog() {
        _showRechargeDialog.value = false
    }
    
    fun showWithdrawDialog() {
        _showWithdrawDialog.value = true
    }
    
    fun hideWithdrawDialog() {
        _showWithdrawDialog.value = false
    }
    
    fun addPaymentMethod(cardNumber: String, expiryDate: String, cvv: String) {
        viewModelScope.launch {
            when (val result = paymentRepository.addPaymentMethod(cardNumber, expiryDate, cvv)) {
                is Resource.Success -> {
                    // Refresh payments after adding method
                    loadPayments()
                }
                is Resource.Error -> {
                    _paymentState.value = PaymentState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun rechargeWallet(amount: Double) {
        viewModelScope.launch {
            when (val result = paymentRepository.rechargeWallet(amount)) {
                is Resource.Success -> {
                    loadWallet()
                    loadPayments()
                }
                is Resource.Error -> {
                    _paymentState.value = PaymentState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun withdrawFromWallet(amount: Double) {
        viewModelScope.launch {
            when (val result = paymentRepository.withdrawFromWallet(amount)) {
                is Resource.Success -> {
                    loadWallet()
                    loadPayments()
                }
                is Resource.Error -> {
                    _paymentState.value = PaymentState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
}