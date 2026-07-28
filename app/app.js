const SUPABASE_URL='https://agczzdjxnytjzgprvcxq.supabase.co';
const SUPABASE_KEY='sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const state={session:null,leads:[],clients:[],projects:[],files:[],media:[],active:'dashboard',editing:null,mediaReady:true};
const labels={dashboard:'Overview',leads:'Requests',clients:'Clients',projects:'Projects',files:'Files',media:'Website Media'};
const schemas={
  leads:[['name','Full name','text',true],['phone','Phone','tel',true],['email','Email','email'],['address','Project address','text'],['service','Service','select',['Concrete','Grading','Excavation','Pavers','Landscaping','Remodeling','Other']],['status','Status','select',['new','contacted','estimate_scheduled','quoted','won','lost']],['estimated_value','Estimated value','number'],['preferred_timing','Preferred timing','text'],['message','Project details','textarea']],
  clients:[['name','Client name','text',true],['phone','Phone','tel'],['email','Email','email'],['address','Address','text'],['notes','Notes','textarea']],
  projects:[['name','Project name','text',true],['client_id','Client','client'],['service','Service','select',['Concrete','Grading','Excavation','Pavers','Landscaping','Remodeling','Other']],['status','Status','select',['planning','scheduled','in_progress','on_hold','completed','cancelled']],['address','Jobsite address','text'],['start_date','Start date','date'],['end_date','End date','date'],['contract_value','Contract value','number'],['notes','Project notes','textarea']]
};

function toast(msg,error=false){const el=$('#toast');el.textContent=msg;el.className=`toast show${error?' error':''}`;clearTimeout(el._t);el._t=setTimeout(()=>el.className='toast',4000)}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function money(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0)}
function safeName(name){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').replace(/-+/g,'-')}
function fileType(file){return file.type.startsWith('video/')?'video':'image'}

async function boot(){
  const{data:{session}}=await db.auth.getSession();
  setSession(session);
  db.auth.onAuthStateChange((_event,nextSession)=>setSession(nextSession));
}

async function setSession(session){
  state.session=session;
  $('#auth-view').classList.toggle('hidden',!!session);
  $('#app-view').classList.toggle('hidden',!session);
  if(session){$('#user-email').textContent=session.user.email;await refresh();}
}

$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const email=$('#login-email').value.trim(),password=$('#login-password').value;
  const{error}=await db.auth.signInWithPassword({email,password});
  if(error)toast(error.message,true);
});
$('#logout-btn').addEventListener('click',()=>db.auth.signOut());

$$('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
function showView(name){
  state.active=name;
  $$('.view').forEach(view=>view.classList.toggle('active',view.id===name));
  $$('.sidebar nav button').forEach(button=>button.classList.toggle('active',button.dataset.view===name));
  $('#page-title').textContent=labels[name];
  $('#new-record-btn').style.display=['leads','clients','projects'].includes(name)?'inline-flex':'none';
  if(name==='media')renderMedia();
}

async function refresh(){
  const [leads,clients,projects,files,media]=await Promise.all([
    db.from('leads').select('*').order('created_at',{ascending:false}),
    db.from('clients').select('*').order('created_at',{ascending:false}),
    db.from('projects').select('*,clients(name)').order('created_at',{ascending:false}),
    db.from('project_files').select('*,projects(name),leads(name)').order('created_at',{ascending:false}),
    db.from('site_media').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false})
  ]);
  for(const result of [leads,clients,projects,files]){
    if(result.error){toast(result.error.message,true);return;}
  }
  state.leads=leads.data||[];
  state.clients=clients.data||[];
  state.projects=projects.data||[];
  state.files=files.data||[];
  if(media.error){
    state.media=[];
    state.mediaReady=false;
  }else{
    state.media=media.data||[];
    state.mediaReady=true;
  }
  renderAll();
}

function renderAll(){
  renderDashboard();
  renderTable('leads');
  renderTable('clients');
  renderTable('projects');
  renderFiles();
  renderMedia();
  fillProjectSelect();
}

function renderDashboard(){
  const open=state.leads.filter(item=>!['won','lost'].includes(item.status));
  const active=state.projects.filter(item=>!['completed','cancelled'].includes(item.status));
  $('#metric-leads').textContent=open.length;
  $('#metric-projects').textContent=active.length;
  $('#metric-clients').textContent=state.clients.length;
  $('#metric-value').textContent=money(state.leads.reduce((sum,item)=>sum+(Number(item.estimated_value)||0),0));
  $('#recent-leads').innerHTML=listItems(open.slice(0,5),'lead');
  $('#recent-projects').innerHTML=listItems(active.slice(0,5),'project');
  $$('#recent-leads [data-lead-id]').forEach(item=>item.addEventListener('click',()=>viewLead(item.dataset.leadId)));
}

function listItems(items,type){
  if(!items.length)return'<div class="empty">Nothing here yet.</div>';
  return items.map(item=>`<div class="list-item ${type==='lead'?'clickable':''}" ${type==='lead'?`data-lead-id="${item.id}"`:''}><div><strong>${esc(item.name)}</strong><span>${esc(type==='lead'?`${item.service||'General'} · ${item.phone||''}`:`${item.service||'Project'} · ${item.clients?.name||'No client'}`)}</span></div><span class="badge">${esc((item.status||'new').replaceAll('_',' '))}</span></div>`).join('');
}

function getFiltered(type){
  const rows=state[type];
  const q=$(`#${type.slice(0,-1)}-search`)?.value.toLowerCase()||'';
  const status=$(`#${type.slice(0,-1)}-filter`)?.value||'';
  return rows.filter(item=>{
    const haystack=JSON.stringify(item).toLowerCase();
    return(!q||haystack.includes(q))&&(!status||item.status===status);
  });
}

function renderTable(type){
  const rows=getFiltered(type),target=$(`#${type.slice(0,-1)}-list`);
  if(!target)return;
  if(!rows.length){target.innerHTML='<div class="empty">No records found.</div>';return;}
  const cols=type==='leads'?['name','phone','service','status','estimated_value','created_at']:type==='clients'?['name','phone','email','address','created_at']:['name','client','service','status','contract_value','start_date'];
  target.innerHTML=`<table class="data-table"><thead><tr>${cols.map(column=>`<th>${column.replaceAll('_',' ')}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.map(row=>`<tr>${cols.map(column=>`<td>${cell(type,row,column)}</td>`).join('')}<td class="row-actions">${type==='leads'?`<button onclick="viewLead('${row.id}')">View</button>`:''}<button onclick="editRecord('${type}','${row.id}')">Edit</button><button onclick="deleteRecord('${type}','${row.id}')">Delete</button></td></tr>`).join('')}</tbody></table>`;
}

function cell(type,row,column){
  if(column==='status')return`<span class="badge">${esc((row[column]||'').replaceAll('_',' '))}</span>`;
  if(column.includes('value'))return money(row[column]);
  if(column==='created_at'||column.endsWith('_date'))return row[column]?new Date(row[column]).toLocaleDateString():'—';
  if(column==='client')return esc(row.clients?.name||'—');
  return esc(row[column]||'—');
}

['lead-search','lead-filter','client-search','project-search','project-filter'].forEach(id=>$(`#${id}`)?.addEventListener('input',()=>renderTable(id.startsWith('lead')?'leads':id.startsWith('client')?'clients':'projects')));

$('#new-record-btn').addEventListener('click',()=>openDialog(state.active));
window.editRecord=(type,id)=>openDialog(type,state[type].find(item=>item.id===id));
function openDialog(type,row=null){
  state.editing={type,row};
  $('#dialog-title').textContent=`${row?'Edit':'New'} ${type.slice(0,-1)}`;
  $('#record-fields').innerHTML=schemas[type].map(field=>fieldHtml(field,row)).join('');
  $('#record-dialog').showModal();
}
function fieldHtml([name,label,type,options],row){
  const value=row?.[name]??'';
  const required=options===true?'required':'';
  if(type==='textarea')return`<label class="wide">${label}<textarea name="${name}">${esc(value)}</textarea></label>`;
  if(type==='select')return`<label>${label}<select name="${name}">${options.map(option=>`<option value="${option}" ${value===option?'selected':''}>${option.replaceAll('_',' ')}</option>`).join('')}</select></label>`;
  if(type==='client')return`<label>${label}<select name="${name}"><option value="">No client</option>${state.clients.map(client=>`<option value="${client.id}" ${value===client.id?'selected':''}>${esc(client.name)}</option>`).join('')}</select></label>`;
  return`<label class="${name==='address'?'wide':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required}></label>`;
}

$('#record-form').addEventListener('submit',async event=>{
  if(event.submitter?.value==='cancel')return;
  event.preventDefault();
  const{type,row}=state.editing;
  const data=Object.fromEntries(new FormData(event.currentTarget));
  ['estimated_value','contract_value'].forEach(key=>{if(key in data)data[key]=data[key]?Number(data[key]):null});
  const query=row?db.from(type).update(data).eq('id',row.id):db.from(type).insert(data);
  const{error}=await query;
  if(error)return toast(error.message,true);
  $('#record-dialog').close();
  toast('Saved');
  await refresh();
});

window.deleteRecord=async(type,id)=>{
  if(!confirm('Delete this record?'))return;
  const{error}=await db.from(type).delete().eq('id',id);
  if(error)return toast(error.message,true);
  toast('Deleted');
  await refresh();
};

window.viewLead=async id=>{
  const lead=state.leads.find(item=>item.id===id);
  if(!lead)return;
  $('#lead-detail-title').textContent=lead.name;
  const linkedFiles=state.files.filter(file=>file.lead_id===id);
  const fileCards=await Promise.all(linkedFiles.map(async file=>{
    const{data,error}=await db.storage.from('project-files').createSignedUrl(file.storage_path,3600);
    if(error)return'';
    const url=data.signedUrl;
    const preview=file.mime_type?.startsWith('image/')?`<img src="${url}" alt="${esc(file.file_name)}">`:file.mime_type?.startsWith('video/')?`<video src="${url}" controls playsinline preload="metadata"></video>`:'<div class="document-icon">FILE</div>';
    return`<a class="lead-file-card" href="${url}" target="_blank" rel="noopener">${preview}<span>${esc(file.file_name)}</span></a>`;
  }));
  $('#lead-detail-content').innerHTML=`
    <div class="detail-grid">
      <div><span>Phone</span><strong><a href="tel:${esc(lead.phone)}">${esc(lead.phone||'—')}</a></strong></div>
      <div><span>Email</span><strong>${lead.email?`<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`:'—'}</strong></div>
      <div><span>Service</span><strong>${esc(lead.service||'—')}</strong></div>
      <div><span>Status</span><strong>${esc((lead.status||'new').replaceAll('_',' '))}</strong></div>
      <div class="wide"><span>Address</span><strong>${esc(lead.address||'—')}</strong></div>
      <div class="wide"><span>Preferred timing</span><strong>${esc(lead.preferred_timing||'—')}</strong></div>
      <div class="wide"><span>Project details</span><p>${esc(lead.message||'No details provided.')}</p></div>
    </div>
    <div class="lead-files"><h3>Customer photos & videos (${linkedFiles.length})</h3><div class="lead-file-grid">${fileCards.filter(Boolean).join('')||'<div class="empty">No files attached to this request.</div>'}</div></div>`;
  $('#lead-detail-dialog').showModal();
};
$('#lead-detail-close').addEventListener('click',()=>$('#lead-detail-dialog').close());

function fillProjectSelect(){
  $('#file-project').innerHTML='<option value="">General / no project</option>'+state.projects.map(project=>`<option value="${project.id}">${esc(project.name)}</option>`).join('');
}

$('#file-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const files=[...$('#file-input').files],projectId=$('#file-project').value||null;
  for(const file of files){
    const path=`${state.session.user.id}/${projectId||'general'}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload=await db.storage.from('project-files').upload(path,file,{contentType:file.type});
    if(upload.error){toast(upload.error.message,true);continue;}
    const meta=await db.from('project_files').insert({project_id:projectId,file_name:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,uploaded_by:state.session.user.id});
    if(meta.error)toast(meta.error.message,true);
  }
  event.currentTarget.reset();
  toast('Upload complete');
  await refresh();
});

async function renderFiles(){
  const target=$('#file-list');
  if(!state.files.length){target.innerHTML='<div class="empty">No files uploaded.</div>';return;}
  target.innerHTML=(await Promise.all(state.files.map(async file=>{
    const{data}=await db.storage.from('project-files').createSignedUrl(file.storage_path,3600);
    const owner=file.leads?.name?`Request: ${file.leads.name}`:file.projects?.name?`Project: ${file.projects.name}`:'General';
    return`<article class="file-card"><a href="${data?.signedUrl||'#'}" target="_blank" rel="noopener">${esc(file.file_name)}</a><small>${esc(owner)} · ${Math.round((file.size_bytes||0)/1024)} KB</small></article>`;
  }))).join('');
}

$('#media-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!state.mediaReady){toast('Run supabase/site-media-migration.sql first.',true);return;}
  const button=event.currentTarget.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='Uploading…';
  const selected=[...$('#media-input').files];
  const titleEn=$('#media-title-en').value.trim();
  const titleEs=$('#media-title-es').value.trim();
  const category=$('#media-category').value;
  const sortOrder=Number($('#media-sort').value)||0;
  let uploaded=0;
  for(const file of selected){
    const type=fileType(file);
    const path=`website/${category}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const upload=await db.storage.from('project-files').upload(path,file,{contentType:file.type,cacheControl:'3600'});
    if(upload.error){toast(upload.error.message,true);continue;}
    const insert=await db.from('site_media').insert({title_en:titleEn,title_es:titleEs,media_type:type,category,storage_path:path,sort_order:sortOrder,is_active:true,uploaded_by:state.session.user.id});
    if(insert.error){
      await db.storage.from('project-files').remove([path]);
      toast(insert.error.message,true);
      continue;
    }
    uploaded++;
  }
  button.disabled=false;button.textContent='Upload to website';
  event.currentTarget.reset();
  $('#media-sort').value='0';
  toast(`${uploaded} website item${uploaded===1?'':'s'} uploaded`);
  await refresh();
});

async function renderMedia(){
  const target=$('#media-list');
  if(!target)return;
  if(!state.mediaReady){
    target.innerHTML='<div class="setup-card"><strong>Website Media needs one database update.</strong><p>Run <code>supabase/site-media-migration.sql</code> in the Supabase SQL Editor, then refresh this page.</p></div>';
    return;
  }
  if(!state.media.length){target.innerHTML='<div class="empty">No website media yet. Upload the EBC photos and videos you want customers to see.</div>';return;}
  target.innerHTML=(await Promise.all(state.media.map(async item=>{
    const{data}=await db.storage.from('project-files').createSignedUrl(item.storage_path,3600);
    const url=data?.signedUrl||'';
    const preview=item.media_type==='video'?`<video src="${url}" muted playsinline controls preload="metadata"></video>`:`<img src="${url}" alt="${esc(item.title_en)}" loading="lazy">`;
    return`<article class="media-admin-card">${preview}<div class="media-admin-copy"><strong>${esc(item.title_en)}</strong><span>${esc(item.title_es)}</span><small>${esc(item.category)} · order ${item.sort_order} · ${item.is_active?'Visible':'Hidden'}</small><div class="media-admin-actions"><button onclick="toggleMedia('${item.id}',${!item.is_active})">${item.is_active?'Hide':'Show'}</button><button class="danger" onclick="deleteMedia('${item.id}')">Delete</button></div></div></article>`;
  }))).join('');
}

window.toggleMedia=async(id,isActive)=>{
  const{error}=await db.from('site_media').update({is_active:isActive}).eq('id',id);
  if(error)return toast(error.message,true);
  toast(isActive?'Media is now visible':'Media hidden from website');
  await refresh();
};

window.deleteMedia=async id=>{
  const item=state.media.find(media=>media.id===id);
  if(!item||!confirm(`Delete “${item.title_en}” from the website library?`))return;
  const remove=await db.storage.from('project-files').remove([item.storage_path]);
  if(remove.error)return toast(remove.error.message,true);
  const{error}=await db.from('site_media').delete().eq('id',id);
  if(error)return toast(error.message,true);
  toast('Website media deleted');
  await refresh();
};

boot();