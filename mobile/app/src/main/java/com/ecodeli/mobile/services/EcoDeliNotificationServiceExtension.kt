package com.ecodeli.mobile.services

import android.content.Context
import com.onesignal.notifications.IDisplayableMutableNotification
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

class EcoDeliNotificationServiceExtension : INotificationServiceExtension {
    
    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification
        
        // Customize notification based on type
        when (notification.additionalData?.getString("type")) {
            "delivery_update" -> {
                customizeDeliveryNotification(notification)
            }
            "new_opportunity" -> {
                customizeOpportunityNotification(notification)
            }
            "payment_received" -> {
                customizePaymentNotification(notification)
            }
            "validation_required" -> {
                customizeValidationNotification(notification)
            }
            else -> {
                // Keep default notification
            }
        }
    }
    
    private fun customizeDeliveryNotification(notification: IDisplayableMutableNotification) {
        notification.setExtender { builder ->
            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(android.graphics.Color.parseColor("#4CAF50"))
                .setCategory(android.app.Notification.CATEGORY_TRANSPORT)
                .setPriority(android.app.Notification.PRIORITY_HIGH)
        }
    }
    
    private fun customizeOpportunityNotification(notification: IDisplayableMutableNotification) {
        notification.setExtender { builder ->
            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(android.graphics.Color.parseColor("#FF9800"))
                .setCategory(android.app.Notification.CATEGORY_RECOMMENDATION)
                .setPriority(android.app.Notification.PRIORITY_DEFAULT)
        }
    }
    
    private fun customizePaymentNotification(notification: IDisplayableMutableNotification) {
        notification.setExtender { builder ->
            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(android.graphics.Color.parseColor("#2196F3"))
                .setCategory(android.app.Notification.CATEGORY_SERVICE)
                .setPriority(android.app.Notification.PRIORITY_HIGH)
        }
    }
    
    private fun customizeValidationNotification(notification: IDisplayableMutableNotification) {
        notification.setExtender { builder ->
            builder.setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setColor(android.graphics.Color.parseColor("#F44336"))
                .setCategory(android.app.Notification.CATEGORY_ALARM)
                .setPriority(android.app.Notification.PRIORITY_MAX)
        }
    }
}