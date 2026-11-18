# YJH's Iceland Volcano Simulator

Next.js + TypeScript prototype for an Eulerian volcanic-ash dispersion research interface.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Current implementation

- Home screen with Replay and Experiment modes.
- Responsive dark research dashboard based on the supplied reference.
- MapLibre GL JS globe projection, Iceland source marker, and European city markers.
- Browser-side Eulerian mass-grid prototype with periodic longitude and pole reflection.
- Open-Meteo Archive API daily downloader with IndexedDB chunk caching; completed days are skipped on retry.
- 30-minute simulation snapshots, city concentration thresholds, charts, JSON export.
- Experiment parameters lock after starting.

## Scientific limitations — read before interpreting results

This repository is an application prototype, **not a validated atmospheric dispersion model**.

The current weather downloader requests surface / 10 m hourly variables at the volcano source location only. It does not create a 3-D, time-varying European wind field. The browser solver currently uses a neutral zero-wind placeholder so it does not misrepresent synthetic winds as observations. The simplified grid transport and diffusion are integration scaffolding, not a validated spherical finite-volume solver. The concentration display should not be used for aviation safety decisions.

For research-grade reconstruction, add a server-side data pipeline for ERA5 pressure-level GRIB/NetCDF data (u, v, vertical velocity, temperature, geopotential, humidity and precipitation), convert to chunked Zarr, build a spherical/cubed-sphere finite-volume solver with positivity and mass-conservation tests, and validate against satellite / lidar / VAAC observations. Add size-bin settling, drag, dry/wet deposition, aggregation, terrain masks, and uncertainty estimates. A single Open-Meteo surface request cannot supply the required 3-D field.

## Data source

Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api

Map tiles in this prototype use the public MapLibre demo style. For production deployment, select a tile provider and comply with its usage and attribution requirements.

## Deployment

Deploy as a standard Next.js application (Vercel, Node hosting, or Docker). Configure a production map style / tile provider before public launch.
