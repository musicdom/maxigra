import { auth, body, errorResponse, redis, reply } from './_lib.js';

const ADMIN_ID='163701646';
const USERS_KEY='checkers:users';
const INVENTORY_KEY=id=>`checkers:shop:user:${id}`;
const CATALOG={
  board_90s:{title:'СВО'},board_svo:{title:'90-е'},board_max:{title:'MAX'},board_orbita:{title:'ОРБИТА'},board_original:{title:'Оригинал'}
};
const BOARD_IDS=Object.keys(CATALOG);

function admin(request){
  const user=auth(request);
  if(String(user.id)!==ADMIN_ID)throw Object.assign(new Error('FORBIDDEN'),{status:403});
  return user;
}
async function getUsers(){
  const raw=await redis('HGETALL',[USERS_KEY]);
  const out=[];
  if(Array.isArray(raw)){
    for(let i=0;i<raw.length;i+=2){try{const v=JSON.parse(raw[i+1]);if(v?.id)out.push(v)}catch{}}
  }else if(raw&&typeof raw==='object'){
    for(const [id,value] of Object.entries(raw)){try{const v=JSON.parse(value);if(v?.id)out.push(v);else out.push({id})}catch{out.push({id})}}
  }
  return out.sort((a,b)=>Number(b.lastSeenAt||0)-Number(a.lastSeenAt||0));
}
async function readInventory(id){
  const raw=await redis('GET',[INVENTORY_KEY(id)]);
  let state={};try{state=raw?JSON.parse(raw):{}}catch{}
  state.owned=Array.isArray(state.owned)?state.owned.filter(x=>BOARD_IDS.includes(x)):[];
  if(!state.owned.includes('board_original'))state.owned.push('board_original');
  state.selectedBoard=BOARD_IDS.includes(state.selectedBoard)&&state.owned.includes(state.selectedBoard)?state.selectedBoard:'board_original';
  return state;
}
async function saveInventory(id,state){
  await redis('SET',[INVENTORY_KEY(id),JSON.stringify({
    owned:state.owned,selectedBoard:state.selectedBoard,
    selectedPieces:state.selectedPieces||'default',ai:Number(state.ai)||1,hints:Number(state.hints)||0
  })]);
}
export async function GET(request){
  try{
    admin(request);
    const users=await getUsers();
    const accounts=[];
    for(const u of users){accounts.push({...u,shop:await readInventory(u.id)})}
    return reply({ok:true,accounts,boards:CATALOG});
  }catch(error){return errorResponse(error);}
}
export async function POST(request){
  try{
    admin(request);
    const p=await body(request);
    const id=String(p?.userId||'');
    if(!id)return reply({ok:false,error:'USER_ID_REQUIRED'},400);
    const state=await readInventory(id);
    const action=String(p?.action||'');
    if(action==='reset'){
      state.owned=['board_original'];state.selectedBoard='board_original';
    }else if(action==='grant'){
      const board=String(p?.boardId||'');
      if(!BOARD_IDS.includes(board))return reply({ok:false,error:'BOARD_NOT_FOUND'},404);
      if(!state.owned.includes(board))state.owned.push(board);
    }else if(action==='revoke'){
      const board=String(p?.boardId||'');
      if(board==='board_original')return reply({ok:false,error:'ORIGINAL_CANNOT_BE_REMOVED'},400);
      state.owned=state.owned.filter(x=>x!==board);
      if(state.selectedBoard===board)state.selectedBoard='board_original';
    }else return reply({ok:false,error:'BAD_ACTION'},400);
    await saveInventory(id,state);
    return reply({ok:true,userId:id,shop:state});
  }catch(error){return errorResponse(error);}
}
export default {GET,POST};
