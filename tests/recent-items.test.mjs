import {readFileSync} from 'node:fs';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
const js=ts.transpileModule(readFileSync(new URL('../lib/monday.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {recentWindow,Monday}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('window follows Bangkok midnight and handles month boundaries',()=>{
 assert.deepEqual(recentWindow(Date.parse('2026-09-10T17:00:00Z')),{since:'2026-08-12',today:'2026-09-11'});
 assert.deepEqual(recentWindow(Date.parse('2026-09-10T16:59:59Z')),{since:'2026-08-11',today:'2026-09-10'});
});
test('every initial status filter constrains dates and omits file/detail fields',async()=>{
 for(const filter of ['pending','done','all']){
  let query='';const api=new Monday('test',async(_,init)=>{query=JSON.parse(init.body).query;return Response.json({data:{boards:[{items_page:{items:[],cursor:null}}]}})});
  await api.list(undefined,filter);
  assert.match(query,/operator:and/);assert.match(query,/greater_than_or_equals/);assert.match(query,/lower_than_or_equal/);assert.match(query,/direction:desc/);assert.doesNotMatch(query,/signature|short_text259/);
 }
});
