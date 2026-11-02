(() => {
 const params=new URLSearchParams(location.search);
 const projects={"driveway":["Concrete driveway","Entrada de concreto"],"patio":["Concrete patio extension","Ampliación de patio de concreto"],"walkway":["Concrete access beside the home","Acceso de concreto junto a la casa"],"walls":["Curved block wall with lighting","Muro curvo de bloques con iluminación"],"sod":["Backyard sod installation","Instalación de pasto en patio"],"welding":["Welding on site","Soldadura en sitio"]};
 const services={"california-style":["California-style concrete","Concreto estilo California"],"concrete-driveways":["Driveways & extensions","Entradas y ampliaciones"],"concrete-patios":["Concrete patios","Patios de concreto"],"concrete-slabs":["Slabs & foundations","Losas y cimentaciones"],"concrete-walkways":["Sidewalks & steps","Pasillos y escalones"]};
 const project=params.get('project'), interest=params.get('interest');
 const selected=(Object.hasOwn(projects,project)&&projects[project]) || (Object.hasOwn(services,interest)&&services[interest]);
 const field=document.querySelector('#project');
 if(!selected||!field)return;
 let last='';
 function sync(){const es=document.documentElement.lang==='es';const next=(es?'Me interesa: ':'I am interested in: ')+selected[es?1:0]+'.\n';if(!field.value||field.value===last){field.value=next;last=next;}}
 sync();window.addEventListener('ebc:languagechange',sync);
})();
