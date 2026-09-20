import {handlePostings,handlePostingsCallback} from "../lib/postings.js";
function uid(u){return u?.user?.user_id??u?.user?.id??u?.message?.sender?.user_id??u?.message?.sender?.id??u?.callback?.user?.user_id??u?.callback?.user?.id??null}
function txt(u){return String(u?.message?.body?.text??u?.message?.text??u?.body?.text??u?.text??"").trim()}
export default async function handler(req,res){
 if(req.method==="GET")return res.status(200).json({ok:true,service:"MAXИГРА BOT WEBHOOK"});
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