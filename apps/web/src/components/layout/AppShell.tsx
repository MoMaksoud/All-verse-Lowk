export default function AppShell({ children }: { children: React.ReactNode }) {
  const NAV_H = 64;
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* navbar is assumed already rendered at the top with h-16 */}
      <div style={{ paddingTop: NAV_H }}>{children}</div>
    </div>
  );
}
