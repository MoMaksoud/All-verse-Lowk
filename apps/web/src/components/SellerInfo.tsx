import { User } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface SellerInfoProps {
  seller?: {
    name?: string;
    since?: string;
    rating?: number;
    reviews?: number;
    id?: string;
  };
  onContactClick?: () => void;
}

export function SellerInfo({ seller, onContactClick }: SellerInfoProps) {
  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-zinc-800 grid place-items-center text-zinc-200">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-zinc-100 font-medium">
            {seller?.name}
          </h3>
          <p className="text-sm text-zinc-400">
            Member since {seller?.since}
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1 text-yellow-400">
          ⭐ {seller?.rating}
        </span>
        <span className="text-zinc-400">
          ({seller?.reviews} reviews)
        </span>
      </div>

      {/* Contact button */}
      <button 
        onClick={onContactClick}
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-sm font-medium transition"
      >
        Contact Seller
      </button>
    </Card>
  );
}
