package com.ecodeli.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.rememberNavController
import com.ecodeli.presentation.navigation.EcoDeliNavHost
import com.ecodeli.presentation.ui.theme.EcoDeliTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Activité principale de l'application EcoDeli
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // Installer le splash screen
        installSplashScreen()
        
        super.onCreate(savedInstanceState)
        
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
    }
}

@Composable
fun EcoDeliApp() {
    val navController = rememberNavController()
    
    EcoDeliNavHost(
        navController = navController,
        startDestination = "splash" // Commencer par un écran splash pour vérifier l'auth
    )
}