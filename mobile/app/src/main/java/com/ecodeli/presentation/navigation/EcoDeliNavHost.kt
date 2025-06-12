package com.ecodeli.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ecodeli.data.repositories.AuthRepository
import com.ecodeli.presentation.ui.auth.LoginScreen
import com.ecodeli.presentation.ui.auth.RegisterScreen
import com.ecodeli.presentation.ui.auth.SplashScreen
import com.ecodeli.presentation.ui.delivery.DeliveryDetailScreen
import com.ecodeli.presentation.ui.delivery.DeliveryListScreen
import com.ecodeli.presentation.ui.home.HomeScreen
import javax.inject.Inject

/**
 * Navigation principale de l'application
 */
@Composable
fun EcoDeliNavHost(
    navController: NavHostController,
    startDestination: String
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Écran Splash
        composable(Routes.SPLASH) {
            SplashScreen(
                onNavigateToHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }
        
        // Authentification
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Routes.REGISTER)
                }
            )
        }
        
        composable(Routes.REGISTER) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.REGISTER) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        // Écran principal
        composable(Routes.HOME) {
            HomeScreen(navController = navController)
        }
        
        // Livraisons
        composable(Routes.DELIVERY_LIST) {
            DeliveryListScreen(
                onDeliveryClick = { delivery ->
                    navController.navigate(Routes.deliveryDetail(delivery.id))
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(
            Routes.DELIVERY_DETAIL,
            arguments = listOf(
                navArgument("deliveryId") { type = NavType.StringType }
            )
        ) {
            DeliveryDetailScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}

/**
 * Définition des routes de navigation
 */
object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val HOME = "home"
    const val DELIVERY_LIST = "deliveries"
    const val DELIVERY_DETAIL = "delivery/{deliveryId}"
    const val SERVICE_LIST = "services"
    const val SERVICE_DETAIL = "service/{serviceId}"
    const val PROFILE = "profile"
    const val WALLET = "wallet"
    const val SETTINGS = "settings"
    
    fun deliveryDetail(deliveryId: String) = "delivery/$deliveryId"
    fun serviceDetail(serviceId: String) = "service/$serviceId"
}