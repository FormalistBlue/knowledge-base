import type { UserRole } from '@prisma/client';

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  tokenVersion: number;
};

declare global {
  namespace Express {
    interface Request {
      currentUser?: CurrentUser;
    }
  }
}

export {};
