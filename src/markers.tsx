import type {Mission} from './data';

export function Marker({node}:{node:Mission}){
 const kind=node.locked?'locked':node.kind;
 return <svg className={`node-marker marker-${kind}`} viewBox="-18 -18 36 36" aria-hidden="true">
  {kind==='mission'?<><path className="marker-shadow" d="M 0 -6.7 6.7 0 0 6.7 -6.7 0 Z"/><path className="marker-fill" d="M 0 -4.4 4.4 0 0 4.4 -4.4 0 Z"/></>:
   kind==='travel'?<><path className="marker-line" d="M 0 -12 12 0 0 12 -12 0 Z M 0 -8 8 0 0 8 -8 0 Z M 0 -3 3 0 0 3 -3 0 Z"/></>:
   kind==='junction'?<><path className="marker-line" d="M-9-11 0-15 12-5 14 3 3 14-8 12-14 1Z M-7-6 0-10 9-3 9 4 1 10-7 7-10 0Z"/><path className="marker-fill" d="M-2-8 8 0-2 8 1 0Z"/></>:
   kind==='locked'?<><path className="marker-frame" d="M 0 -13 13 0 0 13 -13 0 Z"/><path className="marker-line" d="M-4-1V-5A4 4 0 0 1 4-5V-1M-6-1H6V8H-6ZM0 2V5"/></>:
   kind==='open'?<><path className="marker-fill" d="M 0 -12 12 9 3 9 -1 2 -5 9 -13 9Z"/><path d="M 0 -4 4 3 0 9 -4 3Z" fill="#10202a"/></>:
   kind==='relay'?<><path className="marker-frame" d="M0-14 12 0 0 14-12 0Z"/><path className="marker-line" d="M-7 6H7M-5 3H5M-3-7V3M3-7V3M-7-3 0-10 7-3M0-14V-10"/></>:
   kind==='boss'?<><path className="marker-frame" d="M0-15 15 0 0 15-15 0Z"/><path className="marker-line" d="M-9-1Q0 9 9-1Q0-7-9-1ZM0-5V-11M-7-2-9-8M7-2 9-8M-3-7 0-11 3-7"/><circle cx="0" cy="0" r="3" className="marker-fill"/></>:
   <><path className="marker-frame" d="M0-15 15 0 0 15-15 0Z"/><path className="marker-line" d="M-7-4-2-8 1-3 6-8 9-2 4 2 7 6 1 9-3 5-8 8-9 1-4-1ZM-3-1 2-4 6 0 1 4-3 1Z"/></>}
 </svg>
}
