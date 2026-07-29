// app/portal/page.tsx
// Employee self-service dashboard (rendered inside app/portal/layout.tsx).
import Link from "next/link";
import { auth } from "@/auth";
import { User, CalendarClock, FileText, KeyRound } from "lucide-react";
import AttendanceClock from "./AttendanceClock";

function QuickLink({ href, title, desc, icon: Icon }: { href: string; title: string; desc: string; icon: any }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-amber-300 transition flex items-start gap-3"
    >
      <span className="shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-amber-600" />
      </span>
      <span>
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="block text-sm text-gray-500">{desc}</span>
      </span>
    </Link>
  );
}

export default async function PortalPage() {
  const session = await auth();
  const name = session?.user?.name || "Employee";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {name}</h1>
        <p className="text-gray-500 text-sm">Your employee self-service dashboard</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attendance clock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-1">
          <AttendanceClock />
          <Link href="/portal/attendance" className="block text-center text-sm text-amber-700 hover:underline mt-3">
            View monthly attendance →
          </Link>
        </div>

        {/* Quick links */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 content-start">
          <QuickLink href="/portal/profile" title="My Profile" desc="View & update your details" icon={User} />
          <QuickLink href="/portal/leave" title="Leave" desc="Apply & view balance" icon={CalendarClock} />
          <QuickLink href="/portal/documents" title="Documents" desc="Download your documents" icon={FileText} />
          <QuickLink href="/admin/change-password" title="Change Password" desc="Update your password" icon={KeyRound} />
        </div>
      </div>
    </div>
  );
}
