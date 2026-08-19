import type { MiniProfile } from "@/features/company/api/useProfilesByIds";

export function ApproverBadge({
  label,
  userId,
  title,
  profiles,
  at,
  note,
}: {
  label: string;
  userId: string | null;
  title: string;
  profiles: Map<string, MiniProfile>;
  at: string | null;
  note?: string | null;
}) {
  if (!userId) return null;
  const profile = profiles.get(userId);

  return (
    <div className="flex items-center gap-2.5 bg-bg rounded-lg px-3 py-2">
      {profile?.signatureUrl ? (
        <img src={profile.signatureUrl} alt="التوقيع" className="h-8 w-16 object-contain bg-white rounded border border-line/60 shrink-0" />
      ) : (
        <div className="h-8 w-16 rounded border border-dashed border-line/60 shrink-0 flex items-center justify-center text-[9px] text-ink-soft">
          بدون توقيع
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] text-ink-soft">{label}</div>
        <div className="text-xs font-bold text-ink truncate">{profile?.fullName ?? "—"}</div>
        <div className="text-[10px] text-ink-soft">
          {title}
          {at ? ` · ${new Date(at).toLocaleDateString("ar-SA")}` : ""}
        </div>
        {note && <div className="text-[10px] text-ink-soft mt-0.5 truncate">{note}</div>}
      </div>
    </div>
  );
}
