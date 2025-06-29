"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedReviews = seedReviews;
const reviewTemplates = {
    SERVICE: {
        5: [
            'Prestation excellente ! Travail soigné et professionnel.',
            'Je suis ravie du service, personne très compétente.',
            'Parfait ! Ponctuel, efficace et de bon conseil.',
            'Super prestataire, je recommande vivement !',
            'Qualité de service exceptionnelle, merci beaucoup !'
        ],
        4: [
            'Très bon service, juste quelques détails à améliorer.',
            'Prestataire sérieux et travail bien fait.',
            'Bonne prestation dans l\'ensemble, satisfait.',
            'Service de qualité, je referai appel à cette personne.'
        ],
        3: [
            'Service correct mais peut faire mieux.',
            'Prestation moyenne, quelques oublis.',
            'Le travail a été fait mais manque de finition.'
        ]
    },
    PROVIDER_RESPONSES: [
        'Merci beaucoup pour votre confiance et votre retour !',
        'Ravi que vous soyez satisfait de mes services.',
        'Merci pour votre commentaire, à bientôt j\'espère !',
        'C\'est un plaisir de travailler avec des clients comme vous.',
        'Merci pour cette évaluation, votre satisfaction est ma priorité.'
    ]
};
async function seedReviews(ctx) {
    const { prisma } = ctx;
    const bookings = ctx.data.get('bookings') || [];
    console.log('   Creating reviews...');
    const reviews = [];
    // Avis pour les services terminés uniquement (le modèle Review est lié aux bookings)
    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
    for (const booking of completedBookings) {
        // 85% de chance d'avoir un avis pour les services
        if (Math.random() > 0.15) {
            // Distribution des notes pour les services : 70% 5 étoiles, 25% 4 étoiles, 5% 3 étoiles
            let rating = 5;
            const rand = Math.random();
            if (rand < 0.05)
                rating = 3;
            else if (rand < 0.3)
                rating = 4;
            const comments = reviewTemplates.SERVICE[rating];
            const comment = comments[Math.floor(Math.random() * comments.length)];
            const review = await prisma.review.create({
                data: {
                    bookingId: booking.id,
                    clientId: booking.clientId,
                    providerId: booking.providerId,
                    rating,
                    comment,
                    isVerified: true,
                    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Il y a 0-7 jours
                }
            });
            reviews.push(review);
            // 40% de chance que le prestataire réponde
            if (Math.random() < 0.4) {
                const responseText = reviewTemplates.PROVIDER_RESPONSES[Math.floor(Math.random() * reviewTemplates.PROVIDER_RESPONSES.length)];
                await prisma.review.update({
                    where: { id: review.id },
                    data: {
                        response: responseText,
                        respondedAt: new Date(review.createdAt.getTime() + Math.random() * 48 * 60 * 60 * 1000) // 0-48h après l'avis
                    }
                });
            }
        }
    }
    console.log(`   Created ${reviews.length} reviews`);
    return reviews;
}
