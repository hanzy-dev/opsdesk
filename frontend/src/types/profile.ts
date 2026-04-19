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

export type RequestProfileAvatarUploadUrlInput = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type ProfileAvatarUploadTarget = {
  objectKey: string;
  uploadUrl: string;
  uploadMethod: string;
  uploadHeaders: Record<string, string>;
  expiresAt: string;
};
