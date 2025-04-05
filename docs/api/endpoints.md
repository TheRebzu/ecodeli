<<<<<<< Updated upstream
=======
# EcoDeli API Documentation

This document provides details about the EcoDeli API endpoints, request/response formats, and authentication requirements.

## Table of Contents

- [Authentication](#authentication)
- [Trips API](#trips-api)
- [Deliveries API](#deliveries-api)
- [Warehouses API](#warehouses-api)

## Authentication

All secured endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Authentication is handled through NextAuth.js. Users can authenticate via:
- Email/password login
- OAuth providers (if configured)

## Trips API

### Create a Trip

Creates a new planned trip for a delivery person.

**Endpoint:** `POST /api/trips`

**Authentication:** Required (Delivery Person role only)

**Request Body:**
```json
{
  "startLocation": {
    "address": "123 Rue de Départ",
    "city": "Paris",
    "postalCode": "75001",
    "coordinates": {
      "lat": 48.8566,
      "lng": 2.3522
    }
  },
  "endLocation": {
    "address": "456 Rue d'Arrivée",
    "city": "Lyon",
    "postalCode": "69001",
    "coordinates": {
      "lat": 45.7594,
      "lng": 4.8300
    }
  },
  "waypoints": [
    {
      "address": "789 Rue Intermédiaire",
      "city": "Dijon",
      "postalCode": "21000",
      "coordinates": {
        "lat": 47.3220,
        "lng": 5.0415
      }
    }
  ],
  "scheduledDate": "2023-08-15",
  "estimatedDepartureTime": "08:00:00",
  "estimatedArrivalTime": "14:00:00",
  "vehicleType": "VAN",
  "availableSpace": 5,
  "maxWeight": 200,
  "additionalNotes": "Pas de restrictions particulières",
  "isRecurring": false,
  "recurringDays": []
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "trip123",
    "deliveryPersonId": "delivery-person-123",
    "startLocation": {
      "address": "123 Rue de Départ",
      "city": "Paris",
      "postalCode": "75001",
      "coordinates": {
        "lat": 48.8566,
        "lng": 2.3522
      }
    },
    "endLocation": {
      "address": "456 Rue d'Arrivée",
      "city": "Lyon",
      "postalCode": "69001",
      "coordinates": {
        "lat": 45.7594,
        "lng": 4.8300
      }
    },
    "waypoints": [...],
    "scheduledDate": "2023-08-15T00:00:00.000Z",
    "estimatedDepartureTime": "08:00:00",
    "estimatedArrivalTime": "14:00:00",
    "vehicleType": "VAN",
    "availableSpace": 5,
    "maxWeight": 200,
    "additionalNotes": "Pas de restrictions particulières",
    "status": "SCHEDULED",
    "isRecurring": false,
    "recurringDays": [],
    "createdAt": "2023-08-01T10:00:00.000Z",
    "updatedAt": "2023-08-01T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a delivery person
- `404 Not Found`: Delivery person profile not found
- `500 Internal Server Error`: Server error

### List Trips

Get a list of planned trips with filtering options.

**Endpoint:** `GET /api/trips`

**Authentication:** Not required

**Query Parameters:**
- `startCity` (optional): Filter by starting city
- `endCity` (optional): Filter by destination city
- `date` (optional): Filter by scheduled date (YYYY-MM-DD)
- `vehicleType` (optional): Filter by vehicle type (CAR, BIKE, SCOOTER, VAN, TRUCK, PUBLIC_TRANSPORT, WALK)
- `minSpace` (optional): Filter by minimum available space
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "trip123",
      "deliveryPersonId": "delivery-person-123",
      "startLocation": {...},
      "endLocation": {...},
      "waypoints": [...],
      "scheduledDate": "2023-08-15T00:00:00.000Z",
      "estimatedDepartureTime": "08:00:00",
      "estimatedArrivalTime": "14:00:00",
      "vehicleType": "VAN",
      "availableSpace": 5,
      "maxWeight": 200,
      "additionalNotes": "Pas de restrictions particulières",
      "status": "SCHEDULED",
      "isRecurring": false,
      "recurringDays": [],
      "createdAt": "2023-08-01T10:00:00.000Z",
      "updatedAt": "2023-08-01T10:00:00.000Z",
      "deliveryPerson": {
        "id": "delivery-person-123",
        "user": {
          "id": "user-delivery-123",
          "name": "Livreur Test",
          "image": "https://example.com/avatar.jpg",
          "rating": 4.7
        },
        "transportType": "BIKE",
        "status": "AVAILABLE"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters

## Deliveries API

### Create a Delivery

Creates a new delivery request.

**Endpoint:** `POST /api/deliveries`

**Authentication:** Required (Customer or Merchant role)

**Request Body:**
```json
{
  "origin": "123 Commerce Ave",
  "destination": "456 Client St",
  "recipientName": "Client Destinataire",
  "recipientPhone": "+33612345678",
  "recipientEmail": "destinataire@example.com",
  "items": [
    {
      "name": "Produit Test",
      "quantity": 2,
      "weight": 1.5,
      "dimensions": "20x15x10 cm"
    }
  ],
  "packageSize": "MEDIUM",
  "packageWeight": 3,
  "deliveryInstructions": "Code d'immeuble : 1234",
  "isExpress": false,
  "isFragile": true
}
```

**Response (201 Created):**
```json
{
  "delivery": {
    "id": "delivery123",
    "origin": "123 Commerce Ave",
    "destination": "456 Client St",
    "recipientName": "Client Destinataire",
    "recipientPhone": "+33612345678",
    "recipientEmail": "destinataire@example.com",
    "packageDetails": {
      "items": [
        {
          "name": "Produit Test",
          "quantity": 2,
          "weight": 1.5,
          "dimensions": "20x15x10 cm"
        }
      ],
      "packageSize": "MEDIUM",
      "packageWeight": 3,
      "isFragile": true
    },
    "deliveryInstructions": "Code d'immeuble : 1234",
    "estimatedDeliveryDate": "2023-08-02T12:00:00.000Z",
    "isExpress": false,
    "status": "PENDING",
    "trackingNumber": "ECODELI-123456",
    "price": 12.99,
    "customerId": "customer123",
    "merchantId": "merchant123",
    "deliveryPersonId": null,
    "createdAt": "2023-08-01T10:00:00.000Z",
    "updatedAt": "2023-08-01T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Customer or merchant profile not found

### List Deliveries

Get a list of deliveries filtered by the user's role.

**Endpoint:** `GET /api/deliveries`

**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by delivery status
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200 OK):**
```json
{
  "deliveries": [
    {
      "id": "delivery123",
      "origin": "123 Commerce Ave",
      "destination": "456 Client St",
      "recipientName": "Client Destinataire",
      "recipientPhone": "+33612345678",
      "recipientEmail": "destinataire@example.com",
      "packageDetails": {...},
      "deliveryInstructions": "Code d'immeuble : 1234",
      "estimatedDeliveryDate": "2023-08-02T12:00:00.000Z",
      "isExpress": false,
      "status": "PENDING",
      "trackingNumber": "ECODELI-123456",
      "price": 12.99,
      "customerId": "customer123",
      "merchantId": "merchant123",
      "deliveryPersonId": null,
      "createdAt": "2023-08-01T10:00:00.000Z",
      "updatedAt": "2023-08-01T10:00:00.000Z",
      "customer": {
        "id": "customer123",
        "user": {
          "name": "Client Test",
          "email": "client@example.com",
          "phone": "+33612345678"
        }
      },
      "merchant": {
        "id": "merchant123",
        "user": {
          "name": "Commerce Test",
          "email": "commerce@example.com",
          "phone": "+33687654321"
        }
      },
      "deliveryPerson": null,
      "trackingUpdates": [
        {
          "id": "tracking123",
          "deliveryId": "delivery123",
          "status": "PENDING",
          "location": "Entrepôt Commerce Test",
          "description": "Commande reçue et en attente de traitement",
          "timestamp": "2023-08-01T10:05:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: User profile not found

## Warehouses API

### Create a Warehouse

Creates a new warehouse (admin only).

**Endpoint:** `POST /api/warehouses`

**Authentication:** Required (Admin role only)

**Request Body:**
```json
{
  "name": "Entrepôt Paris Centre",
  "address": "123 Rue de la Logistique",
  "city": "Paris",
  "postalCode": "75001",
  "country": "France",
  "coordinates": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "capacity": 100,
  "contactPhone": "+33123456789"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "warehouse123",
    "name": "Entrepôt Paris Centre",
    "address": "123 Rue de la Logistique",
    "city": "Paris",
    "postalCode": "75001",
    "country": "France",
    "coordinates": {
      "lat": 48.8566,
      "lng": 2.3522
    },
    "capacity": 100,
    "availableBoxes": 100,
    "contactPhone": "+33123456789",
    "isActive": true,
    "createdAt": "2023-08-01T10:00:00.000Z",
    "updatedAt": "2023-08-01T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

### List Warehouses

Get a list of warehouses with filtering options.

**Endpoint:** `GET /api/warehouses`

**Authentication:** Required

**Query Parameters:**
- `search` (optional): Search term for warehouse name or city
- `city` (optional): Filter by city
- `isActive` (optional): Filter by active status (true/false)
- `sortBy` (optional): Field to sort by (name, city, capacity, createdAt)
- `sortOrder` (optional): Sort order (asc/desc)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "warehouses": [
      {
        "id": "warehouse123",
        "name": "Entrepôt Paris Centre",
        "address": "123 Rue de la Logistique",
        "city": "Paris",
        "postalCode": "75001",
        "country": "France",
        "coordinates": {
          "lat": 48.8566,
          "lng": 2.3522
        },
        "capacity": 100,
        "availableBoxes": 75,
        "contactPhone": "+33123456789",
        "isActive": true,
        "createdAt": "2023-08-01T10:00:00.000Z",
        "updatedAt": "2023-08-01T10:00:00.000Z",
        "openingHours": [
          {
            "id": "hours1",
            "warehouseId": "warehouse123",
            "dayOfWeek": 1,
            "openTime": "08:00:00",
            "closeTime": "18:00:00"
          },
          {
            "id": "hours2",
            "warehouseId": "warehouse123",
            "dayOfWeek": 2,
            "openTime": "08:00:00",
            "closeTime": "18:00:00"
          }
        ],
        "_count": {
          "storageBoxes": 25
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Not authenticated 
>>>>>>> Stashed changes
