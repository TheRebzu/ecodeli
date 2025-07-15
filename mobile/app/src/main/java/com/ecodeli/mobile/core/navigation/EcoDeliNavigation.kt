package com.ecodeli.mobile.core.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.ecodeli.mobile.core.data.models.UserRole
import com.ecodeli.mobile.features.auth.presentation.AuthViewModel
import com.ecodeli.mobile.features.auth.presentation.LoginScreen
import com.ecodeli.mobile.features.auth.presentation.RegisterScreen
import com.ecodeli.mobile.features.client.presentation.ClientDashboardScreen
import com.ecodeli.mobile.features.client.presentation.ClientAnnouncementsScreen
import com.ecodeli.mobile.features.client.presentation.CreateAnnouncementScreen
import com.ecodeli.mobile.features.delivery.presentation.DeliveryTrackingScreen
import com.ecodeli.mobile.features.delivery.presentation.DeliveryValidationScreen
import com.ecodeli.mobile.features.deliverer.presentation.DelivererDashboardScreen
import com.ecodeli.mobile.features.deliverer.presentation.OpportunitiesScreen
import com.ecodeli.mobile.features.deliverer.presentation.ActiveDeliveriesScreen
import com.ecodeli.mobile.features.splash.SplashScreen

@Composable
fun EcoDeliNavigation(
    navController: NavHostController,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val isAuthenticated by authViewModel.isAuthenticated.collectAsState(initial = false)
    val currentUser by authViewModel.currentUser.collectAsState(initial = null)
    
    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        composable(Routes.SPLASH) {
            SplashScreen(
                onNavigate = {
                    if (isAuthenticated) {
                        when (currentUser?.role) {
                            UserRole.CLIENT -> navController.navigate(Routes.CLIENT_DASHBOARD) {
                                popUpTo(Routes.SPLASH) { inclusive = true }
                            }
                            UserRole.DELIVERER -> navController.navigate(Routes.DELIVERER_DASHBOARD) {
                                popUpTo(Routes.SPLASH) { inclusive = true }
                            }
                            else -> navController.navigate(Routes.LOGIN) {
                                popUpTo(Routes.SPLASH) { inclusive = true }
                            }
                        }
                    } else {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                }
            )
        }
        
        // Auth Navigation
        navigation(
            startDestination = Routes.LOGIN,
            route = Routes.AUTH_GRAPH
        ) {
            composable(Routes.LOGIN) {
                LoginScreen(
                    onLoginSuccess = { user ->
                        when (user.role) {
                            UserRole.CLIENT -> navController.navigate(Routes.CLIENT_DASHBOARD) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                            UserRole.DELIVERER -> navController.navigate(Routes.DELIVERER_DASHBOARD) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                            else -> {}
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
        }
        
        // Client Navigation
        navigation(
            startDestination = Routes.CLIENT_DASHBOARD,
            route = Routes.CLIENT_GRAPH
        ) {
            composable(Routes.CLIENT_DASHBOARD) {
                ClientDashboardScreen(
                    onNavigateToAnnouncements = {
                        navController.navigate(Routes.CLIENT_ANNOUNCEMENTS)
                    },
                    onNavigateToDeliveries = {
                        navController.navigate(Routes.CLIENT_DELIVERIES)
                    },
                    onLogout = {
                        authViewModel.logout()
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.CLIENT_GRAPH) { inclusive = true }
                        }
                    }
                )
            }
            
            composable(Routes.CLIENT_ANNOUNCEMENTS) {
                ClientAnnouncementsScreen(
                    onNavigateToCreate = {
                        navController.navigate(Routes.CREATE_ANNOUNCEMENT)
                    },
                    onNavigateToDetail = { announcementId ->
                        navController.navigate("${Routes.DELIVERY_TRACKING}/$announcementId")
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(Routes.CREATE_ANNOUNCEMENT) {
                CreateAnnouncementScreen(
                    onAnnouncementCreated = {
                        navController.popBackStack()
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(Routes.CLIENT_DELIVERIES) {
                DeliveryTrackingScreen(
                    onNavigateToValidation = { deliveryId ->
                        navController.navigate("${Routes.DELIVERY_VALIDATION}/$deliveryId")
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable("${Routes.DELIVERY_VALIDATION}/{deliveryId}") { backStackEntry ->
                val deliveryId = backStackEntry.arguments?.getString("deliveryId") ?: ""
                DeliveryValidationScreen(
                    deliveryId = deliveryId,
                    onValidationSuccess = {
                        navController.popBackStack()
                    },
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
        
        // Deliverer Navigation
        navigation(
            startDestination = Routes.DELIVERER_DASHBOARD,
            route = Routes.DELIVERER_GRAPH
        ) {
            composable(Routes.DELIVERER_DASHBOARD) {
                DelivererDashboardScreen(
                    onNavigateToOpportunities = {
                        navController.navigate(Routes.DELIVERER_OPPORTUNITIES)
                    },
                    onNavigateToActiveDeliveries = {
                        navController.navigate(Routes.DELIVERER_ACTIVE_DELIVERIES)
                    },
                    onLogout = {
                        authViewModel.logout()
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.DELIVERER_GRAPH) { inclusive = true }
                        }
                    }
                )
            }
            
            composable(Routes.DELIVERER_OPPORTUNITIES) {
                OpportunitiesScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            
            composable(Routes.DELIVERER_ACTIVE_DELIVERIES) {
                ActiveDeliveriesScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}

object Routes {
    const val SPLASH = "splash"
    
    // Auth
    const val AUTH_GRAPH = "auth_graph"
    const val LOGIN = "login"
    const val REGISTER = "register"
    
    // Client
    const val CLIENT_GRAPH = "client_graph"
    const val CLIENT_DASHBOARD = "client_dashboard"
    const val CLIENT_ANNOUNCEMENTS = "client_announcements"
    const val CREATE_ANNOUNCEMENT = "create_announcement"
    const val CLIENT_DELIVERIES = "client_deliveries"
    const val DELIVERY_TRACKING = "delivery_tracking"
    const val DELIVERY_VALIDATION = "delivery_validation"
    
    // Deliverer
    const val DELIVERER_GRAPH = "deliverer_graph"
    const val DELIVERER_DASHBOARD = "deliverer_dashboard"
    const val DELIVERER_OPPORTUNITIES = "deliverer_opportunities"
    const val DELIVERER_ACTIVE_DELIVERIES = "deliverer_active_deliveries"
}