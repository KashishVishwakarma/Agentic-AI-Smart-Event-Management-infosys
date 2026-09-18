"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const savedName = localStorage.getItem("userName");

    if (savedName) {
      setUserName(savedName);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("rememberMe");

    router.push("/");
  };

  const publicPages = ["/", "/register"];

  const isPublicPage = publicPages.includes(pathname);

  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        {!isPublicPage && (
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
            <nav className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-4 md:px-6">

              {/* Logo + Website Name */}
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
              >
                {/* Logo */}
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-2xl shadow-md">
                  📅
                </span>

                {/* Website Name */}
                <span className="text-xl font-bold text-blue-600 md:text-2xl">
                  Smart Event Management
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden items-center gap-7 md:flex">

                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition ${
                    pathname === "/dashboard"
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Dashboard
                </Link>

                <Link
                  href="/events"
                  className={`text-sm font-medium transition ${
                    pathname === "/events" ||
                    pathname.startsWith("/events/")
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  My Events
                </Link>

                <Link
                  href="/create"
                  className={`text-sm font-medium transition ${
                    pathname === "/create"
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Create
                </Link>

                <Link
                  href="/upcoming"
                  className={`text-sm font-medium transition ${
                    pathname === "/upcoming"
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Upcoming
                </Link>

                <Link
                  href="/profile"
                  className={`text-sm font-medium transition ${
                    pathname === "/profile"
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Profile
                </Link>

                {/* User Section */}
                <div className="flex items-center gap-3 border-l border-slate-200 pl-5">

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
                    {userName}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Logout
                  </button>

                </div>
              </div>

              {/* Mobile Logout */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  Logout
                </button>
              </div>

            </nav>

            {/* Mobile Navigation */}
            <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
              <div className="flex flex-wrap gap-2">

                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  Dashboard
                </Link>

                <Link
                  href="/events"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  My Events
                </Link>

                <Link
                  href="/create"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  Create
                </Link>

                <Link
                  href="/upcoming"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  Upcoming
                </Link>

                <Link
                  href="/profile"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                >
                  Profile
                </Link>

              </div>
            </div>

          </header>
        )}

        {children}
      </body>
    </html>
  );
}