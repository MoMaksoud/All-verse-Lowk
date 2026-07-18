import { Navbar } from "@/components/homepage/Navbar";
import { Hero } from "@/components/homepage/Hero";
import { FeaturedListings } from "@/components/homepage/FeaturedListings";
import { CategoryPickerSection } from "@/components/homepage/CategoryPickerSection";
import { ShopByStyleSection } from "@/components/homepage/ShopByStyleSection";
import { PopularCarousel } from "@/components/homepage/PopularCarousel";
import { TrendingSearchesSection } from "@/components/homepage/TrendingSearchesSection";
import { Footer } from "@/components/homepage/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <FeaturedListings />
      <CategoryPickerSection />
      <ShopByStyleSection />
      <PopularCarousel />
      <TrendingSearchesSection />
      <Footer />
    </div>
  );
}
