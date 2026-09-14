import { normalizeCreatorCode, extractCreatorName } from "../src/utils/creator.js";
import Papa from "papaparse";

interface NorthbeamBreakdownItem {
  key?: string;
  name?: string;
  label?: string;
  values?: string[];
  options?: string[];
  items?: string[];
}

// In-memory breakdowns cache (5 min TTL)
let breakdownsCache: {
  codeSet: string[];
  adNames: string[];
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCreatorsList(): Promise<{ creators: string[]; adNames: string[] }> {
  // Check in-memory cache
  if (breakdownsCache && Date.now() - breakdownsCache.timestamp < CACHE_TTL_MS) {
    return { creators: breakdownsCache.codeSet, adNames: breakdownsCache.adNames };
  }

  const apiKey = process.env.NORTHBEAM_API_KEY;
  const clientId = process.env.NORTHBEAM_CLIENT_ID;

  if (!apiKey || !clientId) {
    throw new Error("NORTHBEAM_API_KEY and NORTHBEAM_CLIENT_ID must be configured");
  }

  const headers = {
    "Authorization": apiKey,
    "Data-Client-ID": clientId,
    "Content-Type": "application/json",
  };

  const response = await fetch("https://api.northbeam.io/v1/exports/breakdowns", {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Northbeam breakdowns API returned HTTP ${response.status}: ${errText}`);
  }

  const data: any = await response.json();
  const breakdownsList: NorthbeamBreakdownItem[] =
    data?.breakdowns || data?.results || data?.data || [];

  // Find breakdown where key or name is "Ad Consolidation"
  const adConsolidationObj = breakdownsList.find(
    (b) =>
      b.key === "Ad Consolidation" ||
      b.name === "Ad Consolidation" ||
      b.label === "Ad Consolidation"
  );

  const adNames: string[] =
    adConsolidationObj?.values ||
    adConsolidationObj?.options ||
    adConsolidationObj?.items ||
    [];

  if (adNames.length === 0) {
    throw new Error("No ad names returned in Northbeam Ad Consolidation breakdown");
  }

  const codeSet = new Set<string>();
  adNames.forEach((adName) => {
    const normalized = normalizeCreatorCode(adName);
    if (normalized && normalized.startsWith("CR-")) {
      codeSet.add(normalized);
    }
  });

  const extractedCodes = Array.from(codeSet);
  console.log(
    `[Validation] Extracted ${extractedCodes.length} unique creator codes from Northbeam breakdowns ("Ad Consolidation")`
  );

  breakdownsCache = {
    codeSet: extractedCodes,
    adNames,
    timestamp: Date.now(),
  };

  return { creators: extractedCodes, adNames };
}

const metricsCache = new Map<string, { timestamp: number; data: any }>();
const metricsInflight = new Map<string, Promise<any>>();
const METRICS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function getMetrics(creatorCode: string, dateRange: string) {
  const normalizedTargetCode = normalizeCreatorCode(creatorCode);
  if (!normalizedTargetCode) {
    throw new Error("A valid creator code is required");
  }
  const cacheKey = `${normalizedTargetCode}_${dateRange}`;

  // Check cache
  const cached = metricsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < METRICS_CACHE_TTL_MS) {
    console.log(`[Northbeam Cache] Returning cached metrics for key: ${cacheKey}`);
    return cached.data;
  }

  // Deduplicate in-flight requests
  if (metricsInflight.has(cacheKey)) {
    console.log(`[Northbeam Inflight] Reusing existing promise for key: ${cacheKey}`);
    return metricsInflight.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const data = await fetchMetricsFromNorthbeam(normalizedTargetCode, dateRange);
      metricsCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch (err: any) {
      console.error(`[Northbeam Error] Failed fetching live export for ${normalizedTargetCode} (${dateRange}):`, err?.message || err);
      // If we have previous cached data for this creator and range, serve it gracefully
      const staleCached = metricsCache.get(cacheKey);
      if (staleCached?.data) {
        console.log(`[Northbeam Fallback] Serving cached metrics for ${cacheKey} after export timeout`);
        return staleCached.data;
      }
      throw err;
    } finally {
      metricsInflight.delete(cacheKey);
    }
  })();

  metricsInflight.set(cacheKey, promise);
  return promise;
}

async function fetchMetricsFromNorthbeam(normalizedTargetCode: string, dateRange: string) {
  const apiKey = process.env.NORTHBEAM_API_KEY;
  const clientId = process.env.NORTHBEAM_CLIENT_ID;

  if (!apiKey || !clientId) {
    throw new Error("NORTHBEAM_API_KEY and NORTHBEAM_CLIENT_ID must be configured");
  }

  // 1. Obtain breakdown list of ad names matching this creator's code
  const { adNames } = await getCreatorsList();
  const matchingAdNames = Array.from(
    new Set(
      adNames.filter(
        (name) => normalizeCreatorCode(name) === normalizedTargetCode
      )
    )
  );

  console.log(
    `[Northbeam Export] Creator: ${normalizedTargetCode} | Range: ${dateRange} | Found ${matchingAdNames.length} matching ad names in breakdown`
  );

  const periodMap: Record<string, string> = {
    "7d": "LAST_7_DAYS",
    "14d": "LAST_14_DAYS",
    "30d": "LAST_30_DAYS",
    "90d": "LAST_90_DAYS",
  };

  const windowMap: Record<string, string> = {
    "7d": "7",
    "14d": "14",
    "30d": "30",
    "90d": "90",
  };

  const periodType = periodMap[dateRange] || "LAST_7_DAYS";
  const targetWindow = windowMap[dateRange] || "7";

  // If there are no matching ad names in the breakdown for this creator, return zero metrics
  if (matchingAdNames.length === 0) {
    console.log(`[Northbeam Export] No ads found in Ad Consolidation breakdown for creator ${normalizedTargetCode}`);
    return {
      dateRange,
      creatorCode: normalizedTargetCode,
      ads: [],
      summary: {
        totalSpend: 0,
        totalRev: 0,
        overallRoas: 0,
        totalOrders: 0,
        overallAov: 0,
      },
    };
  }

  // STEP 1 — Create Export Job
  const exportPayload = {
    export_file_name: `creator_${normalizedTargetCode.toLowerCase()}_${dateRange}_${Date.now()}`,
    level: "ad",
    time_granularity: "DAILY",
    period_type: periodType,
    breakdowns: [
      {
        key: "Ad Consolidation",
        values: matchingAdNames,
      },
    ],
    attribution_options: {
      attribution_models: ["last_touch"],
      attribution_windows: Array.from(new Set([targetWindow, "7"])),
      accounting_modes: ["accrual"],
    },
    metrics: [
      { id: "spend" },
      { id: "rev" },
      { id: "roas" },
      { id: "txns" },
      { id: "aov" },
    ],
  };

  console.log("[Northbeam STEP 1] Creating Export Job with payload:", JSON.stringify(exportPayload, null, 2));

  const exportRes = await fetch("https://api.northbeam.io/v1/exports/data-export", {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Data-Client-ID": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(exportPayload),
  });

  if (!exportRes.ok) {
    const errText = await exportRes.text();
    console.error(`[Northbeam STEP 1 ERROR] HTTP ${exportRes.status}:`, errText);
    throw new Error(`Northbeam export creation failed: HTTP ${exportRes.status} - ${errText}`);
  }

  const exportData: any = await exportRes.json();
  const exportId = exportData.id;

  if (!exportId) {
    throw new Error(`Northbeam export response missing ID: ${JSON.stringify(exportData)}`);
  }

  console.log(`[Northbeam STEP 1 SUCCESS] Saved Export ID: ${exportId}`);

  // STEP 2 — Poll for Result with 75s safety timeout
  console.log(`[Northbeam STEP 2] Polling result for export ID ${exportId}...`);
  let resultData: any = null;
  let pollSuccess = false;
  const pollStartTime = Date.now();
  const MAX_POLL_MS = 75000;

  for (let attempt = 1; attempt <= 45; attempt++) {
    if (Date.now() - pollStartTime > MAX_POLL_MS) {
      console.warn(`[Northbeam STEP 2] Polling reached safety timeout threshold of 75s for export ID ${exportId}`);
      break;
    }

    const delay = attempt <= 10 ? 1500 : 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const pollRes = await fetch(`https://api.northbeam.io/v1/exports/data-export/result/${exportId}`, {
        method: "GET",
        headers: {
          "Authorization": apiKey,
          "Data-Client-ID": clientId,
        },
      });

      if (pollRes.ok) {
        resultData = await pollRes.json();
        console.log(`[Northbeam STEP 2 Poll ${attempt}/45] Status: ${resultData?.status}`);

        if (resultData?.status === "SUCCESS" || (Array.isArray(resultData?.result) && resultData.result.length > 0)) {
          pollSuccess = true;
          break;
        }

        if (resultData?.status === "FAILED") {
          throw new Error(`Northbeam export job status: FAILED`);
        }
      } else {
        console.warn(`[Northbeam STEP 2 Poll ${attempt}/45] HTTP ${pollRes.status}`);
      }
    } catch (pollErr: any) {
      if (pollErr?.message?.includes("FAILED")) throw pollErr;
      console.warn(`[Northbeam STEP 2 Poll ${attempt}/45] Network warn:`, pollErr?.message || pollErr);
    }
  }

  if (!pollSuccess || !resultData || !Array.isArray(resultData.result) || resultData.result.length === 0) {
    throw new Error(`Northbeam is taking longer than usual to respond, please try again`);
  }

  const csvUrl = resultData.result[0];
  console.log(`[Northbeam STEP 2 SUCCESS] CSV Signed URL: ${csvUrl}`);

  // STEP 3 — Fetch and Parse CSV
  console.log(`[Northbeam STEP 3] Downloading CSV directly...`);
  const csvRes = await fetch(csvUrl);
  if (!csvRes.ok) {
    throw new Error(`Failed to download CSV from signed URL: HTTP ${csvRes.status}`);
  }

  const csvText = await csvRes.text();

  console.log("=== STEP 5: RAW CSV ROWS FETCHED ===");
  console.log(csvText);

  const parsedCsv = Papa.parse<any>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rawRows = parsedCsv.data || [];
  console.log(`[Northbeam STEP 3 SUCCESS] Parsed ${rawRows.length} CSV rows`);

  // STEP 4 — Aggregate Rows
  console.log(`[Northbeam STEP 4] Filtering rows strictly for accounting_mode="Accrual performance" and attribution_window="${targetWindow}"...`);

  // Strictly filter out any non-accrual rows, cash snapshot rows, and lifetime window rows
  const accrualRows = rawRows.filter((row: any) => {
    const windowStr = String(row.attribution_window || "").trim();
    const modeStr = String(row.accounting_mode || "").trim().toLowerCase();
    return modeStr.includes("accrual") && !modeStr.includes("cash") && windowStr !== "lifetime";
  });

  // Check if any row matches targetWindow exactly
  const hasExactTargetWindow = accrualRows.some(
    (row: any) => String(row.attribution_window || "").trim() === targetWindow
  );

  const windowToUse = hasExactTargetWindow ? targetWindow : "7";

  const filteredRows = accrualRows.filter(
    (row: any) => String(row.attribution_window || "").trim() === windowToUse
  );

  console.log(`[Northbeam STEP 4] ${filteredRows.length} Accrual performance rows selected (window "${windowToUse}")`);

  if (filteredRows.length === 0) {
    return {
      dateRange,
      creatorCode: normalizedTargetCode,
      ads: [],
      summary: {
        totalSpend: 0,
        totalRev: 0,
        overallRoas: 0,
        totalOrders: 0,
        overallAov: 0,
      },
    };
  }

  // Group rows by ad_name
  interface AdRowData {
    campaign: string;
    spend: number;
    rev: number;
    txns: number;
    aov: number;
    rawAov: string;
  }

  const adGroupMap = new Map<
    string,
    {
      adName: string;
      platform: string;
      spend: number;
      rev: number;
      txns: number;
      status: string;
      imageUrl?: string;
      videoUrl?: string;
      rows: AdRowData[];
    }
  >();

  for (const row of filteredRows) {
    const adName = (row.ad_name || row.breakdown_ad_consolidation || "Ad Campaign").trim();

    // 1. Raw cell extraction and diagnostic logging
    const rawRevStr = row.rev !== undefined && row.rev !== null ? String(row.rev).trim() : "";
    const rawRoasStr = row.roas !== undefined && row.roas !== null ? String(row.roas).trim() : "";
    const rawSpendStr = row.spend !== undefined && row.spend !== null ? String(row.spend).trim() : "";
    const rawTxnsStr = String(row.transactions || row.txns || row.orders || "").trim();
    const rawAovStr = row.aov !== undefined && row.aov !== null ? String(row.aov).trim() : "";

    const rowSpend = parseFloat(rawSpendStr) || 0;
    const rowRoasVal = parseFloat(rawRoasStr) || 0;
    const rowTxns = parseFloat(rawTxnsStr) || 0;
    const rowAov = parseFloat(rawAovStr) || 0;

    console.log(
      `[RAW ROW CELL VALUES] ad: "${adName}" | campaign: "${row.campaign_name || ''}" | raw_aov: "${rawAovStr}" (parsed aov: ${rowAov}) | raw_txns: "${rawTxnsStr}" (parsed txns: ${rowTxns}) | raw_spend: "${rawSpendStr}" | raw_rev: "${rawRevStr}" | raw_roas: "${rawRoasStr}"`
    );

    let rowRev = 0;
    let revDerivationMethod = "zero";

    if (rawRevStr !== "") {
      rowRev = parseFloat(rawRevStr) || 0;
      revDerivationMethod = "raw_rev";
    } else if (rawRoasStr !== "" && rowSpend > 0) {
      rowRev = rowSpend * rowRoasVal;
      revDerivationMethod = `roas_times_spend (${rowRoasVal} * ${rowSpend})`;
    } else if (rowAov > 0 && rowTxns > 0) {
      rowRev = rowAov * rowTxns;
      revDerivationMethod = `aov_times_txns (${rowAov} * ${rowTxns})`;
    } else {
      rowRev = 0;
      revDerivationMethod = "missing_data_zero";
    }

    console.log(
      `[DERIVED ROW VALUES] ad: "${adName}" -> spend: $${rowSpend.toFixed(2)}, rev: $${rowRev.toFixed(4)} (${revDerivationMethod}), roas: ${(rowSpend > 0 ? rowRev / rowSpend : 0).toFixed(4)}, txns: ${rowTxns.toFixed(4)}, native_aov: $${rowAov.toFixed(2)}`
    );

    const platform = (row.platform || row.channel_name || row.channel || "").toLowerCase();
    const resolvedChannel = platform.includes("tiktok") ? "tiktok-ads" : "facebook-ads";

    if (!adGroupMap.has(adName)) {
      adGroupMap.set(adName, {
        adName,
        platform: resolvedChannel,
        spend: 0,
        rev: 0,
        txns: 0,
        status: row.status || "Active",
        imageUrl: row.image_url || row.thumbnail_url || row.ad_image_url || undefined,
        videoUrl: row.video_url || undefined,
        rows: [],
      });
    }

    const group = adGroupMap.get(adName)!;
    group.spend += rowSpend;
    group.rev += rowRev;
    group.txns += rowTxns;
    if (!group.imageUrl && (row.image_url || row.thumbnail_url || row.ad_image_url)) {
      group.imageUrl = row.image_url || row.thumbnail_url || row.ad_image_url;
    }
    if (!group.videoUrl && row.video_url) {
      group.videoUrl = row.video_url;
    }
    group.rows.push({
      campaign: row.campaign_name || "",
      spend: rowSpend,
      rev: rowRev,
      txns: rowTxns,
      aov: rowAov,
      rawAov: rawAovStr,
    });
  }

  const aggregatedAds = Array.from(adGroupMap.values()).map((g, idx) => {
    const spend = Number(g.spend.toFixed(2));
    const convValue = Number(g.rev.toFixed(2));
    const roas = g.spend > 0 ? Number((g.rev / g.spend).toFixed(2)) : (spend > 0 ? Number((convValue / spend).toFixed(2)) : 0);
    const rawOrders = g.txns;
    const orders = rawOrders > 0 ? Number(rawOrders.toFixed(2)) : 0;

    let calculatedAov = 0;
    if (g.rows.length === 1) {
      calculatedAov = g.rows[0].aov;
    } else if (g.rows.length > 1) {
      const sumWeightedAov = g.rows.reduce((sum, r) => sum + r.aov * r.txns, 0);
      const sumTxns = g.rows.reduce((sum, r) => sum + r.txns, 0);

      if (sumTxns > 0.000001) {
        calculatedAov = sumWeightedAov / sumTxns;
      } else {
        calculatedAov = 0;
      }
    }
    const aov = Number(calculatedAov.toFixed(2));

    return {
      adId: `nb_${normalizedTargetCode.toLowerCase()}_${idx + 1}`,
      adName: g.adName,
      channel: g.platform || (idx % 2 === 0 ? "facebook-ads" : "tiktok-ads"),
      spend,
      convValue,
      roas,
      orders,
      aov,
      adImageUrl: g.imageUrl,
      videoUrl: g.videoUrl,
    };
  });

  const totalSpend = Number(aggregatedAds.reduce((acc, a) => acc + a.spend, 0).toFixed(2));
  const totalRev = Number(aggregatedAds.reduce((acc, a) => acc + a.convValue, 0).toFixed(2));
  const totalOrders = Number(aggregatedAds.reduce((acc, a) => acc + (a.orders || 0), 0).toFixed(2));
  const overallRoas = totalSpend > 0 ? Number((totalRev / totalSpend).toFixed(2)) : 0;

  let overallAov = 0;
  if (aggregatedAds.length === 1) {
    overallAov = aggregatedAds[0].aov;
  } else {
    let allWeightedAovSum = 0;
    let allTxnsSum = 0;
    for (const group of adGroupMap.values()) {
      for (const r of group.rows) {
        allWeightedAovSum += r.aov * r.txns;
        allTxnsSum += r.txns;
      }
    }

    if (allTxnsSum > 0.000001) {
      overallAov = Number((allWeightedAovSum / allTxnsSum).toFixed(2));
    } else {
      overallAov = 0;
    }
  }

  console.log("=== STEP 5: FINAL AGGREGATED NUMBERS ===");
  console.log({
    creatorCode: normalizedTargetCode,
    dateRange,
    totalSpend,
    totalRev,
    overallRoas,
    totalOrders,
    overallAov,
    adsCount: aggregatedAds.length,
    ads: aggregatedAds,
  });

  return {
    dateRange,
    creatorCode: normalizedTargetCode,
    ads: aggregatedAds,
    summary: {
      totalSpend,
      totalRev,
      overallRoas,
      totalOrders,
      overallAov,
    },
  };
}
