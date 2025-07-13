"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLocations = seedLocations;
const constants_1 = require("../data/constants");
const warehouseData = [
  {
    name: "EcoDeli Paris - Siège",
    city: "Paris",
    address: "110 rue de Flandre",
    postalCode: "75019",
    capacity: 1000,
    managerName: "François Dubois",
    managerEmail: "f.dubois@ecodeli.com",
    boxCount: 50,
  },
  {
    name: "EcoDeli Marseille",
    city: "Marseille",
    address: "15 Boulevard de la Méditerranée",
    postalCode: "13002",
    capacity: 800,
    managerName: "Marie Santini",
    managerEmail: "m.santini@ecodeli.com",
    boxCount: 40,
  },
  {
    name: "EcoDeli Lyon",
    city: "Lyon",
    address: "45 Cours Lafayette",
    postalCode: "69003",
    capacity: 750,
    managerName: "Pierre Mercier",
    managerEmail: "p.mercier@ecodeli.com",
    boxCount: 35,
  },
  {
    name: "EcoDeli Lille",
    city: "Lille",
    address: "22 Place du Général de Gaulle",
    postalCode: "59000",
    capacity: 600,
    managerName: "Sophie Lefebvre",
    managerEmail: "s.lefebvre@ecodeli.com",
    boxCount: 30,
  },
  {
    name: "EcoDeli Rennes",
    city: "Rennes",
    address: "8 Place de la République",
    postalCode: "35000",
    capacity: 500,
    managerName: "Jean-Marc Breizh",
    managerEmail: "jm.breizh@ecodeli.com",
    boxCount: 25,
  },
  {
    name: "EcoDeli Montpellier",
    city: "Montpellier",
    address: "30 Avenue de la Gare",
    postalCode: "34000",
    capacity: 550,
    managerName: "Isabelle Soleil",
    managerEmail: "i.soleil@ecodeli.com",
    boxCount: 28,
  },
];
async function seedLocations(ctx) {
  const { prisma } = ctx;
  console.log("   Creating locations and warehouses...");
  const locations = [];
  const warehouses = [];
  const storageBoxes = [];
  for (const data of warehouseData) {
    const coords = constants_1.CONSTANTS.warehouses[data.city.toUpperCase()];
    // Créer la location
    const location = await prisma.location.create({
      data: {
        name: data.name,
        type: "WAREHOUSE",
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: "FR",
        lat: coords.lat,
        lng: coords.lng,
        phone: `+334${Math.floor(10000000 + Math.random() * 89999999)}`,
        email: data.managerEmail,
        openingHours: [
          { day: "monday", open: "08:00", close: "18:00" },
          { day: "tuesday", open: "08:00", close: "18:00" },
          { day: "wednesday", open: "08:00", close: "18:00" },
          { day: "thursday", open: "08:00", close: "18:00" },
          { day: "friday", open: "08:00", close: "18:00" },
          { day: "saturday", open: "09:00", close: "13:00" },
          { day: "sunday", open: null, close: null },
        ],
        isActive: true,
      },
    });
    locations.push(location);
    // Créer l'entrepôt
    const warehouse = await prisma.warehouse.create({
      data: {
        locationId: location.id,
        capacity: data.capacity,
        currentOccupancy: Math.floor(
          data.capacity * 0.3 + Math.random() * data.capacity * 0.4,
        ), // 30-70% occupé
        managerName: data.managerName,
        managerEmail: data.managerEmail,
      },
    });
    warehouses.push(warehouse);
    // Créer les box de stockage
    const boxSizes = Object.keys(constants_1.CONSTANTS.boxSizes);
    for (let i = 1; i <= data.boxCount; i++) {
      const size = boxSizes[Math.floor(Math.random() * boxSizes.length)];
      const isAvailable = Math.random() > 0.3; // 70% disponibles
      const box = await prisma.storageBox.create({
        data: {
          locationId: location.id,
          boxNumber: `${data.city.substring(0, 3).toUpperCase()}-${i.toString().padStart(3, "0")}`,
          size,
          pricePerDay: constants_1.CONSTANTS.pricing.storage.daily[size],
          isAvailable,
        },
      });
      storageBoxes.push(box);
    }
  }
  // Créer aussi quelques points relais
  const relayPoints = [
    {
      name: "Relay Paris Gare du Nord",
      city: "Paris",
      lat: 48.8809,
      lng: 2.3553,
    },
    { name: "Relay Lyon Part-Dieu", city: "Lyon", lat: 45.7605, lng: 4.8595 },
    {
      name: "Relay Marseille Saint-Charles",
      city: "Marseille",
      lat: 43.3028,
      lng: 5.3806,
    },
  ];
  for (const relay of relayPoints) {
    const location = await prisma.location.create({
      data: {
        name: relay.name,
        type: "RELAY_POINT",
        address: "Gare SNCF",
        city: relay.city,
        postalCode: "00000",
        country: "FR",
        lat: relay.lat,
        lng: relay.lng,
        isActive: true,
      },
    });
    locations.push(location);
  }
  console.log(`   ✓ Created ${locations.length} locations`);
  console.log(`   ✓ Created ${warehouses.length} warehouses`);
  console.log(`   ✓ Created ${storageBoxes.length} storage boxes`);
  // Stocker les locations pour les autres seeds
  ctx.data.set("locations", locations);
  ctx.data.set("warehouses", warehouses);
  return { locations, warehouses, storageBoxes };
}
