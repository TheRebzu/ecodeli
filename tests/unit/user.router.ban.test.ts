import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appRouter } from '@/server/api/root';
import { UserBanAction } from '@/types/user';

// Mock context/session for admin
const adminSession = {
  user: {
    id: 'admin-1',
    role: 'ADMIN',
    name: 'Admin',
    email: 'admin@example.com',
  },
};

// Mock userService
vi.mock('@/server/services/user.service', () => ({
  userService: {
    banOrUnbanUser: vi.fn(async (userId, action, reason, adminId) => ({
      id: userId,
      isBanned: action === UserBanAction.BAN,
      banReason: action === UserBanAction.BAN ? (reason || 'Non spécifiée') : null,
      bannedById: action === UserBanAction.BAN ? adminId : null,
      bannedAt: action === UserBanAction.BAN ? new Date() : null,
    })),
  },
}));

const caller = appRouter.createCaller({ session: adminSession } as any);

describe('userRouter.banOrUnban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bans a user as admin', async () => {
    const result = await caller.banOrUnban({ userId: 'user-1', action: 'BAN', reason: 'Spam' });
    expect(result.isBanned).toBe(true);
    expect(result.banReason).toBe('Spam');
  });

  it('unbans a user as admin', async () => {
    const result = await caller.banOrUnban({ userId: 'user-1', action: 'UNBAN' });
    expect(result.isBanned).toBe(false);
    expect(result.banReason).toBeNull();
  });

  it('throws if not admin', async () => {
    const userCaller = appRouter.createCaller({ session: { user: { id: 'u2', role: 'USER' } } } as any);
    await expect(userCaller.banOrUnban({ userId: 'user-1', action: 'BAN', reason: 'test' })).rejects.toThrow();
  });
});
