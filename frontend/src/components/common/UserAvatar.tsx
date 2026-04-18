import { useMemo, useState } from "react";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "lg";
};

export function UserAvatar({ name, avatarUrl, size = "sm" }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = useMemo(() => {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return "OD";
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }, [name]);

  return (
    <span className={`user-avatar user-avatar--${size}`} aria-hidden="true">
      {avatarUrl && !imageFailed ? (
        <img
          alt=""
          src={avatarUrl}
          onError={() => {
            setImageFailed(true);
          }}
        />
      ) : (
        initials
      )}
    </span>
  );
}
