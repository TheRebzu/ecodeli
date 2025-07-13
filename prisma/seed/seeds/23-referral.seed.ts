import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";

export async function seedReferrals(ctx: SeedContext) {
  const { prisma } = ctx;
  const users = ctx.data.get("users") || [];

  console.log("   Creating referral system data...");

  // Créer un programme de parrainage simple
  const mainProgram = await prisma.referralProgram.create({
    data: {
      name: "Programme Parrainage EcoDeli",
      description: "Parrainez vos amis et gagnez des récompenses !",
      programType: "USER_REFERRAL" as any,
      isActive: true,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      eligibilityRules: {
        minimumAge: 18,
        activeAccount: true,
      },
      referrerReward: {
        amount: 5,
        type: "CREDIT",
      },
      refereeReward: {
        amount: 5,
        type: "CREDIT",
      },
      maxReferralsPerUser: 50,
    },
  });

  // Créer quelques codes de parrainage
  const clients = users.filter((u: any) => u.role === "CLIENT").slice(0, 3);
  const codes = [];

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const code = await prisma.referralCode.create({
      data: {
        programId: mainProgram.id,
        referrerId: client.id,
        code: `ECO${String(i + 1).padStart(3, "0")}REF`,
        isActive: true,
        usageLimit: 10,
        usageCount: Math.floor(Math.random() * 3),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    codes.push(code);
  }

  // Créer quelques parrainages simples
  const referrals = [];
  if (clients.length >= 2) {
    for (let i = 0; i < Math.min(2, clients.length - 1); i++) {
      const referrer = clients[i];
      const referee = clients[i + 1];
      const code = codes[i];

      if (code) {
        const referral = await prisma.referral.create({
          data: {
            programId: mainProgram.id,
            codeId: code.id,
            referrerId: referrer.id,
            refereeId: referee.id,
            status: "ACTIVE" as any,
            referralMethod: "CODE" as any,
            conditionsMet: {
              signedUp: true,
              firstOrder: Math.random() > 0.5,
            },
          },
        });
        referrals.push(referral);
      }
    }
  }

  console.log(`   ✓ Created 1 referral program`);
  console.log(`   ✓ Created ${codes.length} referral codes`);
  console.log(`   ✓ Created ${referrals.length} referrals`);

  return { programs: [mainProgram], codes, referrals };
}
