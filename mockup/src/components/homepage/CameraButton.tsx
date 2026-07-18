import { Camera } from "lucide-react";

export function CameraButton() {
  return (
    <button
      type="button"
      aria-label="Search by image"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#111827] hover:bg-gray-50"
    >
      <Camera className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
