export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  tokenVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: CurrentUser;
};
