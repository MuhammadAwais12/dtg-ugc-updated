import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, LogIn, AlertCircle, ShieldCheck } from "lucide-react";
import { CreatorUser } from "../types";
import { loginCreator } from "../services/creatorAuthApi";

interface LoginScreenProps {
  onLoginSuccess: (user: CreatorUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawName = name.trim();
    const rawCode = code.trim();

    if (!rawName || !rawCode) {
      setErrorMessage("Name and creator code are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send BOTH name and code to the backend
      const result = await loginCreator(rawName, rawCode);

      if (!result.isValid || !result.code) {
        setErrorMessage(
          result.error ||
            "Invalid name or creator code. Please check your details."
        );
        return;
      }

      // Use the creator information returned from Notion/backend
      const user: CreatorUser = {
        name: result.name || rawName,
        code: result.code
      };

      localStorage.setItem("influencer_user", JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      console.error("Login submission error:", err);
      setErrorMessage("Connection error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-[#141416] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-5 border border-indigo-400/20">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Influencer Portal
          </h1>

          <p className="text-sm text-zinc-400 font-normal">
            Enter your name and creator code to access your performance
            dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Name */}
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

          {/* Creator Code */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              CREATOR CODE
            </label>

            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CR-00"
              className="w-full bg-[#0d0d0e] border border-white/10 rounded-xl px-4 py-3.5 text-white uppercase placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm font-mono tracking-wider"
            />
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
          </button>
        </form>

        {/* Signup */}
        <div className="mt-6 text-center relative z-10">
          <p className="text-xs text-zinc-500">
            New creator?{" "}
            <Link
              to="/signup"
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Admin */}
        <div className="mt-4 text-center relative z-10">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};
