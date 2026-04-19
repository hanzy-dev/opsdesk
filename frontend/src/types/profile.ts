import type { UserRole } from "../modules/auth/roles";

export type UserProfile = {
  subject: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
};

export type AssignableUser = {
  subject: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
};

export type UpdateProfileInput = {
  displayName: string;
  avatarUrl: string;
};
