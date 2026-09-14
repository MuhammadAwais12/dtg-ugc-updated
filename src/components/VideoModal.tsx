import React from "react";
import { X, ExternalLink, ShoppingBag, DollarSign, TrendingUp } from "lucide-react";
import { AdMetric } from "../types";

interface VideoModalProps {
  ad: AdMetric | null;
  onClose: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const VideoModal: React.FC<VideoModalProps> = ({ ad, onClose }) => {
  if (!ad) return null;

  const fallbackUrl = ad.channel.includes("tiktok")
    ? `https://library.tiktok.com/ads?keyword=${encodeURIComponent(ad.adName)}`
    : `https://www.facebook.com/ads/library/?id=${ad.adId}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#141416] border border-white/10 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
          <div>
            <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              {ad.channel}
            </span>
            <h3 className="text-sm font-semibold text-white mt-1 line-clamp-1 pr-4">
              {ad.adName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Media Player */}
        <div className="bg-black relative flex items-center justify-center min-h-[260px]">
          {ad.videoUrl ? (
            <video
              src={ad.videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[55vh] object-contain bg-black"
            />
          ) : ad.adImageUrl ? (
            <div className="p-8 text-center flex flex-col items-center">
              <img
                src={ad.adImageUrl}
                alt={ad.adName}
                className="max-h-[40vh] object-contain rounded-xl border border-white/10 mb-4"
              />
              <p className="text-xs text-zinc-400">
                Video player preview not available for this ad.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Media Preview Unavailable</p>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Direct media stream is not provided in the reporting export. Click below to view the post on the platform ad library.
                </p>
              </div>
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
              >
                <span>View on Ad Library</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Ad Performance Footer Details */}
        <div className="p-5 border-t border-white/10 bg-zinc-900/40 space-y-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
                SPEND
              </span>
              <span className="text-xs font-bold text-white">
                {formatCurrency(ad.spend)}
              </span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
                CONV. VALUE
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {formatCurrency(ad.convValue)}
              </span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
                ROAS
              </span>
              <span className="text-xs font-bold text-indigo-400">
                {(ad.roas || 0).toFixed(2)}x
              </span>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-0.5">
                ORDERS
              </span>
              <span className="text-xs font-bold text-white">
                {ad.orders}
              </span>
            </div>
          </div>

          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition duration-200 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <span>Open in Ads Library</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
