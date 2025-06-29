"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDeliveryValidations = seedDeliveryValidations;
async function seedDeliveryValidations(ctx) {
    const { prisma } = ctx;
    console.log('   Creating delivery validations...');
    // Récupérer les livraisons depuis la base de données
    const deliveries = await prisma.delivery.findMany({
        where: { status: 'DELIVERED' }
    });
    const validations = [];
    // Créer des validations pour les livraisons
    for (const delivery of deliveries) {
        // Les livraisons DELIVERED ont une validation complète
        if (delivery.status === 'DELIVERED') {
            const validation = await prisma.deliveryValidation.create({
                data: {
                    deliveryId: delivery.id,
                    code: delivery.validationCode,
                    validationCode: delivery.validationCode,
                    validatedBy: 'CLIENT',
                    validatedAt: delivery.actualDeliveryDate || new Date(),
                    validationType: 'CODE',
                    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
                    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
                    attempts: Math.floor(1 + Math.random() * 2) // 1-2 tentatives
                }
            });
            validations.push(validation);
        }
        // Tentatives de validation (simplifiées)
        // Note: Les tentatives sont maintenant gérées par le champ 'attempts' dans DeliveryValidation
    }
    console.log(`   ✓ Created ${validations.length} delivery validations`);
    return validations;
}
