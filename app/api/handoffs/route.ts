import {Monday,saveHandoff,validateInput,verifyContext,AppError} from '@/lib/monday';
import {runtime,failure,json} from '@/lib/runtime';
export async function POST(request:Request){try{
 const token=runtime(request,true,false);
 if(Number(request.headers.get('content-length'))>1_600_000)throw new AppError(413,'ไฟล์ลายเซ็นใหญ่เกินไป');
 const raw=await request.text();if(raw.length>1_600_000)throw new AppError(413,'ไฟล์ลายเซ็นใหญ่เกินไป');
 const body=validateInput(JSON.parse(raw));const context=await verifyContext(body.context,token);
 return json(await saveHandoff(new Monday(token),body,context));
 }catch(e){return failure(e)}}
