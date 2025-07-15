package com.ecodeli.mobile.core.data.repository

import com.ecodeli.mobile.core.data.models.Announcement
import com.ecodeli.mobile.core.data.models.AnnouncementResponse
import com.ecodeli.mobile.core.data.models.PaymentIntent
import com.ecodeli.mobile.core.data.remote.ApiService
import com.ecodeli.mobile.core.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnnouncementRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    suspend fun getClientAnnouncements(): Resource<List<Announcement>> {
        return try {
            val response = apiService.getClientAnnouncements()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!.announcements)
            } else {
                Resource.Error("Failed to fetch announcements")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun createAnnouncement(announcement: Announcement): Resource<Announcement> {
        return try {
            val response = apiService.createAnnouncement(announcement)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to create announcement")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun getAnnouncement(id: String): Resource<Announcement> {
        return try {
            val response = apiService.getAnnouncement(id)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to fetch announcement")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun createPaymentIntent(announcementId: String): Resource<PaymentIntent> {
        return try {
            val response = apiService.createPaymentIntent(announcementId)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to create payment intent")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    // Deliverer specific methods
    suspend fun getDelivererOpportunities(): Resource<List<Announcement>> {
        return try {
            val response = apiService.getDelivererOpportunities()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to fetch opportunities")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
    
    suspend fun acceptAnnouncement(announcementId: String): Resource<Unit> {
        return try {
            val response = apiService.acceptAnnouncement(announcementId)
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Failed to accept announcement")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error occurred")
        }
    }
}