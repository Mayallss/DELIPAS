import {AppError,Monday,normalize,parse,signContext,verifyContext,BOARD,recentWindow} from '@/lib/monday';
import {runtime,failure,json} from '@/lib/runtime';
export async function GET(request:Request){try{
 const url=new URL(request.url);const id=url.searchParams.get('id');const share=url.searchParams.get('share');const publicItem=!!id&&!!share;const token=runtime(request,false,!publicItem);const api=new Monday(token);
 if(id){if(publicItem){const shared=await verifyContext(share!,token);if(shared.itemId!==id)throw new AppError(403,'ลิงก์นี้ไม่ตรงกับรายการเอกสาร');}const {item,labels}=await api.item(id);const result=normalize(item,labels);return json({item:result,context:publicItem?share:await signContext({itemId:id,statusValue:result.statusValue,updatedAt:result.updatedAt,exp:Date.now()+3600000},token),publicItem});}
 const filter=url.searchParams.get('filter')||'pending';const window=recentWindow();
 let cursor:string|undefined;const supplied=url.searchParams.get('cursor');if(supplied){const c=await verifyContext(supplied,token);if(c.board!==BOARD||c.filter!==filter||c.since!==window.since||c.today!==window.today)throw new AppError(409,'ช่วงวันที่เปลี่ยนแล้ว กรุณาโหลดรายการใหม่');cursor=c.cursor;}
 const board=await api.list(cursor,url.searchParams.get('filter')||'pending');const labels=parse(board.columns[0]?.settings_str)?.labels||[];
 return json({board:board.name,window,items:board.items_page.items.filter((i:any)=>!i.parent_item).map((i:any)=>normalize(i,labels)),cursor:board.items_page.cursor?await signContext({board:BOARD,filter,...window,cursor:board.items_page.cursor,exp:Date.now()+1800000},token):null});
 }catch(e){return failure(e)}}
