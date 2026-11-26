import {forwardRef} from 'react';

const cx=965,cy=540;
// Rings start 100 out from the sun and repeat every 95. The chart adds as many as the
// visible field needs (see `gridRingsFor`), so the grid never ends on screen however
// far the view is panned or zoomed out.
export const ringFirst=100,ringStep=95;
const spokeAngles=Array.from({length:24},(_,i)=>i*Math.PI/12);

// Rings needed so the farthest visible corner of the field is still inside the grid.
export function gridRingsFor(farthest:number){return Math.min(90,Math.max(8,Math.ceil((farthest-ringFirst)/ringStep)+1))}

export const OrbitGrid=forwardRef<SVGSVGElement,{rings:number}>(function OrbitGrid({rings},ref){
 const reach=ringFirst+ringStep*rings;
 return <svg ref={ref} className="orbit-grid" width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true">
  <g className="orbit-spokes">{spokeAngles.map((a,i)=><path key={i} d={`M${cx},${cy}L${(cx+Math.cos(a)*reach).toFixed(1)},${(cy+Math.sin(a)*reach).toFixed(1)}`}/>)}</g>
  <g className="orbit-circles">{Array.from({length:rings},(_,i)=><circle key={i} className={`orbit-ring orbit-ring-${Math.min(i,8)}`} cx={cx} cy={cy} r={ringFirst+i*ringStep}/>)}</g>
 </svg>
});
