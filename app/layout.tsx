import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "YJH's Iceland Volcano Simulator",
  description: "Eulerian volcanic ash dispersion research simulator for the 2010 Eyjafjallajökull eruption."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}