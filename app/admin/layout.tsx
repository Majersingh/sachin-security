// app/admin/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Briefcase,
  Users,
  Search,
  LogOut,
  Menu,
  X,
  Home,
  Building2,
  Network,
  CalendarCheck,
  CalendarClock,
  FileText,
  Settings,
  ExternalLink,
  UserCog
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Role drives visibility of admin-only nav items (e.g. User Management).
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setRole(s?.user?.role ?? null))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut({ callbackUrl: '/admin/login' });
    }
  };

  // app/admin/layout.tsx - Add this to navItems array
const navItems = [
  { name: 'Dashboard', icon: Home, path: '/admin' },
  { name: 'All Jobs', icon: Briefcase, path: '/admin/all-jobs' }, // ADD THIS
  { name: 'Add Job', icon: Briefcase, path: '/admin/add-job' },
  { name: 'Add Employee', icon: Users, path: '/admin/add-employee' },
  { name: 'Search Employee', icon: Search, path: '/admin/search-employee' },
  { name: 'Organization', icon: Building2, path: '/admin/organization' },
  { name: 'Reporting', icon: Network, path: '/admin/reporting' },
  { name: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
  { name: 'Leave', icon: CalendarClock, path: '/admin/leave' },
  { name: 'Documents', icon: FileText, path: '/admin/documents' },
  { name: 'Settings', icon: Settings, path: '/admin/settings' },
  { name: 'User Management', icon: UserCog, path: '/admin/users', adminOnly: true },
  { name: 'Support Ticket', icon: Search, path: '/admin/support-messages' },
  { name: 'Employee Portal', icon: ExternalLink, path: '/portal' },

].filter((item) => !item.adminOnly || role === 'admin');

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-black"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href='/admin/login' className="text-xl font-bold text-gray-900">
              Sachin Security <span className="text-amber-600">Admin</span>
            </Link>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 overflow-y-auto transform lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-0.5 rounded-lg font-medium ${
                  isActive
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pl-64">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        />
      )}
    </div>
  );
}
