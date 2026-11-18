export type WeatherHour = { time:string; wind_speed_10m?:number; wind_direction_10m?:number; temperature_2m?:number; surface_pressure?:number; relative_humidity_2m?:number; precipitation?:number };
const DB_NAME="yjhiceland-weather"; const STORE="hourly";
function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"key"});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function saveChunk(key:string,data:WeatherHour[]){
  const db=await openDb(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put({key,data,savedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
async function hasChunk(key:string){const db=await openDb();return new Promise<boolean>((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>resolve(!!r.result);r.onerror=()=>reject(r.error);});}
export async function downloadHistoricalWeather(start:string,end:string,onProgress:(done:number,total:number)=>void,signal?:AbortSignal){
  const s=new Date(start),e=new Date(end); const days=Math.ceil((e.getTime()-s.getTime())/86400000)+1;let done=0;
  for(let i=0;i<days;i++){
    if(signal?.aborted)throw new DOMException("Download paused","AbortError");
    const d=new Date(s.getTime()+i*86400000), day=d.toISOString().slice(0,10), key=day;
    if(await hasChunk(key)){done++;onProgress(done,days);continue;}
    const url=new URL("https://archive-api.open-meteo.com/v1/archive");
    url.searchParams.set("latitude","63.63");url.searchParams.set("longitude","-19.62");
    url.searchParams.set("start_date",day);url.searchParams.set("end_date",day);
    url.searchParams.set("hourly","temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m");
    url.searchParams.set("timezone","UTC");
    const res=await fetch(url,{signal});if(!res.ok)throw new Error(`Open-Meteo HTTP ${res.status} on ${day}`);
    const json=await res.json();const h=json.hourly;
    if(!h?.time)throw new Error(`No hourly weather returned for ${day}`);
    const rows:WeatherHour[]=h.time.map((time:string,j:number)=>({time,temperature_2m:h.temperature_2m?.[j],relative_humidity_2m:h.relative_humidity_2m?.[j],precipitation:h.precipitation?.[j],surface_pressure:h.surface_pressure?.[j],wind_speed_10m:h.wind_speed_10m?.[j],wind_direction_10m:h.wind_direction_10m?.[j]}));
    await saveChunk(key,rows);done++;onProgress(done,days);
  }
  return {days:done,source:"Open-Meteo Historical Weather API",level:"10 m / surface only"};
}
