import React from "react";
import { LayoutGrid, LogOut, Upload } from "lucide-react";
import { CreatorUser } from "../types";
import { Link } from "react-router-dom";
import logo from "../asset/logo.png";

interface HeaderProps {
  user: CreatorUser;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/5 py-3 px-3 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/30 border border-indigo-400/20 shrink-0">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div> */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={logo}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-white text-sm sm:text-lg tracking-tight truncate">
            Down to Ground
          </span>
        </div>

        {/* Right side navigation */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Currency Badge - hidden on mobile */}
          <div className="hidden md:flex bg-zinc-900 border border-white/10 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-zinc-300 tracking-wider items-center gap-1.5 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>CURRENCY: AUD</span>
          </div>

          {/* Upload Button */}
          <Link
            to="/creator-upload"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-zinc-900 shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 " />
            <span>Upload Content</span>
          </Link>

          {/* User Code - hidden on mobile */}
          <div className="hidden sm:block text-xs text-zinc-400 font-mono bg-zinc-900/80 px-2.5 py-1 rounded-md border border-white/5">
            {user.code}
          </div>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            title="Sign Out"
            aria-label="Sign Out"
            className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
