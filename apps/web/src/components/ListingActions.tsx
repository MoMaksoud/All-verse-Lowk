import { DollarSign, MessageCircle, Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@marketplace/lib";

interface ListingActionsProps {
  price: number;
  onBuyNow: () => void;
  onSuggestPrice: () => void;
  onMessageSeller: () => void;
  onEditListing: () => void;
  onDeleteListing: () => void;
  addingToCart?: boolean;
  suggestingPrice?: boolean;
}

export function ListingActions({
  price,
  onBuyNow,
  onSuggestPrice,
  onMessageSeller,
  onEditListing,
  onDeleteListing,
  addingToCart = false,
  suggestingPrice = false
}: ListingActionsProps) {

  return (
    <Card>
      <h3 className="text-zinc-200 font-medium">Actions</h3>

      {/* Price Display */}
      <div className="text-center">
        <div className="text-3xl font-bold text-zinc-100 mb-1">
          {formatCurrency(price)}
        </div>
        <p className="text-sm text-zinc-400">Current asking price</p>
      </div>

      {/* Primary Action */}
      <button 
        onClick={onBuyNow}
        disabled={addingToCart}
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {addingToCart ? 'Adding to Cart...' : 'Buy Now'}
      </button>

      {/* Secondary Actions */}
      <button
        onClick={onSuggestPrice}
        disabled={suggestingPrice}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <DollarSign className="w-4 h-4" />
        {suggestingPrice ? 'Analyzing...' : 'Suggest Price'}
      </button>

      <button
        onClick={onMessageSeller}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 text-sm font-medium transition flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Message Seller
      </button>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-zinc-800 space-y-2">
        <button 
          onClick={onEditListing}
          className="w-full rounded-xl border border-zinc-700 text-zinc-200 py-2 text-sm hover:bg-zinc-800 transition flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Listing
        </button>
        <button 
          onClick={onDeleteListing}
          className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white py-2 text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Listing
        </button>
      </div>
    </Card>
  );
}
