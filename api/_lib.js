import crypto from 'node:crypto';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const BOT_TOKEN = process.env.MAX_BOT_TOKEN || process.env.MAX_BOT_TOKEN_VALUE;

export function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-max-init-data', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
}
export function cors(request) { if(request.method==='OPTIONS') return reply({ok:true}); return null; }
export async function body(request) { try { return await request.json(); } catch { return {}; } }
export async function redis(command, args = []) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('REDIS_NOT_CONFIGURED');
  const response = await fetch(REDIS_URL, { method:'POST', headers:{authorization:`Bearer ${REDIS_TOKEN}`,'content-type':'application/json'}, body:JSON.stringify([command,...args]) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `Redis ${response.status}`);
  return data.result;
}
function parseInitData(raw) {
  const pairs=raw.split('&').map(part=>{const i=part.indexOf('=');return i<0?[part,'']:[part.slice(0,i),decodeURIComponent(part.slice(i+1).replace(/\+/g,' '))]});
  const counts={}; for(const [key] of pairs) counts[key]=(counts[key]||0)+1;
  if(counts.hash!==1) throw new Error('INVALID_INIT_DATA');
  const hash=pairs.find(([key])=>key==='hash')[1];
  const data=pairs.filter(([key])=>key!=='hash').sort((a,b)=>a[0].localeCompare(b[0]));
  return {hash,data,map:Object.fromEntries(data)};
}
export function validateInitData(raw) {
  if(!raw||!BOT_TOKEN) throw new Error(!raw?'MAX_INIT_DATA_REQUIRED':'MAX_BOT_TOKEN_NOT_CONFIGURED');
  const parsed=parseInitData(raw);
  const launchParams=parsed.data.map(([key,value])=>`${key}=${value}`).join('\n');
  const secretKey=crypto.createHmac('sha256','WebAppData').update(BOT_TOKEN).digest();
  const calculated=crypto.createHmac('sha256',secretKey).update(launchParams).digest('hex');
  const a=Buffer.from(calculated),b=Buffer.from(parsed.hash); if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) throw new Error('INVALID_INIT_DATA');
  const authDate=Number(parsed.map.auth_date||0); if(!authDate||Math.abs(Math.floor(Date.now()/1000)-authDate)>86400) throw new Error('INIT_DATA_EXPIRED');
  let user; try{user=JSON.parse(parsed.map.user||'{}')}catch{throw new Error('INVALID_USER_DATA')}; if(!user.id)throw new Error('USER_NOT_FOUND');
  return {id:String(user.id),name:[user.first_name,user.last_name].filter(Boolean).join(' ').trim()||user.username||'Игрок',username:user.username||'',photo:user.photo_url||''};
}
export function auth(request){try{return validateInitData(request.headers.get('x-max-init-data')||'')}catch(error){throw Object.assign(new Error(error.message),{status:error.message==='MAX_BOT_TOKEN_NOT_CONFIGURED'||error.message==='REDIS_NOT_CONFIGURED'?500:401})}}
export function initialBoard(){const board=Array.from({length:8},()=>Array(8).fill(0));for(let r=0;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2){if(r<3)board[r][c]=2;else if(r>4)board[r][c]=1}return board}
const dirs=[[-1,-1],[-1,1],[1,-1],[1,1]],color=p=>p&3,king=p=>(p&4)!==0,inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
export function captures(board,r,c){const p=board[r]?.[c];if(!p)return[];const side=color(p),out=[];if(!king(p)){for(const[dr,dc]of dirs){const mr=r+dr,mc=c+dc,tr=r+dr*2,tc=c+dc*2;if(inside(tr,tc)&&board[mr]?.[mc]&&color(board[mr][mc])!==side&&!board[tr][tc])out.push({r:tr,c:tc,cap:{r:mr,c:mc}})}}else for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc,enemy=null;while(inside(rr,cc)){const q=board[rr][cc];if(!q){if(enemy)out.push({r:rr,c:cc,cap:enemy})}else if(color(q)!==side){if(enemy)break;enemy={r:rr,c:cc}}else break;rr+=dr;cc+=dc}}return out}
export function simpleMoves(board,r,c){const p=board[r]?.[c],out=[];if(!p)return out;if(king(p))for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(inside(rr,cc)&&!board[rr][cc]){out.push({r:rr,c:cc});rr+=dr;cc+=dc}}else{const dr=color(p)===1?-1:1;for(const dc of[-1,1])if(inside(r+dr,c+dc)&&!board[r+dr][c+dc])out.push({r:r+dr,c:c+dc})}return out}
export function pieces(board,side){const out=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&color(board[r][c])===side)out.push({r,c});return out}
export function hasCapture(board,side){return pieces(board,side).some(p=>captures(board,p.r,p.c).length)}
export function legalPieceMoves(state,side,r,c){const forced=state.chain&&state.chain.side===side?state.chain:null;if(forced&&(forced.r!==r||forced.c!==c))return[];const must=Boolean(forced)||hasCapture(state.board,side);return must?captures(state.board,r,c):simpleMoves(state.board,r,c)}
export function allMoves(state,side){const forced=state.chain&&state.chain.side===side;if(forced){const p=state.chain;return legalPieceMoves(state,side,p.r,p.c).map(move=>({from:{r:p.r,c:p.c},move}))}const must=hasCapture(state,side),out=[];for(const p of pieces(state.board,side))for(const move of(must?captures(state.board,p.r,p.c):simpleMoves(state.board,p.r,p.c)))out.push({from:{r:p.r,c:p.c},move});return out}
export function applyMove(board,from,move){const next=board.map(row=>row.slice());let p=next[from.r][from.c];next[from.r][from.c]=0;if(move.cap)next[move.cap.r][move.cap.c]=0;if(color(p)===1&&move.r===0)p|=4;if(color(p)===2&&move.r===7)p|=4;next[move.r][move.c]=p;return next}
export function stateKey(state){return `${state.turn}|${state.board.flat().join(',')}`}
export function createGame(roomId,p1,p2,p1Side,p2Side){const board=initialBoard(),state={id:roomId,status:'playing',p1,p2,p1Side,p2Side,board,turn:1,chain:null,halfMoves:0,reps:{},winner:null,lastMove:null,createdAt:Date.now(),updatedAt:Date.now()};state.reps[stateKey(state)]=1;return state}
export function publicGame(state,userId){const side=state.p1.id===userId?state.p1Side:state.p2Side,opponent=state.p1.id===userId?state.p2:state.p1;return{id:state.id,status:state.status,board:state.board,turn:state.turn,side,chain:state.chain,lastMove:state.lastMove,winner:state.winner,halfMoves:state.halfMoves,opponent}}
export function errorResponse(error){return reply({ok:false,error:error.message||'SERVER_ERROR'},error.status||500)}
