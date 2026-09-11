import { env } from 'cloudflare:workers';
import { AppError } from './monday';
export function runtime(request:Request,write=false,requireUser=true){
 if(requireUser&&!request.headers.get('oai-authenticated-user-id'))throw new AppError(401,'กรุณาเข้าสู่ระบบเพื่อเปิดรายการ');
 if(write&&requireUser){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw new AppError(403,'ไม่อนุญาตให้บันทึกจากเว็บไซต์อื่น');}
 const token=(env as Record<string,string>).MONDAY_API_TOKEN;if(!token)throw new AppError(503,'ยังไม่ได้ตั้งค่าการเชื่อมต่อ monday');return token;
}
export function failure(error:unknown){return Response.json({error:error instanceof AppError?error.message:'ติดต่อระบบไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:error instanceof AppError?error.status:502,headers:{'Cache-Control':'no-store'}})}
export function json(data:unknown){return Response.json(data,{headers:{'Cache-Control':'no-store'}})}
