import React from "react";
import { AVATAR_ICONS, AVATAR_COLORS, resolveAvatarIcon, resolveAvatarColor } from "../../constants/avatars";

interface ModernAvatarProps {
  iconId?: string;
  colorId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModernAvatarProps["size"]>, string> = {
  sm: "w-8 h-8 rounded-xl",
  md: "w-12 h-12 rounded-2xl",
  lg: "w-16 h-16 rounded-2xl",
};

const ICON_SIZE_CLASSES: Record<NonNullable<ModernAvatarProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function ModernAvatar({ iconId, colorId, size = "md", className = "" }: ModernAvatarProps) {
  const resolvedIconId = resolveAvatarIcon(iconId);
  const resolvedColorId = resolveAvatarColor(colorId);
  const Icon = AVATAR_ICONS[resolvedIconId];
  const color = AVATAR_COLORS[resolvedColorId];

  return (
    <div
      className={`flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${color.bg} ${color.text} ${className}`}
      aria-hidden="true"
    >
      <Icon className={ICON_SIZE_CLASSES[size]} strokeWidth={2} />
    </div>
  );
}
