const ADMIN_ID=String(process.env.MAX_ADMIN_USER_ID||process.env.MAX_OWNER_USER_ID||"163701646");
const TOKEN=process.env.MAX_BOT_TOKEN||process.env.MAX_BOT_TOKEN_VALUE;
const CHANNEL_ID=process.env.MAXIGRA_CHANNEL_ID||process.env.MAX_CHANNEL_ID||process.env.MAX_BOT_CHANNEL_ID;
async function max(method,path,body){if(!TOKEN)throw new Error("MAX_BOT_TOKEN не настроен");const r=await fetch("https://platform-api2.max.ru"+path,{method,headers:{Authorization:TOKEN,"Content-Type":"application/json",Accept:"application/json"},body:body==null?undefined:JSON.stringify(body)});const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{}if(!r.ok)throw new Error("MAX API HTTP "+r.status+": "+raw.slice(0,500));return data}
const kb=rows=>rows.map(row=>row.map(b=>({type:"callback",text:b.text,payload:b.payload})));
const send=(id,text,rows)=>max("POST","/messages?user_id="+encodeURIComponent(String(id)),{text,...(rows?{attachments:[{type:"inline_keyboard",payload:{buttons:kb(rows)}}]}:{})});
const states=new Map(),getState=id=>states.get(String(id)),setState=(id,s)=>states.set(String(id),s),clearState=id=>states.delete(String(id));
function validUrl(v){try{const u=new URL(String(v||"").trim());return(u.protocol==="http:"||u.protocol==="https:")&&u.hostname?u.toString():null}catch{return null}}
async function publish(s){if(!CHANNEL_ID)throw new Error("Не задан MAXIGRA_CHANNEL_ID в Vercel Environment Variables.");const body={text:s.text,notify:true};if(s.buttonText&&s.buttonUrl){const u=validUrl(s.buttonUrl);if(!u)throw new Error("Ссылка должна начинаться с http:// или https://");body.attachments=[{type:"inline_keyboard",payload:{buttons:[[{type:"link",text:s.buttonText,url:u}]]}}]}return max("POST","/messages?chat_id="+encodeURIComponent(String(CHANNEL_ID)),body)}
const cancel=[[{text:"❌ Отмена",payload:"postings:cancel"}]];
const preview=[[{text:"✏️ Изменить текст",payload:"postings:edit_text"}],[{text:"🔗 Изменить кнопку",payload:"postings:edit_button"}],[{text:"🗑 Удалить кнопку",payload:"postings:remove_button"}],[{text:"✅ Опубликовать",payload:"postings:publish"}],[{text:"❌ Отмена",payload:"postings:cancel"}]];
const show=(id,s)=>send(id,"👀 Предпросмотр:\n\n"+s.text+(s.buttonText?"\n\n🔘 "+s.buttonText+"\n"+s.buttonUrl:""),preview);
export async function handlePostings(id,text){
 if(String(id)!==ADMIN_ID)return false;const v=String(text||"").trim();
 if(/^\/?post(?:ing|ings)(?:@\S+)?$/i.test(v)){setState(id,{step:"text",text:"",buttonText:"",buttonUrl:""});await send(id,"📝 Создание публикации\n\nПришли текст поста.",cancel);return true}
 const s=getState(id);if(!s)return false;
 if(s.step==="text"){if(!v){await send(id,"❗ Текст поста не может быть пустым.",cancel);return true}s.text=v;s.step="choice";setState(id,s);await send(id,"Текст получен. Добавить кнопку со ссылкой?",[[{text:"🔗 Добавить кнопку",payload:"postings:add_button"},{text:"➡️ Без кнопки",payload:"postings:no_button"}],...cancel]);return true}
 if(s.step==="button_text"){if(!v){await send(id,"❗ Текст кнопки не может быть пустым.",cancel);return true}s.buttonText=v;s.step="button_url";setState(id,s);await send(id,"🔗 Теперь пришли ссылку (http:// или https://).",cancel);return true}
 if(s.step==="button_url"){if(!validUrl(v)){await send(id,"❗ Некорректная ссылка. Нужен полный URL с http:// или https://.",cancel);return true}s.buttonUrl=v;s.step="confirm";setState(id,s);await show(id,s);return true}
 if(s.step==="edit_text"){if(!v){await send(id,"❗ Текст поста не может быть пустым.",cancel);return true}s.text=v;s.step="confirm";setState(id,s);await show(id,s);return true}
 if(s.step==="edit_button_text"){if(!v){await send(id,"❗ Текст кнопки не может быть пустым.",cancel);return true}s.buttonText=v;s.step="confirm";setState(id,s);await show(id,s);return true}
 if(s.step==="edit_button_url"){if(!validUrl(v)){await send(id,"❗ Некорректная ссылка.",cancel);return true}s.buttonUrl=v;s.step="confirm";setState(id,s);await show(id,s);return true}
 return false
}
export async function handlePostingsCallback(id,payload,callbackId){
 if(String(id)!==ADMIN_ID)return false;
 if(callbackId){try{await max("POST","/answers?callback_id="+encodeURIComponent(String(callbackId)),{})}catch(e){console.error("callback ack",e)}}
 const s=getState(id);if(!s)return true;const a=String(payload||"");
 if(a==="postings:cancel"){clearState(id);await send(id,"❌ Создание публикации отменено.");return true}
 if(a==="postings:add_button"&&s.step==="choice"){s.step="button_text";setState(id,s);await send(id,"🔘 Напиши текст кнопки.",cancel);return true}
 if(a==="postings:no_button"&&s.step==="choice"){s.buttonText="";s.buttonUrl="";s.step="confirm";setState(id,s);await show(id,s);return true}
 if(a==="postings:edit_text"&&s.step==="confirm"){s.step="edit_text";setState(id,s);await send(id,"✏️ Пришли новый текст поста.",cancel);return true}
 if(a==="postings:edit_button"&&s.step==="confirm"){if(s.buttonText&&s.buttonUrl){s.step="button_editor";setState(id,s);await send(id,"🔗 Что изменить?",[[{text:"✏️ Текст",payload:"postings:edit_button_text"},{text:"🌐 Ссылка",payload:"postings:edit_button_url"}],[{text:"↩️ Назад",payload:"postings:back"}],...cancel])}else{s.step="button_text";setState(id,s);await send(id,"🔘 Напиши текст кнопки.",cancel)}return true}
 if(a==="postings:edit_button_text"&&s.step==="button_editor"){s.step="edit_button_text";setState(id,s);await send(id,"✏️ Новый текст кнопки.",cancel);return true}
 if(a==="postings:edit_button_url"&&s.step==="button_editor"){s.step="edit_button_url";setState(id,s);await send(id,"🌐 Новая ссылка.",cancel);return true}
 if(a==="postings:back"){s.step="confirm";setState(id,s);await show(id,s);return true}
 if(a==="postings:remove_button"&&s.step==="confirm"){s.buttonText="";s.buttonUrl="";setState(id,s);await show(id,s);return true}
 if(a==="postings:publish"&&s.step==="confirm"){try{await publish(s);clearState(id);await send(id,"✅ Пост опубликован в канал MAXИГРЫ.")}catch(e){await send(id,"❗ Не удалось опубликовать пост.\n\n"+e.message,preview)}return true}
 return true
}