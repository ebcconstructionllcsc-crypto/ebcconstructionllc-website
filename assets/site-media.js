(()=>{
  const section=document.querySelector('#field-media-section');
  const grid=document.querySelector('#field-media-grid');
  if(!section||!grid||!window.supabase)return;
  const client=window.supabase.createClient('https://agczzdjxnytjzgprvcxq.supabase.co','sb_publishable_0Sn8fs22OGVbNdvyZMILHA_Vv9NI2BE');
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const currentLang=()=>localStorage.getItem('ebc-lang')||document.documentElement.lang||'en';
  let items=[];
  async function signed(path){
    const{data,error}=await client.storage.from('project-files').createSignedUrl(path,3600);
    return error?'':data.signedUrl;
  }
  async function render(){
    if(!items.length){section.classList.add('site-media-hidden');return;}
    const lang=currentLang();
    grid.innerHTML=(await Promise.all(items.map(async item=>{
      const url=await signed(item.storage_path);
      if(!url)return'';
      const title=lang==='es'?(item.title_es||item.title_en):(item.title_en||item.title_es);
      const caption=lang==='es'?(item.caption_es||item.caption_en):(item.caption_en||item.caption_es);
      const media=item.media_type==='video'
        ?`<video controls playsinline preload="metadata" src="${url}" aria-label="${esc(title)}"></video>`
        :`<img loading="lazy" src="${url}" alt="${esc(title)}">`;
      return`<article class="field-media-card">${media}<div class="field-media-copy"><span>${esc(item.media_type==='video'?(lang==='es'?'Video del proyecto':'Project video'):(lang==='es'?'Foto del proyecto':'Project photo'))}</span><h3>${esc(title)}</h3>${caption?`<p>${esc(caption)}</p>`:''}</div></article>`;
    }))).filter(Boolean).join('');
    section.classList.toggle('site-media-hidden',!grid.children.length);
  }
  async function load(){
    const{data,error}=await client.from('site_media').select('*').eq('is_active',true).eq('category','projects').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error)return;
    items=data||[];
    await render();
  }
  document.querySelectorAll('[data-lang-btn]').forEach(button=>button.addEventListener('click',()=>setTimeout(render,0)));
  load();
})();