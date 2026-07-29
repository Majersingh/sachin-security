// app/portal/layout.tsx
// Shared shell for the employee self-service portal: branded top nav + responsive container.
import { auth } from "@/auth";
import PortalNav from "./PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const name = session?.user?.name || "Employee";

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <PortalNav name={name} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
