"use client";

import { useState } from "react";
import { Flame, Globe2, SlidersHorizontal, ArrowUpRight, Activity, ShieldCheck } from "lucide-react";
import Simulator from "@/components/Simulator";

export default function Home() {
  const [mode, setMode] = useState<"home" | "replay" | "lab">("home");
  if (mode !== "home") return <Simulator mode={mode} onHome={() => setMode("home")} />;

  return <main className="home-shell">
    <div className="grid-bg" />
    <header className="brand"><span className="brand-mark"><Flame size={21}/></span><span>YJH / RESEARCH LAB</span></header>
    <div className="hero-orbit" />
    <section className="home-content">
      <div className="eyebrow"><i /> EULERIAN DISPERSION MODEL · 2010</div>
      <h1>YJH's Iceland<br/><em>Volcano Simulator</em></h1>
      <p className="hero-copy">에이야프얄라요쿨 화산재의 3차원 농도장 확산 시뮬레이터</p>
      <div className="mode-grid">
        <button className="mode-card" onClick={() => setMode("replay")}>
          <span className="card-icon"><Globe2 size={25}/></span>
          <strong>재현 모드</strong>
          <small>2010년 분화 사건의 시간 흐름을 재생</small>
          <b>시뮬레이션 열기 <ArrowUpRight size={14}/></b>
        </button>
        <button className="mode-card" onClick={() => setMode("lab")}>
          <span className="card-icon"><SlidersHorizontal size={25}/></span>
          <strong>실험 모드</strong>
          <small>분출 조건과 대기 확산 변수를 조정</small>
          <b>실험실 열기 <ArrowUpRight size={14}/></b>
        </button>
      </div>
    </section>
    <footer className="home-footer"><span>MODEL STATUS: PROTOTYPE</span><span><Activity size={12}/> NUMERICAL VALIDATION REQUIRED</span></footer>
  </main>;
}