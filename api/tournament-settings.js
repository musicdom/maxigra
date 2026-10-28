import { auth, body, errorResponse, redis, reply } from './_lib.js';

const ADMIN_ID='163701646';
const SETTINGS_KEY='checkers:tournament:prize-battle:settings:v1';
const DEFAULTS={title:'Битва за призы',lead:'Проверь свой уровень в русских шашках и поборись за призы. Купи билет, чтобы зарегистрировать участие в турнире.',startDate:'',endDate:'',datesNote:'Дата начала и окончания будут объявлены отдельно.',tableText:'Таблица и результаты появятся после объявления формата турнира.',rulesText:'Подробные правила, порядок определения победителей и выдачи призов будут опубликованы до старта.',prizeTitle:'Призы для лидеров',prizeText:'Фонд формируется из проданных билетов. Сумма и распределение призов будут опубликованы организатором до начала турнира.'};
const FIELDS={title:100,lead:700,datesNote:500,tableText:1200,rulesText:3000,prizeTitle:100,prizeText:2000};
function clean(value,max){return String(value??'').trim().slice(0,max)}
function validDate(value){const v=String(value||'');return !v||/^\\d{4}-\\d{2}-\\d{2}$/.test(v)}
async function readSettings(){const raw=await redis('GET',[SETTINGS_KEY]);let saved={};try{saved=raw?JSON.parse(raw):{}}catch{}return {...DEFAULTS,...saved}}
export async function OPTIONS(){return reply({ok:true})}
export async function GET(){try{return reply({ok:true,settings:await readSettings()})}catch(error){return errorResponse(error)}}
export async function POST(request){try{const payload=await body(request);const user=auth(request,payload?.initData||'');if(String(user.id)!==ADMIN_ID)throw Object.assign(new Error('FORBIDDEN'),{status:403});const startDate=clean(payload.startDate,10),endDate=clean(payload.endDate,10);if(!validDate(startDate)||!validDate(endDate))return reply({ok:false,error:'INVALID_DATE'},400);if(startDate&&endDate&&endDate<startDate)return reply({ok:false,error:'END_DATE_BEFORE_START'},400);const settings={};for(const [key,max] of Object.entries(FIELDS))settings[key]=clean(payload[key]||DEFAULTS[key],max);settings.startDate=startDate;settings.endDate=endDate;settings.updatedAt=Date.now();settings.updatedBy=String(user.id);await redis('SET',[SETTINGS_KEY,JSON.stringify(settings)]);return reply({ok:true,settings})}catch(error){return errorResponse(error)}}
export default {GET,POST,OPTIONS};