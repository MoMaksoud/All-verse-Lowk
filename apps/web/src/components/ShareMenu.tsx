import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Clipboard, Twitter, MessageCircle, Share2 } from "lucide-react";

type Props = {
  listing: { id: string; title: string; price: number };
  align?: "left" | "right"; // popover alignment
};

// tiny click-outside hook (no deps)
function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open, onClose]);
  return ref;
}

export default function ShareMenu({ listing, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "title" | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/listings/${listing.id}`;
  }, [listing.id]);

  const title = `${listing.title} - $${listing.price}`;

  const onClose = () => setOpen(false);
  const boxRef = useClickOutside<HTMLDivElement>(open, onClose);

  async function handleShareClick() {
    // Mobile/native share when available
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url: shareUrl });
        return; // no popover
      } catch {
        // user canceled → silently ignore, no popover
        return;
      }
    }
    // Desktop fallback → open popover
    setOpen((v) => !v);
  }

  async function copy(text: string, type: "link" | "title") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1200);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  }

  return (
    <div className="relative inline-block">
          <button
      type="button"
      onClick={handleShareClick}
      className="w-full rounded-full border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-5 text-sm font-medium transition flex items-center justify-center gap-2 leading-none"
      aria-haspopup="menu"
      aria-expanded={open}
    >
      <div className="flex items-center justify-center w-full gap-2">
        <Share2 className="w-4 h-4 translate-y-[0.5px]" />
        <span className="relative top-[0.5px]">Share</span>
      </div>
    </button>
      {/* Popover */}
      {open && (
        <div
          ref={boxRef}
          role="menu"
          className={[
            "absolute z-[60] mt-2 min-w-[220px] rounded-xl border border-white/10 bg-[#1b2230] p-2 shadow-xl",
            align === "right" ? "right-0" : "left-0"
          ].join(" ")}
          style={{ animation: "fadeIn 120ms ease-out" }}
        >
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          <button
            type="button"
            onClick={() => copy(shareUrl, "link")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/5 transition"
          >
            <Link2 className="h-4 w-4" />
            {copied === "link" ? "Copied Link!" : "Copy Link"}
          </button>

          <button
            type="button"
            onClick={() => copy(`${title} - ${shareUrl}`, "title")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/5 transition"
          >
            <Clipboard className="h-4 w-4" />
            {copied === "title" ? "Copied!" : "Copy Title & Price"}
          </button>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} ${shareUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/5 transition"
            role="menuitem"
            onClick={onClose}
          >
            <Twitter className="h-4 w-4" />
            Share to Twitter
          </a>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${shareUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/5 transition"
            role="menuitem"
            onClick={onClose}
          >
            <MessageCircle className="h-4 w-4" />
            Share to WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
