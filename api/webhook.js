import fs from "fs";
import https from "https";
import path from "path";
import {handlePostings,handlePostingsCallback,handleChannelUpdate} from "../lib/postings.js";

function maxRequest({token,method="GET",apiPath,body=null}){
 return new Promise((resolve,reject)=>{
  const bodyText=body?JSON.stringify(body):null;
  const ca=fs.readFileSync(path.join(process.cwd(),"certs","russian_trusted_root_ca.cer"));
  const req=https.request({
   hostname:"platform-api2.max.ru",path:apiPath,method,
   headers:{Authorization:token,Accept:"application/json","Content-Type":"application/json",...(bodyText?{"Content-Length":Buffer.byteLength(bodyText)}:{})},
   ca,rejectUnauthorized:true,timeout:15000
  },r=>{
   let raw="";r.setEncoding("utf8");r.on("data",c=>raw+=c);r.on("end",()=>{
    let data=null;try{data=raw?JSON.parse(raw):null}catch{}
    resolve({status:r.statusCode,ok:r.statusCode>=200&&r.statusCode<300,data,raw});
   });
  });
  req.on("timeout",()=>req.destroy(new Error("MAX API timeout")));
  req.on("error",reject);
  if(bodyText)req.write(bodyText);
  req.end();
 });
}
function uid(u){return u?.callback?.user?.user_id??u?.callback?.user?.id??u?.user?.user_id??u?.user?.id??u?.message?.sender?.user_id??u?.message?.sender?.id??null}
function txt(u){return String(u?.message?.body?.text??u?.message?.text??u?.body?.text??u?.text??"").trim()}
export default async function handler(req,res){
 if(req.method==="GET"){
  try{
   const token=process.env.MAX_BOT_TOKEN||process.env.MAX_BOT_TOKEN_VALUE;
   if(!token)return res.status(500).json({ok:false,error:"MAX_BOT_TOKEN not configured"});
   const r=await maxRequest({token,method:"POST",apiPath:"/subscriptions",body:{url:"https://maxigra.vercel.app/api/webhook",update_types:["bot_added","bot_removed","message_created","message_removed","message_callback","bot_started"]}});
   return res.status(200).json({ok:r.ok,webhook:"https://maxigra.vercel.app/api/webhook",max_status:r.status,result:r.data||r.raw});
  }catch(e){console.error("MAX SUBSCRIBE ERROR",e);return res.status(500).json({ok:false,error:e.message})}
 }
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
 try{
  let root=req.body||{};if(typeof root==="string"){try{root=JSON.parse(root)}catch{return res.status(200).json({ok:false,error:"Invalid JSON"})}}
  const updates=Array.isArray(root?.updates)?root.updates:[root];
  for(const u of updates){
   const type=u?.update_type||u?.type||root?.update_type||root?.type||"";
   const id=uid(u);console.log("MAXИГРА WEBHOOK",{type,id,chat_id:u?.chat_id??u?.message?.recipient?.chat_id??null,is_channel:u?.is_channel??u?.message?.recipient?.type});
   await handleChannelUpdate(u);
   if(!id)continue;
   if(type==="message_callback"){await handlePostingsCallback(id,u?.callback?.payload??u?.payload??"",u?.callback?.callback_id??u?.callback?.id??null);continue}
   if(type==="message_created")await handlePostings(id,txt(u));
  }
  return res.status(200).json({ok:true,received:true});
 }catch(e){console.error("MAXИГРА WEBHOOK ERROR",e);return res.status(200).json({ok:false,received:false,error:e.message})}
}