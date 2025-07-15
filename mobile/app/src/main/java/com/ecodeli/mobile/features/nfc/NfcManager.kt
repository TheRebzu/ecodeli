package com.ecodeli.mobile.features.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.delay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Singleton
class NfcManager @Inject constructor() {
    
    private val _nfcState = MutableStateFlow<NfcState>(NfcState.Idle)
    val nfcState: StateFlow<NfcState> = _nfcState.asStateFlow()
    
    private val _delivererCard = MutableStateFlow<DelivererCard?>(null)
    val delivererCard: StateFlow<DelivererCard?> = _delivererCard.asStateFlow()
    
    fun enableNfcForegroundDispatch(activity: Activity, adapter: NfcAdapter) {
        val intent = Intent(activity, activity.javaClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        
        val pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.getActivity(activity, 0, intent, PendingIntent.FLAG_MUTABLE)
        } else {
            PendingIntent.getActivity(activity, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)
        }
        
        val intentFilters = arrayOf(
            IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED),
            IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED),
            IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        )
        
        val techLists = arrayOf(
            arrayOf(Ndef::class.java.name)
        )
        
        adapter.enableForegroundDispatch(activity, pendingIntent, intentFilters, techLists)
        _nfcState.value = NfcState.Ready
    }
    
    fun disableNfcForegroundDispatch(activity: Activity, adapter: NfcAdapter) {
        adapter.disableForegroundDispatch(activity)
        _nfcState.value = NfcState.Idle
    }
    
    fun handleNfcIntent(intent: Intent) {
        _nfcState.value = NfcState.Reading
        
        when (intent.action) {
            NfcAdapter.ACTION_NDEF_DISCOVERED -> {
                val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
                tag?.let { readNfcTag(it) }
            }
            NfcAdapter.ACTION_TAG_DISCOVERED -> {
                val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
                tag?.let { readNfcTag(it) }
            }
        }
    }
    
    private fun readNfcTag(tag: Tag) {
        try {
            val ndef = Ndef.get(tag)
            ndef?.connect()
            
            val ndefMessage = ndef?.cachedNdefMessage
            ndefMessage?.let { message ->
                val delivererInfo = parseDelivererCard(message)
                if (delivererInfo != null) {
                    _delivererCard.value = delivererInfo
                    _nfcState.value = NfcState.Success(delivererInfo)
                } else {
                    _nfcState.value = NfcState.Error("Invalid EcoDeli card")
                }
            } ?: run {
                _nfcState.value = NfcState.Error("No data found on card")
            }
            
            ndef?.close()
        } catch (e: Exception) {
            _nfcState.value = NfcState.Error(e.message ?: "Error reading NFC card")
        }
    }
    
    private fun parseDelivererCard(message: NdefMessage): DelivererCard? {
        return try {
            val records = message.records
            if (records.isNotEmpty()) {
                val payload = String(records[0].payload)
                // Skip the first 3 bytes (language code) for text records
                val actualPayload = if (payload.length > 3) payload.substring(3) else payload
                
                // Parse the payload format: "ECODELI:DELIVERER:{id}:{name}:{validUntil}"
                val parts = actualPayload.split(":")
                if (parts.size >= 4 && parts[0] == "ECODELI" && parts[1] == "DELIVERER") {
                    val card = DelivererCard(
                        delivererId = parts[2],
                        delivererName = parts[3],
                        validUntil = parts.getOrNull(4) ?: "",
                        cardId = generateCardId(actualPayload)
                    )
                    
                    // Validate the card
                    if (validateDelivererCard(card)) {
                        card
                    } else {
                        null
                    }
                } else {
                    null
                }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    private fun generateCardId(payload: String): String {
        return payload.hashCode().toString()
    }
    
    fun writeDelivererCard(tag: Tag, delivererCard: DelivererCard): Boolean {
        return try {
            val ndef = Ndef.get(tag)
            ndef?.connect()
            
            val payload = "ECODELI:DELIVERER:${delivererCard.delivererId}:${delivererCard.delivererName}:${delivererCard.validUntil}"
            val mimeType = "application/vnd.ecodeli.deliverer"
            
            val mimeRecord = NdefRecord.createMime(mimeType, payload.toByteArray())
            val ndefMessage = NdefMessage(arrayOf(mimeRecord))
            
            ndef?.writeNdefMessage(ndefMessage)
            ndef?.close()
            
            true
        } catch (e: Exception) {
            false
        }
    }
    
    fun clearState() {
        _nfcState.value = NfcState.Idle
        _delivererCard.value = null
    }
    
    fun simulateNfcScan(delivererCard: DelivererCard) {
        // Simulate NFC scan for testing purposes
        _nfcState.value = NfcState.Reading
        CoroutineScope(Dispatchers.Main).launch {
            delay(1000) // Simulate scanning delay
            _delivererCard.value = delivererCard
            _nfcState.value = NfcState.Success(delivererCard)
        }
    }
    
    fun isNfcAvailable(activity: Activity): Boolean {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
        return nfcAdapter != null && nfcAdapter.isEnabled
    }
    
    fun validateDelivererCard(card: DelivererCard): Boolean {
        // Validate card expiry and format
        return try {
            val currentTime = System.currentTimeMillis()
            val validUntilTime = card.validUntil.toLongOrNull() ?: 0
            currentTime <= validUntilTime
        } catch (e: Exception) {
            false
        }
    }
}

sealed class NfcState {
    object Idle : NfcState()
    object Ready : NfcState()
    object Reading : NfcState()
    data class Success(val delivererCard: DelivererCard) : NfcState()
    data class Error(val message: String) : NfcState()
}

data class DelivererCard(
    val delivererId: String,
    val delivererName: String,
    val validUntil: String,
    val cardId: String
)