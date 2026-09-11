export const BOARD = '5031213491';
export const STATUS = 'single_select_1';
export const FILES = 'signature';
export const OUTCOMES = { '1':'ได้รับเอกสารครบถ้วน/ส่งมอบเอกสารแล้ว', '0':'รับเอกสารไม่ครบถ้วน', '2':'ไม่ได้รับเอกสาร/ไม่ได้ส่งมอบเอกสาร' } as const;
export type Outcome = keyof typeof OUTCOMES;
export class AppError extends Error { constructor(public status:number,message:string){super(message);} }
export const columns = ['dropdown','text0','short_text308','short_text','single_select5','date','single_select1',STATUS,'item_id','dropdown1','short_text7',FILES,'short_text1','short_text3','short_text2','short_text0','short_text71','short_text8','short_text85','short_text89','short_text852','short_text00','short_text4','short_text20','short_text25','short_text259','short_text36','short_text30'];
const fields = `id name updated_at board{id} parent_item{id} group{id title} column_values(ids:${JSON.stringify(columns)}) {id text value}`;
const listFields = `id name updated_at board{id} parent_item{id} column_values(ids:${JSON.stringify(['dropdown','text0','date','single_select1','single_select5',STATUS])}) {id text value}`;
export function recentWindow(now=Date.now()){
 const today=new Date(now+7*3600000).toISOString().slice(0,10);
 const since=new Date(Date.parse(today+'T00:00:00Z')-30*86400000).toISOString().slice(0,10);
 return {since,today};
}
export function parse(value:string|null|undefined){try{return JSON.parse(value||'null')}catch{return null}}
export function value(item:any,id:string){return item.column_values.find((v:any)=>v.id===id)}
export function assertItem(item:any){if(!item||item.board?.id!==BOARD||item.parent_item)throw new AppError(404,'ไม่พบรายการหลักในบอร์ดที่อนุญาต');}
export function validateInput(body:any){
 if(!body||!/^\d{1,20}$/.test(body.itemId)||!['0','1','2'].includes(body.outcome)||typeof body.name!=='string'||!body.name.trim()||body.name.length>120||typeof body.signature!=='string'||body.signature.length>1_500_000||!body.signature.startsWith('data:image/png;base64,iVBORw0KGgo')||!/^[-a-z0-9]{36}$/i.test(body.requestId)||typeof body.context!=='string') throw new AppError(400,'ข้อมูลไม่ครบหรือรูปแบบลายเซ็นไม่ถูกต้อง');
 return {...body,name:body.name.trim()};
}
export class Monday {
 constructor(private token:string,private transport:typeof fetch=fetch){}
 async call(query:string,variables:Record<string,unknown>={},key?:string){
  const response=await this.transport('https://api.monday.com/v2',{method:'POST',headers:{Authorization:this.token,'API-Version':'2026-07','Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(25000)});
  const data:any=await response.json();
  if(!response.ok||data.errors)throw new AppError(response.status===429?429:502,'ติดต่อ monday ไม่สำเร็จ กรุณาลองอีกครั้ง');
  return data.data;
 }
 async list(cursor?:string,filter='pending'){
  const {since,today}=recentWindow();
  const statusRule=filter==='pending'?',{column_id:"single_select_1",compare_value:[5],operator:any_of}':filter==='done'?',{column_id:"single_select_1",compare_value:[0,1,2],operator:any_of}':'';
  const rule=`{operator:and,rules:[{column_id:"date",compare_value:["EXACT","${since}"],operator:greater_than_or_equals},{column_id:"date",compare_value:["EXACT","${today}"],operator:lower_than_or_equal}${statusRule}],order_by:[{column_id:"date",direction:desc}]}`;
  const data=await this.call(`query($cursor:String){boards(ids:[${BOARD}]){name columns(ids:["dropdown"]){settings_str} items_page(limit:25,cursor:$cursor${cursor?'':`,query_params:${rule}`}){cursor items{${listFields}}}}}`,{cursor:cursor||null});
  if(!data.boards?.[0])throw new AppError(403,'บัญชีนี้ไม่มีสิทธิ์อ่านบอร์ดที่กำหนด');
  return data.boards[0];
 }
 async item(id:string){
  if(!/^\d{1,20}$/.test(id))throw new AppError(400,'เลขรายการไม่ถูกต้อง');
  const data=await this.call(`query($ids:[ID!]){boards(ids:[${BOARD}]){columns(ids:["dropdown","single_select_1","signature"]){id type settings_str} items_page(limit:1,query_params:{ids:$ids}){items{${fields}}}}}`,{ids:[id]});
  const board=data.boards?.[0];const item=board?.items_page.items[0];assertItem(item);
  const statusColumn=board.columns.find((c:any)=>c.id===STATUS);const fileColumn=board.columns.find((c:any)=>c.id===FILES);const statusLabels=parse(statusColumn?.settings_str)?.labels;
  if(statusColumn?.type!=='status'||fileColumn?.type!=='file'||Object.entries(OUTCOMES).some(([index,label])=>statusLabels?.[index]!==label))throw new AppError(409,'คอลัมน์หรือชื่อสถานะในบอร์ดเปลี่ยนไป กรุณาให้ผู้ดูแลตรวจการเชื่อมต่อ');
  return {item,labels:parse(board.columns.find((c:any)=>c.id==='dropdown')?.settings_str)?.labels||[]};
 }
 async upload(id:string,png:string,filename:string,key:string){
  const bytes=Uint8Array.from(atob(png.split(',')[1]),c=>c.charCodeAt(0));
  const form=new FormData();
  form.append('query',`mutation($file:File!){add_file_to_column(item_id:${id},column_id:"${FILES}",file:$file){id}}`);
  form.append('map',JSON.stringify({image:'variables.file'}));
  form.append('image',new Blob([bytes],{type:'image/png'}),filename);
  const response=await this.transport('https://api.monday.com/v2/file',{method:'POST',headers:{Authorization:this.token,'API-Version':'2026-07','Idempotency-Key':key},body:form,signal:AbortSignal.timeout(45000)});
  const data:any=await response.json();if(!response.ok||data.errors||!data.data?.add_file_to_column?.id)throw new AppError(502,'ยังยืนยันการบันทึกหลักฐานไม่ได้ กรุณากดส่งซ้ำด้วยรายการเดิม');return data.data.add_file_to_column.id;
 }
 async setStatus(id:string,outcome:Outcome,key:string){return this.call(`mutation($item:ID!,$value:JSON!){change_column_value(board_id:${BOARD},item_id:$item,column_id:"${STATUS}",value:$value){id}}`,{item:id,value:JSON.stringify({index:Number(outcome)})},key);}
}
export function normalize(item:any,labels:any[]){
 assertItem(item);const text=(id:string)=>value(item,id)?.text||'';
 const selected=parse(value(item,'dropdown')?.value)?.ids||[];
 const customer=text('dropdown')||selected.map((id:number)=>labels.find((l:any)=>l.id===id)?.name).filter(Boolean).join(', ')||text('text0');
 const pairs=[['ใบกำกับภาษี','short_text1','short_text3'],['ใบเสร็จรับเงิน','short_text2','short_text0'],['ใบสำคัญรับเงิน','short_text71','short_text8'],['ใบสำคัญจ่าย','short_text85','short_text89'],['เช็ค','short_text852','short_text00'],['แบบนำส่งประกันสังคม','short_text4','short_text20'],['Bank Statement','short_text25','short_text259'],['เอกสารอื่นๆ','short_text36','short_text30']];
 return {id:item.id,name:item.name,customer:customer||item.name,date:text('date'),period:text('single_select1'),type:text('single_select5'),location:text('short_text308'),contact:text('short_text'),note:text('short_text7'),status:text(STATUS),statusValue:value(item,STATUS)?.value||'',updatedAt:item.updated_at,group:item.group?.title,files:parse(value(item,FILES)?.value)?.files||[],documents:pairs.map(([title,a,b])=>({title,detail:text(a),quantity:text(b)})).filter(d=>d.detail||d.quantity)};
}
export async function signContext(data:unknown,secret:string){const payload=btoa(unescape(encodeURIComponent(JSON.stringify(data))));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));return payload+'.'+btoa(String.fromCharCode(...new Uint8Array(sig)));}
export async function verifyContext(token:string,secret:string){try{const [payload,sig,...rest]=token.split('.');if(rest.length)throw 0;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(sig),c=>c.charCodeAt(0)),new TextEncoder().encode(payload)))throw 0;const data=JSON.parse(decodeURIComponent(escape(atob(payload))));if(!Number.isFinite(data.exp)||data.exp<Date.now())throw 0;return data;}catch{throw new AppError(409,'ข้อมูลหมดอายุ กรุณาเปิดรายการใหม่ก่อนบันทึก');}}
export async function saveHandoff(api:Monday,body:any,context:any){
 validateInput(body);if(context.itemId!==body.itemId)throw new AppError(403,'ข้อมูลยืนยันไม่ตรงกับรายการ');
 const {item}=await api.item(body.itemId);const files=parse(value(item,FILES)?.value)?.files||[];
 const prefix=`handoff-${body.itemId}-${body.requestId}-${body.outcome}-`;
 const already=files.some((f:any)=>f.name?.startsWith(prefix));
 const currentStatus=value(item,STATUS)?.text||'';
 if(already&&currentStatus===OUTCOMES[body.outcome as Outcome])return {ok:true,replayed:true,status:currentStatus};
 if((value(item,STATUS)?.value||'')!==context.statusValue||(!already&&item.updated_at!==context.updatedAt))throw new AppError(409,'รายการมีการแก้ไขใน monday กรุณาเปิดตรวจสอบใหม่ก่อนบันทึก');
 if(!already)await api.upload(body.itemId,body.signature,`${prefix}${encodeURIComponent(body.name).slice(0,150)}.png`,prefix+'upload');
 // Re-read after upload so a visible external status change is not blindly overwritten.
 const fresh=await api.item(body.itemId);
 if((value(fresh.item,STATUS)?.value||'')!==context.statusValue)throw new AppError(409,'เก็บหลักฐานแล้ว แต่สถานะเปลี่ยนระหว่างบันทึก กรุณาตรวจสอบใน monday');
 await api.setStatus(body.itemId,body.outcome,prefix+'status');
 return {ok:true,status:OUTCOMES[body.outcome as Outcome]};
}

