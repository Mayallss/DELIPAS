import HandoffApp from './handoff-app';
import {requireChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
async function SignedInApp({returnTo}:{returnTo:string}){await requireChatGPTUser(returnTo);return <HandoffApp/>;}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const params=await searchParams;if(params.item&&params.share)return <HandoffApp publicLink/>;const returnTo=params.item&&/^\d+$/.test(params.item)?'/?item='+params.item:'/';return <SignedInApp returnTo={returnTo}/>;}
