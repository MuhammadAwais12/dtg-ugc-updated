import React from "react";
import { DateRange } from "../types";

interface DateFilterProps {
  selectedRange: DateRange;
  onChange: (range: DateRange) => void;
  isLoading?: boolean;
}

const RANGES: { label: string; value: DateRange }[] = [
  { label: "7D", value: "7d" },
  { label: "14D", value: "14d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

export const DateFilter: React.FC<DateFilterProps> = ({
  selectedRange,
  onChange,
  isLoading = false,
}) => {
  return (
    <div className="bg-[#141416] p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner">
      {RANGES.map((r) => {
        const isActive = selectedRange === r.value;
        return (
          <button
            key={r.value}
            onClick={() => onChange(r.value)}
            disabled={isLoading}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${
              isActive
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
};
