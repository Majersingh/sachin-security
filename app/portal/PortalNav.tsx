"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/profile", label: "Profile" },
  { href: "/portal/attendance", label: "Attendance" },
  { href: "/portal/leave", label: "Leave" },
  { href: "/portal/documents", label: "Documents" },
];

export default function PortalNav({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

  return (
    <header className="bg-zinc-900 text-white sticky top-0 z-40 border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center h-14 gap-6">
          {/* Brand */}
          <Link href="/portal" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="logo" className="w-7 h-7 rounded-full bg-white p-0.5 object-contain" />
            <span className="font-bold text-sm sm:text-base">
              Sachin Security <span className="text-amber-500">Portal</span>
            </span>
          </Link>

          {/* Desktop inline links */}
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.href) ? "bg-white/15 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop user + logout */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-300">{name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="flex items-center gap-1 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden ml-auto p-2 -mr-2" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 space-y-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(l.href) ? "bg-white/15 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3 mt-2 px-3">
              <span className="text-sm text-gray-300">{name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="flex items-center gap-1 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
