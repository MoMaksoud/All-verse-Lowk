import { Navigation } from "@/components/Navigation";

export const metadata = { title: "AI Assistant — All Verse GPT" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}