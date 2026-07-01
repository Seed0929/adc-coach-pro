import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Upload,
  Trash2,
  Mail,
  Gamepad2,
  Save,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, Pill } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar, removeAvatarFiles } from "@/lib/avatar";

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSettingsPage,
});

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState({ displayName: "", avatarUrl: null as string | null });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [riot, setRiot] = useState<{ game_name: string; tag_line: string; region: string } | null>(
    null,
  );

  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name || profile.username || "";
    const url = profile.avatar_url ?? null;
    setDisplayName(name);
    setAvatarUrl(url);
    setInitial({ displayName: name, avatarUrl: url });
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("riot_accounts")
      .select("game_name, tag_line, region")
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRiot(data));
  }, [user]);

  const dirty = displayName !== initial.displayName || avatarUrl !== initial.avatarUrl;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > MAX_SIZE) return toast.error("Image must be under 5MB.");

    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      toast.success("Picture uploaded. Save changes to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePicture() {
    if (!user) return;
    setUploading(true);
    try {
      await removeAvatarFiles(user.id);
      setAvatarUrl(null);
      toast.success("Picture removed. Save changes to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove picture.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !user) return;
    const name = displayName.trim();
    if (!name) return toast.error("Username can't be empty.");
    if (name.length > 40) return toast.error("Username must be under 40 characters.");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name, avatar_url: avatarUrl })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setInitial({ displayName: name, avatarUrl });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDisplayName(initial.displayName);
    setAvatarUrl(initial.avatarUrl);
    navigate({ to: "/settings" });
  }

  const initials = (displayName || user?.email || "B").charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="rise mb-6">
        <Link
          to="/settings"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Settings
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Edit Profile
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          How you're identified across BotDiff. This is independent of your Riot account.
        </p>
      </div>

      <form onSubmit={handleSave} className="rise space-y-6">
        {/* Avatar */}
        <div className="glass rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Profile Picture</h2>
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="size-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-dim font-display text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-background/60">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.1] disabled:opacity-60"
              >
                <Upload className="size-4" /> {avatarUrl ? "Change" : "Upload"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleRemovePicture}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-60"
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
        </div>

        {/* Username + email */}
        <div className="glass space-y-5 rounded-3xl p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium">BotDiff Username</label>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
              <UserIcon className="size-[18px] shrink-0 text-muted-foreground" />
              <input
                type="text"
                maxLength={40}
                placeholder="How you want to be known"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Doesn't need to be unique. Separate from your Riot name.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.02] px-4 py-3">
              <Mail className="size-[18px] shrink-0 text-muted-foreground" />
              <input
                type="email"
                readOnly
                value={profile?.email ?? user?.email ?? ""}
                className="w-full cursor-not-allowed bg-transparent text-sm text-muted-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {/* Riot account */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <Gamepad2 className="size-5" />
              </span>
              <div>
                <div className="font-medium">Linked Riot Account</div>
                <div className="text-sm text-muted-foreground">
                  {riot ? `${riot.game_name}#${riot.tag_line} · ${riot.region}` : "No account linked"}
                </div>
              </div>
            </div>
            {riot ? <Pill tone="success">Linked</Pill> : <Pill tone="warning">Not linked</Pill>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || uploading || !dirty}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/[0.06]"
          >
            Cancel
          </button>
        </div>
      </form>
    </AppShell>
  );
}