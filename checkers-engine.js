(()=>{
'use strict';
const W=1,B=2,K=4;
const dirs=[[-1,-1],[-1,1],[1,-1],[1,1]];
const color=p=>p&3;
const isKing=p=>(p&K)!==0;
const inBoard=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const copy=b=>b.map(row=>row.slice());
function pieces(side,b){const out=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]&&color(b[r][c])===side)out.push({r,c});return out}
function key(b,t){return t+'|'+b.flat().join(',')}
function applyMove(b,from,m){const n=copy(b),p=n[from.r][from.c];n[from.r][from.c]=0;if(m.cap)n[m.cap.r][m.cap.c]=0;let np=p;if(color(p)===W&&m.r===0)np|=K;if(color(p)===B&&m.r===7)np|=K;n[m.r][m.c]=np;return n}
function captures(r,c,b){const p=b[r][c];if(!p)return[];const side=color(p),out=[];if(!isKing(p)){for(const d of dirs){const mr=r+d[0],mc=c+d[1],tr=r+d[0]*2,tc=c+d[1]*2;if(inBoard(tr,tc)&&b[mr]?.[mc]&&color(b[mr][mc])!==side&&!b[tr][tc])out.push({r:tr,c:tc,cap:{r:mr,c:mc}})}}else{for(const d of dirs){let rr=r+d[0],cc=c+d[1],enemy=null;while(inBoard(rr,cc)){const q=b[rr][cc];if(!q){if(enemy)out.push({r:rr,c:cc,cap:enemy})}else if(color(q)!==side){if(enemy)break;enemy={r:rr,c:cc}}else break;rr+=d[0];cc+=d[1]}}}return out}
function simpleMoves(r,c,b){const p=b[r][c],out=[];if(!p)return out;if(isKing(p)){for(const d of dirs){let rr=r+d[0],cc=c+d[1];while(inBoard(rr,cc)&&!b[rr][cc]){out.push({r:rr,c:cc});rr+=d[0];cc+=d[1]}}}else{const dr=color(p)===W?-1:1;for(const dc of[-1,1])if(inBoard(r+dr,c+dc)&&!b[r+dr][c+dc])out.push({r:r+dr,c:c+dc})}return out}
function hasCapture(side,b){return pieces(side,b).some(p=>captures(p.r,p.c,b).length>0)}
function legalFor(side,r,c,b,forced=false){return forced||hasCapture(side,b)?captures(r,c,b):simpleMoves(r,c,b)}
function allMoves(side,b){const force=hasCapture(side,b),out=[];for(const from of pieces(side,b)){if(force){const walk=(pos,state,first)=>{const ms=captures(pos.r,pos.c,state);if(!ms.length){if(first)out.push({from:{...from},move:first,board:state});return}for(const m of ms)walk({r:m.r,c:m.c},applyMove(state,pos,m),first||m)};walk(from,b,null)}else for(const m of simpleMoves(from.r,from.c,b))out.push({from:{...from},move:m,board:applyMove(b,from,m)})}return out}
function evaluate(b){let s=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p)continue;const k=isKing(p),v=k?7:1,adv=k?0:(color(p)===B?r:7-r)*.12,center=(r>=2&&r<=5&&c>=2&&c<=5)?0.12:0,edge=(c===0||c===7)?0.08:0;s+=(color(p)===B?1:-1)*(v+adv+center+edge)}return s+(hasCapture(B,b)?0.3:0)-(hasCapture(W,b)?0.3:0)}
function minimax(b,side,depth,alpha,beta){const moves=allMoves(side,b);if(!moves.length)return side===B?-100000:100000;if(depth<=0)return evaluate(b);if(side===B){let best=-Infinity;for(const m of moves){best=Math.max(best,minimax(m.board,W,depth-1,alpha,beta));alpha=Math.max(alpha,best);if(alpha>=beta)break}return best}else{let best=Infinity;for(const m of moves){best=Math.min(best,minimax(m.board,B,depth-1,alpha,beta));beta=Math.min(beta,best);if(alpha>=beta)break}return best}}
window.CheckersEngine={W,B,K,dirs,color,isKing,inBoard,copy,pieces,key,applyMove,captures,simpleMoves,hasCapture,legalFor,allMoves,evaluate,minimax};
})();
