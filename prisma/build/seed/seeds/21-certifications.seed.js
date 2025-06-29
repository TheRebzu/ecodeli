"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCertifications = seedCertifications;
async function seedCertifications(ctx) {
    const { prisma } = ctx;
    console.log('Seeding certifications data...');
    // Récupérer les providers et deliverers
    const providers = await prisma.provider.findMany({
        include: { user: true }
    });
    const deliverers = await prisma.deliverer.findMany({
        include: { user: true }
    });
    console.log(`Found ${providers.length} providers and ${deliverers.length} deliverers`);
    if (providers.length === 0 && deliverers.length === 0) {
        console.log('   No providers or deliverers found, skipping certifications');
        return [];
    }
    const certifications = [];
    // Types de certifications basiques
    const certificationTypes = [
        'IDENTITY_VERIFICATION',
        'DRIVING_LICENSE',
        'INSURANCE_CERTIFICATE',
        'PROFESSIONAL_TRAINING',
        'SAFETY_CERTIFICATION'
    ];
    // Créer des certifications pour les providers
    for (const provider of providers) {
        const numCerts = Math.floor(Math.random() * 3) + 1; // 1 à 3 certifications
        for (let i = 0; i < numCerts; i++) {
            const certType = certificationTypes[i % certificationTypes.length];
            const issueDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            const expiryDate = new Date(issueDate.getTime() + (2 + Math.random() * 3) * 365 * 24 * 60 * 60 * 1000);
            // Certification générale
            const cert = await prisma.certification.create({
                data: {
                    name: `Certification ${certType}`,
                    description: `Certification de type ${certType} pour prestataire`,
                    category: 'TECHNICAL', // Using TECHNICAL as default category
                    level: ['BASIC', 'INTERMEDIATE', 'ADVANCED'][Math.floor(Math.random() * 3)],
                    requirements: { type: certType, providerId: provider.id }
                }
            });
            certifications.push(cert);
            // Certification spécifique au provider
            await prisma.providerCertification.create({
                data: {
                    providerId: provider.id,
                    certificationId: cert.id,
                    status: 'COMPLETED',
                    startedAt: issueDate,
                    completedAt: issueDate,
                    expiresAt: expiryDate,
                    score: 80 + Math.random() * 20, // Score entre 80 et 100
                    isValid: expiryDate > new Date(),
                    certificateUrl: `https://docs.ecodeli.fr/certs/${provider.id}/${cert.id}.pdf`
                }
            });
        }
        console.log(`Created ${numCerts} certifications for provider ${provider.user.email}`);
    }
    // Créer des certifications pour les deliverers
    for (const deliverer of deliverers) {
        const requiredCerts = ['IDENTITY_VERIFICATION', 'DRIVING_LICENSE', 'INSURANCE_CERTIFICATE'];
        for (const certType of requiredCerts) {
            const issueDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
            const expiryDate = new Date(issueDate.getTime() + (2 + Math.random() * 3) * 365 * 24 * 60 * 60 * 1000);
            // Certification générale
            const cert = await prisma.certification.create({
                data: {
                    name: `Certification ${certType}`,
                    description: `Certification de type ${certType} pour livreur`,
                    category: 'COMPLIANCE', // Using COMPLIANCE for deliverer certs
                    level: 'BASIC',
                    requirements: { type: certType, delivererId: deliverer.id }
                }
            });
            certifications.push(cert);
            // Certification spécifique au deliverer
            await prisma.delivererCertification.create({
                data: {
                    delivererId: deliverer.id,
                    certificationId: cert.id,
                    status: 'COMPLETED',
                    startedAt: issueDate,
                    completedAt: issueDate,
                    expiresAt: expiryDate,
                    score: 80 + Math.random() * 20,
                    isValid: expiryDate > new Date(),
                    certificateUrl: `uploads/certifications/${deliverer.id}/${certType.toLowerCase()}.pdf`
                }
            });
        }
        console.log(`Created certifications for deliverer ${deliverer.user.email}`);
    }
    console.log(`   Created ${certifications.length} certifications`);
    return certifications;
}
