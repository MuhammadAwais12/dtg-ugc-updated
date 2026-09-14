import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, ArrowLeft } from "lucide-react";
import AdminLogin from "../components/admin/AdminLogin";
import ReviewQueue from "../components/admin/ReviewQueue";
import { adminMe, adminLogout } from "../services/adminApi";

export default function Admin() {
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    adminMe().then((res) => setEmail(res?.email || null)).finally(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (!email) return <AdminLogin onLoginSuccess={setEmail} />;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/5 py-3 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{email}</span>
            <button
              onClick={async () => { await adminLogout(); setEmail(null); }}
              className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-sm text-zinc-400 mt-1">Content awaiting approval.</p>
        </div>
        <ReviewQueue />
      </main>
    </div>
  );
}
