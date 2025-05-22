-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastOnboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onboardingCompletionDate" TIMESTAMP(3);
