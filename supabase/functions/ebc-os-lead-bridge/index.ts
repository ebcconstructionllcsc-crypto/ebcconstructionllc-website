// Read-only bridge for the existing EBC website intake. No SDK or external dependency.
// Deploy with verify_jwt=false: authentication below uses a separate server-only token.
declare const Deno: {env:{get:(name:string)=>string|undefined};serve:(handler:(request:Request)=>Promise<Response>)=>void};

const PROJECT_ORIGIN='https://tcjtodjxxszhhmsvqtge.supabase.co';
const MAX_BODY=4096,MAX_JSON=2*1024*1024,MAX_MEDIA=15*1024*1024,PAGE_SIZE=25,MAX_FILES=12;
const MIME_TYPES=['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const HEADERS={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};
const LEAD_COLUMNS='id,full_name,phone,email,service_type,project_address,project_description,preferred_timeline,source,consent_to_contact,status,created_at,updated_at';
const FILE_COLUMNS='id,lead_id,file_name,mime_type,size_bytes,source,created_at,storage_path';
type Row=Record<string,unknown>;
type Input={action:'status'}|{action:'list';cursor:{at:string;id:string}|null}|{action:'detail';leadId:string}|{action:'media';leadId:string;fileId:string};
type Dependencies={fetch?:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>;env?:(name:string)=>string|undefined;now?:()=>number};
class BridgeError extends Error {status:number;code:string;constructor(status:number,code:string){super(code);this.status=status;this.code=code;}}
const object=(value:unknown):value is Row=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clip=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):'';
const date=(value:unknown)=>typeof value==='string'&&TIMESTAMP.test(value)&&Number.isFinite(Date.parse(value));
const websiteSource=(value:unknown)=>typeof value==='string'&&['website','website lead'].includes(value.trim().toLowerCase());
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:HEADERS});
const fail=(status:number,code:string)=>{throw new BridgeError(status,code);};

async function bytes(stream:ReadableStream<Uint8Array>|null,limit:number,signal:AbortSignal){
 if(!stream)return new Uint8Array();
 const reader=stream.getReader(),parts:Uint8Array[]=[];let length=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
 try{for(;;){if(signal.aborted)fail(504,'bridge_timeout');const chunk=await reader.read();if(signal.aborted)fail(504,'bridge_timeout');if(chunk.done)break;length+=chunk.value.byteLength;if(length>limit){await reader.cancel();fail(413,'response_too_large');}parts.push(chunk.value);}}
 finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
 const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.byteLength;}return result;
}
async function sha256(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function equalHash(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<64;i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0;}
function cursorEncode(at:string,id:string){return btoa(JSON.stringify({at,id})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function cursorDecode(value:unknown){
 if(value===undefined)return null;
 if(typeof value!=='string'||!value.length||value.length>1000||!/^[A-Za-z0-9_-]+$/.test(value))return fail(400,'invalid_cursor');
 try{const item=JSON.parse(atob(value.replaceAll('-','+').replaceAll('_','/')));if(!object(item)||Object.keys(item).sort().join(',')!=='at,id'||!date(item.at)||typeof item.id!=='string'||!UUID.test(item.id))return fail(400,'invalid_cursor');return {at:item.at as string,id:item.id.toLowerCase()};}catch{return fail(400,'invalid_cursor');}
}
function inputView(value:unknown):Input{
 if(!object(value)||typeof value.action!=='string')return fail(400,'invalid_request');
 const action=value.action,keys=Object.keys(value).sort().join(',');
 if(action==='status'&&keys==='action')return {action};
 if(action==='list'&&(keys==='action'||keys==='action,cursor'))return {action,cursor:cursorDecode(value.cursor)};
 if((action==='detail'&&keys==='action,leadId'||action==='media'&&keys==='action,fileId,leadId')&&typeof value.leadId==='string'&&UUID.test(value.leadId)&&(action==='detail'||typeof value.fileId==='string'&&UUID.test(value.fileId))){if(action==='detail')return {action,leadId:value.leadId.toLowerCase()};return {action:'media',leadId:value.leadId.toLowerCase(),fileId:(value.fileId as string).toLowerCase()};}
 return fail(400,'invalid_request');
}
function allowedLead(row:unknown):row is Row{return object(row)&&typeof row.id==='string'&&UUID.test(row.id)&&row.consent_to_contact===true&&websiteSource(row.source)&&date(row.created_at)&&date(row.updated_at);}
function fileView(raw:unknown,leadId:string){
 if(!object(raw)||typeof raw.id!=='string'||!UUID.test(raw.id)||raw.lead_id!==leadId||raw.source!=='website'||typeof raw.mime_type!=='string'||!MIME_TYPES.includes(raw.mime_type)||!Number.isSafeInteger(raw.size_bytes)||Number(raw.size_bytes)<1||Number(raw.size_bytes)>MAX_MEDIA||!date(raw.created_at))return null;
 return {id:raw.id,name:clip(raw.file_name,500),mime:raw.mime_type,size:Number(raw.size_bytes),createdAt:raw.created_at as string};
}
function leadView(row:Row){
 if(!allowedLead(row))return fail(502,'invalid_source_data');
 const files=Array.isArray(row.files)?row.files:[];
 return {id:row.id,fullName:clip(row.full_name,300),phone:clip(row.phone,100),email:clip(row.email,250),serviceType:clip(row.service_type,200),projectAddress:clip(row.project_address,1000),description:clip(row.project_description,12000),preferredTimeline:clip(row.preferred_timeline,500),source:'Website Lead',consentToContact:true,status:clip(row.status,100),createdAt:row.created_at,updatedAt:row.updated_at,files:files.slice(0,MAX_FILES).map(file=>fileView(file,row.id as string)).filter(Boolean)};
}
function storagePath(value:unknown,leadId:string){
 if(typeof value!=='string'||value.length>1000)return fail(404,'media_unavailable');
 const segments=value.split('/');if(segments.some(part=>!part||part==='.'||part==='..'||!/^[a-zA-Z0-9_.-]+$/.test(part)))return fail(404,'media_unavailable');
 if(!(segments.length===2&&segments[0]===leadId||segments.length===3&&segments[0]==='incoming'&&segments[1]===leadId))return fail(404,'media_unavailable');
 return segments.map(encodeURIComponent).join('/');
}

export function createBridge(dependencies:Dependencies={}){
 const fetcher=dependencies.fetch??fetch,environment=dependencies.env??(name=>Deno.env.get(name)),now=dependencies.now??Date.now;
 let windowStarted=0,requests=0,active=0;
 return async function handle(request:Request):Promise<Response>{
  let entered=false;
  try{
   if(request.method!=='POST'||new URL(request.url).search)return json({error:'method_not_allowed',code:'method_not_allowed'},405);
   // Browsers do not call this endpoint. Do not enable CORS or forward cookies.
   if(request.headers.has('origin'))return json({error:'request_denied',code:'request_denied'},403);
   const match=/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(request.headers.get('authorization')||'');
   if(!match)return json({error:'unauthorized',code:'unauthorized'},401);
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>MAX_BODY)return json({error:'invalid_request',code:'invalid_request'},400);
   if(now()-windowStarted>=60_000){windowStarted=now();requests=0;}if(++requests>300||active>=4)return new Response(JSON.stringify({error:'try_again',code:'try_again'}),{status:429,headers:{...HEADERS,'Content-Type':'application/json','Retry-After':'10'}});
   active++;entered=true;
   const signal=AbortSignal.timeout(24_000);
   let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(await bytes(request.body,MAX_BODY,signal)));}catch(error){if(error instanceof BridgeError)throw error;return fail(400,'invalid_request');}
   const input=inputView(raw);
   if(environment('SUPABASE_URL')?.replace(/\/$/,'')!==PROJECT_ORIGIN)return fail(503,'bridge_unavailable');
   let secret='';try{const keys=JSON.parse(environment('SUPABASE_SECRET_KEYS')||'{}');if(object(keys)&&typeof keys.default==='string'&&keys.default.startsWith('sb_secret_'))secret=keys.default;}catch{}
   const apiKey=secret||environment('SUPABASE_SERVICE_ROLE_KEY')||'';if(!apiKey)return fail(503,'bridge_unavailable');
   const upstreamHeaders:Record<string,string>={apikey:apiKey,Accept:'application/json'};if(!secret)upstreamHeaders.Authorization='Bearer '+apiKey;
   const get=async(path:string)=>{const response=await fetcher(PROJECT_ORIGIN+path,{method:'GET',headers:upstreamHeaders,redirect:'manual',signal});if(!response.ok){await response.body?.cancel();return fail(response.status===404?404:502,response.status===404?'media_unavailable':'source_unavailable');}return response;};
   const rows=async(table:string,parameters:Record<string,string>,maximum=MAX_JSON):Promise<Row[]>=>{
    const response=await get('/rest/v1/'+table+'?'+new URLSearchParams(parameters));
    let data:unknown;try{data=JSON.parse(new TextDecoder().decode(await bytes(response.body,maximum,signal)));}catch(error){if(error instanceof BridgeError)throw error;return fail(502,'invalid_source_data');}
    if(!Array.isArray(data)||data.some(item=>!object(item)))return fail(502,'invalid_source_data');return data as Row[];
   };
   const digest=await sha256(match[1]);
   const authenticate=async()=>{const config=await rows('ebc_os_lead_bridge_config',{select:'token_sha256,enabled',id:'eq.ebc-os',limit:'1'},4096);const stored=config[0];if(!stored||stored.enabled!==true||typeof stored.token_sha256!=='string'||!(/^[a-f0-9]{64}$/).test(stored.token_sha256)||!equalHash(digest,stored.token_sha256))return fail(401,'unauthorized');};
   await authenticate();
   const leadParameters={select:LEAD_COLUMNS+',files:lead_files!lead_files_lead_id_fkey('+FILE_COLUMNS+')',source:'in.("Website Lead","website","Website","website lead")',consent_to_contact:'eq.true','files.source':'eq.website','files.order':'created_at.asc,id.asc','files.limit':String(MAX_FILES)};
   const findLead=async(leadId:string)=>{const found=await rows('leads',{...leadParameters,id:'eq.'+leadId,limit:'1'});const lead=found[0];if(!allowedLead(lead)||lead.id!==leadId)return fail(404,'lead_unavailable');return lead;};
   if(input.action==='status'){
    await Promise.all([rows('leads',{select:'id',limit:'0'},1024),rows('lead_files',{select:'id',limit:'0'},1024)]);
    return json({status:'ok',ok:true,configured:true});
   }
   if(input.action==='list'){
    const parameters:Record<string,string>={...leadParameters,order:'created_at.desc,id.desc',limit:String(PAGE_SIZE+1)};
    if(input.cursor)parameters.or=`(created_at.lt.${input.cursor.at},and(created_at.eq.${input.cursor.at},id.lt.${input.cursor.id}))`;
    const found=await rows('leads',parameters);if(found.length>PAGE_SIZE+1)return fail(502,'invalid_source_data');
    const page=found.slice(0,PAGE_SIZE);if(page.some(row=>!allowedLead(row)))return fail(502,'invalid_source_data');
    const last=page.at(-1);return json({leads:page.map(leadView),nextCursor:found.length>PAGE_SIZE&&last?cursorEncode(last.created_at as string,last.id as string):null});
   }
   const lead=await findLead(input.leadId!);
   if(input.action==='detail')return json({lead:leadView(lead)});
   const fileRows=await rows('lead_files',{select:FILE_COLUMNS,id:'eq.'+input.fileId,lead_id:'eq.'+input.leadId,source:'eq.website',limit:'1'}),storedFile=fileRows[0];
   const media=fileView(storedFile,input.leadId!);if(!media||media.id!==input.fileId)return fail(404,'media_unavailable');
   const path=storagePath(storedFile.storage_path,input.leadId!);
   const response=await get('/storage/v1/object/authenticated/website-leads/'+path);
   const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase(),declared=Number(response.headers.get('content-length'));
   if(type!==media.mime||response.headers.has('content-length')&&(!Number.isSafeInteger(declared)||declared!==media.size)){await response.body?.cancel();return fail(502,'invalid_media');}
   const content=await bytes(response.body,MAX_MEDIA,signal);if(content.byteLength!==media.size)return fail(502,'invalid_media');
   // Deletion, withdrawn consent, relinking, or token rotation during storage IO
   // cannot release an attachment from a stale authorization snapshot.
   await authenticate();await findLead(input.leadId!);
   const current=await rows('lead_files',{select:FILE_COLUMNS,id:'eq.'+input.fileId,lead_id:'eq.'+input.leadId,source:'eq.website',limit:'1'}),currentFile=current[0],fresh=fileView(currentFile,input.leadId!);
   if(!fresh||fresh.id!==media.id||fresh.mime!==media.mime||fresh.size!==media.size||currentFile.storage_path!==storedFile.storage_path)return fail(404,'media_unavailable');
   const extension=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/heic':'heic','image/heif':'heif'} as Record<string,string>)[media.mime];
   return new Response(content,{headers:{...HEADERS,'Content-Type':media.mime,'Content-Length':String(content.byteLength),'Content-Disposition':'attachment; filename="website-request.'+extension+'"'}});
  }catch(error){const status=error instanceof BridgeError?error.status:503,code=error instanceof BridgeError?error.code:'bridge_unavailable';return json({error:code,code},status);}
  finally{if(entered)active--;}
 };
}

if(typeof Deno!=='undefined')Deno.serve(createBridge());
