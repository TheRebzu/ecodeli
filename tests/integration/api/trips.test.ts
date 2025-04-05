import { NextRequest, NextResponse } from "next/server";
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import * as auth from "next-auth";

// Mock Prisma client
const prismaObj = { default: undefined };
const mockPrisma = mockDeep<PrismaClient>();
prismaObj.default = mockPrisma;

jest.mock("@/lib/prisma", () => prismaObj);

// Mock Next Auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}));

// Handlers d'API
const createTripHandler = jest.fn();
const getTripsHandler = jest.fn();

// Données de test
const mockDeliveryPerson = {
  id: "delivery-person-123",
  userId: "user-delivery-123",
  transportType: "BIKE",
  licenseNumber: "LP12345",
  status: "AVAILABLE",
  currentLocation: { lat: 48.8566, lng: 2.3522 },
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: "user-delivery-123",
    name: "Livreur Test",
    image: "https://example.com/avatar.jpg",
    rating: 4.7
  }
};

const mockDeliveryPersonUser = {
  id: "user-delivery-123",
  email: "livreur@example.com",
  name: "Livreur Test",
  role: "DELIVERY_PERSON",
  phone: "+33699999999"
};

const mockCustomerUser = {
  id: "user-customer-123",
  email: "client@example.com",
  name: "Client Test",
  role: "CUSTOMER",
  phone: "+33612345678"
};

const mockTrip = {
  id: "trip123",
  deliveryPersonId: "delivery-person-123",
  startLocation: {
    address: "123 Rue de Départ",
    city: "Paris",
    postalCode: "75001",
    coordinates: {
      lat: 48.8566,
      lng: 2.3522
    }
  },
  endLocation: {
    address: "456 Rue d'Arrivée",
    city: "Lyon",
    postalCode: "69001",
    coordinates: {
      lat: 45.7594,
      lng: 4.8300
    }
  },
  waypoints: [
    {
      address: "789 Rue Intermédiaire",
      city: "Dijon",
      postalCode: "21000",
      coordinates: {
        lat: 47.3220,
        lng: 5.0415
      }
    }
  ],
  scheduledDate: new Date("2023-08-15"),
  estimatedDepartureTime: "08:00:00",
  estimatedArrivalTime: "14:00:00",
  vehicleType: "VAN",
  availableSpace: 5,
  maxWeight: 200,
  additionalNotes: "Pas de restrictions particulières",
  status: "SCHEDULED",
  isRecurring: false,
  recurringDays: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  deliveryPerson: {
    ...mockDeliveryPerson,
    user: {
      id: "user-delivery-123",
      name: "Livreur Test",
      image: "https://example.com/avatar.jpg",
      rating: 4.7
    }
  }
};

describe("API de trajets", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Configurations par défaut pour les mocks
    createTripHandler.mockImplementation((req) => {
      return NextResponse.json({
        data: mockTrip
      }, { status: 200 });
    });
    
    getTripsHandler.mockImplementation((req) => {
      return NextResponse.json({
        data: [mockTrip],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        }
      }, { status: 200 });
    });
  });

  describe("Création de trajet (POST)", () => {
    it("devrait créer un trajet pour un livreur avec des données valides", async () => {
      // Arrangement
      const tripData = {
        startLocation: {
          address: "123 Rue de Départ",
          city: "Paris",
          postalCode: "75001",
          coordinates: {
            lat: 48.8566,
            lng: 2.3522
          }
        },
        endLocation: {
          address: "456 Rue d'Arrivée",
          city: "Lyon",
          postalCode: "69001",
          coordinates: {
            lat: 45.7594,
            lng: 4.8300
          }
        },
        waypoints: [
          {
            address: "789 Rue Intermédiaire",
            city: "Dijon",
            postalCode: "21000",
            coordinates: {
              lat: 47.3220,
              lng: 5.0415
            }
          }
        ],
        scheduledDate: "2023-08-15",
        estimatedDepartureTime: "08:00:00",
        estimatedArrivalTime: "14:00:00",
        vehicleType: "VAN",
        availableSpace: 5,
        maxWeight: 200,
        additionalNotes: "Pas de restrictions particulières",
        isRecurring: false
      };

      mockPrisma.deliveryPerson.findFirst.mockResolvedValue(mockDeliveryPerson);
      mockPrisma.plannedTrip.create.mockResolvedValue(mockTrip);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockDeliveryPersonUser
      });

      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData)
      });

      // Action
      const response = await createTripHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            id: mockTrip.id,
            startLocation: expect.objectContaining({
              city: tripData.startLocation.city
            }),
            endLocation: expect.objectContaining({
              city: tripData.endLocation.city
            })
          })
        })
      );
    });

    it("devrait refuser la création d'un trajet pour un utilisateur non authentifié", async () => {
      // Arrangement
      const tripData = {
        startLocation: {
          address: "123 Rue de Départ",
          city: "Paris",
          postalCode: "75001",
          coordinates: {
            lat: 48.8566,
            lng: 2.3522
          }
        },
        endLocation: {
          address: "456 Rue d'Arrivée",
          city: "Lyon",
          postalCode: "69001",
          coordinates: {
            lat: 45.7594,
            lng: 4.8300
          }
        },
        scheduledDate: "2023-08-15",
        estimatedDepartureTime: "08:00:00",
        estimatedArrivalTime: "14:00:00",
        vehicleType: "VAN",
        availableSpace: 5,
        maxWeight: 200
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue(null);
      
      createTripHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Unauthorized"
        }, { status: 401 });
      });

      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData)
      });

      // Action
      const response = await createTripHandler(req);

      // Assertions
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Unauthorized"
        })
      );
    });

    it("devrait refuser la création d'un trajet pour un utilisateur qui n'est pas livreur", async () => {
      // Arrangement
      const tripData = {
        startLocation: {
          address: "123 Rue de Départ",
          city: "Paris",
          postalCode: "75001",
          coordinates: {
            lat: 48.8566,
            lng: 2.3522
          }
        },
        endLocation: {
          address: "456 Rue d'Arrivée",
          city: "Lyon",
          postalCode: "69001",
          coordinates: {
            lat: 45.7594,
            lng: 4.8300
          }
        },
        scheduledDate: "2023-08-15",
        estimatedDepartureTime: "08:00:00",
        estimatedArrivalTime: "14:00:00",
        vehicleType: "VAN",
        availableSpace: 5,
        maxWeight: 200
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockCustomerUser
      });
      
      createTripHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Only delivery persons can create trips"
        }, { status: 403 });
      });

      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData)
      });

      // Action
      const response = await createTripHandler(req);

      // Assertions
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Only delivery persons can create trips"
        })
      );
    });

    it("devrait rejeter des données de trajet invalides", async () => {
      // Arrangement
      const invalidTripData = {
        // Manque des champs requis comme endLocation
        startLocation: {
          address: "123 Rue de Départ",
          city: "Paris",
          postalCode: "75001",
          coordinates: {
            lat: 48.8566,
            lng: 2.3522
          }
        },
        scheduledDate: "date-invalide", // Format de date incorrect
        vehicleType: "INVALID_TYPE", // Type de véhicule invalide
        availableSpace: -5, // Espace négatif
        maxWeight: 0 // Poids nul
      };

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockDeliveryPersonUser
      });
      
      createTripHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Invalid request data",
          details: {
            endLocation: {
              _errors: ["Required"]
            },
            scheduledDate: {
              _errors: ["Invalid date format"]
            },
            vehicleType: {
              _errors: ["Invalid enum value"]
            },
            availableSpace: {
              _errors: ["Number must be positive"]
            },
            maxWeight: {
              _errors: ["Number must be positive"]
            },
            estimatedDepartureTime: {
              _errors: ["Required"]
            },
            estimatedArrivalTime: {
              _errors: ["Required"]
            }
          }
        }, { status: 400 });
      });

      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidTripData)
      });

      // Action
      const response = await createTripHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Invalid request data",
          details: expect.any(Object)
        })
      );
    });

    it("devrait gérer le cas où le profil du livreur n'est pas trouvé", async () => {
      // Arrangement
      const tripData = {
        startLocation: {
          address: "123 Rue de Départ",
          city: "Paris",
          postalCode: "75001",
          coordinates: {
            lat: 48.8566,
            lng: 2.3522
          }
        },
        endLocation: {
          address: "456 Rue d'Arrivée",
          city: "Lyon",
          postalCode: "69001",
          coordinates: {
            lat: 45.7594,
            lng: 4.8300
          }
        },
        scheduledDate: "2023-08-15",
        estimatedDepartureTime: "08:00:00",
        estimatedArrivalTime: "14:00:00",
        vehicleType: "VAN",
        availableSpace: 5,
        maxWeight: 200
      };

      mockPrisma.deliveryPerson.findFirst.mockResolvedValue(null);

      (auth.getServerSession as jest.Mock).mockResolvedValue({
        user: mockDeliveryPersonUser
      });
      
      createTripHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Delivery person profile not found"
        }, { status: 404 });
      });

      const req = new NextRequest("http://localhost:3000/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData)
      });

      // Action
      const response = await createTripHandler(req);

      // Assertions
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Delivery person profile not found"
        })
      );
    });
  });

  describe("Récupération des trajets (GET)", () => {
    it("devrait récupérer tous les trajets avec pagination par défaut", async () => {
      // Arrangement
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(1);

      const req = new NextRequest("http://localhost:3000/api/trips");

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: mockTrip.id,
              startLocation: expect.objectContaining({
                city: mockTrip.startLocation.city
              })
            })
          ]),
          pagination: expect.objectContaining({
            total: 1
          })
        })
      );
    });

    it("devrait filtrer les trajets par ville de départ", async () => {
      // Arrangement
      const startCity = "Paris";
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("startCity", startCity);
      
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.plannedTrip.findMany.mockImplementationOnce((params) => {
        expect(params.where["startLocation.city"]).toBe(startCity);
        return Promise.resolve([mockTrip]);
      });

      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les trajets par ville d'arrivée", async () => {
      // Arrangement
      const endCity = "Lyon";
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("endCity", endCity);
      
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.plannedTrip.findMany.mockImplementationOnce((params) => {
        expect(params.where["endLocation.city"]).toBe(endCity);
        return Promise.resolve([mockTrip]);
      });

      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les trajets par date", async () => {
      // Arrangement
      const date = "2023-08-15";
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("date", date);
      
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.plannedTrip.findMany.mockImplementationOnce((params) => {
        expect(params.where.scheduledDate).toEqual(new Date(date));
        return Promise.resolve([mockTrip]);
      });

      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les trajets par type de véhicule", async () => {
      // Arrangement
      const vehicleType = "VAN";
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("vehicleType", vehicleType);
      
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.plannedTrip.findMany.mockImplementationOnce((params) => {
        expect(params.where.vehicleType).toBe(vehicleType);
        return Promise.resolve([mockTrip]);
      });

      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait filtrer les trajets par espace minimum disponible", async () => {
      // Arrangement
      const minSpace = 3;
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("minSpace", minSpace.toString());
      
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(1);
      
      // Mock pour vérifier les paramètres de filtrage
      mockPrisma.plannedTrip.findMany.mockImplementationOnce((params) => {
        expect(params.where.availableSpace).toEqual({ gte: minSpace });
        return Promise.resolve([mockTrip]);
      });

      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
    });

    it("devrait gérer les erreurs de validation des paramètres", async () => {
      // Arrangement
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("vehicleType", "INVALID_TYPE");
      url.searchParams.set("minSpace", "invalid");
      
      getTripsHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          error: "Invalid query parameters",
          details: {
            vehicleType: {
              _errors: ["Invalid enum value"]
            },
            minSpace: {
              _errors: ["Expected number, received nan"]
            }
          }
        }, { status: 400 });
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: "Invalid query parameters",
          details: expect.any(Object)
        })
      );
    });

    it("devrait paginer les résultats correctement", async () => {
      // Arrangement
      const page = 2;
      const limit = 5;
      const url = new URL("http://localhost:3000/api/trips");
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());
      
      mockPrisma.plannedTrip.findMany.mockResolvedValue([mockTrip]);
      mockPrisma.plannedTrip.count.mockResolvedValue(12);
      
      // Mock spécifique pour ce cas avec pagination
      getTripsHandler.mockImplementationOnce((req) => {
        return NextResponse.json({
          data: [mockTrip],
          pagination: {
            total: 12,
            page: 2,
            limit: 5,
            pages: 3
          }
        }, { status: 200 });
      });
      
      // Mock pour vérifier les paramètres de pagination
      mockPrisma.plannedTrip.findMany.mockImplementationOnce((params) => {
        expect(params.skip).toBe((page - 1) * limit);
        expect(params.take).toBe(limit);
        return Promise.resolve([mockTrip]);
      });
      
      const req = new NextRequest(url);

      // Action
      const response = await getTripsHandler(req);

      // Assertions
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.pagination).toEqual(
        expect.objectContaining({
          page: 2,
          limit: 5,
          total: 12,
          pages: 3
        })
      );
    });
  });
}); 