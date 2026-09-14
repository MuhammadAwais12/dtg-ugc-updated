import React from "react";
import { DateRange, KpiMetrics } from "../types";

interface KpiCardsProps {
  kpis: KpiMetrics;
  dateRange: DateRange;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, dateRange }) => {
  const rangeText = `LAST ${dateRange.toUpperCase()}`;

  const cards = [
    {
      title: "TOTAL AD SPEND",
      value: formatCurrency(kpis.totalSpend),
      valueClass: "text-white",
      topBorderColor: "border-blue-500",
    },
    {
      title: "CONVERSION VALUE",
      value: formatCurrency(kpis.convValue),
      valueClass: "text-white",
      topBorderColor: "border-emerald-500",
    },
    {
      title: "ROAS",
      value: `${(kpis.roas || 0).toFixed(2)}x`,
      valueClass: "text-emerald-400 font-semibold",
      topBorderColor: "border-purple-500",
    },
    {
      title: "AOV",
      value: formatCurrency(kpis.aov),
      valueClass: "text-white",
      topBorderColor: "border-amber-500",
    },
    {
      title: "EST. COMMISSION",
      value: formatCurrency(kpis.estCommission),
      valueClass: "text-white",
      topBorderColor: "border-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-[#141416] border border-white/5 border-t-2 ${card.topBorderColor} rounded-xl p-5 shadow-lg flex flex-col justify-between h-32 hover:border-white/15 transition duration-200 relative overflow-hidden group`}
        >
          {/* subtle glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-xl pointer-events-none group-hover:bg-white/[0.03] transition" />

          <div>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              {card.title}
            </span>
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${card.valueClass}`}>
              {card.value}
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {rangeText}
          </div>
        </div>
      ))}
    </div>
  );
};
