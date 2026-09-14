import React from "react";
import { LayoutGrid, ShoppingCart, Play, ExternalLink } from "lucide-react";
import { AdMetric, DateRange } from "../types";

interface AdsTableProps {
  ads: AdMetric[];
  dateRange: DateRange;
  onOpenVideoModal: (ad: AdMetric) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const AdsTable: React.FC<AdsTableProps> = ({
  ads,
  dateRange,
  onOpenVideoModal,
}) => {
  const handlePostUrlClick = (ad: AdMetric) => {
    if (ad.videoUrl) {
      onOpenVideoModal(ad);
    } else {
      const fallbackUrl =
        ad.channel.includes("tiktok")
          ? `https://library.tiktok.com/ads?keyword=${encodeURIComponent(ad.adName)}`
          : `https://www.facebook.com/ads/library/?id=${ad.adId}`;
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Section Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LayoutGrid className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            All My Ads
          </h2>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider ml-1">
            {ads.length} ADS — LAST {dateRange.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Table Responsive Wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01]">
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                PREVIEW
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider min-w-[200px]">
                AD NAME
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                CHANNEL
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-right">
                SPEND
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-right">
                CONV. VALUE
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-right">
                EST. COMMISSION
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-right">
                ORDERS
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-right">
                AOV
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-right">
                ROAS
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center">
                POST URL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {ads.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-zinc-500 font-medium">
                  No ads found matching this criteria.
                </td>
              </tr>
            ) : (
              ads.map((ad) => (
                <tr
                  key={ad.adId}
                  className="hover:bg-white/[0.02] transition duration-150 group"
                >
                  {/* PREVIEW */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onOpenVideoModal(ad)}
                      className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 relative group/thumb cursor-pointer flex items-center justify-center shrink-0"
                    >
                      {ad.adImageUrl ? (
                        <img
                          src={ad.adImageUrl}
                          alt={ad.adName}
                          className="w-full h-full object-cover transition group-hover/thumb:scale-110"
                        />
                      ) : (
                        <ShoppingCart className="w-4 h-4 text-zinc-500" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                      </div>
                    </button>
                  </td>

                  {/* AD NAME */}
                  <td className="py-3 px-4 font-semibold text-white">
                    <span className="line-clamp-2 leading-snug">{ad.adName}</span>
                  </td>

                  {/* CHANNEL */}
                  <td className="py-3 px-4">
                    <span className="bg-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-1 rounded uppercase tracking-wider border border-white/5">
                      {ad.channel}
                    </span>
                  </td>

                  {/* SPEND */}
                  <td className="py-3 px-4 text-right font-medium text-zinc-300">
                    {formatCurrency(ad.spend)}
                  </td>

                  {/* CONV. VALUE */}
                  <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                    {formatCurrency(ad.convValue)}
                  </td>

                  {/* EST. COMMISSION */}
                  <td className="py-3 px-4 text-right font-semibold text-indigo-400">
                    {formatCurrency(ad.estCommission || 0)}
                  </td>

                  {/* ORDERS */}
                  <td className="py-3 px-4 text-right text-zinc-300">
                    {ad.orders}
                  </td>

                  {/* AOV */}
                  <td className="py-3 px-4 text-right text-zinc-300">
                    {formatCurrency(ad.aov || 0)}
                  </td>

                  {/* ROAS */}
                  <td className="py-3 px-4 text-right font-semibold text-indigo-400">
                    {(ad.roas || 0).toFixed(2)}x
                  </td>

                  {/* POST URL */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handlePostUrlClick(ad)}
                      className="text-zinc-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition duration-150 inline-flex items-center justify-center cursor-pointer"
                      title="View Post / Media"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
