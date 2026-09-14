import { AdMetric, DateRange, KpiMetrics } from "../types";
import { normalizeCreatorCode } from "../utils/creator";

export async function fetchCreatorMetrics(
  creatorCode: string,
  dateRange: DateRange
): Promise<{ ads: AdMetric[]; kpis: KpiMetrics }> {
  const normalizedCode = normalizeCreatorCode(creatorCode);
  try {
    const res = await fetch(
      `/api/northbeam/metrics?creatorCode=${encodeURIComponent(
        normalizedCode
      )}&dateRange=${encodeURIComponent(dateRange)}`
    );

    if (!res.ok) {
      let msg = "Failed to fetch creator metrics";
      try {
        const errJson = await res.json();
        if (errJson?.error) msg = errJson.error;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    const rawAds = data.ads || [];

    const summary = data.summary || {};
    let totalSpend = 0;
    let totalConvValue = 0;
    let totalOrders = 0;

    const ads: AdMetric[] = rawAds.map((ad: any) => {
      const spend = Number(ad.spend || 0);
      const convValue = Number(ad.convValue || 0);
      const orders = Number(ad.orders || 0);

      totalSpend += spend;
      totalConvValue += convValue;
      totalOrders += orders;

      const roas = typeof ad.roas === "number" ? ad.roas : (spend > 0 ? convValue / spend : 0);
      const aov = typeof ad.aov === "number" ? ad.aov : (orders > 0 ? convValue / orders : 0);
      const estCommission = convValue * 0.10;

      return {
        ...ad,
        spend,
        convValue,
        orders,
        roas,
        aov,
        estCommission,
      };
    });

    const overallRoas =
      typeof summary.overallRoas === "number"
        ? summary.overallRoas
        : totalSpend > 0
        ? totalConvValue / totalSpend
        : 0;

    const overallAov =
      typeof summary.overallAov === "number"
        ? summary.overallAov
        : totalOrders > 0
        ? totalConvValue / totalOrders
        : 0;

    const overallCommission = totalConvValue * 0.10;

    const kpis: KpiMetrics = {
      totalSpend: typeof summary.totalSpend === "number" ? summary.totalSpend : totalSpend,
      convValue: typeof summary.totalRev === "number" ? summary.totalRev : totalConvValue,
      roas: overallRoas,
      aov: overallAov,
      estCommission: overallCommission,
      totalOrders: typeof summary.totalOrders === "number" ? summary.totalOrders : totalOrders,
    };

    return { ads, kpis };
  } catch (error) {
    console.error("Error fetching creator metrics:", error);
    throw error;
  }
}
