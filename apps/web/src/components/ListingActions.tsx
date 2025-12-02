import { DollarSign, MessageCircle, Edit, Trash2 } from "lucide-react";

interface ListingActionsProps {
  listing: { id: string; title: string; price: number; sold?: boolean; inventory?: number };
  onBuyNow: () => void;
  onSuggestPrice: () => void;
  onMessageSeller: () => void;
  onEditListing: () => void;
  onDeleteListing: () => void;
  addingToCart?: boolean;
  suggestingPrice?: boolean;
  isOwner?: boolean;
}

export function ListingActions({
  listing,
  onBuyNow,
  onSuggestPrice,
  onMessageSeller,
  onEditListing,
  onDeleteListing,
  addingToCart = false,
  suggestingPrice = false,
  isOwner = false
}: ListingActionsProps) {
  // Guard: Don't render purchase UI if sold (check both sold flag and inventory)
  const isSold = listing.sold === true || listing.inventory === 0;
  if (isSold && !isOwner) {
    return (
      <div className="space-y-4">
        <h3 className="text-zinc-200 font-medium">Actions</h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-100 mb-1">
            ${listing.price.toLocaleString()}
          </div>
          <div className="text-lg font-semibold text-red-400 mt-4">SOLD</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-zinc-200 font-medium">Actions</h3>

      {/* Price Display */}
      <div className="text-center">
        <div className="text-3xl font-bold text-zinc-100 mb-1">
          ${listing.price.toLocaleString()}
        </div>
        <p className="text-sm text-zinc-400">Current asking price</p>
      </div>

      {isOwner ? (
        // Owner Actions
        <div className="flex gap-3">
          <button 
            onClick={onEditListing}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-sm font-medium transition flex items-center justify-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Listing
          </button>
          
          <button 
            onClick={onDeleteListing}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-white py-2 text-sm font-medium transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Listing
          </button>
        </div>
      ) : (
        // Non-owner Actions
        <>
          <button 
            onClick={onBuyNow}
            disabled={addingToCart}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingToCart ? 'Adding to Cart...' : 'Buy Now'}
          </button>

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
        </>
      )}
    </div>
  );
}
