import { trustBadges } from "@/lib/mock-data";

export function TrustBadgeRow() {
  return (
    <div className="flex items-center gap-6">
      {trustBadges.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-[#2563EB]" strokeWidth={2} />
          <div className="leading-tight">
            <p className="text-sm font-bold text-[#111827]">{value}</p>
            <p className="text-xs text-[#6B7280]">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
