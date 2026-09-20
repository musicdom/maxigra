import {handlePostings,handlePostingsCallback} from "../lib/postings.js";
function uid(u){return u?.user?.user_id??u?.user?.id??u?.message?.sender?.user_id??u?.message?.sender?.id??u?.callback?.user?.user_id??u?.callback?.user?.id??null}
function txt(u){return String(u?.message?.body?.text??u?.message?.text??u?.body?.text??u?.text??"").trim()}
export default async function handler(req,res){
 if(req.method==="GET"){try{const token=process.env.MAX_BOT_TOKEN||process.env.MAX_BOT_TOKEN_VALUE;if(!token) return res.status(500).json({ok:false,error:"MAX_BOT_TOKEN not configured"});const r=await fetch("https://platform-api2.max.ru/subscriptions",{method:"POST",headers:{Authorization:token,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({url:"https://maxigra.vercel.app/api/webhook",update_types:["message_created","message_callback","bot_started"]})});const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{};return res.status(200).json({ok:r.ok,webhook:"https://maxigra.vercel.app/api/webhook",max_status:r.status,result:data||raw})}catch(e){return res.status(500).json({ok:false,error:e.message})}}
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
 try{let root=req.body||{};if(typeof root==="string"){try{root=JSON.parse(root)}catch{return res.status(200).json({ok:false,error:"Invalid JSON"})}}
 const updates=Array.isArray(root?.updates)?root.updates:[root];
 for(const u of updates){const type=u?.update_type||u?.type||root?.update_type||root?.type||"";const id=uid(u);console.log("MAXИГРА WEBHOOK",{type,id});
  if(!id)continue;
  if(type==="message_callback"){await handlePostingsCallback(id,u?.callback?.payload??u?.payload??"",u?.callback?.callback_id??u?.callback?.id??null);continue}
  if(type==="message_created")await handlePostings(id,txt(u));
 }
 return res.status(200).json({ok:true,received:true})
 }catch(e){console.error("MAXИГРА WEBHOOK ERROR",e);return res.status(200).json({ok:false,received:false,error:e.message})}
}