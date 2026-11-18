"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, BarChart3, CloudDownload, Download, Pause, Play, RotateCcw, SlidersHorizontal, Wind, X } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import Globe from "./Globe";
import { AshGrid, CITIES, DEFAULT_PARAMS, neutralWind, warningFor } from "@/lib/physics";
import { downloadHistoricalWeather } from "@/lib/weather";
import type { Mode, Params, RunStatus, Snapshot } from "@/lib/types";

export default function Simulator({mode,onHome}:{mode:Mode;onHome:()=>void}){
  const [params,setParams]=useState<Params>({...DEFAULT_PARAMS});
  const [status,setStatus]=useState<RunStatus>("idle");
  const [time,setTime]=useState(new Date("2010-04-14T00:00:00Z"));
  const [speed,setSpeed]=useState(10);
  const [showWind,setShowWind]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [showExport,setShowExport]=useState(false);
  const [weatherProgress,setWeatherProgress]=useState(0);
  const [weatherTotal,setWeatherTotal]=useState(0);
  const [weatherState,setWeatherState]=useState("미다운로드");
  const [snapshots,setSnapshots]=useState<Snapshot[]>([]);
  const [metrics,setMetrics]=useState<Snapshot|null>(null);
  const [data,setData]=useState<any>({type:"FeatureCollection",features:[]});
  const [error,setError]=useState("");
  const grid=useRef(new AshGrid()); const lastRecord=useRef(0); const timer=useRef<ReturnType<typeof setInterval>|null>(null); const aborter=useRef<AbortController|null>(null);
  const locked=status==="running"||status==="paused"||status==="complete";
  const dateLabel=time.toISOString().replace("T"," ").slice(0,16)+" UTC";
  const cities=useMemo(()=>CITIES.map(c=>({ ...c, concentration:metrics?.cities[c.name]??0, warning:warningFor(metrics?.cities[c.name]??0)})),[metrics]);
  const setParam=<K extends keyof Params>(key:K,value:Params[K])=>setParams(p=>({...p,[key]:value}));
  const reset=()=>{if(timer.current)clearInterval(timer.current);grid.current.reset();setTime(new Date("2010-04-14T00:00:00Z"));setStatus("idle");setSnapshots([]);setMetrics(null);setData({type:"FeatureCollection",features:[]});lastRecord.current=0;setError("");};
  const tick=useCallback(()=>{
    const dt=1800*speed; const nextTime=new Date(timeRef.current.getTime()+dt*1000);timeRef.current=nextTime;
    grid.current.step(params,dt,neutralWind);
    const iso=nextTime.toISOString();setTime(nextTime);setMetrics(grid.current.snapshot(iso));setData(grid.current.toGeoJSON());
    const elapsed=(nextTime.getTime()-new Date("2010-04-14T00:00:00Z").getTime())/1000;
    if(elapsed-lastRecord.current>=1800){const s=grid.current.snapshot(iso);setSnapshots(prev=>[...prev,s]);lastRecord.current=elapsed;}
    if(nextTime>=new Date(params.end)){setStatus("complete");if(timer.current)clearInterval(timer.current);}
  },[params]);
  const timeRef=useRef(time); useEffect(()=>{timeRef.current=time;},[time]);
  useEffect(()=>{if(status==="running"){timer.current=setInterval(tick,500);return()=>{if(timer.current)clearInterval(timer.current);};}return()=>{if(timer.current)clearInterval(timer.current);};},[status,tick]);
  const start=async()=>{
    if(status==="idle"){
      setStatus("loading");setError("");
      try{
        // Download a local historical weather cache before simulation. Data is currently
        // surface/10 m only; it is not substituted for the required 3-D pressure-level field.
        aborter.current=new AbortController();
        setWeatherState("다운로드 중");
        const result=await downloadHistoricalWeather("2010-04-14","2010-05-23",(d,t)=>{setWeatherProgress(d);setWeatherTotal(t);},aborter.current.signal);
        setWeatherState(`캐시 완료 · ${result.level}`);
        setStatus("running");
      }catch(e:any){if(e.name==="AbortError"){setStatus("idle");setWeatherState("일시 중단");}else{setError(e.message??"Weather download failed");setWeatherState("오류");setStatus("idle");}}
    }else if(status==="paused")setStatus("running");
    else if(status==="running")setStatus("paused");
  };
  const pauseDownload=()=>aborter.current?.abort();
  const exportData=(format:string)=>{
    const rows=snapshots.map(s=>({time:s.time,active_cells:s.activeCells,mean_altitude_km:s.meanAltitudeKm,max_distance_km:s.maxDistanceKm,area_km2:s.areaKm2,max_altitude_km:s.maxAltitudeKm,total_mass_kg:s.totalMassKg,...s.cities}));
    const blob=new Blob([JSON.stringify(rows,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="iceland-volcano-statistics.json";a.click();URL.revokeObjectURL(a.href);setShowExport(false);
    if(format!=="JSON")setError(format+" 내보내기는 다음 단계에서 활성화됩니다. 현재 JSON 내보내기를 제공합니다.");
  };
  const chartData=snapshots.map(s=>({time:s.time.slice(5,16),active:s.activeCells,altitude:s.meanAltitudeKm,area:s.areaKm2,...s.cities}));
  const stopLabel=status==="loading"?"기상 데이터 다운로드":status==="running"?"일시정지":status==="paused"?"재생":"재생";
  return <main className="sim-shell">
    <header className="topbar"><div className="top-brand"><span className="brand-mark"><Activity size={18}/></span><b>YJH'S ICELAND VOLCANO SIMULATOR</b></div><div className="top-actions"><span className="status-dot"/> EULERIAN GRID <button onClick={onHome}><ArrowLeft size={14}/> 홈으로</button></div></header>
    <div className="workspace">
      <aside className="control-panel">
        <div className="panel-title"><div><span className="section-kicker">CONTROL PANEL</span><h2>{mode==="lab"?"실험 모드":"재현 모드"}</h2></div>{mode==="lab"&&<span className="lab-badge">LAB</span>}</div>
        <section className="time-card"><span className="section-kicker">SIMULATION TIME · UTC</span><strong>{dateLabel}</strong><div className="progress-track"><i style={{width:`${Math.min(100,Math.max(0,(time.getTime()-new Date("2010-04-14").getTime())/(new Date(params.end).getTime()-new Date("2010-04-14").getTime())*100))}%`}}/></div></section>
        <section className="control-section"><span className="section-kicker">PLAYBACK</span><div className="play-row"><button className="primary-button" onClick={start} disabled={status==="loading"}>{status==="running"?<Pause size={16}/>:<Play size={16}/>} {stopLabel}</button><button className="square-button" onClick={reset} title="초기화"><RotateCcw size={17}/></button></div>
          {status==="loading"&&<div className="download-progress"><div><span>기상 자료 다운로드</span><b>{weatherProgress}/{weatherTotal||"…"}</b></div><div className="progress-track"><i style={{width:weatherTotal?`${weatherProgress/weatherTotal*100}%`:"4%"}}/></div><button onClick={pauseDownload}>다운로드 중단 (완료분 보존)</button></div>}
          <div className="speed-row">{[1,5,10,50,100,500].map(v=><button key={v} className={speed===v?"selected":""} onClick={()=>setSpeed(v)} disabled={locked}>×{v}</button>)}</div>
        </section>
        {mode==="lab"&&<section className="control-section parameter-section"><span className="section-kicker">EXPERIMENT PARAMETERS</span>
          <Param label="질량 분출률" value={params.emissionRateKgS} min={0} max={5000} step={10} unit="kg/s" disabled={locked} onChange={v=>setParam("emissionRateKgS",v)}/>
          <Param label="분화 기둥 높이" value={params.plumeHeightKm} min={1} max={15} step={.5} unit="km" disabled={locked} onChange={v=>setParam("plumeHeightKm",v)}/>
          <Param label="난류 확산 계수" value={params.horizontalDiffusivity} min={0} max={10000} step={100} unit="m²/s" disabled={locked} onChange={v=>setParam("horizontalDiffusivity",v)}/>
          <Param label="수직 확산 계수" value={params.verticalDiffusivity} min={0} max={500} step={5} unit="m²/s" disabled={locked} onChange={v=>setParam("verticalDiffusivity",v)}/>
          <Param label="최소 입자 반경" value={params.minRadiusUm} min={1} max={100} step={1} unit="μm" disabled={locked} onChange={v=>setParam("minRadiusUm",v)}/>
          <Param label="최대 입자 반경" value={params.maxRadiusUm} min={10} max={1000} step={10} unit="μm" disabled={locked} onChange={v=>setParam("maxRadiusUm",v)}/>
          <p className="parameter-note">실험 변수는 실행 전에만 변경할 수 있습니다. 분출 기둥 높이와 입자 크기는 현재 프로토타입 소스항 및 침강 근사에만 연결되어 있습니다.</p>
        </section>}
        <section className="control-section metrics-section"><span className="section-kicker">EULERIAN GRID METRICS</span><div className="metric-grid">
          <Metric label="활성 격자 수" value={(metrics?.activeCells??0).toLocaleString()} unit="cells"/>
          <Metric label="대기 중 질량" value={(metrics?.totalMassKg??0).toFixed(1)} unit="t" convert={1000}/>
          <Metric label="최대 고도" value={(metrics?.maxAltitudeKm??0).toFixed(2)} unit="km"/>
          <Metric label="확산 면적" value={(metrics?.areaKm2??0).toFixed(0)} unit="km²"/>
        </div></section>
        <section className="control-section city-section"><div className="section-heading"><span className="section-kicker">CITY GROUND CONCENTRATION</span><button className={showWind?"toggle-on":"toggle-off"} onClick={()=>setShowWind(v=>!v)}><Wind size={13}/> 바람</button></div>
          {cities.map(c=><div className="city-row" key={c.name}><div className="city-main"><b>{c.name}</b><span>{c.concentration.toFixed(3)} <small>mg/m³</small></span><em className={c.concentration>=10?"danger":c.concentration>=2?"warning":""}>{c.warning}</em></div><small className="city-sub">지상 기준 농도 · 경보는 고도와 무관</small></div>)}
          <button className="stats-button" onClick={()=>setShowStats(true)}><BarChart3 size={15}/> 통계 보기</button>
        </section>
        <div className="panel-foot"><span>WEATHER: {weatherState}</span><span>MODEL: PROTOTYPE</span></div>
        {error&&<div className="error-box"><AlertTriangle size={14}/>{error}<button onClick={()=>setError("")}><X size={12}/></button></div>}
      </aside>
      <section className="map-panel"><Globe data={data} showWind={showWind}/><div className="map-bottomline"><span><Activity size={13}/> ENGINE: EULERIAN MASS GRID</span><span>GLOBAL GRID · 50 KM CLASS</span></div></section>
    </div>
    {showStats&&<div className="modal-backdrop" onClick={()=>setShowStats(false)}><section className="stats-modal" onClick={e=>e.stopPropagation()}><header><div><span className="section-kicker">SIMULATION ANALYTICS</span><h2>시간별 통계</h2></div><button onClick={()=>setShowStats(false)}><X/></button></header>
      <div className="chart-grid"><Chart title="활성 격자 수" data={chartData} dataKey="active"/><Chart title="평균 고도 (km)" data={chartData} dataKey="altitude"/><Chart title="확산 면적 (km²)" data={chartData} dataKey="area"/><Chart title="도시별 지상 농도 (mg/m³)" data={chartData} dataKeys={["런던","파리","프랑크푸르트","오슬로","스톡홀름"]}/></div>
      <div className="modal-actions"><span>시뮬레이션 내부 시간 30분 간격 · {snapshots.length}개 기록</span><button className="primary-button" onClick={()=>setShowExport(true)}><Download size={15}/> 데이터 다운로드</button></div>
    </section></div>}
    {showExport&&<div className="modal-backdrop" onClick={()=>setShowExport(false)}><section className="export-modal" onClick={e=>e.stopPropagation()}><header><h3>내보낼 파일 형식</h3><button onClick={()=>setShowExport(false)}><X/></button></header>{["JSON","PDF","Excel (XLSX)","PNG"].map(f=><button key={f} onClick={()=>exportData(f)}>{f}</button>)}</section></div>}
  </main>;
}
function Param({label,value,min,max,step,unit,disabled,onChange}:{label:string;value:number;min:number;max:number;step:number;unit:string;disabled:boolean;onChange:(v:number)=>void}){
  return <div className="param-control"><div><label>{label}</label><b>{value.toLocaleString()} <small>{unit}</small></b></div><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/><input className="number-input" type="number" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value))))}/></div>;
}
function Metric({label,value,unit,convert=1}:{label:string;value:string;unit:string;convert?:number}){
  return <div className="metric-card"><span>{label}</span><strong>{(Number(value.replaceAll(",",""))/convert).toLocaleString(undefined,{maximumFractionDigits:1})}</strong><small>{unit}</small></div>;
}
function Chart({title,data,dataKey,dataKeys}:{title:string;data:any[];dataKey?:string;dataKeys?:string[]}){
  return <div className="chart-card"><b>{title}</b><ResponsiveContainer width="100%" height={190}><LineChart data={data}><CartesianGrid stroke="#203849" strokeDasharray="3 3"/><XAxis dataKey="time" tick={{fill:"#8198a8",fontSize:9}}/><YAxis tick={{fill:"#8198a8",fontSize:9}}/><Tooltip contentStyle={{background:"#102334",border:"1px solid #294458",fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/>{(dataKeys??[dataKey!]).map((k,i)=><Line key={k} type="monotone" dataKey={k} dot={false} stroke={["#f3a05e","#7bd6f4","#b7a0f5","#9bd6a8","#f1d27a"][i]} strokeWidth={2}/>)}</LineChart></ResponsiveContainer></div>;
}
