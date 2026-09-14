import React from "react";
import { LayoutGrid, LogOut } from "lucide-react";
import { CreatorUser } from "../types";
import { Link } from "react-router-dom";

interface HeaderProps {
  user: CreatorUser;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/5 py-3 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/30 border border-indigo-400/20 shrink-0">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bold text-white text-base sm:text-lg tracking-tight">
              Down to Ground
            </span>
            <span className="text-zinc-500 text-xs font-normal hidden sm:inline">
              Creator Dashboard
            </span>
          </div>
        </div>

        {/* Right side navigation items */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Static Currency Badge */}
          <div className="bg-zinc-900 border border-white/10 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-zinc-300 tracking-wider flex items-center gap-1.5 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>CURRENCY: AUD</span>
          </div>

          {/* Creator Upload */}
          <Link
            to="/creator-upload"
            className="text-zinc-400 hover:text-white text-xs sm:text-sm font-medium transition duration-200"
          >
            Creator Upload
          </Link>

          {/* User Code badge */}
          <div className="text-xs text-zinc-400 font-mono bg-zinc-900/80 px-2.5 py-1 rounded-md border border-white/5 hidden sm:block">
            {user.code}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};