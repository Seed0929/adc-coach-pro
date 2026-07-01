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
import { useBotDiffData } from "@/lib/player-data";

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSettingsPage,
});

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const REGIONS = ["NA", "EUW", "EUNE", "KR", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP"];

function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { refreshIdentity } = useBotDiffData();
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState({ displayName: "", avatarUrl: null as string | null });
  const [riotGameName, setRiotGameName] = useState("");
  const [riotTagLine, setRiotTagLine] = useState("");
  const [riotRegion, setRiotRegion] = useState("NA");
  const [initialRiot, setInitialRiot] = useState({ gameName: "", tagLine: "", region: "NA" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name || profile.username || "";
    const url = profile.avatar_url ?? profile.profile_picture ?? null;
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
      .then(({ data }) => {
        const next = {
          gameName: data?.game_name ?? "",
          tagLine: data?.tag_line ?? "",
          region: data?.region ?? "NA",
        };
        setRiotGameName(next.gameName);
        setRiotTagLine(next.tagLine);
        setRiotRegion(next.region);
        setInitialRiot(next);
      });
  }, [user]);

  const dirty =
    displayName !== initial.displayName ||
    avatarUrl !== initial.avatarUrl ||
    riotGameName !== initialRiot.gameName ||
    riotTagLine !== initialRiot.tagLine ||
    riotRegion !== initialRiot.region;

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
    const gameName = riotGameName.trim();
    const tagLine = riotTagLine.trim().replace(/^#/, "");
    if (!name) return toast.error("Username can't be empty.");
    if (name.length > 40) return toast.error("Username must be under 40 characters.");
    if (!gameName) return toast.error("Enter your Riot Game Name.");
    if (!tagLine) return toast.error("Enter your Riot Tag.");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: name,
          display_name: name,
          avatar_url: avatarUrl,
          profile_picture: avatarUrl,
          onboarding_complete: true,
          onboarding_completed: true,
        })
        .eq("id", user.id);
      if (error) throw error;

      const { error: riotError } = await supabase.from("riot_accounts").upsert(
        {
          profile_id: user.id,
          game_name: gameName,
          tag_line: tagLine,
          region: riotRegion,
          linked_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );
      if (riotError) throw riotError;

      await refreshProfile();
      await refreshIdentity();
      setRiotTagLine(tagLine);
      setInitial({ displayName: name, avatarUrl });
      setInitialRiot({ gameName, tagLine, region: riotRegion });
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
    setRiotGameName(initialRiot.gameName);
    setRiotTagLine(initialRiot.tagLine);
    setRiotRegion(initialRiot.region);
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
                <div className="text-sm text-muted-foreground">Stored separately from BotDiff authentication</div>
              </div>
            </div>
            {riotGameName && riotTagLine ? <Pill tone="success">Saved</Pill> : <Pill tone="warning">Missing</Pill>}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.8fr_0.7fr]">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Riot Game Name</label>
              <input
                type="text"
                value={riotGameName}
                onChange={(e) => setRiotGameName(e.target.value)}
                placeholder="Faker"
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-white/[0.06]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Riot Tag</label>
              <input
                type="text"
                value={riotTagLine}
                onChange={(e) => setRiotTagLine(e.target.value.replace(/^#/, ""))}
                placeholder="KR1"
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-white/[0.06]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Region</label>
              <select
                value={riotRegion}
                onChange={(e) => setRiotRegion(e.target.value)}
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none focus:bg-white/[0.06] [&>option]:bg-background"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
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