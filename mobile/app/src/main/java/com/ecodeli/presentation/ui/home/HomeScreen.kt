package me.ecodeli.presentation.ui.home

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavController
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import me.ecodeli.presentation.navigation.Routes
import me.ecodeli.presentation.ui.delivery.DeliveryListScreen
import me.ecodeli.presentation.ui.profile.ProfileScreen
import me.ecodeli.presentation.ui.service.ServiceListScreen
import me.ecodeli.presentation.ui.wallet.WalletScreen

/**
 * Écran principal avec navigation par onglets
 */
@Composable
fun HomeScreen(
    navController: NavController
) {
    val bottomNavController = rememberNavController()
    
    Scaffold(
        bottomBar = {
            BottomNavigationBar(
                navController = bottomNavController
            )
        }
    ) { innerPadding ->
        NavHost(
            navController = bottomNavController,
            startDestination = BottomNavItem.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(BottomNavItem.Dashboard.route) {
                DashboardScreen(
                    onNavigateToDeliveries = {
                        navController.navigate(Routes.DELIVERY_LIST)
                    },
                    onNavigateToServices = {
                        navController.navigate(Routes.SERVICE_LIST)
                    }
                )
            }
            
            composable(BottomNavItem.Deliveries.route) {
                DeliveryListScreen(
                    onDeliveryClick = { delivery ->
                        navController.navigate(Routes.deliveryDetail(delivery.id))
                    },
                    onNavigateBack = null // Pas de retour depuis la navigation bottom
                )
            }
            
            composable(BottomNavItem.Services.route) {
                ServiceListScreen(
                    onServiceClick = { service ->
                        navController.navigate(Routes.serviceDetail(service.id))
                    }
                )
            }
            
            composable(BottomNavItem.Wallet.route) {
                WalletScreen()
            }
            
            composable(BottomNavItem.Profile.route) {
                ProfileScreen(
                    onNavigateToSettings = {
                        navController.navigate(Routes.SETTINGS)
                    },
                    onLogout = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.HOME) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}

/**
 * Barre de navigation inférieure
 */
@Composable
fun BottomNavigationBar(
    navController: NavController
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    
    NavigationBar {
        listOf(
            BottomNavItem.Dashboard,
            BottomNavItem.Deliveries,
            BottomNavItem.Services,
            BottomNavItem.Wallet,
            BottomNavItem.Profile
        ).forEach { item ->
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = if (currentDestination?.hierarchy?.any { it.route == item.route } == true) {
                            item.selectedIcon
                        } else {
                            item.unselectedIcon
                        },
                        contentDescription = item.title
                    )
                },
                label = { Text(item.title) },
                selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                onClick = {
                    navController.navigate(item.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }
    }
}

/**
 * Éléments de la navigation inférieure
 */
sealed class BottomNavItem(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Dashboard : BottomNavItem(
        route = "dashboard",
        title = "Accueil",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    )
    
    object Deliveries : BottomNavItem(
        route = "deliveries",
        title = "Livraisons",
        selectedIcon = Icons.Filled.LocalShipping,
        unselectedIcon = Icons.Outlined.LocalShipping
    )
    
    object Services : BottomNavItem(
        route = "services",
        title = "Services",
        selectedIcon = Icons.Filled.Build,
        unselectedIcon = Icons.Outlined.Build
    )
    
    object Wallet : BottomNavItem(
        route = "wallet",
        title = "Portefeuille",
        selectedIcon = Icons.Filled.AccountBalanceWallet,
        unselectedIcon = Icons.Outlined.AccountBalanceWallet
    )
    
    object Profile : BottomNavItem(
        route = "profile",
        title = "Profil",
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person
    )
}