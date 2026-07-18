export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-white">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 1L15 14H1L8 1Z" fill="white" />
        </svg>
      </div>
      <span className="text-base font-bold text-[#111827]">All Verse</span>
    </div>
  );
}
