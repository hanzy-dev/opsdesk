type IdentityLike = {
  subject?: string;
  displayName?: string;
  email?: string;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function isTechnicalIdentifier(value: string) {
  const normalized = value.trim();
  return (
    isUuidLike(normalized) ||
    (/^[a-z0-9-]{20,}$/i.test(normalized) && !normalized.includes("@")) ||
    /^[a-z]{2}-[a-z0-9-]+_[a-z0-9]+$/i.test(normalized)
  );
}

function humanizeEmailLocalPart(email?: string) {
  const localPart = email?.split("@")[0]?.trim() ?? "";
  if (!localPart) {
    return "";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getPreferredDisplayName(identity?: IdentityLike | null) {
  const displayName = identity?.displayName?.trim() ?? "";
  const email = identity?.email?.trim() ?? "";

  if (displayName && displayName !== email && !isTechnicalIdentifier(displayName)) {
    return displayName;
  }

  const emailFallback = humanizeEmailLocalPart(email);
  if (emailFallback) {
    return emailFallback;
  }

  return "Pengguna OpsDesk";
}
