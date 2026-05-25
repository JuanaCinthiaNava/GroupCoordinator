// Minimal layout for /plan/[slug]. The pb-32 reserves space for the sticky
// sign-in affordance bar so it never overlaps content.

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="flex-1 pb-32">
      {children}
    </main>
  );
}
