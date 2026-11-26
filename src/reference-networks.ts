import layouts from './reference-layouts.json';
import type {Planet,Mission} from './data';

// Cubic handles traced from the matching U32 map screenshots. Topology and
// curvature are authored together; current wiki progression is not substituted
// for the network visible in an older reference. Values are source-image pixels.
const networks:Record<string,string>={
 Mars:`Wahiba>Ultor|1060,163,1002,181;Ultor>Alator|927,219,857,226;Alator>Ara|798,282,801,347;Syrtis>Ara|740,264,783,343;Ara>Ares|857,445,898,501;Ares>Augustus|940,458,984,387;Augustus>Gradivus|1100,335,1211,333;Augustus>Olympus|1101,391,1160,433;Gradivus>Tharsis|1280,402,1299,557;Tharsis>Hellas|1225,719,1145,779;Hellas>Spear|1002,798,1024,740;Spear>Ares|994,628,952,569;Spear>Arval|1018,631,1042,600;Ares>Martialis|875,538,817,535;Martialis>Vallis|705,539,624,570;Martialis>War|731,553,722,602;War>Kadesh|741,692,805,704;Kadesh>To Deimos|809,806,765,834;Martialis>Ceres Junction|709,465,639,377;Ceres Junction>To Ceres|547,309,499,294;Gradivus>Phobos Junction|1347,303,1388,281;Phobos Junction>To Phobos|1446,247,1488,211;Tharsis>Maroo's Bazaar|1303,601,1343,585;Hellas>To Earth|1113,848,1205,865`,
 Ceres:`Thon>Kiste|798,269,740,307;Kiste>Cinxia|759,331,813,358;Cinxia>Pallas|914,431,932,482;Pallas>Bode|944,577,931,614;Bode>Casta|891,706,860,748;Casta>Lex|762,794,711,799;Lex>Ludi|569,779,511,727;Ludi>Ker|439,604,447,499;Ker>Kiste|539,366,610,330;Ker>Draco|478,385,420,359;Ludi>Exta|507,624,520,578;Exta>Nuovo|620,537,687,534;Nuovo>Cinxia|798,461,826,419;Nuovo>Bode|813,539,876,588;Casta>Seimeni|779,777,741,733;Lex>Gabii|616,807,602,858;Ludi>Jupiter Junction|456,697,427,713;Jupiter Junction>To Jupiter|380,752,349,774;Pallas>To Mars|956,491,990,467`,
 Phobos:`To Void>Stickney|709,222,764,250;Stickney>Skyresh|858,315,887,344;Skyresh>Monolith|916,302,938,247;Monolith>Iliad|1060,157,1134,162;Iliad>Kepler|1287,245,1409,339;Kepler>Sharpless|1429,595,1326,741;Sharpless>Roche|1190,851,1110,822;Roche>Shklovsky|981,754,945,700;Shklovsky>Skyresh|901,541,886,445;Kepler>Memphis|1381,375,1271,383;Kepler>Zeugma|1371,439,1320,461;Sharpless>Gulliver|1312,785,1411,737;Roche>To Mars|1025,870,961,949`,
 Saturn:`To Jupiter>Kronia Relay|637,242,776,204;To Jupiter>Cassini|658,293,840,281;To Jupiter>Dione|523,311,540,329;Dione>Telesto|518,424,487,470;Telesto>Anthe|396,527,331,519;Anthe>Rhea|219,547,175,573;Rhea>Piscinas|139,657,182,699;Telesto>Keeler|374,566,315,590;Keeler>Calypso|288,702,382,729;Piscinas>Calypso|299,747,398,744;Calypso>Tethys|587,763,757,784;Tethys>Helene|997,809,1108,781;Helene>Enceladus|1206,690,1223,635;Enceladus>Numa|1208,552,1152,514;Numa>Cassini|1067,402,1010,345;Numa>Pandora|1146,473,1190,446;Pandora>Caracol|1285,452,1316,500;Enceladus>Titan|1292,618,1375,627;Tethys>Uranus Junction|934,819,1003,847;Uranus Junction>To Uranus|1078,888,1113,903`,
 Uranus:`Ur>Cressida|914,226,934,319;Caelus>Cressida|1060,321,1016,357;Cressida>Titania|1034,432,1080,520;Titania>Rosalind|1082,554,1024,541;Rosalind>Desdemona|888,535,831,541;Desdemona>Stephano|740,609,706,670;Stephano>Sycorax|595,698,547,635;Sycorax>Ariel|534,555,579,528;Ariel>Ophelia|650,431,652,375;Sycorax>Caliban|530,735,564,799;Caliban>Umbriel|688,898,775,916;Umbriel>Puck|913,873,935,817;Puck>Titania|1034,708,1088,622;Puck>Assur|1042,793,1104,822;Sycorax>To Saturn|448,619,379,635;Titania>Neptune Junction|1157,611,1184,638;Neptune Junction>To Neptune|1224,684,1262,715`,
 Neptune:`Kelashin>Proteus|1371,167,1310,173;Proteus>Sao|1189,220,1133,281;Sao>Despina|1028,318,964,325;Despina>Galatea|856,400,841,450;Galatea>Triton|801,575,764,639;Triton>Larissa|740,747,761,810;Triton>Neso|818,743,924,772;Neso>Nereid|1082,804,1154,765;Nereid>Psamathe|1303,670,1369,591;Psamathe>Laomedeia|1343,553,1245,499;Laomedeia>Sao|1150,425,1132,347;Nereid>The Index: Endurance|1117,703,1054,602;Neso>Salacia|1127,823,1269,868;Salacia>Yursa|1454,819,1517,752;Psamathe>Pluto Junction|1433,454,1444,371;Pluto Junction>To Pluto|1504,288,1556,277;Galatea>To Uranus|761,530,697,520;Larissa>To Void|719,888,682,897`,
 Pluto:`To Sedna>Sedna Junction|1031,206,1066,229;Sedna Junction>Regna|1116,304,1125,349;Regna>Hieracon|1133,347,1160,331;Regna>Oceanum|1129,462,1138,545;Oceanum>Minthe|1119,664,1074,675;Minthe>To Neptune|1048,800,1050,879;To Neptune>Hydra|1102,903,1190,893;Hydra>Narcissus|1287,841,1292,764;Narcissus>Outer Terminus|1351,673,1309,607;Outer Terminus>Oceanum|1226,581,1180,609;Outer Terminus>Sechura|1311,546,1336,506;Narcissus>Cypress|1405,704,1465,724;Cypress>Cerberus|1544,676,1469,626;Cerberus>Palus|1469,528,1536,493;Palus>Hades|1538,416,1442,377;Oceanum>Acheron|1083,528,1046,483;Acheron>Eris Junction|947,397,906,384;Eris Junction>To Eris|850,304,883,272;To Neptune>Orcus Relay|993,824,926,736`,
 Sedna:`Amarna>Hydron|1318,237,1312,282;Kappa>Hydron|1421,267,1367,301;Hydron>Rusalka|1327,404,1370,460;Rusalka>Naga|1420,560,1414,608;Naga>To Pluto|1493,661,1554,708;Naga>Adaro|1372,655,1316,681;Adaro>Selkie|1214,774,1203,820;Selkie>Marid|1048,838,956,760;Marid>Nakki|924,660,963,609;Nakki>Merrow|1020,466,1040,423;Nakki>Yam|969,504,960,455;Yam>Vodyanoi|883,443,854,475;Rusalka>Berehynia|1340,484,1279,455;Berehynia>Sangeru|1189,477,1184,581;Selkie>Charybdis|1064,879,950,887;Charybdis>Kelpie|808,839,810,795;Kelpie>To Void|705,712,656,666`,
 Eris:`Akkad>Nimus|1224,291,1268,336;Nimus>Solium|1363,427,1417,508;Solium>Isos|1407,624,1359,650;Isos>Oestrus|1309,635,1299,554;Isos>Naeglar|1304,763,1295,818;Naeglar>Brugia|1166,872,1086,839;Brugia>Saxis|929,768,853,736;Brugia>Kala-azar|902,806,834,813;Kala-azar>Xini|722,728,706,674;Xini>Zabala|674,523,674,451;Naeglar>To Pluto|1346,808,1467,676`,
 Lua:`Zeipel>Plato|1147,309,1066,353;Plato>Copernicus|1112,350,1185,387;Copernicus>Grimaldi|1287,487,1288,520;Grimaldi>Stöfler|1280,614,1265,650;Stöfler>Apollo|1164,716,1104,731;Apollo>Pavlov|1148,801,1339,766;Pavlov>Tycho|1440,584,1431,512;Tycho>Zeipel|1364,371,1289,335;Grimaldi>Yuvarium|1238,561,1184,558;Yuvarium>Circulus|1080,556,1035,560;Plato>To Earth|924,424,801,484`,
 Void:`To Phobos>Teshub|1061,249,1005,242;Teshub>Hepit|938,287,955,372;Hepit>Taranis|900,430,817,420;To Sedna>Aten|483,312,418,285;Aten>Marduk|350,327,380,394;Marduk>Mithra|452,457,517,455;Mithra>Mot|599,509,598,541;To Europa>Tiwaz|1137,526,1140,576;Tiwaz>Stribog|1167,665,1230,698;Stribog>Ani|1115,733,964,693;To Neptune>Ukko|807,832,752,789;Ukko>Oxomoco|599,747,503,750;Oxomoco>Belenus|413,696,487,663`,
 Deimos:`To Mars>Horend|1005,301,907,302;Horend>Phlegyas|761,318,718,328;Phlegyas>Formido|649,411,621,446;Formido>Hyf|621,578,650,622;Hyf>Magnacidium|791,699,913,743;Formido>Dirus|687,549,806,560;Dirus>Magnacidium|910,670,923,728;Magnacidium>Terrorem|1036,793,1106,837;Terrorem>Exequias|1233,771,1290,722;Phlegyas>Cambion Drift|730,397,770,444;Cambion Drift>Necralisk|863,457,908,448`,
 'Kuva Fortress':`Tamu>Garus|643,355,688,395;Garus>Rotuma|738,493,689,548;Rotuma>Koro|772,640,853,692;Koro>Dakata|858,753,719,757;Koro>Nabuk|933,700,907,622;Nabuk>Pago|900,529,943,498;Pago>Taveuni|931,400,891,360`
};
type Curve=[number,number,number,number];
export const referenceCurves:Record<string,Record<string,Curve>>={};
for(const [planet,rows]of Object.entries(networks))referenceCurves[planet]=Object.fromEntries(rows.split(';').map(row=>{const [edge,points]=row.split('|');return [edge,points.split(',').map(Number) as Curve]}));

// Nodes missed by OCR are restored at their visible marker, not at the label.
const additions:Record<string,[string,number,number,string,string,string?][]>={
 Mars:[['To Ceres',444,275,'travel','','Ceres'],['To Earth',1283,928,'travel','','Earth']],
 Neptune:[['Galatea',803,511,'mission','Capture'],['To Uranus',654,520,'travel','','Uranus'],['To Void',637,913,'travel','','Void']],
 Pluto:[['Acheron',1000,437,'mission','Exterminate'],['Outer Terminus',1270,557,'dark','Defense'],['Cerberus',1464,568,'mission','Interception']],
 Eris:[['Isos',1305,704,'mission','Capture'],['Jordas Golem',1393,264,'boss','Assassination']]
};
export function applyReferenceNetwork(planet:Planet){
 const source=(layouts as Record<string,{cx:number;cy:number;radius:number}>)[planet.name];
 if(!source)return;
 const {cx,cy,radius}=source;
 for(const [name,x,y,kind,type,to]of additions[planet.name]||[]){if(!planet.nodes.some(n=>n.name===name))planet.nodes.push({name,x:(x-cx)/radius,y:(y-cy)/radius,kind,type,to,level:''})}
 for(const node of planet.nodes){
  if(node.name.endsWith(' Junction')){node.kind='junction';node.to=node.name.replace(' Junction','');node.type='Junction'}
  if(node.name.endsWith(' Relay')||node.name==="Maroo's Bazaar"){node.kind='relay';node.type='Relay'}
 }
 const curves=referenceCurves[planet.name];
 if(curves){planet.edges=Object.keys(curves).map(edge=>edge.split('>').map(name=>planet.nodes.findIndex(n=>n.name===name)));if(planet.edges.some(e=>e.some(i=>i<0)))throw new Error('Missing reference node for '+planet.name)}
}
export function referenceHandles(planet:Planet,a:Mission,b:Mission):Curve|undefined{
 const curves=referenceCurves[planet.name];if(!curves)return;
 const direct=curves[a.name+'>'+b.name],back=curves[b.name+'>'+a.name];
 if(!direct&&!back)return;
 const c=direct||[back[2],back[3],back[0],back[1]];
 const source=(layouts as Record<string,{cx:number;cy:number;radius:number}>)[planet.name];
 return c.map((v,i)=>(v-(i%2?source.cy:source.cx))/source.radius*345) as Curve;
}
