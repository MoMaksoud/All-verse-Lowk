import { Heart, ShoppingCart } from "lucide-react";
import { Logo } from "./Logo";
import { NavItem } from "./NavItem";
import { SellButton } from "./SellButton";
import { UserMenu } from "./UserMenu";
import { navItems } from "@/lib/mock-data";

export function Navbar() {
  return (
    <header className="h-16 w-full border-b border-[#ECECEC] bg-white">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-8">
        <Logo />

        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Favorites"
            className="text-[#111827] hover:text-[#2563EB]"
          >
            <Heart className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <button
            aria-label="Cart"
            className="text-[#111827] hover:text-[#2563EB]"
          >
            <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <SellButton />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
