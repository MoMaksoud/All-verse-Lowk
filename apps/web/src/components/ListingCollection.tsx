import ListingCard from "@/components/ListingCard";

type Item = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  imageUrl?: string | null;
  sellerId?: string;
};

export default function ListingCollection({
  items,
  view, // "grid" | "list"
}: { 
  items: Item[]; 
  view: "grid" | "list" 
}) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <ListingCard 
            key={item.id} 
            variant="grid" 
            id={item.id}
            title={item.title}
            description={item.description}
            price={item.price}
            category={item.category}
            condition={item.condition}
            imageUrl={item.imageUrl}
            sellerId={item.sellerId}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {items.map((item) => (
        <ListingCard 
          key={item.id} 
          variant="list" 
          id={item.id}
          title={item.title}
          description={item.description}
          price={item.price}
          category={item.category}
          condition={item.condition}
          imageUrl={item.imageUrl}
          sellerId={item.sellerId}
        />
      ))}
    </div>
  );
}
