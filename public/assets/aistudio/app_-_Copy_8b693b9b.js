const LS='rescue_demo_v1';
let db=JSON.parse(localStorage.getItem(LS)||'null')||{reports:[],animals:[
{id:1,name:'Moti',cat:'Dog',age:'2 yrs',gender:'Male',vacc:'Yes',loc:'Janipur, Jammu',photo:'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',status:'Under Treatment',desc:'Friendly, rescued from road.'},
{id:2,name:'Simran',cat:'Cat',age:'1 yr',gender:'Female',vacc:'Yes',loc:'Gandhi Nagar, Jammu',photo:'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',status:'Rescued',desc:'Calm indoor cat.'},
{id:3,name:'Tuffy',cat:'Puppy',age:'6 months',gender:'Male',vacc:'No',loc:'Trikuta Nagar, Jammu',photo:'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',status:'Reported',desc:'Playful puppy.'},
{id:4,name:'Kitty',cat:'Kitten',age:'3 months',gender:'Female',vacc:'No',loc:'Talab Tillo, Jammu',photo:'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600',status:'Reported',desc:'Tiny kitten.'}],
reqs:[],vols:[]};
function save(){localStorage.setItem(LS,JSON.stringify(db));renderAll()}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderAll(){
 document.getElementById('cRescued').textContent=db.animals.filter(a=>['Rescued','Under Treatment','Adopted'].includes(a.status)).length;
 document.getElementById('cAdopted').textContent=db.animals.filter(a=>a.status==='Adopted').length;
 document.getElementById('cVol').textContent=db.vols.length;
 document.getElementById('aReports').textContent=db.reports.length+db.animals.length;
 document.getElementById('aAdopts').textContent=db.reqs.length;
 renderGrid('All');renderAdmin();const vl=document.getElementById('volList');if(vl)vl.innerHTML=db.vols.map(v=>`<div class="card p-2 mb-2">${esc(v.name)} - ${esc(v.area)} - ${esc(v.days)}</div>`).join('')||'<p>No volunteers yet (demo).</p>';
}
let filter='All';
document.querySelectorAll('.fbtn').forEach(b=>b.onclick=()=>{filter=b.dataset.f;renderGrid(filter)});
function renderGrid(f){const g=document.getElementById('animalGrid');const list=db.animals.filter(a=>f==='All'||a.cat===f);g.innerHTML=list.map(a=>`<div class="col-md-4 mb-3"><div class="card p-3"><img src="${esc(a.photo||'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600')}" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'"><h5>${esc(a.name)}</h5><p>${esc(a.age)} - ${esc(a.gender)}<br>Vaccinated: ${esc(a.vacc)}<br>${esc(a.loc)}<br>Status: ${esc(a.status)}</p><button class="btn btn-primary" onclick="openAnimal(${a.id})">View + Adopt</button></div></div>`).join('')||'<p>No animals in this filter.</p>'}
window.openAnimal=id=>{const a=db.animals.find(x=>x.id==id);const d=document.getElementById('animalDetail');d.classList.remove('d-none');d.innerHTML=`<h3>${esc(a.name)}</h3><img src="${esc(a.photo)}" class="img-fluid" style="max-height:300px;object-fit:cover"><p>${esc(a.desc||'')}<br>${esc(a.age)} | ${esc(a.gender)} | Vaccinated: ${esc(a.vacc)} | ${esc(a.loc)}</p><h5>Adopt Request Form (demo)</h5><form onsubmit="return adoptReq(event,${a.id})"><input class="form-control mb-2" id="adName" placeholder="Your name" required><input class="form-control mb-2" id="adPhone" placeholder="Phone" required><textarea class="form-control mb-2" placeholder="Why adopt?"></textarea><button class="btn btn-success">Send Adoption Request</button></form>`;d.scrollIntoView({behavior:'smooth'})}
window.adoptReq=(e,id)=>{e.preventDefault();db.reqs.push({id:Date.now(),animal:id,name:adName.value,phone:adPhone.value});save();alert('Adoption request saved (demo)');return false}
function usePin(){if(!navigator.geolocation){alert('GPS not available');return}navigator.geolocation.getCurrentPosition(p=>{rPin.value=`${p.coords.latitude},${p.coords.longitude} - https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`},()=>alert('Location permission denied'))}
document.getElementById('reportForm').onsubmit=e=>{e.preventDefault();const f=rPhoto.files[0];if(!f){alert('Photo required');return false}const rd=new FileReader();rd.onload=()=>{db.reports.push({id:Date.now(),type:rType.value,cond:rCond.value,loc:rLoc.value,pin:rPin.value,desc:rDesc.value,name:rName.value,phone:rPhone.value,photo:rd.result,status:'Reported',date:new Date().toISOString()});save();reportOk.classList.remove('d-none');e.target.reset()};rd.readAsDataURL(f);return false}
document.querySelectorAll('.amt').forEach(b=>b.onclick=()=>{customAmt.value=b.dataset.a;alert('Selected Rs '+b.dataset.a+' - SAMPLE QR only, not live')});
// --- admin login (demo, sessionStorage) ---
function adminLogin(){const e=document.getElementById('admEmail').value.trim(),p=document.getElementById('admPass').value;
if(e===CONFIG.adminEmail&&p===CONFIG.adminPassDemo){sessionStorage.setItem('adm','1');showAdmin()}else{document.getElementById('admErr').textContent='Wrong email or password'}}
function adminLogout(){sessionStorage.removeItem('adm');showAdmin()}
function showAdmin(){const on=sessionStorage.getItem('adm')==='1';document.getElementById('adminGate').classList.toggle('d-none',on);document.getElementById('adminPanel').classList.toggle('d-none',!on)}
window.adminLogin=adminLogin;window.adminLogout=adminLogout;
showAdmin();

// --- dynamic UPI QR ---
(function(){const amt=document.getElementById('customAmt');const box=document.getElementById('qrBox');
function draw(amount){if(CONFIG.upiId){const upi=`upi://pay?pa=${encodeURIComponent(CONFIG.upiId)}&pn=${encodeURIComponent(CONFIG.payeeName)}&cu=INR${amount?`&am=${amount}`:''}`;
box.innerHTML=`<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upi)}" alt="UPI QR" style="width:240px;height:240px">`;
document.getElementById('upiLine').textContent=`UPI ID: ${CONFIG.upiId} | Amount: Rs ${amount||'custom (enter in UPI app)'}`}else{box.innerHTML='SAMPLE UPI QR<br>Not live';document.getElementById('upiLine').textContent='UPI ID not set yet. Edit config.js -> upiId to go live.'}}
draw('');document.querySelectorAll('.amt').forEach(b=>b.onclick=()=>{amt.value=b.dataset.a;draw(b.dataset.a)});
amt.addEventListener('input',()=>draw(amt.value.trim()))})();

document.getElementById('volForm').onsubmit=e=>{e.preventDefault();db.vols.push({name:vName.value,phone:vPhone.value,area:vArea.value,days:vDays.value});save();volOk.classList.remove('d-none');e.target.reset();return false}
document.getElementById('animalForm').onsubmit=e=>{e.preventDefault();const id=aId.value?+aId.value:Date.now();const o={id,name:aName.value,cat:aCat.value,age:aAge.value,gender:aGender.value,vacc:aVacc.value,loc:aLoc.value,photo:aPhoto.value,status:aStatus.value};if(aId.value)db.animals=db.animals.map(x=>x.id==id?o:x);else db.animals.push(o);save();e.target.reset();aId.value='';return false}
function renderAdmin(){adminList.innerHTML=(db.reports.map(r=>`<div class="card p-3 mb-2"><b>REPORT</b> ${esc(r.type)} - ${esc(r.cond)} - ${esc(r.loc)} - ${esc(r.name)} (${esc(r.phone)}) - ${esc(r.status)} ${r.photo?`<img src="${r.photo}" style="height:80px">`:''} <button class="btn btn-sm btn-danger" onclick="delRep(${r.id})">Delete</button></div>`).join('')+db.animals.map(a=>`<div class="card p-3 mb-2"><b>${esc(a.name)}</b> ${esc(a.cat)} ${esc(a.status)} <button class="btn btn-sm btn-warning" onclick="editA(${a.id})">Edit</button> <button class="btn btn-sm btn-danger" onclick="delA(${a.id})">Delete</button> <select onchange="setStatus(${a.id},this.value)">${['Reported','Rescued','Under Treatment','Adopted'].map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}</select></div>`).join(''))||'<p>No data yet</p>';adoptReqList.innerHTML=db.reqs.map(r=>`<div class="card p-3 mb-2">Adopt req by ${esc(r.name)} ${esc(r.phone)} for animal ${r.animal}</div>`).join('')||'<p>No adoption requests yet</p>'}
window.delRep=id=>{db.reports=db.reports.filter(r=>r.id!=id);save()}
window.delA=id=>{db.animals=db.animals.filter(r=>r.id!=id);save()}
window.setStatus=(id,s)=>{db.animals.find(r=>r.id==id).status=s;save()}
window.editA=id=>{const a=db.animals.find(r=>r.id==id);aId.value=a.id;aName.value=a.name;aCat.value=a.cat;aAge.value=a.age;aGender.value=a.gender;aVacc.value=a.vacc;aLoc.value=a.loc;aPhoto.value=a.photo;aStatus.value=a.status;window.scrollTo(0,document.getElementById('admin').offsetTop)}
renderAll();

window.setRepStatus=(id,s)=>{const r=db.reports.find(x=>x.id==id);if(r)r.status=s;save()}
