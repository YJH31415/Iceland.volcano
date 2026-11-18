export type Mode = "replay" | "lab";
export type RunStatus = "idle" | "loading" | "running" | "paused" | "complete" | "error";
export type Params = {
  emissionRateKgS: number;
  plumeHeightKm: number;
  start: string;
  end: string;
  minRadiusUm: number;
  maxRadiusUm: number;
  particleDensity: number;
  horizontalDiffusivity: number;
  verticalDiffusivity: number;
};
export type City = { name: string; lat: number; lon: number };
export type CityReading = City & { concentration: number; warning: string };
export type Snapshot = {
  time: string; activeCells: number; meanAltitudeKm: number; maxDistanceKm: number;
  areaKm2: number; maxAltitudeKm: number; totalMassKg: number;
  cities: Record<string, number>;
};