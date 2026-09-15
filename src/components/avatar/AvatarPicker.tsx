import React from "react";
import { AVATAR_ICON_IDS, AVATAR_COLOR_IDS, AVATAR_COLORS, resolveAvatarIcon, resolveAvatarColor, type AvatarIconId, type AvatarColorId } from "../../constants/avatars";
import { ModernAvatar } from "./ModernAvatar";

interface AvatarPickerProps {
  iconId?: string;
  colorId?: string;
  onChange: (iconId: AvatarIconId, colorId: AvatarColorId) => void;
  label?: string;
}

export function AvatarPicker({ iconId, colorId, onChange, label = "Ikona profilu" }: AvatarPickerProps) {
  const resolvedIcon = resolveAvatarIcon(iconId);
  const resolvedColor = resolveAvatarColor(colorId);

  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <details className="group border border-border rounded-xl relative">
        <summary className="p-2.5 text-xs font-semibold text-text-main cursor-pointer bg-surface hover:bg-surface-offset transition-colors flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-border focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset">
          <div className="flex items-center gap-3">
            <ModernAvatar iconId={resolvedIcon} colorId={resolvedColor} size="sm" />
            <span>Wybierz ikonę profilu</span>
          </div>
          <span className="group-open:rotate-180 transition-transform mr-2 text-text-muted">▼</span>
        </summary>
        <div className="p-3 border-t border-border bg-bg-base/95 backdrop-blur-2xl absolute w-full z-10 shadow-lg rounded-b-lg space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {AVATAR_ICON_IDS.map((id) => {
              const isSelected = resolvedIcon === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onChange(id, resolvedColor);
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                  className={`flex items-center justify-center p-1.5 rounded-xl border transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-focus-ring ${isSelected ? 'border-brand shadow-sm' : 'border-border hover:bg-surface-offset'}`}
                  aria-label={`Wybierz ikonę ${id}`}
                  aria-pressed={isSelected}
                >
                  <ModernAvatar iconId={id} colorId={resolvedColor} size="sm" />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-border/70">
            {AVATAR_COLOR_IDS.map((id) => {
              const isSelected = resolvedColor === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onChange(resolvedIcon, id);
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                  className={`w-6 h-6 rounded-full ${AVATAR_COLORS[id].swatch} transition-all active:scale-90 focus-visible:ring-2 focus-visible:ring-focus-ring ${isSelected ? 'ring-2 ring-offset-2 ring-offset-bg-base ring-text-main' : ''}`}
                  aria-label={`Wybierz kolor ${id}`}
                  aria-pressed={isSelected}
                />
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
