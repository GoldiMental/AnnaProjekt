// ---------- Hilfsfunktionen ----------
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
const $ = (sel,root=document)=>root.querySelector(sel);
const fmt = n => (Number(n)||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const todayStr = ()=> new Date().toISOString().slice(0,10);

const store = {
  get(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch{ return fallback } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

// ---------- Tabs ----------
$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const t = btn.dataset.tab;
  $('#bereich-rechnungen').style.display = (t==='rechnungen')?'grid':'none';
  $('#bereich-kalender').style.display   = (t==='kalender')?'grid':'none';
  $('#bereich-artikel').style.display    = (t==='artikel')?'grid':'none';
  $('#bereich-kunden').style.display     = (t==='kunden')?'grid':'none';
}));

// ---------- Artikel ----------
function ladeArtikelListe(){
  const arr = store.get('artikel', []);
  const q = ($('#suche-artikel')?.value||'').toLowerCase();
  const tbody = $('#tabelle-artikel tbody');
  if(tbody){
    tbody.innerHTML = '';
    arr.filter(a=> (a.nr+a.name).toLowerCase().includes(q)).forEach((a,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.nr}</td>
        <td>${a.name}</td>
        <td class="right">${fmt(a.preis)}</td>
        <td class="right">${Number(a.ust||0)}%</td>
        <td class="right">
          <button class="btn ghost" data-edit="${i}">Bearbeiten</button>
          <button class="btn danger" data-del="${i}">Löschen</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }
  // Optionen für Rechnung
  const sel = $('#pos-artikel');
  if(sel){ sel.innerHTML = '<option value="">– Artikel wählen –</option>' + arr.map((a,idx)=>`<option value="${idx}">${a.nr} • ${a.name}</option>`).join(''); }
}

function artikelSpeichern(){
  const nr = $('#a-nr').value.trim();
  const name = $('#a-name').value.trim();
  const preis = parseFloat($('#a-preis').value||0);
  const ust = parseFloat($('#a-ust').value||19);
  const desc = $('#a-desc').value.trim();
  if(!nr||!name){alert('Bitte Artikelnummer und Bezeichnung angeben.');return}
  const arr = store.get('artikel', []);
  const idx = arr.findIndex(x=>x.nr===nr);
  const obj = {nr,name,preis,ust,desc};
  if(idx>-1) arr[idx]=obj; else arr.push(obj);
  store.set('artikel', arr);
  ladeArtikelListe();
  artikelReset();
}
function artikelReset(){ ['a-nr','a-name','a-preis','a-ust','a-desc'].forEach(id=>$('#'+id).value=''); $('#a-ust').value=19; }

document.addEventListener('click', (e)=>{
  if(e.target?.id==='btn-artikel-speichern') artikelSpeichern();
  if(e.target?.id==='btn-artikel-reset') artikelReset();
});
document.addEventListener('input', (e)=>{ if(e.target?.id==='suche-artikel') ladeArtikelListe(); });
document.addEventListener('click', (e)=>{
  if(e.target.closest('#tabelle-artikel')){
    const btn=e.target; const i = btn.dataset.edit ?? btn.dataset.del; if(i==null) return;
    const arr = store.get('artikel', []);
    if(btn.dataset.edit!=null){
      const a = arr[i];
      $('#a-nr').value=a.nr; $('#a-name').value=a.name; $('#a-preis').value=a.preis; $('#a-ust').value=a.ust; $('#a-desc').value=a.desc;
    } else if(confirm('Artikel wirklich löschen?')){
      arr.splice(i,1); store.set('artikel', arr); ladeArtikelListe();
    }
  }
});

// ---------- Kunden ----------
const kundenStore = {
  getAll(){ return store.get('kunden', []); },
  setAll(arr){ store.set('kunden', arr); }
};

let selectedKundeIndex = null;

// Label im Dropdown
function kundenLabel(k){
  const left  = k.nr ? (k.nr + ' • ') : '';
  const right = k.email ? (' • ' + k.email) : '';
  return `${left}${k.name||''}${right}`;
}

// Adresse in mehrzeiligem Text
function kundenAlsAdresse(k){
  const parts=[];
  if(k.strasse) parts.push(k.strasse);
  const line2=[k.plz,k.ort].filter(Boolean).join(' ');
  if(line2) parts.push(line2);
  if(k.land) parts.push(k.land);
  return parts.join('\n');
}

// ausgewählten Kunden in die drei Felder schreiben
function applyKundeByIndex(idx){
  const k = kundenStore.getAll()[idx];
  if(!k) return;
  $('#k-name').value    = k.name || '';
  $('#k-email').value   = k.email || '';
  $('#k-adresse').value = kundenAlsAdresse(k);
}

// Text auf dem „Button“ aktualisieren
function updateKundeDisplay(){
  const btn = $('#k-select-display');
  const arr = kundenStore.getAll();
  if(!btn) return;
  if(selectedKundeIndex == null || !arr[selectedKundeIndex]){
    btn.textContent = 'Bitte wählen…';
  }else{
    btn.textContent = kundenLabel(arr[selectedKundeIndex]);
  }
}

// Dropdown + Optionsliste befüllen (mit Suche)
function ladeKundenDropdown(){
  const arr = kundenStore.getAll();
  const select = $('#k-select'); // das versteckte <select>
  const optionsContainer = $('#k-select-options'); // sichtbare Liste
  const searchInput = $('#k-select-search');
  const searchTerm = (searchInput?.value || '').toLowerCase();

  // verstecktes <select> aktuell halten
  if(select){
    select.innerHTML = '';
    const placeholder = new Option('', '');
    select.appendChild(placeholder);
    arr.forEach((k,i)=>{
      const opt = new Option(kundenLabel(k), i);
      select.appendChild(opt);
    });
  }

  // sichtbare Option-Liste (mit Filter)
  if(optionsContainer){
    optionsContainer.innerHTML = '';
    arr.forEach((k,i)=>{
      const label = kundenLabel(k);
      if(searchTerm && !label.toLowerCase().includes(searchTerm)) return;
      const div = document.createElement('div');
      div.className = 'cs-option';
      div.dataset.index = i;
      div.textContent = label;
      if(selectedKundeIndex === i) div.classList.add('cs-active');
      optionsContainer.appendChild(div);
    });
  }

  updateKundeDisplay();
}

// Kundenliste im Kundenstamm-Tab
function ladeKundenListe(){
  const arr = kundenStore.getAll();
  const q = ($('#suche-kunde')?.value||'').toLowerCase();
  const tbody = $('#tabelle-kunden tbody');

  if(!tbody){
    // falls Tabelle noch nicht sichtbar ist, trotzdem Dropdown aktualisieren
    ladeKundenDropdown();
    return;
  }

  tbody.innerHTML='';
  arr
    .filter(k => (k.nr+' '+k.name+' '+(k.email||'')).toLowerCase().includes(q))
    .forEach((k,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `
        <td>${k.nr||''}</td>
        <td>${k.name||''}</td>
        <td>${k.email||''}</td>
        <td>${k.phone||''}</td>
        <td class="right">
          <button class="btn ghost" data-edit="${i}">Bearbeiten</button>
          <button class="btn danger" data-del="${i}">Löschen</button>
        </td>`;
      tbody.appendChild(tr);
    });

  // danach Dropdown auch aktualisieren
  ladeKundenDropdown();
}

// Kunden speichern / reset
function kundenSpeichern(){
  const obj = {
    nr:$('#c-nr').value.trim(),
    name:$('#c-name').value.trim(),
    ansprech:$('#c-ansprech').value.trim(),
    email:$('#c-email').value.trim(),
    phone:$('#c-phone').value.trim(),
    land:$('#c-land').value.trim(),
    strasse:$('#c-strasse').value.trim(),
    plz:$('#c-plz').value.trim(),
    ort:$('#c-ort').value.trim(),
    notiz:$('#c-notiz').value.trim(),
  };
  if(!obj.name){
    alert('Bitte mindestens Firma/Name angeben.');
    return;
  }
  const arr = kundenStore.getAll();
  const idx = obj.nr ? arr.findIndex(k=>k.nr===obj.nr) : -1;
  if(idx>-1) arr[idx]=obj; else arr.push(obj);
  kundenStore.setAll(arr);
  ladeKundenListe();
  kundenReset();
}

function kundenReset(){
  ['c-nr','c-name','c-ansprech','c-email','c-phone','c-land','c-strasse','c-plz','c-ort','c-notiz']
    .forEach(id=>$('#'+id).value='');
  $('#c-land').value='Deutschland';
}

// Buttons im Kunden-Tab
document.addEventListener('click',(e)=>{
  if(e.target?.id==='btn-kunde-speichern') kundenSpeichern();
  if(e.target?.id==='btn-kunde-reset') kundenReset();
});

// Suche in Kundenliste
document.addEventListener('input',(e)=>{
  if(e.target?.id==='suche-kunde') ladeKundenListe();
});

// Bearbeiten/Löschen in der Tabelle
document.addEventListener('click',(e)=>{
  const table = $('#tabelle-kunden');
  if(!table || !table.contains(e.target)) return;

  const btn = e.target;
  const i = btn.dataset.edit ?? btn.dataset.del;
  if(i == null) return;

  const arr = kundenStore.getAll();
  if(btn.dataset.edit != null){
    const k = arr[i];
    $('#c-nr').value=k.nr||'';
    $('#c-name').value=k.name||'';
    $('#c-ansprech').value=k.ansprech||'';
    $('#c-email').value=k.email||'';
    $('#c-phone').value=k.phone||'';
    $('#c-land').value=k.land||'';
    $('#c-strasse').value=k.strasse||'';
    $('#c-plz').value=k.plz||'';
    $('#c-ort').value=k.ort||'';
    $('#c-notiz').value=k.notiz||'';
  }else if(confirm('Kunde wirklich löschen?')){
    arr.splice(i,1);
    kundenStore.setAll(arr);
    ladeKundenListe();
  }
});

// Klick-Logik für das Such-Dropdown
document.addEventListener('click',(e)=>{
  const wrapper = $('#k-select-wrapper');
  const panel   = $('#k-select-panel');
  if(!wrapper || !panel) return;

  // Button: Panel auf/zu
  if(e.target.id === 'k-select-display'){
    panel.classList.toggle('open');
    const input = $('#k-select-search');
    if(panel.classList.contains('open') && input){
      setTimeout(()=>input.focus(),0);
    }
    return;
  }

  // Klick auf Option
  if(e.target.classList.contains('cs-option')){
    const idx = Number(e.target.dataset.index);
    const select = $('#k-select');
    if(select){
      select.value = String(idx);
      select.dispatchEvent(new Event('change')); // löst das Autofüllen aus
    }
    selectedKundeIndex = idx;
    panel.classList.remove('open');
    ladeKundenDropdown();
    return;
  }

  // Klick außerhalb -> Panel schließen
  if(!wrapper.contains(e.target)){
    panel.classList.remove('open');
  }
});

// Suchfeld im Panel
document.addEventListener('input',(e)=>{
  if(e.target?.id === 'k-select-search'){
    ladeKundenDropdown();
  }
});

// Enter im Suchfeld -> ersten Treffer wählen
document.addEventListener('keydown',(e)=>{
  if(e.target?.id === 'k-select-search' && e.key === 'Enter'){
    const first = $('#k-select-options .cs-option');
    if(first){
      first.click();
      e.preventDefault();
    }
  }
});

// WENN sich das „echte“ Select ändert -> Felder ausfüllen
const kSelect = $('#k-select');
if(kSelect){
  kSelect.addEventListener('change', function(){
    const v = this.value;
    if(v === ''){
      selectedKundeIndex = null;
      updateKundeDisplay();
      return;
    }
    const idx = Number(v);
    if(Number.isNaN(idx)) return;
    selectedKundeIndex = idx;
    applyKundeByIndex(idx);
    updateKundeDisplay();
  });
}

// ---------- Rechnung ----------
let positionen = [];

function posRender(){
  const tbody = $('#pos-tabelle tbody');
  tbody.innerHTML='';
  let netto = 0;
  positionen.forEach((p,idx)=>{
    const zw = (p.preis*p.menge) * (1 - (p.rabatt||0)/100);
    netto += zw;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td class="right">${fmt(p.preis)}</td>
      <td class="right">${p.menge}</td>
      <td class="right">${p.rabatt||0}%</td>
      <td class="right">${fmt(zw)}</td>
      <td class="right"><button class="btn danger" data-remove="${idx}">Entfernen</button></td>`;
    tbody.appendChild(tr);
  });
  const ustSatz = parseFloat($('#r-ust').value||0)/100;
  const versand = parseFloat($('#r-versand').value||0);
  const ust = netto*ustSatz;
  const gesamt = netto+ust+versand;
  $('#summe-netto').textContent = fmt(netto);
  $('#summe-ust').textContent = fmt(ust);
  $('#summe-versand').textContent = fmt(versand);
  $('#summe-gesamt').textContent = fmt(gesamt);
}

function rechnungReset(){
  positionen = [];
  ['r-nr','r-notiz','k-name','k-email','k-adresse','u-name','u-steuer','u-adresse','r-fusstext','pos-preis','pos-menge','pos-rabatt'].forEach(id=>$('#'+id).value='');
  $('#r-datum').value = todayStr();
  $('#r-faellig').value = todayStr();
  $('#r-ust').value = 19; $('#r-versand').value = 0; $('#pos-menge').value=1; $('#pos-rabatt').value=0;
  $('#pos-artikel').selectedIndex=0;

    // NEU:
  const sel = $('#k-select');
  if(sel) sel.value = '';
  selectedKundeIndex = null;
  updateKundeDisplay();

  posRender();
}

function posAusArtikel(){
  const idx = $('#pos-artikel').value;
  if(idx==='') return;
  const a = store.get('artikel', [])[Number(idx)];
  if(!a) return;
  $('#pos-preis').value = a.preis;
}

function posHinzufuegen(){
  const idx = $('#pos-artikel').value;
  let name = '';
  let preis = parseFloat($('#pos-preis').value||0);
  const menge = parseFloat($('#pos-menge').value||1);
  const rabatt = parseFloat($('#pos-rabatt').value||0);
  if(idx!==''){
    const a = store.get('artikel', [])[Number(idx)];
    if(a){ name = `${a.nr} • ${a.name}`; if(!$('#pos-preis').value) preis = a.preis; }
  } else {
    name = prompt('Freitext-Position: Bitte Bezeichnung eingeben:','Neue Position')||'';
  }
  if(!name){ alert('Keine Position angegeben.'); return; }
  positionen.push({name, preis: preis||0, menge: menge||1, rabatt: rabatt||0});
  posRender();
  ['pos-preis','pos-menge','pos-rabatt'].forEach(id=>$('#'+id).value=''); $('#pos-menge').value=1; $('#pos-rabatt').value=0; $('#pos-artikel').selectedIndex=0;
}

$('#pos-artikel').addEventListener('change', posAusArtikel);
$('#btn-pos-hinzufuegen').addEventListener('click', posHinzufuegen);
$('#pos-tabelle').addEventListener('click', e=>{
  if(e.target.dataset.remove!=null){ positionen.splice(Number(e.target.dataset.remove),1); posRender(); }
});
$('#r-ust').addEventListener('input', posRender);
$('#r-versand').addEventListener('input', posRender);

function rechnungSpeichern(){
  const data = {
    nr: $('#r-nr').value.trim() || `R-${Date.now()}`,
    datum: $('#r-datum').value || todayStr(),
    faellig: $('#r-faellig').value || $('#r-datum').value || todayStr(),
    notiz: $('#r-notiz').value.trim(),
    kunde: { name: $('#k-name').value.trim(), email: $('#k-email').value.trim(), adresse: $('#k-adresse').value.trim() },
    firma: { name: $('#u-name').value.trim(), steuer: $('#u-steuer').value.trim(), adresse: $('#u-adresse').value.trim() },
    pos: positionen,
    ust: parseFloat($('#r-ust').value||0),
    versand: parseFloat($('#r-versand').value||0),
    fuss: $('#r-fusstext').value.trim(),
  };
  const arr = store.get('rechnungen', []);
  const idx = arr.findIndex(r=>r.nr===data.nr);
  if(idx>-1) arr[idx]=data; else arr.unshift(data);
  store.set('rechnungen', arr);
  rechnungenRender();
  alert('Rechnung gespeichert.');
}

function rechnungenRender(){
  const arr = store.get('rechnungen', []);
  const q = ($('#suche-rechnung')?.value||'').toLowerCase();
  const tbody = $('#tabelle-rechnungen tbody');
  tbody.innerHTML='';
  arr.filter(r=> (r.nr + ' ' + (r.kunde?.name||'') + ' ' + r.datum).toLowerCase().includes(q)).forEach((r,i)=>{
    const netto = r.pos.reduce((s,p)=> s + (p.preis*p.menge)*(1-(p.rabatt||0)/100), 0);
    const ust = netto * (r.ust/100);
    const summe = netto + ust + (r.versand||0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.nr}</td>
      <td>${r.datum}</td>
      <td>${r.kunde?.name||''}</td>
      <td class="right">${fmt(summe)}</td>
      <td><span class="pill">offen</span></td>
      <td class="right">
        <button class="btn ghost" data-open="${i}">Öffnen</button>
        <button class="btn warn" data-print="${i}">Drucken</button>
        <button class="btn danger" data-del="${i}">Löschen</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function rechnungOeffnen(r){
  $('#r-nr').value=r.nr; $('#r-datum').value=r.datum; $('#r-faellig').value=r.faellig; $('#r-notiz').value=r.notiz||'';
  $('#k-name').value=r.kunde?.name||''; $('#k-email').value=r.kunde?.email||''; $('#k-adresse').value=r.kunde?.adresse||'';
  $('#u-name').value=r.firma?.name||''; $('#u-steuer').value=r.firma?.steuer||''; $('#u-adresse').value=r.firma?.adresse||'';
  $('#r-ust').value=r.ust||19; $('#r-versand').value=r.versand||0; $('#r-fusstext').value=r.fuss||'';
  positionen = r.pos||[]; posRender();
 // Kunden-Dropdown passend setzen
  const arr = kundenStore.getAll();
  const idx = arr.findIndex(k =>
    (k.email && r.kunde?.email && k.email === r.kunde.email) ||
    (k.name && r.kunde?.name && k.name === r.kunde.name)
  );
  const sel = $('#k-select');
  if(sel) sel.value = idx > -1 ? String(idx) : '';
  selectedKundeIndex = idx > -1 ? idx : null;
  updateKundeDisplay();
}

function rechnungDruckAnsicht(r){
  $('#p-nr').textContent = r.nr;
  $('#p-datum').textContent = `Datum: ${r.datum} • Fällig: ${r.faellig}`;
  $('#p-kunde').innerHTML = `<strong>${r.kunde?.name||''}</strong><br>${(r.kunde?.adresse||'').replaceAll('\n','<br>')}<br>${r.kunde?.email||''}`;
  $('#p-unternehmen').innerHTML = `<strong>${r.firma?.name||''}</strong><br>${(r.firma?.adresse||'').replaceAll('\n','<br>')}<br>${r.firma?.steuer||''}`;
  const tbody = $('#p-pos'); tbody.innerHTML='';
  let netto=0; (r.pos||[]).forEach(p=>{
    const zw=(p.preis*p.menge)*(1-(p.rabatt||0)/100); netto+=zw;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="padding:8px;border-bottom:1px solid #eee">${p.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(p.preis)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${p.menge}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${p.rabatt||0}%</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(zw)}</td>`;
    tbody.appendChild(tr);
  });
  const ust = netto*(r.ust/100); const ges = netto+ust+(r.versand||0);
  $('#p-netto').textContent = fmt(netto);
  $('#p-ust').textContent = fmt(ust);
  $('#p-versand').textContent = fmt(r.versand||0);
  $('#p-gesamt').textContent = fmt(ges);
  $('#p-fusstext').textContent = r.fuss||'';
  window.print();
}

$('#btn-speichern-rechnung').addEventListener('click', rechnungSpeichern);
$('#btn-neue-rechnung').addEventListener('click', rechnungReset);
$('#btn-drucken').addEventListener('click', ()=>{
  const arr = store.get('rechnungen', []);
  const idx = arr.findIndex(x=>x.nr===$('#r-nr').value.trim());
  const r = idx>-1 ? arr[idx] : {
    nr: $('#r-nr').value.trim()||'Unbenannt', datum: $('#r-datum').value||todayStr(), faellig: $('#r-faellig').value||todayStr(),
    kunde:{name:$('#k-name').value,email:$('#k-email').value,adresse:$('#k-adresse').value},
    firma:{name:$('#u-name').value,steuer:$('#u-steuer').value,adresse:$('#u-adresse').value},
    pos: positionen, ust: parseFloat($('#r-ust').value||0), versand: parseFloat($('#r-versand').value||0), fuss: $('#r-fusstext').value||''
  };
  rechnungDruckAnsicht(r);
});

$('#tabelle-rechnungen').addEventListener('click', e=>{
  const arr = store.get('rechnungen', []);
  const i = e.target.dataset.open ?? e.target.dataset.print ?? e.target.dataset.del;
  if(i==null) return;
  const r = arr[Number(i)];
  if(e.target.dataset.open!=null){ rechnungOeffnen(r); }
  else if(e.target.dataset.print!=null){ rechnungDruckAnsicht(r); }
  else if(confirm('Rechnung wirklich löschen?')){ arr.splice(Number(i),1); store.set('rechnungen',arr); rechnungenRender(); }
});

$('#suche-rechnung').addEventListener('input', rechnungenRender);

// Export / Import
$('#btn-export').addEventListener('click', ()=>{
  const data = {
    artikel: store.get('artikel', []),
    kunden: store.get('kunden', []),
    rechnungen: store.get('rechnungen', []),
    events: store.get('events', [])
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});
$('#importFile').addEventListener('change', (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    try{
      const data = JSON.parse(rd.result);
      if(data.artikel) store.set('artikel', data.artikel);
      if(data.kunden) store.set('kunden', data.kunden);
      if(data.rechnungen) store.set('rechnungen', data.rechnungen);
      if(data.events) store.set('events', data.events);
      ladeArtikelListe(); ladeKundenListe(); ladeKundenDropdown(); rechnungenRender(); renderCalendar(); renderEventList();
      alert('Import erfolgreich.');
    }catch(err){ alert('Import fehlgeschlagen: '+err.message); }
  };
  rd.readAsText(file);
});

// ---------- Kalender ----------
let calRef = new Date();

function eventsGet(){ return store.get('events', []).sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time)); }
function eventsSet(arr){ store.set('events', arr); }

function renderCalendar(){
  const container = $('#calendar');
  container.innerHTML='';
  const y = calRef.getFullYear();
  const m = calRef.getMonth();
  $('#kal-title').textContent = calRef.toLocaleDateString('de-DE',{month:'long',year:'numeric'});

  const first = new Date(y,m,1);
  const startIdx = (first.getDay()+6)%7; // Mo=0
  const daysInMonth = new Date(y,m+1,0).getDate();
  for(let i=0;i<startIdx;i++) container.appendChild(document.createElement('div'));
  const evs = eventsGet();
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className='cal-cell';
    const date = document.createElement('div'); date.className='date'; date.textContent=d; cell.appendChild(date);
    evs.filter(e=>e.date===dateStr).slice(0,3).forEach(e=>{
      const el = document.createElement('div'); el.className='event'; el.textContent = `${e.time||''} ${e.title}`; cell.appendChild(el);
    });
    cell.addEventListener('click',()=>{ $('#ev-datum').value = dateStr; $('#ev-titel').focus(); });
    container.appendChild(cell);
  }
}

function saveEvent(){
  const date = $('#ev-datum').value; const time = $('#ev-zeit').value; const title = $('#ev-titel').value.trim(); const desc = $('#ev-desc').value.trim();
  if(!date||!title){ alert('Bitte Datum und Titel eingeben.'); return }
  const arr = eventsGet(); arr.push({date,time,title,desc}); eventsSet(arr);
  renderCalendar(); renderEventList();
  ['ev-datum','ev-zeit','ev-titel','ev-desc'].forEach(id=>$('#'+id).value='');
}

function renderEventList(){
  const wrap = $('#ev-liste'); wrap.innerHTML='';
  eventsGet().forEach((e,i)=>{
    const div = document.createElement('div');
    div.className='event';
    div.innerHTML = `<strong>${e.date} ${e.time||''}</strong> – ${e.title}<br><span class="muted">${e.desc||''}</span>
      <div style="margin-top:6px;text-align:right"><button class="btn danger" data-del="${i}">Löschen</button></div>`;
    wrap.appendChild(div);
  });
}

$('#kal-prev').addEventListener('click', ()=>{ calRef.setMonth(calRef.getMonth()-1); renderCalendar(); });
$('#kal-next').addEventListener('click', ()=>{ calRef.setMonth(calRef.getMonth()+1); renderCalendar(); });
$('#btn-ev-speichern').addEventListener('click', saveEvent);
$('#btn-ev-reset').addEventListener('click', ()=>{ ['ev-datum','ev-zeit','ev-titel','ev-desc'].forEach(id=>$('#'+id).value=''); });
$('#ev-liste').addEventListener('click', e=>{
  if(e.target.dataset.del!=null){ const arr=eventsGet(); arr.splice(Number(e.target.dataset.del),1); eventsSet(arr); renderCalendar(); renderEventList(); }
});

// ---------- Initialisierung ----------
function initDemoDaten(){
  if(!localStorage.getItem('artikel')){
    store.set('artikel', [
      {nr:'SKU-001', name:'Beratung (Stunde)', preis:85, ust:19, desc:'IT- und Prozessberatung je Stunde'},
      {nr:'SKU-100', name:'Wartungsvertrag (Monat)', preis:199, ust:19, desc:'Service & Updates'},
      {nr:'SKU-500', name:'Webhosting (Jahr)', preis:120, ust:19, desc:'Domain, SSL, Space'}
    ]);
  }
  if(!localStorage.getItem('kunden')){
    store.set('kunden', [
      {nr:'K-0001', name:'Musterfirma GmbH', ansprech:'Max Beispiel', email:'office@musterfirma.de', phone:'+49 30 123456', land:'Deutschland', strasse:'Beispielstraße 1', plz:'10115', ort:'Berlin', notiz:''},
      {nr:'K-0002', name:'Anna Schmidt', ansprech:'', email:'anna@example.com', phone:'+49 171 555555', land:'Deutschland', strasse:'Hauptweg 5', plz:'20095', ort:'Hamburg', notiz:'Stammkundin'}
    ]);
  }
}

// Neue Rechnung / Laden
$('#btn-neue-rechnung').addEventListener('click', rechnungReset);

// Seite starten
(function start(){
  initDemoDaten();
  $('#r-datum').value = todayStr();
  $('#r-faellig').value = todayStr();
  ladeArtikelListe();
  ladeKundenListe();
  ladeKundenDropdown();
  rechnungenRender();
  renderCalendar();
  renderEventList();

  // Minimale Selbsttests (Konsole)
  try{
    console.assert(fmt(10)==='10,00\u00a0€','fmt ok');
    console.assert(kundenAlsAdresse({strasse:'A 1',plz:'12345',ort:'Stadt',land:'DE'})==='A 1\n12345 Stadt\nDE','addr ok');
  }catch(e){ console.warn('Selbsttest-Hinweis', e); }
})();
