export function ChatHeader() {
  return (
    <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60 bg-zinc-950/80 border-b border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-600 grid place-items-center">🛍️</div>
        <div className="flex flex-col">
          <span className="text-zinc-100 font-medium leading-tight">Shopping Assistant</span>
          <span className="text-zinc-400 text-sm leading-tight">Finding the best deals for you</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 text-sm">Online</span>
        </div>
      </div>
    </div>
  );
}
