export function Composer({ 
  value, 
  onChange, 
  onSubmit, 
  loading 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  onSubmit: () => void; 
  loading?: boolean; 
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-5 pt-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { 
            if (e.key === "Enter" && !e.shiftKey) { 
              e.preventDefault(); 
              onSubmit(); 
            } 
          }}
          placeholder="Ask me about products, deals, or recommendations…"
          className="flex-1 bg-transparent outline-none placeholder:text-zinc-500 text-zinc-100"
        />
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
