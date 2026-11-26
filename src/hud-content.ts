import {planets,displayNames,type Mission,type Planet} from './data';

// Copy and numbers for the mission HUD that opens when a planet is clicked.
// The star chart has no live course backend yet, so the briefs are authored
// here and progress is a stable, per-planet demo value (see baselineDone).
export type PlanetInfo={brief:string;warning:string;note:string;level:number;goal:string};
const fallback:PlanetInfo={brief:'Survey this world: complete its lessons in order and clear every checkpoint.',warning:'Unmapped content ahead. Review the previous planet before you continue.',note:'Caution_Ex 1',level:2,goal:'Clear every checkpoint'};
export const planetInfo:Record<string,PlanetInfo>={
 Mercury:{brief:'Begin the survey of AI: what it is, how machines learn from data, and the vocabulary every explorer needs.',warning:'Foundations module. Every later planet builds on these ideas, so skip nothing.',note:'Caution_Ex 1',level:1,goal:'Learn the core vocabulary'},
 Venus:{brief:'Get hands-on with today’s AI tools: prompting, workflows and the techniques that turn ideas into results.',warning:'Dense tool content. Keep a notebook open and test each technique yourself.',note:'Caution_Ex 2',level:2,goal:'Build three working prompts'},
 Earth:{brief:'Navigate bias, privacy and responsible use so your AI work stays fair, honest and safe for everyone.',warning:'Sensitive material. Case studies cover real harms and the policies that answer them.',note:'Caution_Ex 3',level:3,goal:'Audit a real AI system'},
 Mars:{brief:'Study how AI is reshaping teaching, tutoring and assessment, and how to learn alongside it.',warning:'Prerequisite: finish Ethical AI Usage before the assessment checkpoints.',note:'Caution_Ex 2',level:2,goal:'Design an AI study plan'},
 Jupiter:{brief:'Explore how AI drives strategy, automation and decision-making across modern organisations.',warning:'Large module. Plan several sessions and use the review quizzes between them.',note:'Caution_Ex 3',level:3,goal:'Map one workflow to automate'},
 Ceres:{brief:'Survey diagnostics, patient care and drug discovery, where AI is already saving time and lives.',warning:'Clinical terminology ahead. Glossary cards unlock after each node.',note:'Caution_Ex 4',level:4,goal:'Review a clinical AI case'},
 Saturn:{brief:'Create with AI: image, music and writing tools, and the craft of directing them with intent.',warning:'Studio module. Bring your own project idea to get the most from every node.',note:'Caution_Ex 2',level:2,goal:'Ship one creative project'},
 Uranus:{brief:'See how AI accelerates discovery, from protein folding to climate models and space science.',warning:'Advanced maths in places. Optional refreshers are linked at each checkpoint.',note:'Caution_Ex 4',level:4,goal:'Read a research paper with AI'},
 Neptune:{brief:'Dive into autonomous machines, smart systems and the engineering that keeps them reliable.',warning:'Heavy systems content. Finish the Practical AI Tools planet first.',note:'Caution_Ex 4',level:4,goal:'Sketch a smart-system design'},
 Pluto:{brief:'Spot the AI in your phone, home and commute, and learn to use it with everyday confidence.',warning:'Light module. A good place to take a break between the heavier planets.',note:'Caution_Ex 1',level:1,goal:'Audit your own daily AI use'},
 Sedna:{brief:'Look ahead at emerging research, open questions and the careers that AI is creating.',warning:'Capstone content. Complete at least five other planets before you attempt it.',note:'Caution_Ex 5',level:5,goal:'Write your AI roadmap'}
};
export const infoFor=(planet:Planet)=>planetInfo[planet.name]||fallback;
export const levelLabel=(level:number)=>['','EASY','STEADY','HARD','SEVERE','CRITIC!'][Math.max(1,Math.min(5,level))];

export const isStop=(node:Mission)=>node.kind!=='travel'&&node.kind!=='junction';
export const stopsOf=(planet:Planet)=>planet.nodes.filter(isStop);
export const hashOf=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return ((h>>>0)%100000)/100000};

// Orthographic inverse of the node position on the planet disc. Nodes past the
// limb are pulled onto it, so every waypoint has a believable coordinate.
export function coordsFor(planet:Planet,node:Mission){
 const seed=hashOf(planet.name),spread=Math.hypot(node.x,node.y),k=spread>.97?.97/spread:1,x=node.x*k,y=-node.y*k,lat=Math.asin(Math.max(-1,Math.min(1,y)))*180/Math.PI,lon=Math.atan2(x,Math.sqrt(Math.max(0,1-x*x-y*y)))*180/Math.PI+(seed*60-30);
 const wrap=((lon+540)%360)-180;
 return `${Math.abs(lat).toFixed(1)}° ${lat>=0?'N':'S'}, ${Math.abs(wrap).toFixed(1)}° ${wrap>=0?'E':'W'}`;
}

export type Objective={tier:'primary'|'secondary'|'optional';text:string};
export function objectivesFor(planet:Planet,node:Mission):Objective[]{
 if(node.kind==='junction'||node.kind==='travel'){const name=displayNames[planet.name]||planet.name;return [
  {tier:'primary',text:`Finish every node on ${name} to open the route to ${node.to||'the next world'}.`},
  {tier:'secondary',text:'Score 80% or higher on the planet review quiz.'},
  {tier:'optional',text:'Complete one bonus challenge for a bigger reward.'}]}
 const type=(node.type||'core').toLowerCase();
 return [
  {tier:'primary',text:`Complete the ${type} lesson at ${node.name} and clear its checkpoint.`},
  {tier:'secondary',text:'Pass the practice quiz with 80% or higher on the first try.'},
  {tier:'optional',text:`Replay ${node.name} on a harder setting to earn bonus XP.`}];
}

// Stable per-planet starting progress, so every world shows a different bar.
export function baselineDone(planet:Planet){const total=stopsOf(planet).length;return Math.min(total-1,Math.max(0,Math.round(total*(.15+hashOf(planet.name)*.5))))}
export const progressFor=(planet:Planet,visited:ReadonlySet<string>)=>{
 const total=stopsOf(planet).length||1,extra=stopsOf(planet).filter(n=>visited.has(`${planet.name}:${n.name}`)).length,done=Math.min(total,baselineDone(planet)+extra);
 return {done,total,percent:done/total*100};
};

export const supplies=(planet:Planet)=>{const h=hashOf(planet.name);return [
 {name:'Study XP',value:`+${120+Math.round(h*80)}`,note:'Per cleared node'},
 {name:'Checkpoint Keys',value:`${2+Math.round(h*3)}`,note:'Open locked routes'},
 {name:'Hint Tokens',value:`${3+Math.round(h*4)}`,note:'Reveal a worked example'},
 {name:'Planet Badge',value:'1',note:'Awarded at 100%'}]};

// The waypoint that is selected when a planet opens: the first plain, unlocked stop.
export const defaultPick=(planet:Planet)=>{
 const open=planet.nodes.findIndex(n=>isStop(n)&&!n.locked&&n.kind==='mission'),index=open>=0?open:planet.nodes.findIndex(isStop);
 return index>=0?{planet,node:planet.nodes[index],index}:null;
};
export const planetByName=(name?:string|null)=>planets.find(p=>p.name===name);
