import type { Params, Snapshot } from "./types";

export const EARTH_RADIUS_M = 6371008.8;
export const CITIES = [
  { name: "런던", lat: 51.5072, lon: -0.1276 },
  { name: "파리", lat: 48.8566, lon: 2.3522 },
  { name: "프랑크푸르트", lat: 50.1109, lon: 8.6821 },
  { name: "오슬로", lat: 59.9139, lon: 10.7522 },
  { name: "스톡홀름", lat: 59.3293, lon: 18.0686 }
];
export const DEFAULT_PARAMS: Params = {
  emissionRateKgS: 850, plumeHeightKm: 8, start: "2010-04-14T00:00",
  end: "2010-05-22T00:00", minRadiusUm: 2, maxRadiusUm: 250,
  particleDensity: 2300, horizontalDiffusivity: 1200, verticalDiffusivity: 20
};
export function warningFor(c: number) {
  if (c >= 10) return "매우 높음";
  if (c >= 5) return "높음";
  if (c >= 2) return "중간";
  if (c >= 0.2) return "낮음";
  return "매우 낮음";
}
export function haversineKm(lat1:number, lon1:number, lat2:number, lon2:number) {
  const r = Math.PI / 180, p1=lat1*r, p2=lat2*r, dp=(lat2-lat1)*r, dl=(lon2-lon1)*r;
  const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*EARTH_RADIUS_M/1000*Math.asin(Math.sqrt(Math.min(1,a)));
}

/**
 * Conservative finite-volume-inspired Eulerian prototype.
 * State is mass per cell, not a collection of rendered particles.
 * This simplified browser solver is for interface/integration testing only:
 * it does NOT claim research-grade meteorological fidelity.
 */
export class AshGrid {
  readonly nLat=36; readonly nLon=72; readonly nZ=8;
  readonly dLat=180/this.nLat; readonly dLon=360/this.nLon; readonly dz=1500;
  mass = new Float32Array(this.nLat*this.nLon*this.nZ);
  elapsed=0; emittedKg=0; depositedKg=0;
  private idx(z:number,y:number,x:number){return z*this.nLat*this.nLon+y*this.nLon+x;}
  reset(){this.mass.fill(0);this.elapsed=0;this.emittedKg=0;this.depositedKg=0;}
  inject(params:Params, dt:number) {
    const y=Math.floor((63.6+90)/this.dLat), x=Math.floor((-19.6+180)/this.dLon);
    const z=Math.min(this.nZ-1,Math.floor(params.plumeHeightKm*1000/this.dz));
    const amount=params.emissionRateKgS*dt;
    this.mass[this.idx(z,y,x)] += amount;
    this.emittedKg += amount;
  }
  step(params:Params, dt:number, wind:(lat:number,lon:number,alt:number)=>{u:number;v:number;w:number}) {
    this.inject(params,dt);
    const next=new Float32Array(this.mass.length);
    const dx=EARTH_RADIUS_M*Math.PI/180*this.dLon;
    for(let z=0;z<this.nZ;z++) for(let y=0;y<this.nLat;y++) for(let x=0;x<this.nLon;x++){
      const i=this.idx(z,y,x), m=this.mass[i]; if(m<=0) continue;
      const lat=-90+(y+.5)*this.dLat, lon=-180+(x+.5)*this.dLon, alt=(z+.5)*this.dz;
      const wv=wind(lat,lon,alt);
      const east=wv.u*dt/(Math.max(.08,Math.cos(lat*Math.PI/180))*dx);
      const north=wv.v*dt/(EARTH_RADIUS_M*Math.PI/180*this.dLat);
      const down=Math.max(0,(-wv.w+Math.max(.05,Math.min(8,Math.pow(params.maxRadiusUm/100,2)*.8)))*dt/this.dz);
      const tx=Math.round(x+east), tyRaw=Math.round(y+north), tz=Math.max(0,Math.min(this.nZ-1,Math.round(z-down)));
      // Periodic longitude and pole reflection preserve global spherical continuity.
      const ty=tyRaw<0?Math.min(this.nLat-1,-tyRaw-1):tyRaw>=this.nLat?Math.max(0,2*this.nLat-tyRaw-1):tyRaw;
      const txWrapped=((tx%this.nLon)+this.nLon)%this.nLon;
      next[this.idx(tz,Math.min(this.nLat-1,ty),txWrapped)] += m;
    }
    // Simple mass-conserving nearest-neighbour horizontal mixing. Production model
    // should replace this with a stable spherical finite-volume diffusion operator.
    const mix=Math.min(.12,params.horizontalDiffusivity*dt/(dx*dx));
    if(mix>0) for(let z=0;z<this.nZ;z++) for(let y=0;y<this.nLat;y++) for(let x=0;x<this.nLon;x++){
      const i=this.idx(z,y,x), m=next[i]; if(!m) continue;
      const share=m*mix*.25; next[i]-=share*4;
      next[this.idx(z,y,(x+1)%this.nLon)]+=share;
      next[this.idx(z,y,(x+this.nLon-1)%this.nLon)]+=share;
      next[this.idx(z,Math.max(0,y-1),x)]+=share;
      next[this.idx(z,Math.min(this.nLat-1,y+1),x)]+=share;
    }
    this.mass=next; this.elapsed+=dt;
  }
  concentrationAt(lat:number,lon:number,altM=1500) {
    const y=Math.max(0,Math.min(this.nLat-1,Math.floor((lat+90)/this.dLat)));
    const x=((Math.floor((lon+180)/this.dLon)%this.nLon)+this.nLon)%this.nLon;
    const z=Math.max(0,Math.min(this.nZ-1,Math.floor(altM/this.dz)));
    const cellArea=EARTH_RADIUS_M**2*(this.dLat*Math.PI/180)*(this.dLon*Math.PI/180)*Math.max(.01,Math.cos(lat*Math.PI/180));
    return this.mass[this.idx(z,y,x)]/Math.max(1,cellArea*this.dz)*1e6;
  }
  snapshot(time:string):Snapshot {
    let active=0,total=0,weightedZ=0,maxZ=0;
    for(let z=0;z<this.nZ;z++)for(let y=0;y<this.nLat;y++)for(let x=0;x<this.nLon;x++){
      const m=this.mass[this.idx(z,y,x)]; if(m>1e-6){active++;total+=m;weightedZ+=m*(z+.5)*this.dz;maxZ=Math.max(maxZ,(z+1)*this.dz);}
    }
    const cities:Record<string,number>={};
    for(const c of CITIES)cities[c.name]=this.concentrationAt(c.lat,c.lon);
    return {time,activeCells:active,meanAltitudeKm:total?weightedZ/total/1000:0,maxDistanceKm:0,areaKm2:active*(this.dLat*Math.PI/180*EARTH_RADIUS_M/1000)*(this.dLon*Math.PI/180*EARTH_RADIUS_M/1000),maxAltitudeKm:maxZ/1000,totalMassKg:total,cities};
  }
  toGeoJSON(){
    const features:any[]=[];
    for(let z=0;z<this.nZ;z++)for(let y=0;y<this.nLat;y++)for(let x=0;x<this.nLon;x++){
      const m=this.mass[this.idx(z,y,x)]; if(m<=1e-5)continue;
      const lat=-90+(y+.5)*this.dLat,lon=-180+(x+.5)*this.dLon;
      const area=EARTH_RADIUS_M**2*(this.dLat*Math.PI/180)*(this.dLon*Math.PI/180)*Math.max(.01,Math.cos(lat*Math.PI/180));
      const c=m/(area*this.dz)*1e6;
      if(c>.00001)features.push({type:"Feature",geometry:{type:"Point",coordinates:[lon,lat]},properties:{concentration:c,altitudeKm:(z+.5)*this.dz/1000}});
    }
    return {type:"FeatureCollection",features};
  }
}

// Placeholder only for wiring tests. Never label this field as observed weather.
// Replace by the cached Open-Meteo/ERA5 interpolator before scientific use.
export function neutralWind(){return {u:0,v:0,w:0};}
