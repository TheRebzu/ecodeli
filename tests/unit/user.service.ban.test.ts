import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '@/server/services/user.service';
import { UserBanAction } from '@/types/user';

// Mock Prisma client
globalThis.db = {
  user: {
    update: vi.fn(),
  },
};

const adminId = 'admin-1';
const userId = 'user-1';

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService.banOrUnbanUser', () => {
  it('bans a user with reason', async () => {
    const reason = 'Violation des règles';
    (globalThis.db.user.update as any).mockResolvedValue({ isBanned: true, banReason: reason });
    const result = await userService.banOrUnbanUser(userId, UserBanAction.BAN, reason, adminId);
    expect(globalThis.db.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: expect.any(Date),
        bannedById: adminId,
        banReason: reason,
      },
    });
    expect(result.isBanned).toBe(true);
    expect(result.banReason).toBe(reason);
  });

  it('bans a user with default reason if none provided', async () => {
    (globalThis.db.user.update as any).mockResolvedValue({ isBanned: true, banReason: 'Non spécifiée' });
    const result = await userService.banOrUnbanUser(userId, UserBanAction.BAN, undefined, adminId);
    expect(globalThis.db.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: expect.any(Date),
        bannedById: adminId,
        banReason: 'Non spécifiée',
      },
    });
    expect(result.banReason).toBe('Non spécifiée');
  });

  it('unbans a user', async () => {
    (globalThis.db.user.update as any).mockResolvedValue({ isBanned: false, banReason: null });
    const result = await userService.banOrUnbanUser(userId, UserBanAction.UNBAN, undefined, adminId);
    expect(globalThis.db.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedById: null,
        banReason: null,
      },
    });
    expect(result.isBanned).toBe(false);
    expect(result.banReason).toBeNull();
  });
});
