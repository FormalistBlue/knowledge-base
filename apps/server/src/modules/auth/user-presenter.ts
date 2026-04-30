import type { User, UserRole, UserStatus } from '@prisma/client';

type SafeUserInput = Pick<
  User,
  'id' | 'username' | 'displayName' | 'role' | 'status' | 'tokenVersion' | 'lastLoginAt' | 'createdAt' | 'updatedAt'
>;

export type SafeUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const toSafeUser = (user: SafeUserInput): SafeUser => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  role: user.role,
  status: user.status,
  tokenVersion: user.tokenVersion,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
