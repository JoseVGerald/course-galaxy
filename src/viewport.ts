// Preserve circular chart geometry while filling every browser aspect ratio.
export function chartViewport(width:number,height:number){
 const scale=Math.min(width/1920,height/1080);
 const logicalWidth=width/scale,logicalHeight=height/scale;
 return {scale,width:logicalWidth,height:logicalHeight,offsetX:(logicalWidth-1920)/2,offsetY:(logicalHeight-1080)/2};
}
