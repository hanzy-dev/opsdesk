import { apiRequest } from "./client";
import type { UpdateProfileInput, UserProfile } from "../types/profile";

export function getMyProfile() {
  return apiRequest<UserProfile>("/profile/me");
}

export function updateMyProfile(input: UpdateProfileInput) {
  return apiRequest<UserProfile>("/profile/me", {
    method: "PATCH",
    body: JSON.stringify({
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
    }),
  });
}
