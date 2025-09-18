type Action = { label: string; onClick: () => void; icon?: React.ReactNode };

export function QuickActions({ actions }: { actions: Action[] }) {
  if (!actions?.length) return null;
  
  return (
    <div className="mx-auto max-w-6xl px-4 mt-3">
      <div className="text-zinc-300 text-sm mb-2">Quick actions</div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition"
          >
            {a.icon ?? <span>🔎</span>}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
