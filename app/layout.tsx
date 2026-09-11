import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'รับส่ง — เซ็นรับ–ส่งเอกสาร',description:'บันทึกหลักฐานรับและส่งเอกสารบนมือถือ',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'รับส่ง',statusBarStyle:'default'},icons:{icon:'/icon.svg',apple:'/icon-192.png'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="th"><body>{children}</body></html>}
