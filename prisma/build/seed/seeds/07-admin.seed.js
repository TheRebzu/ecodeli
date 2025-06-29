"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmin = seedAdmin;
const constants_1 = require("../data/constants");
async function seedAdmin(ctx) {
    const { prisma } = ctx;
    console.log('👨‍💼 Seeding admin-specific data...');
    const admins = await prisma.user.findMany({
        where: { role: constants_1.CONSTANTS.roles.ADMIN },
        include: { profile: true }
    });
    for (const admin of admins) {
        if (!admin.profile)
            continue;
        const index = admins.indexOf(admin);
        // Créer les permissions admin
        const permissions = [
            'users.read', 'users.write', 'users.delete',
            'deliveries.read', 'deliveries.write', 'deliveries.validate',
            'announcements.read', 'announcements.moderate',
            'payments.read', 'payments.refund',
            'documents.validate', 'documents.reject',
            'settings.read', 'settings.write'
        ];
        await prisma.admin.upsert({
            where: { userId: admin.id },
            update: {},
            create: {
                userId: admin.id,
                permissions: permissions,
                department: index === 0 ? 'OPERATIONS' :
                    index === 1 ? 'FINANCE' :
                        index === 2 ? 'CUSTOMER_SERVICE' :
                            index === 3 ? 'LOGISTICS' : 'TECHNICAL'
            }
        });
        // Créer l'historique des actions admin
        const actionTypes = ['USER_VALIDATION', 'DOCUMENT_APPROVAL', 'PAYMENT_REFUND', 'DISPUTE_RESOLUTION'];
        for (let i = 0; i < 5; i++) {
            await prisma.activityLog.create({
                data: {
                    userId: admin.id,
                    action: actionTypes[i % actionTypes.length],
                    entityType: 'USER',
                    entityId: `target_${Math.random().toString(36).substr(2, 9)}`,
                    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                }
            });
        }
        ctx.logger?.log(`Created admin data for ${admin.email}`);
    }
    ctx.logger?.log(`✅ Admin seeding completed - ${admins.length} admins processed`);
}
