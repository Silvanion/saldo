import React, { useState } from "react";
import { Users, Edit2, Trash2, ArrowRight, Plus, X, AlertTriangle } from "lucide-react";
import { Profile, SupportedCurrency } from "../../types";
import { AvatarPicker } from "../avatar/AvatarPicker";
import { ModernAvatar } from "../avatar/ModernAvatar";
import { DEFAULT_AVATAR_ICON, DEFAULT_AVATAR_COLOR } from "../../constants/avatars";

interface SettingsProfileSectionProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onUpdateProfile: (
    profileId: string,
    data: {
      name: string;
      kind: "personal" | "shared";
      partnerName: string;
      avatar: string;
      color: string;
      currency: SupportedCurrency;
    }
  ) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenProfileModal: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function SettingsProfileSection({
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onDeleteProfile,
  onOpenProfileModal,
  showToast
}: SettingsProfileSectionProps) {
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileData, setEditProfileData] = useState<{
    name: string;
    kind: "personal" | "shared";
    partnerName: string;
    avatar: string;
    color: string;
    currency: SupportedCurrency;
  } | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  const startEditingProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditProfileData({
      name: profile.name,
      kind: profile.kind,
      partnerName: profile.partnerName || "",
      avatar: profile.avatar || DEFAULT_AVATAR_ICON,
      color: profile.color || DEFAULT_AVATAR_COLOR,
      currency: profile.currency || "PLN"
    });
  };

  const cancelEditingProfile = () => {
    setEditingProfileId(null);
    setEditProfileData(null);
  };

  const handleSaveEditedProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileId || !editProfileData) return;
    if (!editProfileData.name.trim()) return;
    if (editProfileData.kind === "shared" && !editProfileData.partnerName.trim()) {
      showToast("Proszę podać imię partnera dla profilu wspólnego.", "error");
      return;
    }

    onUpdateProfile(editingProfileId, {
      name: editProfileData.name.trim(),
      kind: editProfileData.kind,
      partnerName: editProfileData.kind === "shared" ? editProfileData.partnerName.trim() : "",
      avatar: editProfileData.avatar,
      color: editProfileData.color,
      currency: editProfileData.currency
    });
    setEditingProfileId(null);
    setEditProfileData(null);
  };

  return (
    <>
      <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-profiles-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main">Zarządzanie profilami budżetu</h3>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Każdy profil posiada niezależne transakcje, limity, salda bankowe oraz cele oszczędnościowe.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
            {profiles.length} {profiles.length === 1 ? "profil" : profiles.length < 5 ? "profile" : "profili"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5" id="profiles-grid">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const isShared = p.kind === "shared";
            const isEditing = editingProfileId === p.id;

            if (isEditing && editProfileData) {
              return (
                <div key={p.id} className="col-span-1 sm:col-span-2 bg-surface rounded-2xl border border-brand/20 p-5 shadow-md ring-2 ring-brand/20">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-brand" />
                      <h4 className="text-sm font-extrabold text-text-main">Edycja profilu: {p.name}</h4>
                    </div>
                    <button onClick={cancelEditingProfile} className="text-text-muted hover:text-text-main p-1.5 rounded-xl hover:bg-surface-2 active:scale-95 transition-colors cursor-pointer" aria-label="Zamknij edycję">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveEditedProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-main mb-1">Nazwa profilu</label>
                        <input
                          type="text"
                          value={editProfileData.name}
                          onChange={(e) => setEditProfileData(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                          required
                        />
                      </div>

                      <AvatarPicker
                        label="Ikona profilu"
                        iconId={editProfileData.avatar}
                        colorId={editProfileData.color}
                        onChange={(iconId, colorId) => setEditProfileData(prev => prev ? { ...prev, avatar: iconId, color: colorId } : null)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-main mb-1">Rodzaj profilu</label>
                      <select
                        value={editProfileData.kind}
                        onChange={(e) => setEditProfileData(prev => prev ? { ...prev, kind: e.target.value as "personal" | "shared" } : null)}
                        className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                      >
                        <option value="personal">👤 Osobisty (budżet prywatny)</option>
                        <option value="shared">👪 Wspólny (budżet domowy / z partnerem)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-main mb-1">Waluta bazowa</label>
                      <select
                        value={editProfileData.currency}
                        onChange={(e) => setEditProfileData(prev => prev ? { ...prev, currency: e.target.value as SupportedCurrency } : null)}
                        className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                      >
                        <option value="PLN">PLN (Polski Złoty)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="USD">USD (Dolar amerykański)</option>
                        <option value="GBP">GBP (Funt brytyjski)</option>
                      </select>
                    </div>

                    {editProfileData.kind === "shared" && (
                      <div>
                        <label className="block text-xs font-bold text-text-main mb-1">Imię partnera/współdzielącego</label>
                        <input
                          type="text"
                          value={editProfileData.partnerName}
                          onChange={(e) => setEditProfileData(prev => prev ? { ...prev, partnerName: e.target.value } : null)}
                          className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                          placeholder="np. Anna"
                          required
                          pattern=".*\S+.*"
                          title="Imię partnera nie może składać się z samych spacji"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                      <button
                        type="button"
                        onClick={cancelEditingProfile}
                        className="bg-surface border border-border text-text-muted font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-surface-offset active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        Anuluj
                      </button>
                      <button
                        type="submit"
                        disabled={
                          editProfileData.name === p.name &&
                          editProfileData.kind === p.kind &&
                          editProfileData.partnerName === (p.partnerName || "") &&
                          editProfileData.avatar === (p.avatar || DEFAULT_AVATAR_ICON) &&
                          editProfileData.color === (p.color || DEFAULT_AVATAR_COLOR) &&
                          editProfileData.currency === (p.currency || "PLN")
                        }
                        className="bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        Zapisz zmiany
                      </button>
                    </div>
                  </form>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? "bg-brand-subtle/30 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                    : "bg-surface border-border/70 hover:border-brand/30 hover:bg-surface-2"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <ModernAvatar iconId={p.avatar} colorId={p.color} size="md" className="border border-border/70 shadow-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-text-main">{p.name}</strong>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-brand text-text-inverse px-1.5 py-0.5 rounded shadow-xs">
                            Aktywny
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted mt-0.5 block">
                        {isShared ? `Wspólny z: ${p.partnerName || "Partner"}` : "Profil osobisty"} • {p.currency || "PLN"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditingProfile(p)}
                      className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-2 active:scale-95 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title="Edytuj profil"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setProfileToDelete(p.id)}
                      disabled={profiles.length <= 1}
                      className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger-subtle active:scale-95 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title={profiles.length <= 1 ? "Nie możesz usunąć jedynego profilu" : "Usuń profil"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!isActive && (
                  <button
                    onClick={() => onSelectProfile(p.id)}
                    className="w-full py-2 px-3 bg-brand hover:bg-brand-hover text-text-inverse font-bold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-1 focus-visible:ring-2 focus-visible:ring-focus-ring"
                    id={`btn-select-profile-${p.id}`}
                  >
                    <span>Otwórz ten profil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onOpenProfileModal}
            id="btn-add-profile-settings"
            className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2.5 p-4 rounded-xl border border-dashed border-border/70 hover:border-brand/40 hover:bg-brand-subtle/40 text-text-main font-bold text-xs active:scale-[0.98] transition-all cursor-pointer group shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <div className="p-2 bg-brand-subtle text-brand rounded-lg group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span> Utwórz nowy profil budżetu</span>
          </button>
        </div>
      </div>

      {profileToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-danger-subtle text-danger flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Usuwanie profilu</h3>
            <p className="text-sm text-text-muted mb-6">
              Czy na pewno chcesz usunąć ten profil? <strong>Wszystkie transakcje, cele i płatności zostaną bezpowrotnie usunięte.</strong>
              Ta operacja jest nieodwracalna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProfileToDelete(null)}
                className="flex-1 bg-surface hover:bg-surface-2 border border-border text-text-muted font-bold py-3 rounded-xl active:scale-[0.98] transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  onDeleteProfile(profileToDelete);
                  setProfileToDelete(null);
                }}
                className="flex-1 bg-danger hover:bg-danger/90 text-text-inverse font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Usuń profil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
