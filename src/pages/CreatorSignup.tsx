import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, UserPlus, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { CreatorUser } from "../types";
import { signupCreator } from "../services/creatorAuthApi";

interface CreatorSignupProps {
  onSignupSuccess: (user: CreatorUser) => void;
}

export default function CreatorSignup({ onSignupSuccess }: CreatorSignupProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ name: string; code: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await signupCreator(name.trim(), email.trim());
      setResult({ name: res.name, code: res.code });
    } catch (err: any) {
      setErrorMessage(err?.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (!result) return;
    const user: CreatorUser = { name: result.name, code: result.code };
    localStorage.setItem("influencer_user", JSON.stringify(user));
    onSignupSuccess(user);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-[#141416] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />

        {result ? (
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-5 mx-auto">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">You're all set, {result.name}!</h1>
            <p className="text-sm text-zinc-400 mb-6">
              Your creator code has been created. Save it — you'll use it to log in next time.
            </p>

            <div className="bg-[#0d0d0e] border border-white/10 rounded-xl px-4 py-4 mb-6 flex items-center justify-between">
              <span className="font-mono text-xl tracking-wider text-indigo-300">{result.code}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(result.code)}
                className="text-zinc-500 hover:text-white p-1.5"
                title="Copy code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl transition"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-8 relative z-10">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-5 border border-indigo-400/20">
                <LayoutGrid className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                Creator Sign Up
              </h1>
              <p className="text-sm text-zinc-400 font-normal">
                We'll auto-assign your unique creator code
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sophie Bennett"
                  className="w-full bg-[#0d0d0e] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sophie@example.com"
                  className="w-full bg-[#0d0d0e] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
                />
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/25 disabled:opacity-50 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? "Creating account..." : "Sign Up"}</span>
              </button>
            </form>

            <div className="mt-6 text-center relative z-10">
              <p className="text-xs text-zinc-500">
                Already have a code?{" "}
                <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
