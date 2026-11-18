"use client";
import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";

type Props={data:any;showWind:boolean};
export default function Globe({data,showWind}:Props){
  const ref=useRef<HTMLDivElement>(null),map=useRef<Map|null>(null);
  useEffect(()=>{
    if(!ref.current||map.current)return;
    const m=new maplibregl.Map({container:ref.current,style:"https://demotiles.maplibre.org/style.json",center:[-18,57],zoom:2.2,projection:{type:"globe"},attributionControl:true});
    m.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");
    m.on("load",()=>{
      m.addSource("ash",{type:"geojson",data:data??{type:"FeatureCollection",features:[]}});
      m.addLayer({id:"ash-glow",type:"circle",source:"ash",paint:{"circle-radius":["interpolate",["linear"],["get","concentration"],.0001,2,.01,5,1,15,10,28],"circle-color":"#f49a55","circle-opacity":.48,"circle-blur":.8}});
      m.addSource("cities",{type:"geojson",data:{type:"FeatureCollection",features:[
        {type:"Feature",geometry:{type:"Point",coordinates:[-.1276,51.5072]},properties:{name:"런던"}},
        {type:"Feature",geometry:{type:"Point",coordinates:[2.3522,48.8566]},properties:{name:"파리"}},
        {type:"Feature",geometry:{type:"Point",coordinates:[8.6821,50.1109]},properties:{name:"프랑크푸르트"}},
        {type:"Feature",geometry:{type:"Point",coordinates:[10.7522,59.9139]},properties:{name:"오슬로"}},
        {type:"Feature",geometry:{type:"Point",coordinates:[18.0686,59.3293]},properties:{name:"스톡홀름"}}
      ]}});
      m.addLayer({id:"city-dots",type:"circle",source:"cities",paint:{"circle-radius":4,"circle-color":"#80d9f5","circle-stroke-width":1,"circle-stroke-color":"#e8f8ff"}});
      m.addLayer({id:"city-labels",type:"symbol",source:"cities",layout:{"text-field":["get","name"],"text-size":11,"text-offset":[0,1.2]},paint:{"text-color":"#d5e5ed","text-halo-color":"#071522","text-halo-width":1.5}});
      new maplibregl.Marker({color:"#f29b55"}).setLngLat([-19.62,63.63]).setPopup(new maplibregl.Popup().setText("Eyjafjallajökull · Iceland")).addTo(m);
    });
    map.current=m;return()=>{m.remove();map.current=null;};
  },[]);
  useEffect(()=>{const m=map.current;if(!m)return;const source=m.getSource("ash") as maplibregl.GeoJSONSource|undefined;if(source)source.setData(data??{type:"FeatureCollection",features:[]});},[data]);
  return <div className="globe-wrap"><div ref={ref} className="globe-map"/><div className="map-caption"><span>NORTH ATLANTIC / EUROPE</span><b>2010 Eyjafjallajökull ash concentration field</b><small>SPHERICAL GLOBE · EULERIAN GRID</small></div>{showWind&&<div className="wind-note">WIND BARBS · WEATHER FIELD NOT LOADED</div>}<div className="map-legend"><b>화산재 농도 · mg/m³</b><div className="legend-scale"><span>0.2</span><span>2</span><span>5</span><span>10+</span></div><small>● 활성 농도 격자　　○ 도시 관측 지점</small></div></div>;
}
