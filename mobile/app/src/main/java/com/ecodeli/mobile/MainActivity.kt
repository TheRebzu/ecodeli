package com.ecodeli.mobile

import android.content.Intent
import android.nfc.NfcAdapter
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.ecodeli.mobile.core.navigation.EcoDeliNavigation
import com.ecodeli.mobile.core.theme.EcoDeliTheme
import com.ecodeli.mobile.features.nfc.NfcManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var nfcManager: NfcManager
    
    private var nfcAdapter: NfcAdapter? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        
        setContent {
            EcoDeliTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    EcoDeliApp()
                }
            }
        }
        
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }
    
    override fun onResume() {
        super.onResume()
        nfcAdapter?.let { adapter ->
            nfcManager.enableNfcForegroundDispatch(this, adapter)
        }
    }
    
    override fun onPause() {
        super.onPause()
        nfcAdapter?.let { adapter ->
            nfcManager.disableNfcForegroundDispatch(this, adapter)
        }
    }
    
    private fun handleIntent(intent: Intent) {
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {
            nfcManager.handleNfcIntent(intent)
        }
    }
}

@Composable
fun EcoDeliApp() {
    val navController = rememberNavController()
    EcoDeliNavigation(navController = navController)
}