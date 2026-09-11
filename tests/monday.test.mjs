import {readFileSync} from 'node:fs';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
const js=ts.transpileModule(readFileSync(new URL('../lib/monday.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {BOARD,STATUS,FILES,assertItem,saveHandoff,signContext,verifyContext,validateInput,OUTCOMES}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
function fixture(){return {id:'2856139276',board:{id:BOARD},parent_item:null,updated_at:'2026-09-10T02:42:21Z',column_values:[{id:STATUS,value:null,text:'รอดำเนินการ'},{id:FILES,value:null}]}}
const body={itemId:'2856139276',name:'ผู้ทดสอบ',outcome:'1',signature:'data:image/png;base64,iVBORw0KGgoAAA',requestId:'d86d20ec-9aeb-4bc3-a74e-bf102e2db3a0',context:'test'};
const context={itemId:body.itemId,statusValue:'',updatedAt:'2026-09-10T02:42:21Z'};
test('reject other boards and subitems',()=>{assert.throws(()=>assertItem({...fixture(),board:{id:'1'}}));assert.throws(()=>assertItem({...fixture(),parent_item:{id:'1'}}))});
test('reject unsupported status and blank signer',()=>{assert.throws(()=>validateInput({...body,outcome:'5'}));assert.throws(()=>validateInput({...body,name:' '}))});
test('signed contexts reject tampering and expiration',async()=>{const token=await signContext({itemId:body.itemId,exp:Date.now()+10000},'secret');assert.equal((await verifyContext(token,'secret')).itemId,body.itemId);await assert.rejects(verifyContext(token,'wrong'));await assert.rejects(verifyContext(await signContext({exp:0},'secret'),'secret'))});
test('upload precedes status mutation',async()=>{const order=[];const api={item:async()=>({item:fixture()}),upload:async()=>order.push('upload'),setStatus:async()=>order.push('status')};assert.equal((await saveHandoff(api,body,context)).ok,true);assert.deepEqual(order,['upload','status'])});
test('upload failure cannot change status',async()=>{let writes=0;const api={item:async()=>({item:fixture()}),upload:async()=>{throw Error('timeout')},setStatus:async()=>writes++};await assert.rejects(saveHandoff(api,body,context));assert.equal(writes,0)});
test('changed item rejected before any upload',async()=>{let writes=0;const api={item:async()=>({item:{...fixture(),updated_at:'later'}}),upload:async()=>writes++};await assert.rejects(saveHandoff(api,body,context));assert.equal(writes,0)});
test('retry reconciles existing proof without another upload',async()=>{let uploads=0,writes=0;const item=fixture();item.column_values[1].value=JSON.stringify({files:[{name:`handoff-${body.itemId}-${body.requestId}-1-test.png`}]});item.updated_at='changed-by-upload';const api={item:async()=>({item}),upload:async()=>uploads++,setStatus:async()=>writes++};await saveHandoff(api,body,context);assert.equal(uploads,0);assert.equal(writes,1)});
test('completed retry does not write again',async()=>{const item=fixture();item.column_values[0]={id:STATUS,value:'{"index":1}',text:OUTCOMES['1']};item.column_values[1].value=JSON.stringify({files:[{name:`handoff-${body.itemId}-${body.requestId}-1-test.png`}]});const api={item:async()=>({item})};assert.equal((await saveHandoff(api,body,context)).replayed,true)});
test('status change during upload is preserved',async()=>{let reads=0,writes=0;const api={item:async()=>{const item=fixture();if(reads++)item.column_values[0].value='{"index":2}';return {item}},upload:async()=>{},setStatus:async()=>writes++};await assert.rejects(saveHandoff(api,body,context));assert.equal(writes,0)});
