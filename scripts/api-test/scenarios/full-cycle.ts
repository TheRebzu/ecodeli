import { Logger } from "../helpers/logger.helper";
import { AuthHelper } from "../helpers/auth.helper";
import { RequestHelper } from "../helpers/request.helper";
import { defaultUsers } from "../config/users.config";
import { AnnouncementTests } from "../tests/annonces/annonces.test";

const scenarioLogger = new Logger("Scenario:FullCycle");

/**
 * Full delivery cycle scenario:
 * 1. Client creates an announcement
 * 2. Multiple deliverers view and apply
 * 3. Client selects a deliverer
 * 4. Deliverer picks up package
 * 5. Deliverer delivers package
 * 6. Client confirms delivery
 * 7. Payment is processed
 * 8. Both parties rate each other
 */
export async function runFullDeliveryCycle(): Promise<void> {
  scenarioLogger.title("🚀 Full Delivery Cycle Scenario");
  scenarioLogger.info(
    "Simulating complete delivery flow from announcement to completion",
  );
  scenarioLogger.separator();

  try {
    // Step 1: Client creates announcement
    scenarioLogger.title("Step 1: Client Creates Announcement");
    const clientUser = defaultUsers.client;

    const announcementData = {
      type: "DELIVERY" as const,
      title: "Urgent Document Delivery - Paris to Versailles",
      description:
        "Important legal documents need to be delivered today. Handle with care.",
      pickupAddress: {
        street: "15 Avenue des Champs-Élysées",
        city: "Paris",
        postalCode: "75008",
        country: "France",
        latitude: 48.8698,
        longitude: 2.3078,
      },
      deliveryAddress: {
        street: "Place d'Armes",
        city: "Versailles",
        postalCode: "78000",
        country: "France",
        latitude: 48.8048,
        longitude: 2.1204,
      },
      price: 35.0,
      weight: 0.5,
      dimensions: {
        length: 30,
        width: 22,
        height: 2,
      },
      preferredDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    };

    const announcement = await RequestHelper.trpc(
      clientUser,
      "client.announcements.create",
      announcementData,
    );

    scenarioLogger.success("Announcement created", {
      id: announcement.id,
      title: announcement.title,
      price: `€${announcement.price}`,
    });

    // Step 2: Multiple deliverers search and apply
    scenarioLogger.title("Step 2: Deliverers Search and Apply");

    const deliverer1 = defaultUsers.deliverer;
    const deliverer2 = defaultUsers.delivererVerified;

    // Deliverer 1 searches
    const searchResults1 = await RequestHelper.trpc(
      deliverer1,
      "deliverer.announcements.search",
      {
        page: 1,
        limit: 10,
        type: "DELIVERY",
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
        maxDistance: 30,
      },
    );

    scenarioLogger.info(
      `Deliverer 1 found ${searchResults1.total} announcements`,
    );

    // Deliverer 1 applies
    const application1 = await RequestHelper.trpc(
      deliverer1,
      "deliverer.announcements.apply",
      {
        announcementId: announcement.id,
        proposedPrice: 32.0,
        estimatedDeliveryTime: new Date(
          Date.now() + 3 * 60 * 60 * 1000,
        ).toISOString(),
        message: "I can deliver within 3 hours. I know the area well.",
      },
    );

    scenarioLogger.success("Deliverer 1 applied", {
      proposedPrice: `€${application1.proposedPrice}`,
      delivererId: deliverer1.email,
    });

    // Deliverer 2 applies
    const application2 = await RequestHelper.trpc(
      deliverer2,
      "deliverer.announcements.apply",
      {
        announcementId: announcement.id,
        proposedPrice: 30.0,
        estimatedDeliveryTime: new Date(
          Date.now() + 2.5 * 60 * 60 * 1000,
        ).toISOString(),
        message:
          "Express delivery available. Verified deliverer with 5-star rating.",
      },
    );

    scenarioLogger.success("Deliverer 2 applied", {
      proposedPrice: `€${application2.proposedPrice}`,
      delivererId: deliverer2.email,
    });

    // Step 3: Client views applications and selects deliverer
    scenarioLogger.title("Step 3: Client Selects Deliverer");

    const applications = await RequestHelper.trpc(
      clientUser,
      "client.announcements.getApplications",
      { announcementId: announcement.id },
    );

    scenarioLogger.info(`Client received ${applications.length} applications`);
    scenarioLogger.table(
      applications.map((app) => ({
        deliverer: app.delivererName,
        price: `€${app.proposedPrice}`,
        time: new Date(app.estimatedDeliveryTime).toLocaleTimeString(),
        rating: app.delivererRating || "N/A",
      })),
    );

    // Client selects deliverer 2 (verified with better price)
    const selection = await RequestHelper.trpc(
      clientUser,
      "client.announcements.selectDeliverer",
      {
        announcementId: announcement.id,
        applicationId: application2.id,
      },
    );

    scenarioLogger.success("Deliverer selected", {
      selectedDeliverer: deliverer2.name,
      agreedPrice: `€${selection.agreedPrice}`,
    });

    // Step 4: Deliverer confirms pickup
    scenarioLogger.title("Step 4: Deliverer Picks Up Package");

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate travel time

    const pickupConfirmation = await RequestHelper.trpc(
      deliverer2,
      "deliverer.delivery.confirmPickup",
      {
        deliveryId: selection.deliveryId,
        pickupCode: "1234", // In real scenario, this would be provided by client
        location: {
          latitude: 48.8698,
          longitude: 2.3078,
        },
        notes:
          "Package picked up successfully. Documents in perfect condition.",
      },
    );

    scenarioLogger.success("Pickup confirmed", {
      time: new Date(pickupConfirmation.pickupTime).toLocaleTimeString(),
      status: pickupConfirmation.status,
    });

    // Step 5: Deliverer updates location and delivers
    scenarioLogger.title("Step 5: Package In Transit and Delivery");

    // Update location (midway)
    await RequestHelper.trpc(deliverer2, "deliverer.delivery.updateLocation", {
      deliveryId: selection.deliveryId,
      location: {
        latitude: 48.8373,
        longitude: 2.2582,
      },
    });

    scenarioLogger.info("Deliverer location updated - halfway to destination");

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delivery time

    // Confirm delivery
    const deliveryConfirmation = await RequestHelper.trpc(
      deliverer2,
      "deliverer.delivery.confirmDelivery",
      {
        deliveryId: selection.deliveryId,
        deliveryCode: "5678", // Provided by recipient
        recipientName: "Marie Dubois",
        location: {
          latitude: 48.8048,
          longitude: 2.1204,
        },
        photo: "base64_encoded_delivery_photo_here", // Simplified for demo
        signature: "base64_encoded_signature_here",
        notes: "Delivered to reception desk.",
      },
    );

    scenarioLogger.success("Delivery confirmed", {
      time: new Date(deliveryConfirmation.deliveryTime).toLocaleTimeString(),
      recipient: deliveryConfirmation.recipientName,
    });

    // Step 6: Client confirms receipt
    scenarioLogger.title("Step 6: Client Confirms Receipt");

    const receiptConfirmation = await RequestHelper.trpc(
      clientUser,
      "client.delivery.confirmReceipt",
      {
        deliveryId: selection.deliveryId,
        satisfied: true,
        notes: "Documents received in perfect condition. Thank you!",
      },
    );

    scenarioLogger.success("Receipt confirmed by client", {
      status: receiptConfirmation.status,
      paymentStatus: receiptConfirmation.paymentStatus,
    });

    // Step 7: Payment processing (simulated)
    scenarioLogger.title("Step 7: Payment Processing");

    // In a real scenario, this would involve Stripe webhook
    scenarioLogger.info("Processing payment through Stripe...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const paymentStatus = await RequestHelper.trpc(
      clientUser,
      "client.payments.getStatus",
      { deliveryId: selection.deliveryId },
    );

    scenarioLogger.success("Payment processed", {
      amount: `€${paymentStatus.amount}`,
      delivererEarnings: `€${paymentStatus.delivererEarnings}`,
      platformFee: `€${paymentStatus.platformFee}`,
      status: paymentStatus.status,
    });

    // Step 8: Mutual ratings
    scenarioLogger.title("Step 8: Mutual Ratings");

    // Client rates deliverer
    const clientRating = await RequestHelper.trpc(
      clientUser,
      "client.ratings.create",
      {
        deliveryId: selection.deliveryId,
        targetId: deliverer2.email,
        targetType: "DELIVERER",
        rating: 5,
        comment: "Excellent service! Fast and professional delivery.",
        tags: ["punctual", "professional", "careful"],
      },
    );

    scenarioLogger.success("Client rated deliverer", {
      rating: `${clientRating.rating}/5`,
      comment: clientRating.comment,
    });

    // Deliverer rates client
    const delivererRating = await RequestHelper.trpc(
      deliverer2,
      "deliverer.ratings.create",
      {
        deliveryId: selection.deliveryId,
        targetId: clientUser.email,
        targetType: "CLIENT",
        rating: 5,
        comment: "Clear instructions and easy pickup. Would deliver again!",
        tags: ["clear_communication", "easy_pickup", "friendly"],
      },
    );

    scenarioLogger.success("Deliverer rated client", {
      rating: `${delivererRating.rating}/5`,
      comment: delivererRating.comment,
    });

    // Final summary
    scenarioLogger.separator();
    scenarioLogger.title("📊 Delivery Cycle Summary");
    scenarioLogger.success("Full delivery cycle completed successfully!");

    const summary = {
      "Announcement ID": announcement.id.substring(0, 8),
      Route: `${announcementData.pickupAddress.city} → ${announcementData.deliveryAddress.city}`,
      Client: clientUser.name,
      Deliverer: deliverer2.name,
      "Original Price": `€${announcement.price}`,
      "Final Price": `€${selection.agreedPrice}`,
      Duration: "~2.5 hours",
      "Client Rating": "⭐⭐⭐⭐⭐",
      "Deliverer Rating": "⭐⭐⭐⭐⭐",
    };

    scenarioLogger.table([summary]);

    // Cleanup
    scenarioLogger.info("Cleaning up test data...");
    AuthHelper.clearAllSessions();
  } catch (error) {
    scenarioLogger.error("Scenario failed", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runFullDeliveryCycle()
    .then(() => {
      scenarioLogger.success("Scenario completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      scenarioLogger.error("Scenario failed", error);
      process.exit(1);
    });
}
