(()=>{
'use strict';
const W=1,B=2,K=4,dirs=[[-1,-1],[-1,1],[1,-1],[1,1]];
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const color=p=>p&3;
const king=p=>(p&K)!==0;
function captures(b,r,c){const p=b?.[r]?.[c];if(!p)return[];const side=color(p),out=[];if(!king(p)){for(const[dr,dc]of dirs){const mr=r+dr,mc=c+dc,tr=r+dr*2,tc=c+dc*2;if(inside(tr,tc)&&b[mr]?.[mc]&&color(b[mr][mc])!==side&&!b[tr][tc])out.push({r:tr,c:tc,cap:{r:mr,c:mc}})}}else for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc,enemy=null;while(inside(rr,cc)){const q=b[rr][cc];if(!q){if(enemy)out.push({r:rr,c:cc,cap:enemy})}else if(color(q)!==side){if(enemy)break;enemy={r:rr,c:cc}}else break;rr+=dr;cc+=dc}}return out}
function simple(b,r,c){const p=b?.[r]?.[c],out=[];if(!p)return out;if(king(p))for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(inside(rr,cc)&&!b[rr][cc]){out.push({r:rr,c:cc});rr+=dr;cc+=dc}}else{const dr=color(p)===W?-1:1;for(const dc of[-1,1])if(inside(r+dr,c+dc)&&!b[r+dr][c+dc])out.push({r:r+dr,c:c+dc})}return out}
window.CheckersOnlineCore={W,B,K,captures,simple,color,king,inside};
})();
