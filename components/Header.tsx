"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

const navLinks = [
  { label: "利用規約", href: "/tos" },
  { label: "プライバシーポリシー", href: "/privacy" },
  { label: "使い方", href: "/guide" },
  { label: "お問い合わせ", href: "#contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { sessionEmail } = useUser();

  const isAdmin = sessionEmail === "goldbenchan@gmail.com";
  const navItems = isAdmin ? [...navLinks, { label: "管理者パネル", href: "/admin" }] : navLinks;
  const isLoggedIn = Boolean(sessionEmail);
  const displayName = useMemo(() => {
    if (!sessionEmail) return "";
    const [name] = sessionEmail.split("@");
    return name ?? sessionEmail;
  }, [sessionEmail]);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-0 z-50 w-full transition-all duration-300 bg-white/70 backdrop-blur-md shadow-sm border-b border-white/50">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-heading text-2xl font-bold tracking-tight text-[#FF8FA3] group-hover:text-[#FF6B8B] transition-colors">
            りんご会♪
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link 
              key={item.label} 
              href={item.href} 
              className="text-[#5D4037] hover:text-[#FF8FA3] transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex items-center gap-4 ml-4">
            {isLoggedIn ? (
              <>
                <span className="px-4 py-2 rounded-full bg-[#FFF5F7] text-[#5D4037] font-semibold border border-[#FFD1DC]">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="px-6 py-2.5 rounded-full border border-[#FF8FA3] text-[#FF8FA3] font-bold hover:bg-[#FFF5F7] transition-all disabled:opacity-60"
                >
                  {signingOut ? "ログアウト中" : "ログアウト"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-6 py-2.5 rounded-full border border-[#FF8FA3] text-[#FF8FA3] font-bold hover:bg-[#FFF5F7] transition-all"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary px-6 py-2.5 rounded-full font-bold shadow-lg shadow-[#FF8FA3]/30"
                >
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          className="md:hidden p-2 rounded-full hover:bg-black/5"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニューを開く"
        >
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <span className={`h-0.5 bg-[#5D4037] w-full transform transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`h-0.5 bg-[#5D4037] w-full transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 bg-[#5D4037] w-full transform transition-all ${menuOpen ? "-rotate-45 -translate-y-2.5" : ""}`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-t border-white/20 p-6 flex flex-col gap-6 shadow-xl md:hidden animate-fade-up">
          {navItems.map((item) => (
            <Link 
              key={item.label} 
              href={item.href} 
              className="text-lg font-medium text-[#5D4037]" 
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-2">
            {isLoggedIn ? (
              <>
                <div className="w-full py-3 rounded-full bg-[#FFF5F7] text-[#5D4037] font-semibold text-center border border-[#FFD1DC]">
                  {displayName}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="w-full py-3 rounded-full border border-[#FF8FA3] text-[#FF8FA3] font-bold text-center disabled:opacity-60"
                >
                  {signingOut ? "ログアウト中" : "ログアウト"}
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="w-full py-3 rounded-full border border-[#FF8FA3] text-[#FF8FA3] font-bold text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  ログイン
                </Link>
                <Link 
                  href="/signup" 
                  className="w-full py-3 rounded-full bg-[#FF8FA3] text-white font-bold text-center shadow-lg"
                  onClick={() => setMenuOpen(false)}
                >
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
