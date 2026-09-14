import React, { useEffect, useState, useCallback } from "react";
import { AdMetric, CreatorUser, DateRange, KpiMetrics } from "./types";
import { fetchCreatorMetrics } from "./services/api";
import { extractCreatorName } from "./utils/creator";
import { LoginScreen } from "./components/LoginScreen";
import { Header } from "./components/Header";
import { DateFilter } from "./components/DateFilter";
import { KpiCards } from "./components/KpiCards";
import { AdsTable } from "./components/AdsTable";
import { VideoModal } from "./components/VideoModal";
import { KpiSkeletons, TableSkeleton } from "./components/Skeletons";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import {Routes, Route} from "react-router-dom"
import CreatorUpload from "./pages/CreatorUpload";
import Admin from "./pages/Admin";
import CreatorSignup from "./pages/CreatorSignup";

export default function App() {
  const [user, setUser] = useState<CreatorUser | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [kpis, setKpis] = useState<KpiMetrics | null>(null);
  const [ads, setAds] = useState<AdMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAdForModal, setSelectedAdForModal] = useState<AdMetric | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedUserJson = localStorage.getItem("influencer_user");
      if (savedUserJson) {
        const parsed = JSON.parse(savedUserJson);
        if (parsed?.name && parsed?.code) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error("Error reading session from localStorage:", e);
    }
  }, []);

  // Load metrics data whenever user or dateRange changes
  const loadDashboardData = useCallback(async (creatorCode: string, range: DateRange) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const metricsRes = await fetchCreatorMetrics(creatorCode, range);

      setKpis(metricsRes.kpis);
      setAds(metricsRes.ads);
    } catch (err: any) {
      console.error("Failed to load dashboard metrics:", err);
      const rawMsg = err?.message || "";
      if (
        rawMsg.toLowerCase().includes("longer than usual") ||
        rawMsg.toLowerCase().includes("timeout") ||
        rawMsg.toLowerCase().includes("504")
      ) {
        setErrorMessage("Northbeam is taking longer than usual to respond, please try again.");
      } else {
        setErrorMessage(rawMsg || "Failed to load metrics. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.code) {
      loadDashboardData(user.code, dateRange);
    }
  }, [user, dateRange, loadDashboardData]);

  const handleRetry = () => {
    if (user?.code) {
      loadDashboardData(user.code, dateRange);
    }
  };

  const handleLoginSuccess = (loggedInUser: CreatorUser) => {
    setUser(loggedInUser);
  };

  const handleSignOut = () => {
    localStorage.removeItem("influencer_user");
    setUser(null);
    setKpis(null);
    setAds([]);
    setErrorMessage(null);
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  // Extract display name using robust utility (handles [Name], CR-100 | Name, etc.)
  const displayName = user ? extractCreatorName(ads[0]?.adName, user.name) : "";

  return (
  <Routes>
    <Route
      path="/"
      element={
        !user ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
        <div className="min-h-screen bg-[#0A0A0B] text-white selection:bg-indigo-500 selection:text-white flex flex-col justify-between font-sans">
        <div className="min-h-screen bg-[#0A0A0B] text-white selection:bg-indigo-500 selection:text-white flex flex-col justify-between font-sans">
      <div>
        {/* Fixed Header */}
        <Header user={user} onSignOut={handleSignOut} />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
          {/* Error Banner with Retry */}
          {errorMessage && (
            <div
              id="error-banner"
              className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-sm font-medium">{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  id="error-retry-btn"
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Retry
                </button>
                <button
                  id="error-dismiss-btn"
                  onClick={() => setErrorMessage(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Welcome Header & Date Range Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome back {displayName}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-normal">
                Here's how your content is performing across all active campaigns.
              </p>
            </div>

            <DateFilter
              selectedRange={dateRange}
              onChange={handleDateRangeChange}
              isLoading={isLoading}
            />
          </div>

          {/* KPI Metric Cards */}
          {isLoading || !kpis ? (
            <KpiSkeletons />
          ) : (
            <KpiCards kpis={kpis} dateRange={dateRange} />
          )}

          {/* "All My Ads" Table Section */}
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <AdsTable
              ads={ads}
              dateRange={dateRange}
              onOpenVideoModal={(ad) => setSelectedAdForModal(ad)}
            />
          )}
        </main>
      </div>

      {/* Video Preview Modal */}
      <VideoModal
        ad={selectedAdForModal}
        onClose={() => setSelectedAdForModal(null)}
      />

      {/* Footer Branding */}
      <footer className="py-8 text-center text-[11px] font-mono tracking-widest text-zinc-600 uppercase border-t border-white/5 mt-12">
        POWERED BY Northbeam DATA ENGINE
      </footer>
    </div>
        </div>
        )
      }
    />

    <Route path="/creator-upload" element={<CreatorUpload />} />

    <Route path="/admin" element={<Admin />} />

    <Route path="/signup" element={<CreatorSignup onSignupSuccess={handleLoginSuccess} />} />
  </Routes>
);
};