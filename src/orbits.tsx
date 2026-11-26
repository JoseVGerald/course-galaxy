import {forwardRef} from 'react';

const cx=965,cy=540;
const radii=[100,195,290,385,480,575,670,765];
const spokeAngles=Array.from({length:24},(_,i)=>i*Math.PI/12);

export const OrbitGrid=forwardRef<SVGSVGElement,{}>(function OrbitGrid(_props,ref){return <svg ref={ref} className="orbit-grid" width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true">
 <g className="orbit-spokes">{spokeAngles.map((a,i)=><path key={i} d={`M${cx},${cy}L${cx+Math.cos(a)*930},${cy+Math.sin(a)*930}`}/>)}</g>
 <g className="orbit-circles">{radii.map((r,i)=><circle key={r} className={`orbit-ring orbit-ring-${i}`} cx={cx} cy={cy} r={r}/>)}</g>
</svg>});
