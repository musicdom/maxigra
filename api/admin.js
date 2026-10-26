import { auth, body, errorResponse, redis, reply } from './_lib.js';
import { send as sendMaxMessage } from '../lib/postings.js';

const ADMIN_ID='163701646';
const INVENTORY_KEY=id=>`checkers:shop:user:${id}`;
const USER_KEY_PREFIX='checkers:user:';
const CATALOG={
  board_90s:{title:'СВО'},board_svo:{title:'90-е'},board_max:{title:'MAX'},board_orbita:{title:'ОРБИТА'},board_original:{title:'Оригинал'}
};
const BOARD_IDS=Object.keys(CATALOG);
function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function admin(request, initData=''){const user=auth(request,initData);if(String(user.id)!==ADMIN_ID)throw Object.assign(new Error('FORBIDDEN'),{status:403});return user;}
async function getUsers(){
 const keys=await redis('KEYS',[`${USER_KEY_PREFIX}*`]),out=[];
 for(const key of(Array.isArray(keys)?keys:[])){const raw=await redis('GET',[key]);if(!raw)continue;try{const v=JSON.parse(raw);if(v?.id)out.push(v)}catch{}}
 return out.sort((a,b)=>Number(b.lastSeenAt||0)-Number(a.lastSeenAt||0));
}
async function readInventory(id){
 const raw=await redis('GET',[INVENTORY_KEY(id)]);let state={};try{state=raw?JSON.parse(raw):{}}catch{}
 state.owned=Array.isArray(state.owned)?state.owned.filter(x=>BOARD_IDS.includes(x)):['board_original'];if(!state.owned.includes('board_original'))state.owned.push('board_original');
 state.selectedBoard=BOARD_IDS.includes(state.selectedBoard)&&state.owned.includes(state.selectedBoard)?state.selectedBoard:'board_original';state.resetAt=Number(state.resetAt)||0;return state;
}
async function saveInventory(id,state){await redis('SET',[INVENTORY_KEY(id),JSON.stringify({owned:state.owned,selectedBoard:state.selectedBoard,selectedPieces:state.selectedPieces||'default',ai:Number(state.ai)||1,hints:Number(state.hints)||0,resetAt:Number(state.resetAt)||0})]);}
async function readStats(id,mode){
 const raw=await redis('GET',[`checkers:stats:${mode}:${id}`]);
 try{
  const s=raw?JSON.parse(raw):{};
  const wins=Math.max(0,Number(s.wins)||0),losses=Math.max(0,Number(s.losses)||0),draws=Math.max(0,Number(s.draws)||0);
  // Older records may have outcomes but no explicit games counter.
  const games=Math.max(0,Number(s.games)||0,wins+losses+draws);
  return {games,wins,losses,draws,updatedAt:Number(s.updatedAt)||0};
 }catch{return {games:0,wins:0,losses:0,draws:0,updatedAt:0}}
}
export async function OPTIONS(){return reply({ok:true});}
export async function GET(request){
 try{
  admin(request);const url=new URL(request.url),userId=String(url.searchParams.get('userId')||'');
  if(userId){
   const users=await getUsers(),user=users.find(u=>String(u.id)===userId);if(!user)return reply({ok:false,error:'USER_NOT_FOUND'},404);
   const [offline,online,shop]=await Promise.all([readStats(userId,'offline'),readStats(userId,'online'),readInventory(userId)]);
   let orderIds=[];try{const ids=await redis('SMEMBERS',[`checkers:shop:orders:user:${userId}`]);orderIds=Array.isArray(ids)?ids:[]}catch{}
   // Backward compatibility: older orders may exist without a per-user set index.
   if(!orderIds.length){try{const keys=await redis('KEYS',[`checkers:shop:order:*`]);for(const key of(Array.isArray(keys)?keys:[])){const raw=await redis('GET',[key]);if(!raw)continue;try{const order=JSON.parse(raw);if(String(order.userId)===userId)orderIds.push(String(order.id||String(key).split(':').pop()))}catch{}}}catch{}}
   const orders=[];for(const id of [...new Set(orderIds)]){try{const raw=await redis('GET',[`checkers:shop:order:${String(id)}`]);if(!raw)continue;const o=JSON.parse(raw);if(String(o.userId)!==userId)continue;if(o.status==='pending'&&Number(o.expiresAt||0)>0&&Date.now()>Number(o.expiresAt)){o.status='expired';o.expiredAt=Date.now();await redis('SET',[`checkers:shop:order:${String(id)}`,JSON.stringify(o)]);}orders.push({id:String(o.id||id),itemId:String(o.itemId||''),price:Number(o.price)||0,currency:String(o.currency||'RUB'),status:String(o.status||'pending'),createdAt:Number(o.createdAt)||0,paidAt:Number(o.paidAt)||0,expiredAt:Number(o.expiredAt)||0,operationId:String(o.operationId||''),paidAmount:Number(o.withdrawAmount??o.paidAmount)||0});}catch{}}
   orders.sort((a,b)=>b.createdAt-a.createdAt);
   return reply({ok:true,user,shop,stats:{offline,online},orders});
  }
  const users=await getUsers(),accounts=[];for(const u of users)accounts.push({...u,shop:await readInventory(u.id)});
  return reply({ok:true,accounts,boards:CATALOG});
 }catch(error){return errorResponse(error);}
}
export async function POST(request){
 try{
  const p=await body(request);admin(request,p?.initData||'');const id=String(p?.userId||'');if(!id)return reply({ok:false,error:'USER_ID_REQUIRED'},400);
  const state=await readInventory(id),action=String(p?.action||'');
  if(action==='contact'){
   const users=await getUsers(),target=users.find(u=>String(u.id)===id);if(!target)return reply({ok:false,error:'USER_NOT_FOUND'},404);
   const name=escapeHtml(target.name||'Пользователь');await sendMaxMessage(ADMIN_ID,'👤 <a href="max://user/'+encodeURIComponent(id)+'">'+name+'</a>',null,'html');
   return reply({ok:true,userId:id});
  }
  if(action==='reset'){state.owned=['board_original'];state.selectedBoard='board_original';state.resetAt=Date.now();}
  else if(action==='grant'){const board=String(p?.boardId||'');if(!BOARD_IDS.includes(board))return reply({ok:false,error:'BOARD_NOT_FOUND'},404);if(!state.owned.includes(board))state.owned.push(board);}
  else if(action==='revoke'){const board=String(p?.boardId||'');if(board==='board_original')return reply({ok:false,error:'ORIGINAL_CANNOT_BE_REMOVED'},400);if(!BOARD_IDS.includes(board))return reply({ok:false,error:'BOARD_NOT_FOUND'},404);state.owned=state.owned.filter(x=>x!==board);if(state.selectedBoard===board)state.selectedBoard='board_original';state.resetAt=Date.now();}
  else return reply({ok:false,error:'BAD_ACTION'},400);
  await saveInventory(id,state);return reply({ok:true,userId:id,shop:state});
 }catch(error){return errorResponse(error);}
}
export default {GET,POST,OPTIONS};
