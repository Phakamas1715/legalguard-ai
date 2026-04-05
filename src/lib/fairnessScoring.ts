// CFS Fairness Scoring — Composite Fairness Score
// CFS = 0.3 × F_geo + 0.3 × F_court + 0.4 × F_time

import type { SearchResult } from "@/components/ResultCard";

interface FairnessBreakdown {
  cfs: number;
  fGeo: number;
  fCourt: number;
  fTime: number;
  label: string;
  color: string;
}

// Geographic fairness: penalizes over-concentration in Bangkok
function calcGeoFairness(results: SearchResult[]): number {
  if (results.length === 0) return 1;
  const provinces = results.map((r) => r.province || "ไม่ระบุ");
  const unique = new Set(provinces).size;
  const bkkCount = provinces.filter((p) => p === "กรุงเทพมหานคร" || p === "นนทบุรี" || p === "สมุทรปราการ").length;
  const bkkRatio = bkkCount / results.length;
  // Diversity bonus + Bangkok concentration penalty
  const diversity = Math.min(unique / Math.max(results.length * 0.5, 1), 1);
  return Math.min(diversity + (1 - bkkRatio) * 0.5, 1);
}

// Court-type fairness: penalizes single court type domination
function calcCourtFairness(results: SearchResult[]): number {
  if (results.length === 0) return 1;
  const types = results.map((r) => r.courtType);
  const counts: Record<string, number> = {};
  for (const t of types) counts[t] = (counts[t] || 0) + 1;
  const maxRatio = Math.max(...Object.values(counts)) / results.length;
  return 1 - (maxRatio - 0.25) * 0.5; // Slight penalty when one type > 25%
}

// Temporal fairness: ensures results aren't all from the same year range
function calcTimeFairness(results: SearchResult[]): number {
  if (results.length === 0) return 1;
  const years = results.map((r) => r.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const spread = maxYear - minYear;
  return Math.min(spread / 5, 1); // 5-year spread = perfect score
}

export function calculateCFS(results: SearchResult[]): FairnessBreakdown {
  const fGeo = calcGeoFairness(results);
  const fCourt = calcCourtFairness(results);
  const fTime = calcTimeFairness(results);
  const cfs = 0.3 * fGeo + 0.3 * fCourt + 0.4 * fTime;

  let label: string;
  let color: string;
  if (cfs >= 0.935) { label = "ยุติธรรมสูง"; color = "text-teal"; }
  else if (cfs >= 0.7) { label = "ยุติธรรมปานกลาง"; color = "text-accent-foreground"; }
  else { label = "ควรปรับปรุง"; color = "text-destructive"; }

  return { cfs: Math.round(cfs * 1000) / 1000, fGeo: Math.round(fGeo * 100) / 100, fCourt: Math.round(fCourt * 100) / 100, fTime: Math.round(fTime * 100) / 100, label, color };
}
