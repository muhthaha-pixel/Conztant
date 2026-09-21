(function(){
"use strict";

/* ============================== utils ============================== */
const $ = (sel, el) => (el||document).querySelector(sel);
const $$ = (sel, el) => Array.from((el||document).querySelectorAll(sel));
const esc = (s) => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const uid = () => Math.random().toString(36).slice(2,9);
// The db capability returns snapshot bodies frozen (read-only) — every "read it, edit it, write
// it back" doc handler needs a real mutable copy first, or assigning a property throws. Since
// everything we store is plain JSON (no Date objects, no functions), a JSON round-trip clones it safely.
const cloneDoc = (obj) => obj==null ? obj : JSON.parse(JSON.stringify(obj));

const money = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n||0);
const moneyShort = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const liters = (n) => (n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' L';
const numFmt = (n) => (n||0).toLocaleString('en-IN',{maximumFractionDigits:2});

function pad2(n){ return String(n).padStart(2,'0'); }
function ymd(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function todayStr(){ return ymd(new Date()); }
function monthIdOf(dateStr){ return dateStr.slice(0,7); }
function dayOf(dateStr){ return dateStr.slice(8,10); }
function monthLabel(monthId){
  const [y,m] = monthId.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}
function shiftMonth(monthId, delta){
  let [y,m] = monthId.split('-').map(Number);
  m += delta;
  while(m<1){m+=12;y--;} while(m>12){m-=12;y++;}
  return y+'-'+pad2(m);
}
function daysInMonth(monthId){
  const [y,m] = monthId.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function fmtDateLabel(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

function icon(name){
  const paths = {
    home:'<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
    pump:'<path d="M5 21V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15"/><path d="M5 12h9"/><path d="M16 8h2l2 2v7a1.3 1.3 0 0 1-2.6 0v-2.5H16"/>',
    tank:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>',
    receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
    wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14" r="1"/>',
    chart:'<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2 20h20"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.6 7.6 0 0 0 .1-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.5 2.4a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L6.5 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1L10 21h4l.5-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    chevL:'<path d="M15 18l-6-6 6-6"/>', chevR:'<path d="M9 18l6-6-6-6"/>',
    trash:'<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>';
}

/* ============================== confirm modal ============================== */
function closeModal(){
  const root = $('#modalRoot');
  if (root) root.innerHTML = '';
}
function confirmModal({title, body, confirmLabel='Delete', cancelLabel='Cancel', danger=true}){
  return new Promise(resolve=>{
    const root = $('#modalRoot');
    if (!root){ resolve(false); return; }
    root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
      <div class="modal">
        <h3>${esc(title)}</h3>
        <p style="font-size:13.5px;color:var(--text-muted);margin:0 0 4px;">${body||''}</p>
        <div class="modal-actions">
          <button class="btn" id="mbCancel">${esc(cancelLabel)}</button>
          <button class="btn ${danger?'danger':'primary'}" id="mbConfirm">${esc(confirmLabel)}</button>
        </div>
      </div>
    </div>`;
    const cleanup = (val)=>{ closeModal(); resolve(val); };
    $('#mbCancel').onclick = ()=>cleanup(false);
    $('#mbConfirm').onclick = ()=>cleanup(true);
    $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') cleanup(false); });
  });
}

function openPaymentModal(creditor){
  const root = $('#modalRoot');
  if (!root) return;
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>Record payment — ${esc(creditor.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">Outstanding balance: <strong class="mono">${money(creditor.balance||0)}</strong></p>
      <div class="field"><label>Date</label><input type="date" id="pmDate" value="${todayStr()}" max="${todayStr()}"></div>
      <div class="field"><label>Amount received (₹)</label><input type="number" step="0.01" id="pmAmount" placeholder="0.00"></div>
      <div class="field"><label>Note (optional)</label><input type="text" id="pmNote" placeholder="e.g. cash / bank transfer"></div>
      <div id="pmMsg" style="font-size:13px;color:var(--critical);"></div>
      <div class="modal-actions">
        <button class="btn" id="pmCancel">Cancel</button>
        <button class="btn primary" id="pmSave">Record payment</button>
      </div>
    </div>
  </div>`;
  $('#pmCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $('#pmSave').onclick = async ()=>{
    if (!state.dbReady){ $('#pmMsg').textContent = "Live data isn't connected."; return; }
    const amt = num($('#pmAmount').value);
    if (!(amt>0)){ $('#pmMsg').textContent = 'Enter an amount.'; return; }
    const date = $('#pmDate').value, note = $('#pmNote').value.trim();
    $('#pmSave').disabled = true;
    try{
      const cRef = state.db.doc('creditors/'+creditor.id);
      const snap = await cRef.get();
      const data = snap.exists ? snap.data() : {};
      const payments = (data.payments||[]).concat([{id:uid(), date, amount:amt, note, savedAt:new Date().toISOString()}]);
      const balance = num(data.balance) - amt;
      await cRef.update({payments, balance});
      await logActivity({entity:'Creditor payment', entityLabel:creditor.name, action:'add', summary:`Recorded ${money(amt)} payment`});
      closeModal();
    }catch(e){
      $('#pmMsg').textContent = 'Could not save: '+(e.message||'error');
      $('#pmSave').disabled = false;
    }
  };
}

function openCreditorLedgerModal(creditor){
  const root = $('#modalRoot');
  if (!root) return;
  const payments = (creditor.payments||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal" style="max-width:540px;">
      <h3>Payment history — ${esc(creditor.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;">Outstanding balance: <strong class="mono">${money(creditor.balance||0)}</strong></p>
      <div class="table-wrap" style="max-height:320px;overflow-y:auto;">
        <table><thead><tr><th>Date</th><th class="num">Amount</th><th>Note</th><th></th></tr></thead>
        <tbody id="clTbody">${payments.length? payments.map(p=>`<tr data-id="${p.id}">
          <td><input type="date" class="clDate" value="${p.date||''}" style="width:130px;"></td>
          <td class="num"><input type="number" step="0.01" class="clAmt" value="${p.amount||0}" style="width:90px;text-align:right;"></td>
          <td><input type="text" class="clNote" value="${esc(p.note||'')}" style="width:120px;"></td>
          <td><button class="btn ghost sm clSave">Save</button> <button class="btn danger sm clDel">${icon('trash')}</button></td>
        </tr>`).join('') : `<tr><td colspan="4" class="empty">No payments recorded yet.</td></tr>`}</tbody></table>
      </div>
      <div id="clMsg" style="font-size:13px;color:var(--critical);margin-top:6px;"></div>
      <div class="modal-actions"><button class="btn" id="clClose">Close</button></div>
    </div>
  </div>`;
  $('#clClose').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $$('.clSave', root).forEach(b=>b.onclick=async ()=>{
    if (!state.dbReady){ $('#clMsg').textContent = "Live data isn't connected."; return; }
    const tr = b.closest('tr'); const id = tr.dataset.id;
    const old = (creditor.payments||[]).find(x=>x.id===id);
    if (!old) return;
    const newDate = tr.querySelector('.clDate').value;
    const newAmt = num(tr.querySelector('.clAmt').value);
    const newNote = tr.querySelector('.clNote').value.trim();
    try{
      const cRef = state.db.doc('creditors/'+creditor.id);
      const snap = await cRef.get();
      const data = snap.exists ? snap.data() : {};
      const payments = (data.payments||[]).map(p=>p.id===id?Object.assign({},p,{date:newDate,amount:newAmt,note:newNote}):p);
      const balance = num(data.balance) - (newAmt - num(old.amount));
      await cRef.update({payments, balance});
      const changes = [];
      if ((old.date||'')!==newDate) changes.push({field:'Date', from:old.date||'—', to:newDate});
      if (num(old.amount)!==newAmt) changes.push({field:'Amount', from:money(old.amount), to:money(newAmt)});
      if ((old.note||'')!==newNote) changes.push({field:'Note', from:old.note||'—', to:newNote||'—'});
      if (changes.length) await logActivity({entity:'Creditor payment', entityLabel:creditor.name, action:'edit', changes});
      openCreditorLedgerModal(Object.assign({}, creditor, {payments, balance}));
    }catch(e){ $('#clMsg').textContent = 'Could not save: '+(e.message||'error'); }
  });
  $$('.clDel', root).forEach(b=>b.onclick=async ()=>{
    if (!state.dbReady){ $('#clMsg').textContent = "Live data isn't connected."; return; }
    const tr = b.closest('tr'); const id = tr.dataset.id;
    const old = (creditor.payments||[]).find(x=>x.id===id);
    if (!old) return;
    const ok = await confirmModal({title:'Delete this payment?', body:"This removes it from the creditor's history and adds the amount back to their outstanding balance.", confirmLabel:'Delete payment'});
    if (!ok) return;
    try{
      const cRef = state.db.doc('creditors/'+creditor.id);
      const snap = await cRef.get();
      const data = snap.exists ? snap.data() : {};
      const payments = (data.payments||[]).filter(p=>p.id!==id);
      const balance = num(data.balance) + num(old.amount);
      await cRef.update({payments, balance});
      await logActivity({entity:'Creditor payment', entityLabel:creditor.name, action:'delete', summary:`Removed ${money(old.amount)} payment`});
      openCreditorLedgerModal(Object.assign({}, creditor, {payments, balance}));
    }catch(e){ /* confirmModal already closed the ledger view; nothing more to show */ }
  });
}

function openAccountLedgerModal(account){
  const root = $('#modalRoot');
  if (!root) return;
  const ledger = (account.ledger||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const sign = (type)=> type==='deposit' ? 1 : -1;
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal" style="max-width:560px;">
      <h3>Ledger — ${esc(account.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 12px;">Balance: <strong class="mono">${money(account.balance||0)}</strong></p>
      <div class="table-wrap" style="max-height:320px;overflow-y:auto;">
        <table><thead><tr><th>Date</th><th>Type</th><th class="num">Amount</th><th>From / note</th><th></th></tr></thead>
        <tbody id="alTbody">${ledger.length? ledger.map(l=>`<tr data-id="${l.id}" data-type="${l.type}">
          <td><input type="date" class="alDate" value="${l.date||''}" style="width:130px;"></td>
          <td><span class="pill neutral">${esc(l.type)}</span></td>
          <td class="num"><input type="number" step="0.01" class="alAmt" value="${l.amount||0}" style="width:90px;text-align:right;"></td>
          <td><input type="text" class="alFrom" value="${esc(l.from||l.note||'')}" style="width:130px;"></td>
          <td><button class="btn ghost sm alSave">Save</button> <button class="btn danger sm alDel">${icon('trash')}</button></td>
        </tr>`).join('') : `<tr><td colspan="5" class="empty">No entries yet.</td></tr>`}</tbody></table>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:11.5px;margin-top:6px;">Deposits add to the balance, settlements subtract from it — the type of an existing entry can't be changed here.</div>
      <div id="alMsg" style="font-size:13px;color:var(--critical);margin-top:4px;"></div>
      <div class="modal-actions"><button class="btn" id="alClose">Close</button></div>
    </div>
  </div>`;
  $('#alClose').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $$('.alSave', root).forEach(b=>b.onclick=async ()=>{
    if (!state.dbReady){ $('#alMsg').textContent = "Live data isn't connected."; return; }
    const tr = b.closest('tr'); const id = tr.dataset.id, type = tr.dataset.type;
    const old = (account.ledger||[]).find(x=>x.id===id);
    if (!old) return;
    const newDate = tr.querySelector('.alDate').value;
    const newAmt = num(tr.querySelector('.alAmt').value);
    const newFrom = tr.querySelector('.alFrom').value.trim();
    try{
      const aRef = state.db.doc('accounts/'+account.id);
      const snap = await aRef.get();
      const data = snap.exists ? snap.data() : {};
      const ledger = (data.ledger||[]).map(l=>l.id===id?Object.assign({},l,{date:newDate,amount:newAmt,from:newFrom,note:newFrom}):l);
      const balance = num(data.balance) + sign(type)*(newAmt - num(old.amount));
      await aRef.update({ledger, balance});
      const changes = [];
      if ((old.date||'')!==newDate) changes.push({field:'Date', from:old.date||'—', to:newDate});
      if (num(old.amount)!==newAmt) changes.push({field:'Amount', from:money(old.amount), to:money(newAmt)});
      if ((old.from||old.note||'')!==newFrom) changes.push({field:'From / note', from:old.from||old.note||'—', to:newFrom||'—'});
      if (changes.length) await logActivity({entity:'Account entry', entityLabel:account.name, action:'edit', changes});
      openAccountLedgerModal(Object.assign({}, account, {ledger, balance}));
    }catch(e){ $('#alMsg').textContent = 'Could not save: '+(e.message||'error'); }
  });
  $$('.alDel', root).forEach(b=>b.onclick=async ()=>{
    if (!state.dbReady){ $('#alMsg').textContent = "Live data isn't connected."; return; }
    const tr = b.closest('tr'); const id = tr.dataset.id, type = tr.dataset.type;
    const old = (account.ledger||[]).find(x=>x.id===id);
    if (!old) return;
    const ok = await confirmModal({title:'Delete this entry?', body:'This removes it from the ledger and reverses its effect on the balance.', confirmLabel:'Delete entry'});
    if (!ok) return;
    try{
      const aRef = state.db.doc('accounts/'+account.id);
      const snap = await aRef.get();
      const data = snap.exists ? snap.data() : {};
      const ledger = (data.ledger||[]).filter(l=>l.id!==id);
      const balance = num(data.balance) - sign(type)*num(old.amount);
      await aRef.update({ledger, balance});
      await logActivity({entity:'Account entry', entityLabel:account.name, action:'delete', summary:`Removed a ${old.type} of ${money(old.amount)}`});
      openAccountLedgerModal(Object.assign({}, account, {ledger, balance}));
    }catch(e){ /* modal already updated by confirmModal's close */ }
  });
}

/* ============================== generic line-edit modal + activity log ============================== */
function fieldHtml(f, val){
  const id = 'lem_'+f.key;
  if (f.type==='select'){
    return `<div class="field"><label>${esc(f.label)}</label><select id="${id}">${(f.options||[]).map(o=>`<option value="${esc(String(o.value))}" ${String(o.value)===String(val)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  }
  if (f.type==='checkbox'){
    return `<label class="toggle" style="margin:6px 0;"><input type="checkbox" id="${id}" ${val?'checked':''}> ${esc(f.label)}</label>`;
  }
  const type = f.type||'text';
  const stepAttr = type==='number' ? ' step="0.01"' : '';
  return `<div class="field"><label>${esc(f.label)}</label><input type="${type}" id="${id}"${stepAttr} value="${val==null?'':esc(String(val))}"></div>`;
}
function openLineEditModal({title, subtitle, fields, values, onSave, saveLabel='Save changes'}){
  const root = $('#modalRoot');
  if (!root) return;
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>${esc(title)}</h3>
      ${subtitle?`<p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">${subtitle}</p>`:''}
      ${fields.map(f=>fieldHtml(f, values[f.key])).join('')}
      <div id="lemMsg" style="font-size:13px;color:var(--critical);margin-top:4px;"></div>
      <div class="modal-actions">
        <button class="btn" id="lemCancel">Cancel</button>
        <button class="btn primary" id="lemSave">${esc(saveLabel)}</button>
      </div>
    </div>
  </div>`;
  $('#lemCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $('#lemSave').onclick = async ()=>{
    const out = {};
    fields.forEach(f=>{
      const el = $('#lem_'+f.key);
      if (!el) return;
      if (f.type==='checkbox') out[f.key] = el.checked;
      else if (f.type==='number') out[f.key] = num(el.value);
      else out[f.key] = el.value;
    });
    $('#lemMsg').textContent = '';
    $('#lemSave').disabled = true;
    try{
      await onSave(out);
      closeModal();
    }catch(e){
      $('#lemMsg').textContent = 'Could not save: '+(e.message||'error');
      $('#lemSave').disabled = false;
    }
  };
}
// Compares a field list's old vs new values (using each field's own display formatter when given)
// and returns only what actually changed — the shape every edit modal logs to the Activity Log.
function diffFields(fields, oldObj, newObj){
  const changes = [];
  fields.forEach(f=>{
    const ov = oldObj ? oldObj[f.key] : undefined;
    const nv = newObj[f.key];
    const os = f.fmt ? f.fmt(ov) : (ov==null||ov===''?'—':String(ov));
    const ns = f.fmt ? f.fmt(nv) : (nv==null||nv===''?'—':String(nv));
    if (os !== ns) changes.push({field:f.label, from:os, to:ns});
  });
  return changes;
}
// Appends one entry to that day's month's activity log. Never throws — logging must never
// block the actual save it's recording. Records the signed-in user (if any) alongside what
// changed and when — on a station that hasn't set up users yet, "by" is just left blank.
async function logActivity({entity, entityLabel, action, changes, summary}){
  if (!state.dbReady) return;
  try{
    const monthId = monthIdOf(todayStr());
    const data = (await getMonthDoc('activityLog', monthId)) || {items:[]};
    const by = state.currentUser ? state.currentUser.name : '';
    data.items = (data.items||[]).concat([{id:uid(), at:new Date().toISOString(), entity, entityLabel:entityLabel||'', action, changes:changes||[], summary:summary||'', by}]);
    await setMonthDoc('activityLog', monthId, data);
  }catch(e){ /* swallow — logging is best-effort */ }
}

/* ============================== state ============================== */
const state = {
  db: null,
  dbReady: false,
  config: { stationName:'Conztant Petroleum Retailers', products:{p1:'Petrol (MS)',p2:'Diesel (HSD)',p3:'Power / XP'} },
  tanks: [], nozzles: [], staff: [], creditors: [], suppliers: [], accounts: [],
  users: [], usersLoaded: false, currentUser: null,
  ratesFlat: {},        // 'YYYY-MM-DD' -> {p1,r2,p3}
  ratesLoadedMonths: new Set(),
  activeMonth: monthIdOf(todayStr()),
  view: 'dashboard',
  setupTab: 'tanks',
  monthCache: {},       // collectionName -> {monthId: data}
  dailyLogsCache: {},   // date -> doc data
  monthLogsCache: {},   // monthId -> dailyLogs docs array (for reports/salary)
  todayLog: null,
};

const PRODUCT_KEYS = ['p1','p2','p3'];
const PRODUCT_COLOR = {p1:'var(--cat-1)', p2:'var(--cat-2)', p3:'var(--cat-3)'};

/* ============================== db bootstrap ============================== */
// Connects to Firebase Firestore using the config in js/firebase-config.js. The compat SDK
// exposes the same doc/collection/onSnapshot/where API this app was written against, so the
// rest of the code is unchanged. Anonymous auth is used so Firestore rules can require a
// signed-in session (see firestore.rules) without users ever seeing a Google login.
let dbError = '';
async function initDb(){
  try{
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || /^PASTE/.test(cfg.apiKey)){
      throw new Error('Firebase is not configured yet — fill in js/firebase-config.js');
    }
    if (!window.firebase) throw new Error('Firebase SDK failed to load (check your internet connection).');
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    await firebase.auth().signInAnonymously();
    state.db = firebase.firestore();
  }catch(e){
    state.db = null;
    dbError = e.message || String(e);
  }
  state.dbReady = !!state.db;
  if (state.dbReady) subscribeMasters();
  renderAll();
}

function subscribeMasters(){
  const db = state.db;
  db.doc('config/main').onSnapshot(snap=>{
    if (snap.exists){ state.config = Object.assign({}, state.config, snap.data()); }
    $('#stationNameLbl').textContent = state.config.stationName || 'Fuel Ledger';
    refreshView();
  }, ()=>{});

  db.collection('tanks').onSnapshot(qs=>{
    state.tanks = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('nozzles').onSnapshot(qs=>{
    state.nozzles = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('staff').onSnapshot(qs=>{
    state.staff = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('creditors').onSnapshot(qs=>{
    state.creditors = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('suppliers').onSnapshot(qs=>{
    state.suppliers = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('accounts').onSnapshot(qs=>{
    state.accounts = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('users').onSnapshot(qs=>{
    state.users = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    state.usersLoaded = true;
    if (state.currentUser){
      // Keep the signed-in profile in sync if an owner edits this user's role/name/password
      // elsewhere, and sign them out immediately if their account was deleted or deactivated.
      const fresh = state.users.find(u=>u.id===state.currentUser.id);
      if (fresh && fresh.active!==false) state.currentUser = fresh;
      else { state.currentUser = null; clearSession(); }
    } else {
      tryRestoreSession();
    }
    renderAll();
  }, ()=>{});

  loadTodayLog();
}

function loadTodayLog(){
  if(!state.db) return;
  state.db.doc('dailyLogs/'+todayStr()).onSnapshot(snap=>{
    // Prime the same cache getDailyLog() reads from, so a save later today doesn't pick up
    // this listener's frozen snapshot body instead of a clone it's allowed to mutate.
    state.todayLog = snap.exists ? cloneDoc(snap.data()) : null;
    state.dailyLogsCache[todayStr()] = state.todayLog;
    if(!authGateNeeded() && (state.view==='dashboard' || state.view==='shift')) renderCurrentView();
  }, ()=>{});
}

/* ============================== login / access control ============================== */
// Roles are enforced only at the nav/view level (which tabs a signed-in user can open) — there's
// no server-side rule layer behind the db capability, so this is a front-door convenience for a
// shared terminal, not a hard security boundary. See the login screen's own note to the owner.
const ROLE_TABS = {
  owner:   ['dashboard','shift','stock','expenses','salary','reports','activity','setup'],
  manager: ['dashboard','shift','stock','expenses','salary','reports'],
  staff:   ['dashboard','shift'],
};
const ROLE_LABEL = {owner:'Owner', manager:'Manager', staff:'Staff'};
function allowedTabs(){
  if (!state.currentUser) return NAV.map(n=>n.id);
  return ROLE_TABS[state.currentUser.role] || ['dashboard'];
}
function authGateNeeded(){
  if (!state.dbReady) return null; // offline/dev mode: no users collection to check against, keep the app open
  if (!state.usersLoaded) return 'loading';
  if (!state.users.length) return 'bootstrap';
  if (!state.currentUser) return 'login';
  return null;
}
// Snapshot listeners that can fire before login (initial master-data load) must not blow away
// a login/bootstrap screen that's currently showing — they re-check the gate before touching #viewRoot.
function refreshView(){
  if (authGateNeeded()) { renderAll(); return; }
  renderCurrentView();
}
const SESSION_KEY = 'pumpLedgerUserId';
function persistSession(userId){
  try{ sessionStorage.setItem(SESSION_KEY, userId); }catch(e){}
}
function clearSession(){
  try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
}
function tryRestoreSession(){
  if (state.currentUser) return;
  let savedId = null;
  try{ savedId = sessionStorage.getItem(SESSION_KEY); }catch(e){}
  if (!savedId) return;
  const u = state.users.find(x=>x.id===savedId);
  if (u && u.active!==false) state.currentUser = u;
  else clearSession();
}
function signOut(){
  state.currentUser = null;
  clearSession();
  state.view = 'dashboard';
  renderAll();
}
function renderTopbarUser(){
  const el = $('#userChip');
  if (!el) return;
  if (!state.currentUser){ el.innerHTML = ''; return; }
  const u = state.currentUser;
  el.innerHTML = `<span class="pill neutral" style="margin-right:6px;">${esc(u.name)} · ${esc(ROLE_LABEL[u.role]||u.role)}</span><button class="btn ghost sm" id="chgPwBtn" type="button">Change password</button> <button class="btn ghost sm" id="signOutBtn" type="button">Sign out</button>`;
  $('#chgPwBtn').onclick = openChangePasswordModal;
  $('#signOutBtn').onclick = signOut;
}
function renderOwnerBootstrap(mount){
  mount.innerHTML = `
    <div class="card card-pad" style="max-width:420px;margin:56px auto;">
      <h2 style="margin-top:0;">Welcome — set up the Owner account</h2>
      <p style="font-size:13px;color:var(--text-muted);">No user profiles exist yet. Create the first one — it gets full Owner access, including managing every other user afterwards.</p>
      <div class="field"><label>Your name</label><input type="text" id="bsName" placeholder="e.g. Muhammed Thaha"></div>
      <div class="field"><label>Username</label><input type="text" id="bsUser" placeholder="e.g. muhammed" autocomplete="username"></div>
      <div class="field"><label>Password</label><input type="password" id="bsPass" autocomplete="new-password"></div>
      <div class="field"><label>Confirm password</label><input type="password" id="bsPass2" autocomplete="new-password"></div>
      <div id="bsMsg" style="font-size:13px;color:var(--critical);min-height:18px;"></div>
      <button class="btn primary" style="width:100%" id="bsCreate" type="button">Create Owner account</button>
      <p class="hint" style="color:var(--text-faint);font-size:11.5px;margin-top:10px;">Heads-up: passwords here are a convenience lock for this shared terminal, not encrypted storage — don't reuse a sensitive password.</p>
    </div>
  `;
  $('#bsCreate').onclick = async ()=>{
    const name = $('#bsName').value.trim();
    const username = $('#bsUser').value.trim().toLowerCase().replace(/\s+/g,'');
    const pass = $('#bsPass').value, pass2 = $('#bsPass2').value;
    const msg = $('#bsMsg');
    if (!name || !username){ msg.textContent = 'Enter your name and a username.'; return; }
    if (!pass || pass.length<4){ msg.textContent = 'Password must be at least 4 characters.'; return; }
    if (pass!==pass2){ msg.textContent = 'Passwords do not match.'; return; }
    if (!state.dbReady){ msg.textContent = "Live data isn't connected."; return; }
    $('#bsCreate').disabled = true;
    try{
      const id = uid();
      const record = {name, username, password:pass, role:'owner', active:true, createdAt:new Date().toISOString()};
      await state.db.doc('users/'+id).set(record);
      state.currentUser = Object.assign({id}, record);
      state.users = state.users.concat([state.currentUser]);
      state.usersLoaded = true;
      persistSession(id);
      await logActivity({entity:'User', entityLabel:name, action:'add', summary:'Created the Owner account'});
      renderAll();
    }catch(e){ msg.textContent = 'Could not save: '+(e.message||'error'); $('#bsCreate').disabled = false; }
  };
}
function renderLoginScreen(mount){
  mount.innerHTML = `
    <div class="card card-pad" style="max-width:380px;margin:56px auto;">
      <h2 style="margin-top:0;">${esc(state.config.stationName || 'Sign in')}</h2>
      <p style="font-size:13px;color:var(--text-muted);">Sign in to continue.</p>
      <div class="field"><label>Username</label><input type="text" id="liUser" autocomplete="username"></div>
      <div class="field"><label>Password</label><input type="password" id="liPass" autocomplete="current-password"></div>
      <div id="liMsg" style="font-size:13px;color:var(--critical);min-height:18px;"></div>
      <button class="btn primary" style="width:100%" id="liSubmit" type="button">Sign in</button>
    </div>
  `;
  const submit = ()=>{
    const username = $('#liUser').value.trim().toLowerCase();
    const pass = $('#liPass').value;
    const msg = $('#liMsg');
    const u = state.users.find(x=>String(x.username||'').toLowerCase()===username);
    if (!u || u.active===false || u.password!==pass){ msg.textContent = 'Incorrect username or password.'; return; }
    state.currentUser = u;
    persistSession(u.id);
    renderAll();
  };
  $('#liSubmit').onclick = submit;
  ['liUser','liPass'].forEach(id=> $('#'+id).addEventListener('keydown', e=>{ if (e.key==='Enter') submit(); }));
}
function openChangePasswordModal(){
  const root = $('#modalRoot');
  if (!root || !state.currentUser) return;
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>Change password</h3>
      <div class="field"><label>Current password</label><input type="password" id="cpOld" autocomplete="current-password"></div>
      <div class="field"><label>New password</label><input type="password" id="cpNew" autocomplete="new-password"></div>
      <div class="field"><label>Confirm new password</label><input type="password" id="cpNew2" autocomplete="new-password"></div>
      <div id="cpMsg" style="font-size:13px;color:var(--critical);"></div>
      <div class="modal-actions">
        <button class="btn" id="cpCancel">Cancel</button>
        <button class="btn primary" id="cpSave">Change password</button>
      </div>
    </div>
  </div>`;
  $('#cpCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $('#cpSave').onclick = async ()=>{
    const msg = $('#cpMsg');
    const oldPass = $('#cpOld').value, newPass = $('#cpNew').value, newPass2 = $('#cpNew2').value;
    if (oldPass !== state.currentUser.password){ msg.textContent = 'Current password is incorrect.'; return; }
    if (!newPass || newPass.length<4){ msg.textContent = 'New password must be at least 4 characters.'; return; }
    if (newPass !== newPass2){ msg.textContent = 'New passwords do not match.'; return; }
    if (!state.dbReady){ msg.textContent = "Live data isn't connected."; return; }
    $('#cpSave').disabled = true;
    try{
      await state.db.doc('users/'+state.currentUser.id).update({password:newPass});
      await logActivity({entity:'User', entityLabel:state.currentUser.name, action:'edit', summary:'Changed their own password'});
      closeModal();
    }catch(e){ msg.textContent = 'Could not save: '+(e.message||'error'); $('#cpSave').disabled = false; }
  };
}

/* ---- generic monthly aggregate doc helpers (read-mutate-set pattern) ---- */
async function getMonthDoc(collection, monthId){
  const cacheKey = collection;
  state.monthCache[cacheKey] = state.monthCache[cacheKey] || {};
  if (state.monthCache[cacheKey][monthId] !== undefined) return state.monthCache[cacheKey][monthId];
  if (!state.db) return null;
  const snap = await state.db.doc(collection+'/'+monthId).get();
  const data = snap.exists ? cloneDoc(snap.data()) : null;
  state.monthCache[cacheKey][monthId] = data;
  return data;
}
async function setMonthDoc(collection, monthId, data){
  state.monthCache[collection] = state.monthCache[collection] || {};
  state.monthCache[collection][monthId] = data;
  if (!state.db) return;
  await state.db.doc(collection+'/'+monthId).set(data);
}
function invalidateMonth(collection, monthId){
  if (state.monthCache[collection]) delete state.monthCache[collection][monthId];
}

async function getDailyLog(dateStr){
  if (state.dailyLogsCache[dateStr] !== undefined) return state.dailyLogsCache[dateStr];
  if (!state.db) return null;
  const snap = await state.db.doc('dailyLogs/'+dateStr).get();
  const data = snap.exists ? cloneDoc(snap.data()) : null;
  state.dailyLogsCache[dateStr] = data;
  return data;
}
async function setDailyLog(dateStr, data){
  state.dailyLogsCache[dateStr] = data;
  delete state.monthLogsCache[monthIdOf(dateStr)];
  if (!state.db) return;
  await state.db.doc('dailyLogs/'+dateStr).set(data);
}
async function getMonthDailyLogs(monthId){
  if (state.monthLogsCache[monthId]) return state.monthLogsCache[monthId];
  if (!state.db) return [];
  const dim = daysInMonth(monthId);
  const startDate = monthId+'-01', endDate = monthId+'-'+pad2(dim);
  const qs = await state.db.collection('dailyLogs').where('date','>=',startDate).where('date','<=',endDate).get();
  const docs = qs.docs.map(d=>cloneDoc(d.data()));
  state.monthLogsCache[monthId] = docs;
  return docs;
}
function hoursBetween(start, end){
  if (!start || !end) return 0;
  const parts1 = start.split(':').map(Number), parts2 = end.split(':').map(Number);
  const sh=parts1[0], sm=parts1[1], eh=parts2[0], em=parts2[1];
  if ([sh,sm,eh,em].some(n=>isNaN(n))) return 0;
  let diff = (eh*60+em) - (sh*60+sm);
  if (diff<=0) diff += 24*60;
  return diff/60;
}

/* ---- rates ---- */
async function ensureRatesMonthLoaded(monthId){
  if (state.ratesLoadedMonths.has(monthId)) return;
  const data = await getMonthDoc('ratesMonthly', monthId);
  const days = (data && data.days) || {};
  Object.keys(days).forEach(d=>{
    state.ratesFlat[monthId+'-'+d] = days[d];
  });
  state.ratesLoadedMonths.add(monthId);
}
async function getRateForDate(dateStr, productKey){
  const monthId = monthIdOf(dateStr);
  await ensureRatesMonthLoaded(monthId);
  await ensureRatesMonthLoaded(shiftMonth(monthId,-1));
  const keys = Object.keys(state.ratesFlat).filter(k=>k<=dateStr).sort().reverse();
  for (const k of keys){
    const r = state.ratesFlat[k];
    if (r && r[productKey]!=null) return r[productKey];
  }
  return null;
}
async function setRateForDate(dateStr, rates){
  const monthId = monthIdOf(dateStr), d = dayOf(dateStr);
  const data = (await getMonthDoc('ratesMonthly', monthId)) || {days:{}};
  data.days = data.days || {};
  data.days[d] = Object.assign({}, data.days[d]||{}, rates);
  await setMonthDoc('ratesMonthly', monthId, data);
  invalidateMonth('ratesMonthly', monthId);
  state.ratesLoadedMonths.delete(monthId);
  await ensureRatesMonthLoaded(monthId);
}

/* ============================== nav / router ============================== */
const NAV = [
  {id:'dashboard', label:'Dashboard', icon:'home'},
  {id:'shift', label:'Duty Entry', icon:'pump'},
  {id:'stock', label:'Stock', icon:'tank'},
  {id:'expenses', label:'Expenses', icon:'receipt'},
  {id:'salary', label:'Salary', icon:'wallet'},
  {id:'reports', label:'Reports', icon:'chart'},
  {id:'activity', label:'Activity Log', icon:'clock'},
  {id:'setup', label:'Setup', icon:'gear'},
];

function renderNav(){
  const tabs = $('#tabs');
  const visible = NAV.filter(n=>allowedTabs().includes(n.id));
  tabs.innerHTML = visible.map(n=>`<button data-view="${n.id}" class="${state.view===n.id?'active':''}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
  tabs.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{ state.view = b.dataset.view; renderAll(); });
  });
}

function renderAll(){
  renderTopbarUser();
  const gate = authGateNeeded();
  if (gate){
    $('#tabs').innerHTML = '';
    const views = $('#views');
    views.innerHTML = `<div class="view active" id="viewRoot"></div>`;
    const root = $('#viewRoot');
    if (gate==='loading') root.innerHTML = `<div class="card empty" style="max-width:380px;margin:56px auto;">Loading…</div>`;
    else if (gate==='bootstrap') renderOwnerBootstrap(root);
    else renderLoginScreen(root);
    return;
  }
  if (!allowedTabs().includes(state.view)) state.view = allowedTabs()[0] || 'dashboard';
  renderNav();
  $('#todayChip').textContent = fmtDateLabel(todayStr());
  const views = $('#views');
  views.innerHTML = `<div class="view active" id="viewRoot"></div>`;
  renderCurrentView();
}

function renderCurrentView(){
  const root = $('#viewRoot');
  if (!root) return;
  if (authGateNeeded()){ renderAll(); return; }
  if (!allowedTabs().includes(state.view)) state.view = allowedTabs()[0] || 'dashboard';
  if (!state.dbReady){
    root.innerHTML = offlineNotice() + viewShell();
  } else {
    root.innerHTML = viewShell();
  }
  const mount = $('#viewMount');
  switch(state.view){
    case 'dashboard': renderDashboard(mount); break;
    case 'shift': renderShiftEntry(mount); break;
    case 'stock': renderStock(mount); break;
    case 'expenses': renderExpenses(mount); break;
    case 'salary': renderSalary(mount); break;
    case 'reports': renderReports(mount); break;
    case 'activity': renderActivityLog(mount); break;
    case 'setup': renderSetup(mount); break;
  }
}
function viewShell(){ return `<div id="viewMount"></div>`; }
function offlineNotice(){
  return `<div class="banner">${icon('gear')}<div>Live data isn't connected — ${esc(dbError||'could not reach Firebase')}. Nothing can be saved until this is fixed. See README.md for the Firebase setup steps.</div></div>`;
}

/* ============================== DASHBOARD ============================== */
function renderDashboard(mount){
  const log = state.todayLog;
  const dayAmount = log ? (log.dayAmount||0) : 0;
  const dayLiters = log ? (log.dayLiters||0) : 0;
  const duties = log ? Object.values(log.duties||{}) : [];

  mount.innerHTML = `
    <h1 class="page-title">Today, ${fmtDateLabel(todayStr())}</h1>
    <p class="page-sub">${esc(state.config.stationName||'')}</p>

    <div class="grid grid-kpi">
      <div class="card kpi"><div class="label">Sales today</div><div class="value">${money(dayAmount)}</div><div class="foot">${liters(dayLiters)} dispensed</div></div>
      <div class="card kpi"><div class="label">Duties logged today</div><div class="value">${duties.length}</div><div class="foot">${duties.length? duties.map(d=>esc(d.staffName)).join(', ') : 'none yet'}</div></div>
      <div class="card kpi"><div class="label">Active nozzles</div><div class="value">${state.nozzles.filter(n=>n.active!==false).length}</div><div class="foot">across ${state.tanks.filter(t=>t.active!==false).length} tanks</div></div>
      <div class="card kpi"><div class="label">Staff on roll</div><div class="value">${state.staff.filter(s=>s.active!==false).length}</div><div class="foot">active</div></div>
    </div>

    <div class="section-head"><h2>Tank stock</h2><span class="hint">updates as duties are saved</span></div>
    <div class="grid grid-2" id="dashTanks"></div>

    <div class="section-head"><h2>Quick actions</h2></div>
    <div class="row">
      <button class="btn primary" id="qaShift">${icon('pump')} Log a duty</button>
      <button class="btn" id="qaExpense">${icon('receipt')} Log an expense</button>
      <button class="btn" id="qaStock">${icon('tank')} Record fuel purchase</button>
    </div>
  `;
  renderTankCards($('#dashTanks'), {compact:true});
  $('#qaShift').onclick = ()=>{ state.view='shift'; renderAll(); };
  $('#qaExpense').onclick = ()=>{ state.view='expenses'; renderAll(); };
  $('#qaStock').onclick = ()=>{ state.view='stock'; renderAll(); };
}

function tankLevelStatus(pct){
  if (pct<=15) return {cls:'critical', label:'Low'};
  if (pct<=35) return {cls:'warning', label:'Refill soon'};
  return {cls:'good', label:'OK'};
}

function renderTankCards(el, opts){
  opts = opts||{};
  const tanks = state.tanks.filter(t=>t.active!==false);
  if (!tanks.length){ el.innerHTML = `<div class="card empty">No tanks set up yet. Add them in Setup → Tanks.</div>`; return; }
  el.innerHTML = tanks.map(t=>{
    const cap = num(t.capacityL)||1;
    const cur = num(t.currentStockL);
    const pct = clamp((cur/cap)*100,0,100);
    const st = tankLevelStatus(pct);
    const prod = state.config.products[t.product] || t.product;
    return `<div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:8px;">
        <div class="stack"><strong>${esc(t.name)}</strong><span class="hint" style="font-size:12px;color:var(--text-muted)">${esc(prod)}</span></div>
        <span class="pill ${st.cls}">${st.label}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--${st.cls==='good'?'good':st.cls==='warning'?'warning':'critical'})"></div></div>
      <div class="row" style="justify-content:space-between;margin-top:8px;font-size:12.5px;color:var(--text-muted)">
        <span class="mono">${numFmt(cur)} L</span><span>${pct.toFixed(0)}% of ${numFmt(cap)} L</span>
      </div>
    </div>`;
  }).join('');
}

/* ============================== DUTY ENTRY ============================== */
const DENOMS = [500,200,100,50,20,10,5,2,1];
let dutyForm = null;      // null = list view; object = add/edit form
let dutyListDate = todayStr();

function newDutyForm(date){
  return { date, dutyId:null, staffId:'', startTime:'', endTime:'', nozzleIds:[], rows:{}, pos:0, upi:0, hpCard:0, bankAccountId:'', creditSales:[], expenses:[], cashCount:{}, _amount:0, _liters:0 };
}

function renderShiftEntry(mount){
  if (!dutyForm){
    mount.innerHTML = `
      <h1 class="page-title">Duty Entry</h1>
      <p class="page-sub">Log each staff member's pump duty — meter readings, test fuel, and the cash / card / UPI / credit split at closing.</p>
      <div class="card card-pad row" style="justify-content:space-between;margin-bottom:16px;">
        <div class="field" style="margin-bottom:0;"><label>Date</label><input type="date" id="dutyListDate" value="${dutyListDate}" max="${todayStr()}"></div>
        <button class="btn primary" id="dutyAddBtn" ${state.dbReady?'':'disabled'}>${icon('plus')} Add duty</button>
      </div>
      <div id="dutyListWrap"></div>
    `;
    $('#dutyListDate').onchange = (e)=>{ dutyListDate = e.target.value; loadDutyList(); };
    $('#dutyAddBtn').onclick = ()=>{ dutyForm = newDutyForm(dutyListDate); renderCurrentView(); };
    loadDutyList();
    return;
  }
  renderDutyForm(mount);
}

async function loadDutyList(){
  const el = $('#dutyListWrap'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const log = await getDailyLog(dutyListDate);
  const duties = log ? Object.entries(log.duties||{}) : [];
  if (!duties.length){ el.innerHTML = `<div class="card empty">No duties logged for ${fmtDateLabel(dutyListDate)} yet.</div>`; return; }
  el.innerHTML = `<div class="grid grid-2">${duties.map(([id,d])=>`
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;">
        <div class="stack"><strong>${esc(d.staffName)}</strong><span class="hint" style="font-size:12px;color:var(--text-muted)">${esc(d.startTime||'—')}–${esc(d.endTime||'—')} · ${(d.nozzleIds||[]).length} nozzle(s)</span></div>
        <button class="btn ghost sm" data-edit="${id}">${icon('edit')}</button>
      </div>
      <div class="row" style="justify-content:space-between;margin-top:10px;">
        <span class="mono" style="font-weight:600;">${money(d.dutyAmount)}</span>
        <span class="hint" style="color:var(--text-muted);font-size:12.5px;">${liters(d.dutyLiters)}</span>
      </div>
    </div>`).join('')}</div>`;
  $$('[data-edit]', el).forEach(b=>b.onclick=()=>editDuty(dutyListDate, b.dataset.edit));
}

async function editDuty(date, dutyId){
  const log = await getDailyLog(date);
  const d = log && log.duties && log.duties[dutyId];
  if (!d) return;
  const rows = {};
  Object.entries(d.nozzles||{}).forEach(([nid,n])=>{ rows[nid] = Object.assign({}, n, {transferOn: !!n.transferToTankId}); });
  dutyForm = {
    date, dutyId, staffId:d.staffId, startTime:d.startTime||'', endTime:d.endTime||'',
    nozzleIds:(d.nozzleIds||[]).slice(), rows,
    pos:(d.pay&&d.pay.pos)||0, upi:(d.pay&&d.pay.upi)||0, hpCard:(d.pay&&d.pay.hpCard)||0,
    bankAccountId:(d.pay&&d.pay.bankAccountId)||'',
    creditSales:(d.creditSales||[]).map(c=>Object.assign({},c)),
    expenses:(d.expenses||[]).map(e=>Object.assign({},e)),
    cashCount: Object.assign({}, d.cashCount||{}), _amount:d.dutyAmount||0, _liters:d.dutyLiters||0,
  };
  renderCurrentView();
}

function renderDutyForm(mount){
  const activeNozzles = state.nozzles.filter(n=>n.active!==false);
  mount.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:10px;">
      <h1 class="page-title" style="margin-bottom:0;">${dutyForm.dutyId?'Edit duty':'New duty'} — ${fmtDateLabel(dutyForm.date)}</h1>
      <button class="btn ghost sm" id="dutyBack">${icon('chevL')} Back to list</button>
    </div>

    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Staff</label><select id="dfStaff"><option value="">Select staff</option>${state.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}" ${s.id===dutyForm.staffId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Duty start</label><input type="time" id="dfStart" value="${dutyForm.startTime||''}"></div>
        <div class="field"><label>Duty end</label><input type="time" id="dfEnd" value="${dutyForm.endTime||''}"></div>
      </div>
      <label style="margin-top:8px;">Nozzles on this duty (up to 4)</label>
      <div class="check-grid" id="dfNozzles">
        ${activeNozzles.map(n=>{
          const tank = state.tanks.find(t=>t.id===n.tankId);
          const checked = dutyForm.nozzleIds.includes(n.id);
          return `<label class="check-chip ${checked?'checked':''}"><input type="checkbox" value="${n.id}" ${checked?'checked':''}><span>${esc(n.name)}${tank?` <em>(${esc(tank.name)})</em>`:''}</span></label>`;
        }).join('') || '<span class="hint">Add nozzles in Setup first.</span>'}
      </div>
      <div class="hint" id="dfNozzleHint" style="margin-top:6px;color:var(--text-faint);font-size:12px;"></div>
    </div>

    <div id="dfRows"></div>

    <div class="card card-pad" style="margin-top:16px;">
      <h3 style="margin:0 0 12px;font-size:14px;">Closing — payment split</h3>
      <div class="form-grid">
        <div class="field"><label>POS / Card (₹)</label><input type="number" step="0.01" id="dfPos" value="${dutyForm.pos||0}"></div>
        <div class="field"><label>UPI (₹)</label><input type="number" step="0.01" id="dfUpi" value="${dutyForm.upi||0}"></div>
        <div class="field"><label>HP Card (₹)</label><input type="number" step="0.01" id="dfHp" value="${dutyForm.hpCard||0}"></div>
        <div class="field"><label>Credit (₹)</label><input type="text" id="dfCreditTotal" value="₹0" disabled></div>
        <div class="field"><label>Expenses (₹)</label><input type="text" id="dfExpenseTotal" value="₹0" disabled></div>
        <div class="field"><label>Cash (balance)</label><input type="text" id="dfCash" value="₹0" disabled></div>
      </div>
      <div class="field" style="max-width:340px;margin-top:4px;">
        <label>Deposit POS + UPI to</label>
        <select id="dfBank">
          <option value="">Not tracked to a bank account</option>
          ${state.accounts.filter(a=>a.kind==='bank' && a.active!==false).map(a=>`<option value="${a.id}" ${a.id===dutyForm.bankAccountId?'selected':''}>${esc(a.name)}</option>`).join('')}
        </select>
        ${state.accounts.filter(a=>a.kind==='bank').length? '' : `<div class="hint" style="color:var(--text-faint);font-size:12px;margin-top:4px;">Add a bank account in Setup → Accounts to track card/UPI settlement.</div>`}
      </div>

      <div class="section-head" style="margin:16px 0 8px;"><h2 style="font-size:13.5px;">Credit sales</h2><button class="btn ghost sm" id="dfAddCredit">${icon('plus')} Add creditor line</button></div>
      <div id="dfCreditRows"></div>

      <div class="section-head" style="margin:20px 0 8px;"><h2 style="font-size:13.5px;">Expenses paid from till</h2><button class="btn ghost sm" id="dfAddExpense">${icon('plus')} Add expense</button></div>
      <div id="dfExpenseRows"></div>

      <div class="section-head" style="margin:20px 0 8px;"><h2 style="font-size:13.5px;">Cash denomination count</h2></div>
      <div class="denom-grid" id="dfDenoms"></div>
      <div class="row" style="justify-content:space-between;margin-top:10px;">
        <span class="hint">Counted cash</span><span class="mono" id="dfCounted">₹0</span>
      </div>
      <div class="row" style="justify-content:space-between;margin-top:4px;" id="dfVarianceRow"></div>
    </div>

    <div class="card card-pad row" style="justify-content:space-between;margin-top:16px;">
      <div class="stack"><span class="hint">Duty total</span><span class="mono" style="font-size:19px;font-weight:600" id="dfTotalAmt">₹0</span></div>
      <div class="stack" style="align-items:flex-end;"><span class="hint">Sale liters</span><span class="mono" id="dfTotalLtr">0 L</span></div>
      <button class="btn primary" id="dfSave" ${state.dbReady?'':'disabled'}>${icon('pump')} Save duty</button>
    </div>
    <div id="dfMsg" style="margin-top:10px;font-size:13px;"></div>
  `;

  $('#dutyBack').onclick = ()=>{ dutyForm=null; renderCurrentView(); };
  $('#dfStaff').onchange = (e)=>{ dutyForm.staffId=e.target.value; };
  $('#dfStart').onchange = (e)=>{ dutyForm.startTime=e.target.value; };
  $('#dfEnd').onchange = (e)=>{ dutyForm.endTime=e.target.value; };
  $('#dfPos').oninput = recomputePayments;
  $('#dfUpi').oninput = recomputePayments;
  $('#dfHp').oninput = recomputePayments;
  $('#dfBank').onchange = recomputePayments;
  $$('#dfNozzles input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change', ()=>onNozzleCheck(cb));
  });
  updateNozzleHint();
  $('#dfAddCredit').onclick = ()=>{ dutyForm.creditSales.push({id:uid(), creditorId:'', creditorName:'', amount:0, liters:0, indentNo:'', vehicleNo:''}); renderCreditRows(); };
  $('#dfAddExpense').onclick = ()=>{ dutyForm.expenses.push({id:uid(), category:EXPENSE_CATEGORIES[0], description:'', amount:0}); renderDutyExpenseRows(); };
  $('#dfSave').onclick = saveDutyEntry;

  renderDutyRows();
  renderCreditRows();
  renderDutyExpenseRows();
  renderDenomGrid();
}

function onNozzleCheck(cb){
  const id = cb.value;
  if (cb.checked){
    if (dutyForm.nozzleIds.length>=4){ cb.checked=false; updateNozzleHint(true); return; }
    dutyForm.nozzleIds.push(id);
  } else {
    dutyForm.nozzleIds = dutyForm.nozzleIds.filter(x=>x!==id);
    delete dutyForm.rows[id];
  }
  cb.closest('.check-chip').classList.toggle('checked', cb.checked);
  updateNozzleHint();
  renderDutyRows();
}
function updateNozzleHint(limitHit){
  const hint = $('#dfNozzleHint');
  if (!hint) return;
  hint.textContent = limitHit ? 'Up to 4 nozzles per duty — remove one to add another.' : `${dutyForm.nozzleIds.length}/4 selected`;
  hint.style.color = limitHit ? 'var(--critical)' : 'var(--text-faint)';
}

async function renderDutyRows(){
  const el = $('#dfRows'); if(!el) return;
  const ids = dutyForm.nozzleIds;
  if (!ids.length){ el.innerHTML = `<div class="card empty">Select the nozzles this staff member is handling above.</div>`; recomputeDutyTotals(); return; }
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Nozzle</th><th class="num">Rate</th><th class="num">Opening</th><th class="num">Closing</th><th class="num">Test (L)</th><th>Transfer</th><th class="num">Sale liters</th><th class="num">Amount</th></tr></thead>
    <tbody id="dfTbody"></tbody></table></div>
    <div class="hint" style="color:var(--text-faint);font-size:12px;padding:0 14px 12px;">Tick "Stock transfer" when part of what this nozzle dispensed went into another tank instead of being sold — enter how many liters and pick the destination tank. Sale liters and amount are automatically the balance after Test and Transfer are taken out; the destination tank's stock goes up by the same amount.</div>
    </div>`;
  const tbody = $('#dfTbody');
  for (const nid of ids){
    const n = state.nozzles.find(x=>x.id===nid);
    if (!n) continue;
    const tank = state.tanks.find(t=>t.id===n.tankId);
    const productKey = tank?tank.product:null;
    if (!dutyForm.rows[nid]){
      const rate = await getRateForDate(dutyForm.date, productKey);
      dutyForm.rows[nid] = { opening:num(n.lastClosing), closing:'', testLiters:0, tankId:n.tankId, product:productKey, rate, transferOn:false, transferLiters:0, transferToTankId:'' };
    }
    const row = dutyForm.rows[nid];
    if (row.transferOn===undefined) row.transferOn = !!row.transferToTankId;
    const xferTanks = state.tanks.filter(t=>t.active!==false && t.product===row.product && t.id!==row.tankId);
    const tr = document.createElement('tr');
    tr.dataset.nozzle = nid;
    tr.innerHTML = `<td><strong>${esc(n.name)}</strong>${tank?`<div class="hint" style="font-size:11.5px;color:var(--text-faint)">${esc(tank.name)}</div>`:''}</td>
      <td class="num">${row.rate!=null?money(row.rate):'<span class="pill warning">not set</span>'}</td>
      <td class="num"><input type="number" step="0.01" class="opening" value="${row.opening??0}" style="width:95px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="closing" value="${row.closing??''}" placeholder="0.00" style="width:95px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="testL" value="${row.testLiters||0}" style="width:80px;text-align:right;"></td>
      <td>
        <label class="toggle"><input type="checkbox" class="xferOn" ${row.transferOn?'checked':''}> Stock transfer</label>
        <div class="xferFields" style="display:${row.transferOn?'flex':'none'};flex-direction:column;gap:4px;margin-top:4px;">
          <input type="number" step="0.01" class="xferL" placeholder="Liters" value="${row.transferLiters||''}" style="width:90px;text-align:right;">
          <select class="xferTank" style="width:130px;font-size:11.5px;">
            <option value="">To tank…</option>
            ${xferTanks.map(t=>`<option value="${t.id}" ${t.id===row.transferToTankId?'selected':''}>${esc(t.name)}</option>`).join('')}
          </select>
          ${!xferTanks.length?`<span class="hint" style="font-size:11px;color:var(--text-faint);">No other tank set up for this product.</span>`:''}
        </div>
      </td>
      <td class="num saleCell">—</td><td class="num amtCell">—</td>`;
    tbody.appendChild(tr);
    const upd = ()=>updateDutyRowCalc(nid, tr);
    tr.querySelector('.opening').addEventListener('input', upd);
    tr.querySelector('.closing').addEventListener('input', upd);
    tr.querySelector('.testL').addEventListener('input', upd);
    tr.querySelector('.xferOn').addEventListener('change', (e)=>{
      tr.querySelector('.xferFields').style.display = e.target.checked ? 'flex' : 'none';
      upd();
    });
    tr.querySelector('.xferL').addEventListener('input', upd);
    tr.querySelector('.xferTank').addEventListener('change', upd);
    updateDutyRowCalc(nid, tr);
  }
  recomputeDutyTotals();
}

function updateDutyRowCalc(nid, tr){
  const row = dutyForm.rows[nid];
  const opening = num(tr.querySelector('.opening').value);
  const closingRaw = tr.querySelector('.closing').value;
  const closing = closingRaw==='' ? null : num(closingRaw);
  const testL = Math.max(0, num(tr.querySelector('.testL').value));
  const transferOn = tr.querySelector('.xferOn').checked;
  const transferL = transferOn ? Math.max(0, num(tr.querySelector('.xferL').value)) : 0;
  const transferTank = transferOn ? tr.querySelector('.xferTank').value : '';
  row.opening=opening; row.closing=closing; row.testLiters=testL;
  row.transferOn=transferOn; row.transferLiters=transferL; row.transferToTankId=transferTank;
  const saleCell = tr.querySelector('.saleCell'), amtCell = tr.querySelector('.amtCell');
  if (closing==null){
    saleCell.textContent='—'; amtCell.textContent='—'; saleCell.style.color=''; row.meterLiters=0; row.drawLiters=0; row.liters=0; row.amount=0;
  } else {
    const meterLiters = closing-opening;
    const drawLiters = Math.max(0, meterLiters-testL);
    const saleLiters = Math.max(0, drawLiters-transferL);
    const amount = row.rate!=null ? saleLiters*row.rate : 0;
    row.meterLiters=meterLiters; row.drawLiters=drawLiters; row.liters=saleLiters; row.amount=amount;
    saleCell.textContent = liters(saleLiters);
    saleCell.style.color = meterLiters<0 ? 'var(--critical)' : '';
    amtCell.textContent = money(amount);
  }
  recomputeDutyTotals();
}

function recomputeDutyTotals(){
  let amt=0, ltr=0;
  Object.values(dutyForm.rows).forEach(r=>{ if(r.closing!=null){ amt+=r.amount||0; ltr+=r.liters||0; } });
  dutyForm._amount=amt; dutyForm._liters=ltr;
  $('#dfTotalAmt') && ($('#dfTotalAmt').textContent = money(amt));
  $('#dfTotalLtr') && ($('#dfTotalLtr').textContent = liters(ltr));
  recomputePayments();
}

function renderCreditRows(){
  const el = $('#dfCreditRows'); if(!el) return;
  if (!dutyForm.creditSales.length){ el.innerHTML = `<div class="hint" style="color:var(--text-faint);font-size:12.5px;">No credit sales added.</div>`; recomputePayments(); return; }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Creditor</th><th>Indent No.</th><th>Vehicle No.</th><th class="num">Liters</th><th class="num">Amount</th><th></th></tr></thead><tbody id="dfCreditTbody"></tbody></table></div>
    <div class="hint" style="color:var(--text-faint);font-size:12px;margin-top:6px;">Fill in Liters when this credit is a fuel transfer to a Bowser — it tops up that Bowser's tracked stock.</div>`;
  const tbody = $('#dfCreditTbody');
  dutyForm.creditSales.forEach(c=>{
    const tr = document.createElement('tr'); tr.dataset.id = c.id;
    tr.innerHTML = `<td><select class="cSel">${state.creditors.filter(x=>x.active!==false).map(x=>`<option value="${x.id}" ${x.id===c.creditorId?'selected':''}>${esc(x.name)}${x.isBowser?' (Bowser)':''}</option>`).join('')||'<option value="">Add creditors in Setup</option>'}</select></td>
      <td><input type="text" class="cIndent" value="${esc(c.indentNo||'')}" style="width:90px;"></td>
      <td><input type="text" class="cVeh" value="${esc(c.vehicleNo||'')}" style="width:100px;"></td>
      <td class="num"><input type="number" step="0.01" class="cLtr" value="${c.liters||0}" style="width:80px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="cAmt" value="${c.amount||0}" style="width:90px;text-align:right;"></td>
      <td><button class="btn ghost sm cRemove">${icon('trash')}</button></td>`;
    tbody.appendChild(tr);
    const sel = tr.querySelector('.cSel');
    const sync = ()=>{
      c.creditorId = sel.value;
      c.creditorName = (state.creditors.find(x=>x.id===sel.value)||{}).name||'';
      c.indentNo = tr.querySelector('.cIndent').value;
      c.vehicleNo = tr.querySelector('.cVeh').value;
      c.liters = num(tr.querySelector('.cLtr').value);
      c.amount = num(tr.querySelector('.cAmt').value);
      recomputePayments();
    };
    sel.addEventListener('change', sync);
    tr.querySelector('.cIndent').addEventListener('input', sync);
    tr.querySelector('.cVeh').addEventListener('input', sync);
    tr.querySelector('.cLtr').addEventListener('input', sync);
    tr.querySelector('.cAmt').addEventListener('input', sync);
    tr.querySelector('.cRemove').onclick = ()=>{ dutyForm.creditSales = dutyForm.creditSales.filter(x=>x.id!==c.id); renderCreditRows(); };
    sync();
  });
  recomputePayments();
}

function renderDutyExpenseRows(){
  const el = $('#dfExpenseRows'); if(!el) return;
  if (!dutyForm.expenses.length){ el.innerHTML = `<div class="hint" style="color:var(--text-faint);font-size:12.5px;">No expenses added.</div>`; recomputePayments(); return; }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody id="dfExpenseTbody"></tbody></table></div>
    <div class="hint" style="color:var(--text-faint);font-size:12px;margin-top:6px;">Cash paid out during this duty (e.g. small repairs, tea) — it's logged to Expenses and deducted from the cash you should have in hand.</div>`;
  const tbody = $('#dfExpenseTbody');
  dutyForm.expenses.forEach(e=>{
    const tr = document.createElement('tr'); tr.dataset.id = e.id;
    tr.innerHTML = `<td><select class="eCat">${EXPENSE_CATEGORIES.map(cat=>`<option ${cat===e.category?'selected':''}>${esc(cat)}</option>`).join('')}</select></td>
      <td><input type="text" class="eDesc" value="${esc(e.description||'')}" style="width:150px;"></td>
      <td class="num"><input type="number" step="0.01" class="eAmt" value="${e.amount||0}" style="width:90px;text-align:right;"></td>
      <td><button class="btn ghost sm eRemove">${icon('trash')}</button></td>`;
    tbody.appendChild(tr);
    const sync = ()=>{
      e.category = tr.querySelector('.eCat').value;
      e.description = tr.querySelector('.eDesc').value;
      e.amount = num(tr.querySelector('.eAmt').value);
      recomputePayments();
    };
    tr.querySelector('.eCat').addEventListener('change', sync);
    tr.querySelector('.eDesc').addEventListener('input', sync);
    tr.querySelector('.eAmt').addEventListener('input', sync);
    tr.querySelector('.eRemove').onclick = ()=>{ dutyForm.expenses = dutyForm.expenses.filter(x=>x.id!==e.id); renderDutyExpenseRows(); };
    sync();
  });
  recomputePayments();
}

function renderDenomGrid(){
  const el = $('#dfDenoms'); if(!el) return;
  el.innerHTML = DENOMS.map(d=>`<div class="denom-cell"><label>₹${d}</label><input type="number" min="0" step="1" class="denomInput" data-d="${d}" value="${dutyForm.cashCount[d]||''}" placeholder="0"></div>`).join('');
  $$('.denomInput', el).forEach(inp=>inp.addEventListener('input', ()=>{
    dutyForm.cashCount[inp.dataset.d] = num(inp.value);
    recomputePayments();
  }));
}

function recomputePayments(){
  if (!dutyForm) return;
  const posEl=$('#dfPos'), upiEl=$('#dfUpi'), hpEl=$('#dfHp'), bankEl=$('#dfBank');
  const pos = posEl?num(posEl.value):dutyForm.pos||0;
  const upi = upiEl?num(upiEl.value):dutyForm.upi||0;
  const hp = hpEl?num(hpEl.value):dutyForm.hpCard||0;
  dutyForm.pos=pos; dutyForm.upi=upi; dutyForm.hpCard=hp;
  if (bankEl) dutyForm.bankAccountId = bankEl.value;
  const credit = dutyForm.creditSales.reduce((s,c)=>s+num(c.amount),0);
  const expenses = dutyForm.expenses.reduce((s,e)=>s+num(e.amount),0);
  const total = dutyForm._amount||0;
  const cash = total - pos - upi - hp - credit - expenses;
  $('#dfCreditTotal') && ($('#dfCreditTotal').value = money(credit));
  $('#dfExpenseTotal') && ($('#dfExpenseTotal').value = money(expenses));
  $('#dfCash') && ($('#dfCash').value = money(cash));
  let counted = 0;
  DENOMS.forEach(d=>{ counted += d*num(dutyForm.cashCount[d]); });
  $('#dfCounted') && ($('#dfCounted').textContent = money(counted));
  const varEl = $('#dfVarianceRow');
  if (varEl){
    const diff = counted - cash;
    const cls = Math.abs(diff)<0.5 ? 'good' : (Math.abs(diff)<=50?'warning':'critical');
    varEl.innerHTML = `<span class="hint">Variance vs expected cash</span><span class="pill ${cls}">${diff>=0?'+':''}${money(diff)}</span>`;
  }
}

async function saveDutyEntry(){
  const msg = $('#dfMsg');
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected — open the published page to save.</span>`; return; }
  if (!dutyForm.staffId){ msg.innerHTML = `<span style="color:var(--critical)">Select the staff on duty.</span>`; return; }
  if (!dutyForm.nozzleIds.length){ msg.innerHTML = `<span style="color:var(--critical)">Assign at least one nozzle.</span>`; return; }
  const entries = {};
  let any = false, negative = false, missingRate = false, missingTransferTank = false;
  for (const nid of dutyForm.nozzleIds){
    const row = dutyForm.rows[nid];
    if (!row || row.closing==null) continue;
    any = true;
    if (row.meterLiters<0) negative = true;
    if (row.rate==null) missingRate = true;
    if (row.transferOn && num(row.transferLiters)>0 && !row.transferToTankId) missingTransferTank = true;
    entries[nid] = {
      opening:row.opening, closing:row.closing, meterLiters:row.meterLiters, testLiters:row.testLiters||0,
      drawLiters: row.drawLiters!=null ? row.drawLiters : row.liters,
      transferLiters: (row.transferOn && row.transferToTankId) ? num(row.transferLiters) : 0,
      transferToTankId: (row.transferOn && row.transferToTankId) ? row.transferToTankId : '',
      liters:row.liters, rate:row.rate||0, amount:row.amount||0, product:row.product, tankId:row.tankId,
    };
  }
  if (!any){ msg.innerHTML = `<span style="color:var(--critical)">Enter at least one closing reading.</span>`; return; }
  if (negative){ msg.innerHTML = `<span style="color:var(--critical)">Closing reading can't be less than opening for one or more nozzles.</span>`; return; }
  if (missingTransferTank){ msg.innerHTML = `<span style="color:var(--critical)">Pick a destination tank for every nozzle marked as a stock transfer.</span>`; return; }
  for (const c of dutyForm.creditSales){
    if (num(c.amount)>0 && !c.creditorId){ msg.innerHTML = `<span style="color:var(--critical)">Pick a creditor for every credit sale line, or remove it.</span>`; return; }
  }
  if (missingRate){ msg.innerHTML = `<span style="color:var(--warning)">Note: one or more products have no rate set for this date — saving with ₹0 for those. Set today's rate in Setup → Rates.</span>`; }

  $('#dfSave').disabled = true;
  try{
    const staffName = (state.staff.find(s=>s.id===dutyForm.staffId)||{}).name || '';
    await saveDutyToDb({
      date:dutyForm.date, dutyId:dutyForm.dutyId, staffId:dutyForm.staffId, staffName,
      startTime:dutyForm.startTime, endTime:dutyForm.endTime, nozzleIds:dutyForm.nozzleIds, entries,
      pay:{pos:dutyForm.pos||0, upi:dutyForm.upi||0, hpCard:dutyForm.hpCard||0, bankAccountId:dutyForm.bankAccountId||''},
      creditSales: dutyForm.creditSales.filter(c=>num(c.amount)>0 || num(c.liters)>0),
      expenses: dutyForm.expenses.filter(e=>num(e.amount)>0),
      cashCount: dutyForm.cashCount,
    });
    dutyForm = null;
    renderCurrentView();
  }catch(e){
    msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||e.code||'unknown error')}</span>`;
    const b=$('#dfSave'); if(b) b.disabled=false;
  }
}

async function saveDutyToDb({date, dutyId, staffId, staffName, startTime, endTime, nozzleIds, entries, pay, creditSales, expenses, cashCount}){
  const data = (await getDailyLog(date)) || {duties:{}};
  data.duties = data.duties || {};
  const id = dutyId || uid();
  const prev = data.duties[id];
  const prevNozzles = (prev && prev.nozzles) || {};

  let dutyAmount=0, dutyLiters=0;
  const stockDeltas = {};
  for (const [nid, entry] of Object.entries(entries)){
    dutyAmount += entry.amount; dutyLiters += entry.liters;
    // Use drawLiters (sale + any stock transfer) for the source tank — everything the nozzle
    // physically dispensed leaves this tank, whether it was sold or routed to another tank.
    // Older saved entries have no drawLiters field; their `liters` already meant the same thing.
    const newDraw = entry.drawLiters!=null ? entry.drawLiters : entry.liters;
    const prevEntry = prevNozzles[nid];
    const oldDraw = prevEntry ? (prevEntry.drawLiters!=null ? prevEntry.drawLiters : prevEntry.liters) || 0 : 0;
    const delta = newDraw - oldDraw;
    if (entry.tankId) stockDeltas[entry.tankId] = (stockDeltas[entry.tankId]||0) + delta;
  }
  const credit = creditSales.reduce((s,c)=>s+num(c.amount),0);
  const expenseTotal = (expenses||[]).reduce((s,e)=>s+num(e.amount),0);
  const cash = dutyAmount - (pay.pos||0) - (pay.upi||0) - (pay.hpCard||0) - credit - expenseTotal;
  data.duties[id] = {
    staffId, staffName, startTime, endTime, nozzleIds, nozzles: entries, dutyAmount, dutyLiters,
    pay: {pos:pay.pos||0, upi:pay.upi||0, hpCard:pay.hpCard||0, bankAccountId:pay.bankAccountId||'', credit, expenses:expenseTotal, cash},
    creditSales, expenses: expenses||[], cashCount, savedAt: new Date().toISOString(),
  };
  data.date = date;
  let dayAmount=0, dayLiters=0;
  Object.values(data.duties).forEach(d=>{ dayAmount+=d.dutyAmount||0; dayLiters+=d.dutyLiters||0; });
  data.dayAmount = dayAmount; data.dayLiters = dayLiters; data.updatedAt = new Date().toISOString();

  await setDailyLog(date, data);

  for (const [tankId, delta] of Object.entries(stockDeltas)){
    if (!delta) continue;
    const tank = state.tanks.find(t=>t.id===tankId);
    const cur = tank ? num(tank.currentStockL) : 0;
    await state.db.doc('tanks/'+tankId).update({currentStockL: cur - delta});
  }
  for (const [nid, entry] of Object.entries(entries)){
    await state.db.doc('nozzles/'+nid).update({lastClosing: entry.closing, lastReadingDate: date}).catch(()=>{});
  }

  // Stock transfers: liters dispensed through a nozzle but routed into a different tank instead of
  // sold — credit the destination tank by the CHANGE since this duty's last save. If the destination
  // was switched between saves, reverse what the old one got and credit the new one instead.
  const transferDeltas = {};
  for (const [nid, entry] of Object.entries(entries)){
    const prevEntry = prevNozzles[nid] || {};
    const oldToTank = prevEntry.transferToTankId || '';
    const oldAmt = num(prevEntry.transferLiters);
    const newToTank = entry.transferToTankId || '';
    const newAmt = num(entry.transferLiters);
    if (oldToTank && oldToTank===newToTank){
      const d = newAmt - oldAmt;
      if (d) transferDeltas[oldToTank] = (transferDeltas[oldToTank]||0) + d;
    } else {
      if (oldToTank && oldAmt) transferDeltas[oldToTank] = (transferDeltas[oldToTank]||0) - oldAmt;
      if (newToTank && newAmt) transferDeltas[newToTank] = (transferDeltas[newToTank]||0) + newAmt;
    }
  }
  for (const [tankId, delta] of Object.entries(transferDeltas)){
    if (!delta) continue;
    const tank = state.tanks.find(t=>t.id===tankId);
    const cur = tank ? num(tank.currentStockL) : 0;
    await state.db.doc('tanks/'+tankId).update({currentStockL: cur + delta});
  }

  // Credit sales move money owed (and, for a Bowser creditor, fuel liters) onto the creditor —
  // only apply the CHANGE versus what this duty previously had saved for each creditor, so re-saving an edit never double-counts.
  const prevCreditSales = (prev && prev.creditSales) || [];
  const sumByCreditor = (arr, field) => {
    const m = {};
    (arr||[]).forEach(c=>{ if (c.creditorId) m[c.creditorId] = (m[c.creditorId]||0) + num(c[field]); });
    return m;
  };
  const oldAmt = sumByCreditor(prevCreditSales, 'amount'), newAmt = sumByCreditor(creditSales, 'amount');
  const oldLtr = sumByCreditor(prevCreditSales, 'liters'), newLtr = sumByCreditor(creditSales, 'liters');
  const creditorIds = new Set([...Object.keys(oldAmt), ...Object.keys(newAmt), ...Object.keys(oldLtr), ...Object.keys(newLtr)]);
  for (const cid of creditorIds){
    const amtDelta = (newAmt[cid]||0) - (oldAmt[cid]||0);
    const ltrDelta = (newLtr[cid]||0) - (oldLtr[cid]||0);
    if (!amtDelta && !ltrDelta) continue;
    const creditor = state.creditors.find(c=>c.id===cid);
    if (!creditor) continue;
    const patch = {};
    if (amtDelta) patch.balance = num(creditor.balance) + amtDelta;
    if (ltrDelta && creditor.isBowser) patch.bowserStockL = num(creditor.bowserStockL) + ltrDelta;
    if (Object.keys(patch).length) await state.db.doc('creditors/'+cid).update(patch).catch(()=>{});
  }

  // Expenses paid out of the till on this duty mirror into the Expenses monthly ledger, so they
  // show up in that report and in the P&L — re-saving an edited duty replaces its own set of lines.
  await syncDutyExpenses(date, id, expenses||[]);

  // POS + UPI settle into the chosen bank account; only the CHANGE since this duty's last save is
  // applied, and moving the duty from one account to another reverses the old one and credits the new.
  const prevPay = (prev && prev.pay) || {};
  const prevBankId = prevPay.bankAccountId || '';
  const newBankId = pay.bankAccountId || '';
  const prevBankAmt = num(prevPay.pos) + num(prevPay.upi);
  const newBankAmt = num(pay.pos) + num(pay.upi);
  if (prevBankId && prevBankId === newBankId){
    const delta = newBankAmt - prevBankAmt;
    if (delta){
      const acct = state.accounts.find(a=>a.id===prevBankId);
      if (acct) await state.db.doc('accounts/'+prevBankId).update({balance: num(acct.balance) + delta}).catch(()=>{});
    }
  } else {
    if (prevBankId && prevBankAmt){
      const acct = state.accounts.find(a=>a.id===prevBankId);
      if (acct) await state.db.doc('accounts/'+prevBankId).update({balance: num(acct.balance) - prevBankAmt}).catch(()=>{});
    }
    if (newBankId && newBankAmt){
      const acct = state.accounts.find(a=>a.id===newBankId);
      if (acct) await state.db.doc('accounts/'+newBankId).update({balance: num(acct.balance) + newBankAmt}).catch(()=>{});
    }
  }

  // HP Card sales are settled by HPCL later, not paid to the station same-day — auto-credit the
  // standing HPCL receivable account (created on first use) by the change in HP Card amount.
  const hpDelta = num(pay.hpCard) - num(prevPay.hpCard);
  if (hpDelta){
    let hpAcct = state.accounts.find(a=>a.system && a.hpcl);
    if (hpAcct){
      await state.db.doc('accounts/'+hpAcct.id).update({balance: num(hpAcct.balance) + hpDelta}).catch(()=>{});
    } else {
      const ref = await state.db.collection('accounts').add({
        name:'HPCL — HP Card settlement', kind:'receivable', system:true, hpcl:true,
        bankName:'', accountNo:'', balance:hpDelta, active:true, createdAt:new Date().toISOString(),
      });
      state.accounts.push({id:ref.id, name:'HPCL — HP Card settlement', kind:'receivable', system:true, hpcl:true, balance:hpDelta, active:true});
    }
  }

  await logActivity({
    entity:'Duty', entityLabel:`${staffName} · ${fmtDateLabel(date)}`,
    action: dutyId ? 'edit' : 'add',
    summary: `${dutyId?'Edited':'Saved'} duty totalling ${money(dutyAmount)}${startTime||endTime?` (${startTime||'—'}–${endTime||'—'})`:''}`,
  });
}

// Mirrors a duty's "expenses paid from till" lines into that month's expensesMonthly document,
// tagged with source:'duty' + dutyId so re-saving the same duty replaces its own lines instead of
// piling up duplicates. A manually-added expense (no dutyId) is never touched by this.
async function syncDutyExpenses(date, dutyId, expenseItems){
  const monthId = monthIdOf(date);
  const list = (expenseItems||[]).filter(e=>num(e.amount)>0);
  const existing = await getMonthDoc('expensesMonthly', monthId);
  if (!list.length && !existing) return;
  const data = existing || {items:[], total:0};
  const kept = (data.items||[]).filter(it=>it.dutyId!==dutyId);
  const mine = list.map(e=>({id:e.id||uid(), date, category:e.category||EXPENSE_CATEGORIES[0], description:e.description||'', amount:num(e.amount), source:'duty', dutyId}));
  data.items = kept.concat(mine);
  data.total = data.items.reduce((s,it)=>s+num(it.amount),0);
  await setMonthDoc('expensesMonthly', monthId, data);
}

/* ============================== STOCK ============================== */
function renderStock(mount){
  mount.innerHTML = `
    <h1 class="page-title">Tank Stock</h1>
    <p class="page-sub">Live stock per tank, updated automatically as duties are saved and fuel is purchased.</p>
    <div class="grid grid-2" id="stockTanks" style="margin-bottom:24px;"></div>

    <div class="section-head"><h2>Bowsers (mobile tanks)</h2><span class="hint">filled from station nozzles, tracked as credit</span></div>
    <div class="grid grid-2" id="stockBowsers" style="margin-bottom:24px;"></div>

    <div class="section-head"><h2>Fuel purchases</h2><span id="stockMonthLabel"></span></div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="drDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field"><label>Product</label><select id="drProduct">${PRODUCT_KEYS.map(k=>`<option value="${k}">${esc(state.config.products[k]||k)}</option>`).join('')}</select></div>
        <div class="field"><label>Tank</label><select id="drTank"></select></div>
        <div class="field"><label>Quantity (L)</label><input type="number" step="0.01" id="drLiters" placeholder="0.00"></div>
        <div class="field"><label>Rate (₹/L)</label><input type="number" step="0.01" id="drRate" placeholder="0.00"></div>
        <div class="field"><label>Total amount</label><input type="text" id="drTotal" value="₹0" disabled></div>
        <div class="field"><label>Supplier</label><input type="text" id="drSupplier" list="drSupplierList" placeholder="e.g. HPCL">
          <datalist id="drSupplierList">${state.suppliers.filter(s=>s.active!==false).map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>
        </div>
        <div class="field"><label>Invoice / DO ref</label><input type="text" id="drRef" placeholder="e.g. DO-4521"></div>
        <div class="field"><button class="btn primary" id="drSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add purchase</button></div>
      </div>
      <div id="drMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>

    <div id="stockList"></div>
  `;
  renderTankCards($('#stockTanks'), {});
  renderBowserCards($('#stockBowsers'));
  populateDrTankOptions();
  $('#drProduct').onchange = populateDrTankOptions;
  $('#drLiters').oninput = updateDrTotal;
  $('#drRate').oninput = updateDrTotal;
  $('#drSave').onclick = addStockReceipt;
  loadStockReceiptsList();
}

function renderBowserCards(el){
  if (!el) return;
  const bowsers = state.creditors.filter(c=>c.isBowser && c.active!==false);
  if (!bowsers.length){ el.innerHTML = `<div class="card empty">No Bowser configured yet. Add one in Setup → Creditors.</div>`; return; }
  el.innerHTML = bowsers.map(c=>{
    const cap = num(c.bowserCapacityL);
    const cur = num(c.bowserStockL);
    const pct = cap>0 ? clamp((cur/cap)*100,0,100) : null;
    const prod = state.config.products[c.bowserProduct]||c.bowserProduct||'';
    const due = num(c.balance)>0;
    return `<div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:8px;">
        <div class="stack"><strong>${esc(c.name)}</strong><span class="hint" style="font-size:12px;color:var(--text-muted)">${esc(prod)}</span></div>
        <span class="pill ${due?'warning':'good'}">${due?money(c.balance)+' due':'settled'}</span>
      </div>
      ${cap>0?`<div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--brand)"></div></div>`:''}
      <div class="row" style="justify-content:space-between;margin-top:8px;font-size:12.5px;color:var(--text-muted)">
        <span class="mono">${numFmt(cur)} L</span>${cap>0?`<span>${pct.toFixed(0)}% of ${numFmt(cap)} L</span>`:''}
      </div>
    </div>`;
  }).join('');
}

function populateDrTankOptions(){
  const sel = $('#drTank'); if (!sel) return;
  const productKey = $('#drProduct') ? $('#drProduct').value : PRODUCT_KEYS[0];
  const matching = state.tanks.filter(t=>t.active!==false && t.product===productKey);
  sel.innerHTML = matching.length ? matching.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('') : `<option value="">No tank set up for this product</option>`;
}

function updateDrTotal(){
  const ltrEl = $('#drLiters'), rateEl = $('#drRate'), totalEl = $('#drTotal');
  if (!totalEl) return;
  const ltr = num(ltrEl && ltrEl.value), rate = num(rateEl && rateEl.value);
  totalEl.value = money(ltr*rate);
}

async function addStockReceipt(){
  const msg = $('#drMsg');
  const date = $('#drDate').value, productKey = $('#drProduct').value, tankId = $('#drTank').value;
  const ltr = num($('#drLiters').value), rate = num($('#drRate').value);
  const amount = ltr*rate;
  const supplier = $('#drSupplier').value.trim(), ref = $('#drRef').value.trim();
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!tankId){ msg.innerHTML = `<span style="color:var(--critical)">No tank is set up for this product yet — add one in Setup → Tanks.</span>`; return; }
  if (!(ltr>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter the quantity received.</span>`; return; }
  $('#drSave').disabled = true;
  try{
    const tank = state.tanks.find(t=>t.id===tankId);
    const monthId = monthIdOf(date);
    const data = (await getMonthDoc('stockReceiptsMonthly', monthId)) || {items:[], totalLiters:0, totalAmount:0};
    data.items = (data.items||[]).concat([{id:uid(), date, product:productKey, tankId, tankName: tank?tank.name:'', liters:ltr, rate, amount, supplier, ref}]);
    data.totalLiters = (data.totalLiters||0) + ltr;
    data.totalAmount = (data.totalAmount||0) + amount;
    await setMonthDoc('stockReceiptsMonthly', monthId, data);

    const cur = tank ? num(tank.currentStockL) : 0;
    await state.db.doc('tanks/'+tankId).update({currentStockL: cur + ltr});
    await logActivity({entity:'Purchase', entityLabel:(tank?tank.name:'')+' · '+fmtDateLabel(date), action:'add', summary:`Added ${liters(ltr)} for ${money(amount)}`});

    $('#drMsg').innerHTML = `<span style="color:var(--good)">Purchase recorded — ${esc(tank?tank.name:'tank')} stock updated.</span>`;
    $('#drLiters').value=''; $('#drRate').value=''; $('#drSupplier').value=''; $('#drRef').value='';
    updateDrTotal();
    loadStockReceiptsList();
  }catch(e){
    msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`;
  } finally { $('#drSave').disabled = false; }
}

async function adjustTankStock(tankId, delta){
  if (!tankId || !delta) return;
  const tank = state.tanks.find(t=>t.id===tankId);
  const cur = tank ? num(tank.currentStockL) : 0;
  await state.db.doc('tanks/'+tankId).update({currentStockL: cur + delta});
}

const STOCK_RECEIPT_EDIT_FIELDS = [
  {key:'date', label:'Date', type:'date'},
  {key:'product', label:'Product', type:'select', options:PRODUCT_KEYS.map(k=>({value:k,label:state.config.products[k]||k})), fmt:v=>state.config.products[v]||v||'—'},
  {key:'tankId', label:'Tank', type:'select', options:state.tanks.filter(t=>t.active!==false).map(t=>({value:t.id,label:t.name})), fmt:v=>{ const t=state.tanks.find(x=>x.id===v); return t?t.name:(v||'—'); }},
  {key:'liters', label:'Quantity (L)', type:'number', fmt:v=>liters(v)},
  {key:'rate', label:'Rate (₹/L)', type:'number', fmt:v=>money(v)},
  {key:'supplier', label:'Supplier', type:'text'},
  {key:'ref', label:'Invoice / DO ref', type:'text'},
];
function editStockReceipt(monthId, item){
  openLineEditModal({
    title:'Edit purchase', fields:STOCK_RECEIPT_EDIT_FIELDS, values:item,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      out.amount = num(out.liters)*num(out.rate);
      const tank = state.tanks.find(t=>t.id===out.tankId);
      out.tankName = tank?tank.name:'';
      const changes = diffFields(STOCK_RECEIPT_EDIT_FIELDS, item, out);
      const data = await getMonthDoc('stockReceiptsMonthly', monthId);
      if (!data) throw new Error('Record not found.');
      const idx = (data.items||[]).findIndex(i=>i.id===item.id);
      if (idx<0) throw new Error('Record not found.');
      data.items = data.items.map((i,ix)=> ix===idx ? Object.assign({}, i, out, {id:item.id}) : i);
      data.totalLiters = data.items.reduce((s,i)=>s+num(i.liters),0);
      data.totalAmount = data.items.reduce((s,i)=>s+num(i.amount),0);
      await setMonthDoc('stockReceiptsMonthly', monthId, data);
      // Move the tank-stock effect the same way an edited duty transfer does: same tank just applies
      // the liters delta, a changed tank reverses the old one and credits the new one.
      if ((item.tankId||'')===(out.tankId||'')){
        await adjustTankStock(out.tankId, num(out.liters)-num(item.liters));
      } else {
        await adjustTankStock(item.tankId, -num(item.liters));
        await adjustTankStock(out.tankId, num(out.liters));
      }
      if (changes.length) await logActivity({entity:'Purchase', entityLabel:(tank?tank.name:'')+' · '+fmtDateLabel(out.date), action:'edit', changes});
      loadStockReceiptsList();
    }
  });
}
async function removeStockReceipt(monthId, item){
  const ok = await confirmModal({title:'Delete this purchase?', body:'This removes it from the purchase log and reverses the liters it added to the tank.', confirmLabel:'Delete purchase'});
  if (!ok) return;
  const data = await getMonthDoc('stockReceiptsMonthly', monthId);
  if (!data) return;
  data.items = (data.items||[]).filter(i=>i.id!==item.id);
  data.totalLiters = data.items.reduce((s,i)=>s+num(i.liters),0);
  data.totalAmount = data.items.reduce((s,i)=>s+num(i.amount),0);
  await setMonthDoc('stockReceiptsMonthly', monthId, data);
  await adjustTankStock(item.tankId, -num(item.liters));
  await logActivity({entity:'Purchase', entityLabel:(item.tankName||'')+' · '+fmtDateLabel(item.date), action:'delete', summary:`Removed ${liters(item.liters)}`});
  loadStockReceiptsList();
}

async function loadStockReceiptsList(){
  const el = $('#stockList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#stockMonthLabel') && ($('#stockMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('stockReceiptsMonthly', monthId);
  const items = (data && data.items || []).slice().sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Product</th><th>Tank</th><th>Supplier</th><th class="num">Liters</th><th class="num">Rate</th><th class="num">Amount</th><th>Ref</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr><td>${fmtDateLabel(it.date)}</td><td>${esc(state.config.products[it.product]||it.product||'—')}</td><td>${esc(it.tankName)}</td><td>${esc(it.supplier||'—')}</td><td class="num">${liters(it.liters)}</td><td class="num">${it.rate?money(it.rate):'—'}</td><td class="num">${it.amount?money(it.amount):'—'}</td><td>${esc(it.ref||'—')}</td><td><button class="btn ghost sm" data-edit="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-rm="${it.id}">${icon('trash')}</button></td></tr>`).join('') : `<tr><td colspan="9" class="empty">No purchases logged for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="4" style="font-weight:700;">Total</td><td class="num" style="font-weight:700;">${liters(data.totalLiters)}</td><td></td><td class="num" style="font-weight:700;">${money(data.totalAmount)}</td><td colspan="2"></td></tr></tfoot>`:''}
  </table></div></div>`;
  $$('#stockList [data-edit]').forEach(b=>b.onclick=()=>{
    const it = items.find(x=>x.id===b.dataset.edit);
    if (it) editStockReceipt(monthId, it);
  });
  $$('#stockList [data-rm]').forEach(b=>b.onclick=()=>{
    const it = items.find(x=>x.id===b.dataset.rm);
    if (it) removeStockReceipt(monthId, it);
  });
  wireMonthSwitcher(()=>{ loadStockReceiptsList(); });
}

/* ============================== EXPENSES ============================== */
const EXPENSE_CATEGORIES = ['Electricity','Maintenance & Repairs','Rent','Statutory / Tax','Bank & Card Charges','Transport','Miscellaneous'];

function renderExpenses(mount){
  mount.innerHTML = `
    <h1 class="page-title">Expenses</h1>
    <p class="page-sub">Running costs outside fuel purchase and salary — feeds the monthly P&amp;L.</p>

    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="exDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field"><label>Category</label><select id="exCat">${EXPENSE_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></div>
        <div class="field" style="grid-column:span 2;"><label>Description</label><input type="text" id="exDesc" placeholder="e.g. July electricity bill"></div>
        <div class="field"><label>Amount (₹)</label><input type="number" step="0.01" id="exAmt" placeholder="0.00"></div>
        <div class="field"><button class="btn primary" id="exSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add expense</button></div>
      </div>
      <div id="exMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>

    <div class="section-head"><h2>This period</h2><span id="exMonthLabel"></span></div>
    <div id="exList"></div>
  `;
  $('#exSave').onclick = addExpense;
  loadExpensesList();
}

async function addExpense(){
  const msg = $('#exMsg');
  const date = $('#exDate').value, cat = $('#exCat').value, desc = $('#exDesc').value.trim(), amt = num($('#exAmt').value);
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!(amt>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter an amount.</span>`; return; }
  $('#exSave').disabled = true;
  try{
    const monthId = monthIdOf(date);
    const data = (await getMonthDoc('expensesMonthly', monthId)) || {items:[], total:0};
    data.items = (data.items||[]).concat([{id:uid(), date, category:cat, description:desc, amount:amt}]);
    data.total = (data.total||0) + amt;
    await setMonthDoc('expensesMonthly', monthId, data);
    await logActivity({entity:'Expense', entityLabel:cat+(desc?' · '+desc:''), action:'add', summary:`Added ${money(amt)}`});
    msg.innerHTML = `<span style="color:var(--good)">Expense added.</span>`;
    $('#exDesc').value=''; $('#exAmt').value='';
    loadExpensesList();
  }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`; }
  finally{ $('#exSave').disabled=false; }
}

async function removeExpense(monthId, itemId){
  const data = await getMonthDoc('expensesMonthly', monthId);
  if (!data) return;
  const item = (data.items||[]).find(i=>i.id===itemId);
  data.items = (data.items||[]).filter(i=>i.id!==itemId);
  data.total = Math.max(0, (data.total||0) - (item?item.amount:0));
  await setMonthDoc('expensesMonthly', monthId, data);
  if (item) await logActivity({entity:'Expense', entityLabel:item.category+(item.description?' · '+item.description:''), action:'delete', summary:`Removed ${money(item.amount)}`});
  loadExpensesList();
}

const EXPENSE_EDIT_FIELDS = [
  {key:'date', label:'Date', type:'date'},
  {key:'category', label:'Category', type:'select', options:EXPENSE_CATEGORIES.map(c=>({value:c,label:c}))},
  {key:'description', label:'Description', type:'text'},
  {key:'amount', label:'Amount (₹)', type:'number', fmt:v=>money(v)},
];
function editExpense(monthId, item){
  openLineEditModal({
    title:'Edit expense', fields:EXPENSE_EDIT_FIELDS, values:item,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      const data = await getMonthDoc('expensesMonthly', monthId);
      if (!data) throw new Error('Record not found.');
      const idx = (data.items||[]).findIndex(i=>i.id===item.id);
      if (idx<0) throw new Error('Record not found.');
      const changes = diffFields(EXPENSE_EDIT_FIELDS, item, out);
      data.items = data.items.map((i,ix)=> ix===idx ? Object.assign({}, i, out, {id:item.id}) : i);
      data.total = data.items.reduce((s,i)=>s+num(i.amount),0);
      await setMonthDoc('expensesMonthly', monthId, data);
      if (changes.length) await logActivity({entity:'Expense', entityLabel:out.category+(out.description?' · '+out.description:''), action:'edit', changes});
      loadExpensesList();
    }
  });
}

async function loadExpensesList(){
  const el = $('#exList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#exMonthLabel') && ($('#exMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('expensesMonthly', monthId);
  const items = (data && data.items || []).slice().sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr><td>${fmtDateLabel(it.date)}</td><td>${esc(it.category)}</td><td>${esc(it.description||'—')}${it.source==='duty'?`<div class="hint" style="font-size:11px;color:var(--text-faint)">from a duty entry</div>`:''}</td><td class="num">${money(it.amount)}</td><td>${it.source==='duty' ? `<span class="hint" style="font-size:11px;color:var(--text-faint)">Edit via the duty</span>` : `<button class="btn ghost sm" data-edit="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-rm="${it.id}">${icon('trash')}</button>`}</td></tr>`).join('') : `<tr><td colspan="5" class="empty">No expenses logged for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="3" style="font-weight:700;">Total</td><td class="num" style="font-weight:700;">${money(data.total)}</td><td></td></tr></tfoot>`:''}
  </table></div></div>`;
  $$('#exList [data-rm]').forEach(b=>b.onclick=()=>removeExpense(monthId, b.dataset.rm));
  $$('#exList [data-edit]').forEach(b=>b.onclick=()=>{
    const it = items.find(x=>x.id===b.dataset.edit);
    if (it) editExpense(monthId, it);
  });
  wireMonthSwitcher(()=>{ loadExpensesList(); });
}

/* ============================== SALARY ============================== */
function renderSalary(mount){
  mount.innerHTML = `
    <h1 class="page-title">Salary</h1>
    <p class="page-sub">Monthly salary sheet for your team.</p>
    <div class="section-head"><h2 id="salMonthTitle"></h2><span id="salMonthLabel"></span></div>
    <div class="row" style="margin-bottom:12px;"><button class="btn" id="salGen" ${state.dbReady?'':'disabled'}>${icon('plus')} Add active staff to this month's sheet</button></div>
    <div id="salList"></div>
  `;
  $('#salMonthTitle').textContent = 'Salary sheet — ' + monthLabel(state.activeMonth);
  $('#salGen').onclick = generateSalarySheet;
  loadSalaryList();
}

async function generateSalarySheet(){
  const monthId = state.activeMonth;
  const data = (await getMonthDoc('salaryMonthly', monthId)) || {staff:{}};
  data.staff = data.staff || {};
  const activeStaff = state.staff.filter(s=>s.active!==false);
  const needsHours = activeStaff.some(s=>!data.staff[s.id] && num(s.hourlyWage)>0);
  const logs = needsHours ? await getMonthDailyLogs(monthId) : [];
  const added = [];
  activeStaff.forEach(s=>{
    if (data.staff[s.id]) return;
    added.push(s.name);
    const hourly = num(s.hourlyWage)>0;
    let base, hoursWorked = null;
    if (hourly){
      let hours = 0;
      logs.forEach(doc=>{
        Object.values(doc.duties||{}).forEach(d=>{
          if (d.staffId===s.id) hours += hoursBetween(d.startTime, d.endTime);
        });
      });
      hoursWorked = Math.round(hours*100)/100;
      base = hours*num(s.hourlyWage);
    } else {
      base = num(s.monthlySalary);
    }
    data.staff[s.id] = {name:s.name, wageType: hourly?'hourly':'monthly', hoursWorked, baseSalary:base, advance:0, deduction:0, netPaid:base, status:'pending', paidDate:null};
  });
  recomputeSalaryTotals(data);
  await setMonthDoc('salaryMonthly', monthId, data);
  if (added.length) await logActivity({entity:'Salary', entityLabel:monthLabel(monthId), action:'add', summary:`Added ${added.join(', ')} to the sheet`});
  loadSalaryList();
}
function recomputeSalaryTotals(data){
  let total=0, paid=0;
  Object.values(data.staff||{}).forEach(s=>{
    s.netPaid = Math.max(0, num(s.baseSalary) - num(s.advance) - num(s.deduction));
    total += s.netPaid;
    if (s.status==='paid') paid += s.netPaid;
  });
  data.totalAccrued = total; data.totalPaid = paid;
}

async function loadSalaryList(){
  const el = $('#salList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#salMonthLabel') && ($('#salMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('salaryMonthly', monthId) || {staff:{}};
  const rows = Object.entries(data.staff||{});
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Staff</th><th class="num">Base</th><th class="num">Advance</th><th class="num">Deduction</th><th class="num">Net</th><th>Status</th><th></th></tr></thead>
    <tbody id="salTbody">${rows.length? rows.map(([id,s])=>salaryRow(id,s)).join('') : `<tr><td colspan="7" class="empty">No salary sheet yet for ${monthLabel(monthId)} — click "Add active staff" above.</td></tr>`}</tbody>
    ${rows.length?`<tfoot><tr><td style="font-weight:700;">Total (accrued)</td><td></td><td></td><td></td><td class="num" style="font-weight:700;">${money(data.totalAccrued)}</td><td colspan="2"></td></tr></tfoot>`:''}
  </table></div></div>`;

  rows.forEach(([id])=>{
    const tr = $(`tr[data-staff="${id}"]`);
    if(!tr) return;
    tr.querySelector('.adv').addEventListener('change', (e)=>updateSalaryField(monthId, id, 'advance', e.target.value));
    tr.querySelector('.ded').addEventListener('change', (e)=>updateSalaryField(monthId, id, 'deduction', e.target.value));
    const payBtn = tr.querySelector('[data-pay]');
    if (payBtn) payBtn.onclick = ()=>markSalaryPaid(monthId, id);
    const editBtn = tr.querySelector('[data-edit]');
    if (editBtn) editBtn.onclick = ()=>{
      const s = data.staff[id];
      if (s) editSalaryRecord(monthId, id, s);
    };
  });
  wireMonthSwitcher(()=>{ loadSalaryList(); });
}
function salaryRow(id, s){
  const paid = s.status==='paid';
  return `<tr data-staff="${id}">
    <td>${esc(s.name)}${s.wageType==='hourly'?`<div class="hint" style="font-size:11px;color:var(--text-faint)">hourly · ${numFmt(s.hoursWorked||0)} hrs</div>`:''}</td>
    <td class="num">${money(s.baseSalary)}</td>
    <td class="num"><input type="number" class="adv" value="${s.advance||0}" style="width:90px;text-align:right;" ${paid?'disabled':''}></td>
    <td class="num"><input type="number" class="ded" value="${s.deduction||0}" style="width:90px;text-align:right;" ${paid?'disabled':''}></td>
    <td class="num" style="font-weight:600;">${money(s.netPaid)}</td>
    <td><span class="pill ${paid?'good':'neutral'}">${paid?'Paid':'Pending'}</span></td>
    <td>${paid ? `<span class="hint" style="font-size:11.5px;color:var(--text-faint)">${s.paidDate?fmtDateLabel(s.paidDate):''}</span>` : `<button class="btn sm primary" data-pay>Mark paid</button>`} <button class="btn ghost sm" data-edit style="margin-left:6px;">${icon('edit')}</button></td>
  </tr>`;
}
const SALARY_EDIT_FIELDS = [
  {key:'baseSalary', label:'Base salary (₹)', type:'number', fmt:v=>money(v)},
  {key:'advance', label:'Advance (₹)', type:'number', fmt:v=>money(v)},
  {key:'deduction', label:'Deduction (₹)', type:'number', fmt:v=>money(v)},
  {key:'status', label:'Status', type:'select', options:[{value:'pending',label:'Pending'},{value:'paid',label:'Paid'}]},
  {key:'paidDate', label:'Paid date (if paid)', type:'date'},
];
function editSalaryRecord(monthId, staffId, s){
  openLineEditModal({
    title:`Edit salary — ${esc(s.name)}`, fields:SALARY_EDIT_FIELDS, values:s,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      const data = await getMonthDoc('salaryMonthly', monthId);
      if (!data || !data.staff || !data.staff[staffId]) throw new Error('Record not found.');
      const changes = diffFields(SALARY_EDIT_FIELDS, data.staff[staffId], out);
      data.staff[staffId] = Object.assign({}, data.staff[staffId], out, {
        paidDate: out.status==='paid' ? (out.paidDate||todayStr()) : null,
      });
      recomputeSalaryTotals(data);
      await setMonthDoc('salaryMonthly', monthId, data);
      if (changes.length) await logActivity({entity:'Salary', entityLabel:s.name, action:'edit', changes});
      loadSalaryList();
    }
  });
}
async function updateSalaryField(monthId, staffId, field, val){
  const data = await getMonthDoc('salaryMonthly', monthId);
  if (!data || !data.staff || !data.staff[staffId]) return;
  const old = data.staff[staffId][field];
  const label = field==='advance' ? 'Advance' : 'Deduction';
  data.staff[staffId][field] = num(val);
  recomputeSalaryTotals(data);
  await setMonthDoc('salaryMonthly', monthId, data);
  if (num(old)!==num(val)) await logActivity({entity:'Salary', entityLabel:data.staff[staffId].name, action:'edit', changes:[{field:label, from:money(old), to:money(val)}]});
  loadSalaryList();
}
async function markSalaryPaid(monthId, staffId){
  const data = await getMonthDoc('salaryMonthly', monthId);
  if (!data || !data.staff || !data.staff[staffId]) return;
  data.staff[staffId].status = 'paid';
  data.staff[staffId].paidDate = todayStr();
  recomputeSalaryTotals(data);
  await setMonthDoc('salaryMonthly', monthId, data);
  await logActivity({entity:'Salary', entityLabel:data.staff[staffId].name, action:'edit', changes:[{field:'Status', from:'Pending', to:'Paid'}]});
  loadSalaryList();
}

/* ============================== month switcher (shared) ============================== */
function monthSwitcherHtml(){
  return `<div class="month-switch">
    <button id="mPrev">${icon('chevL')}</button>
    <span class="label">${monthLabel(state.activeMonth)}</span>
    <button id="mNext" ${state.activeMonth>=monthIdOf(todayStr())?'disabled':''}>${icon('chevR')}</button>
  </div>`;
}
function wireMonthSwitcher(onChange){
  const p = $('#mPrev'), n = $('#mNext');
  if (p) p.onclick = ()=>{ state.activeMonth = shiftMonth(state.activeMonth,-1); onChange(); refreshMonthTitles(); };
  if (n) n.onclick = ()=>{ if(state.activeMonth<monthIdOf(todayStr())){ state.activeMonth = shiftMonth(state.activeMonth,1); onChange(); refreshMonthTitles(); } };
}
function refreshMonthTitles(){
  const t = $('#salMonthTitle'); if (t) t.textContent = 'Salary sheet — ' + monthLabel(state.activeMonth);
}

/* ============================== ACTIVITY LOG ============================== */
const ACTIVITY_ACTION_LABEL = {add:'Added', edit:'Edited', delete:'Deleted'};
const ACTIVITY_ACTION_CLASS = {add:'good', edit:'warning', delete:'critical'};
async function renderActivityLog(mount){
  mount.innerHTML = `
    <h1 class="page-title">Activity Log</h1>
    <p class="page-sub" id="actMonthLabel"></p>
    <div class="banner info">${icon('receipt')}Entries logged before user profiles existed have no "By" name — only what changed and when.</div>
    <div id="actBody"><div class="card empty">Loading…</div></div>
  `;
  await loadActivityLog();
}
async function loadActivityLog(){
  const el = $('#actBody'); if(!el) return;
  const monthId = state.activeMonth;
  $('#actMonthLabel') && ($('#actMonthLabel').innerHTML = monthSwitcherHtml());
  wireMonthSwitcher(()=>loadActivityLog());
  const data = await getMonthDoc('activityLog', monthId);
  const items = (data && data.items || []).slice().sort((a,b)=>(b.at||'').localeCompare(a.at||''));
  if (!items.length){ el.innerHTML = `<div class="card empty">No edits logged for ${monthLabel(monthId)}.</div>`; return; }
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>When</th><th>By</th><th>Entity</th><th>Action</th><th>What changed</th></tr></thead>
    <tbody>${items.map(it=>{
      const dt = new Date(it.at);
      const when = isNaN(dt) ? '—' : dt.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      const changesHtml = (it.changes&&it.changes.length)
        ? `<ul style="margin:0;padding-left:16px;">${it.changes.map(c=>`<li style="font-size:12.5px;"><strong>${esc(c.field)}:</strong> ${esc(String(c.from))} → ${esc(String(c.to))}</li>`).join('')}</ul>`
        : `<span class="hint" style="color:var(--text-faint);">${esc(it.summary||'—')}</span>`;
      return `<tr>
        <td style="white-space:nowrap;font-size:12.5px;">${when}</td>
        <td style="white-space:nowrap;">${esc(it.by||'—')}</td>
        <td>${esc(it.entity)}${it.entityLabel?`<div class="hint" style="font-size:11px;color:var(--text-faint)">${esc(it.entityLabel)}</div>`:''}</td>
        <td><span class="pill ${ACTIVITY_ACTION_CLASS[it.action]||'neutral'}">${esc(ACTIVITY_ACTION_LABEL[it.action]||it.action)}</span></td>
        <td>${changesHtml}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}

/* ============================== REPORTS / P&L ============================== */
async function renderReports(mount){
  mount.innerHTML = `
    <h1 class="page-title">Monthly P&amp;L</h1>
    <p class="page-sub" id="repMonthLabel"></p>
    <div id="repBody"><div class="card empty">Crunching the numbers…</div></div>
  `;
  $('#repMonthLabel').innerHTML = monthSwitcherHtml();
  wireMonthSwitcher(()=>renderReports(mount));
  await loadReportBody();
}

async function loadReportBody(){
  const body = $('#repBody'); if(!body) return;
  const monthId = state.activeMonth;
  const dim = daysInMonth(monthId);

  const dayDocs = await getMonthDailyLogs(monthId);
  const expData = await getMonthDoc('expensesMonthly', monthId);
  const salData = await getMonthDoc('salaryMonthly', monthId);
  const stockData = await getMonthDoc('stockReceiptsMonthly', monthId);

  let revenue=0, ltrTotal=0;
  const byProduct = {p1:{liters:0,amount:0}, p2:{liters:0,amount:0}, p3:{liters:0,amount:0}};
  const byDay = {};
  const payTotals = {pos:0, upi:0, hpCard:0, credit:0, cash:0};
  dayDocs.forEach(doc=>{
    revenue += doc.dayAmount||0; ltrTotal += doc.dayLiters||0;
    byDay[doc.date] = (byDay[doc.date]||0) + (doc.dayAmount||0);
    Object.values(doc.duties||{}).forEach(duty=>{
      const p = duty.pay||{};
      payTotals.pos += p.pos||0; payTotals.upi += p.upi||0; payTotals.hpCard += p.hpCard||0; payTotals.credit += p.credit||0; payTotals.cash += p.cash||0;
      Object.values(duty.nozzles||{}).forEach(nz=>{
        const prod = nz.product;
        if (prod && byProduct[prod]){ byProduct[prod].liters += nz.liters||0; byProduct[prod].amount += nz.amount||0; }
      });
    });
  });
  const fuelCost = (stockData && stockData.totalAmount) || 0;
  const grossMargin = revenue - fuelCost;
  const expenses = (expData && expData.total) || 0;
  const salary = (salData && salData.totalAccrued) || 0;
  const net = grossMargin - expenses - salary;

  body.innerHTML = `
    <div class="grid grid-kpi" style="margin-bottom:22px;">
      <div class="card kpi"><div class="label">Fuel sales</div><div class="value">${moneyShort(revenue)}</div><div class="foot">${liters(ltrTotal)}</div></div>
      <div class="card kpi"><div class="label">Fuel purchase cost</div><div class="value">${moneyShort(fuelCost)}</div><div class="foot">from deliveries logged</div></div>
      <div class="card kpi"><div class="label">Gross margin</div><div class="value ${grossMargin>=0?'good':'critical'}">${moneyShort(grossMargin)}</div></div>
      <div class="card kpi"><div class="label">Expenses</div><div class="value">${moneyShort(expenses)}</div></div>
      <div class="card kpi"><div class="label">Salary</div><div class="value">${moneyShort(salary)}</div></div>
      <div class="card kpi"><div class="label">Net P&amp;L</div><div class="value ${net>=0?'good':'critical'}">${moneyShort(net)}</div></div>
    </div>

    <div class="grid grid-2">
      <div class="card"><div class="chart-wrap"><h3 style="margin:0 0 10px;font-size:14px;">Sales by product</h3><div id="chartProduct"></div></div></div>
      <div class="card"><div class="chart-wrap"><h3 style="margin:0 0 10px;font-size:14px;">Daily revenue trend</h3><div id="chartTrend"></div></div></div>
    </div>

    <div class="section-head"><h2>Collections by payment method</h2></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Method</th><th class="num">Amount</th></tr></thead>
      <tbody>
        <tr><td>Cash</td><td class="num">${money(payTotals.cash)}</td></tr>
        <tr><td>POS / Card</td><td class="num">${money(payTotals.pos)}</td></tr>
        <tr><td>UPI</td><td class="num">${money(payTotals.upi)}</td></tr>
        <tr><td>HP Card</td><td class="num">${money(payTotals.hpCard)}</td></tr>
        <tr><td>Credit</td><td class="num">${money(payTotals.credit)}</td></tr>
      </tbody>
    </table></div></div>
  `;
  drawProductChart($('#chartProduct'), byProduct);
  drawTrendChart($('#chartTrend'), byDay, monthId, dim);
}

function drawProductChart(el, byProduct){
  const rows = PRODUCT_KEYS.map(k=>({key:k, name:state.config.products[k]||k, amount:byProduct[k].amount, liters:byProduct[k].liters, color:PRODUCT_COLOR[k]}));
  const max = Math.max(1, ...rows.map(r=>r.amount));
  const W=440,H=rows.length*46+10;
  let bars = rows.map((r,i)=>{
    const y = i*46+8;
    const w = (r.amount/max)*(W-140);
    return `<text x="0" y="${y+14}" font-size="12">${esc(r.name)}</text>
      <rect x="0" y="${y+20}" width="${W}" height="10" rx="5" fill="var(--surface-2)"></rect>
      <rect x="0" y="${y+20}" width="${Math.max(2,w)}" height="10" rx="5" fill="${r.color}"></rect>
      <text x="${W}" y="${y+14}" font-size="12" text-anchor="end">${esc(money(r.amount))} · ${esc(liters(r.liters))}</text>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="overflow:visible">${bars}</svg>`;
}

function drawTrendChart(el, byDay, monthId, dim){
  const W=520,H=180,padL=8,padR=8,padT=10,padB=24;
  const vals = [];
  for (let d=1; d<=dim; d++){
    const key = monthId+'-'+pad2(d);
    vals.push(byDay[key]||0);
  }
  const max = Math.max(1, ...vals);
  const innerW = W-padL-padR, innerH = H-padT-padB;
  const pts = vals.map((v,i)=>{
    const x = padL + (i/(Math.max(1,vals.length-1)))*innerW;
    const y = padT + innerH - (v/max)*innerH;
    return [x,y];
  });
  const line = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area = line + ` L${pts[pts.length-1][0].toFixed(1)},${padT+innerH} L${pts[0][0].toFixed(1)},${padT+innerH} Z`;
  const lastPt = pts[pts.length-1];
  const gridY = [0,0.5,1].map(f=>padT+innerH*f);
  const gridLines = gridY.map(y=>`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`).join('');
  const labels = `<text x="${padL}" y="${H-6}" font-size="11">1</text><text x="${W-padR}" y="${H-6}" font-size="11" text-anchor="end">${dim}</text>`;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
    ${gridLines}
    <path d="${area}" fill="var(--brand)" opacity="0.12" stroke="none"/>
    <path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="3.5" fill="var(--brand)"/>
    ${labels}
  </svg>`;
}

/* ============================== SETUP ============================== */
// Field configs + collection/list lookups for the generic Setup "Edit" modal — one entry per
// master-data type, shared by openSetupEditModal so each Setup subtab doesn't need its own edit form.
const SETUP_ENTITY = {
  tanks: { label:'Tank', collection:'tanks', list:()=>state.tanks, fields:()=>[
    {key:'name', label:'Tank name', type:'text'},
    {key:'product', label:'Product', type:'select', options:PRODUCT_KEYS.map(k=>({value:k,label:state.config.products[k]||k})), fmt:v=>state.config.products[v]||v||'—'},
    {key:'capacityL', label:'Capacity (L)', type:'number', fmt:v=>liters(v)},
    {key:'currentStockL', label:'Current stock (L) — manual correction', type:'number', fmt:v=>liters(v)},
  ]},
  nozzles: { label:'Nozzle', collection:'nozzles', list:()=>state.nozzles, fields:()=>[
    {key:'name', label:'Nozzle / PU name', type:'text'},
    {key:'tankId', label:'Linked tank', type:'select', options:state.tanks.filter(t=>t.active!==false).map(t=>({value:t.id,label:t.name})), fmt:v=>{ const t=state.tanks.find(x=>x.id===v); return t?t.name:(v||'—'); }},
    {key:'lastClosing', label:'Last closing reading — manual correction', type:'number', fmt:v=>liters(v)},
  ]},
  staff: { label:'Staff', collection:'staff', list:()=>state.staff, fields:()=>[
    {key:'name', label:'Name', type:'text'},
    {key:'phone', label:'Phone', type:'tel'},
    {key:'role', label:'Role', type:'text'},
    {key:'monthlySalary', label:'Monthly salary (₹)', type:'number', fmt:v=>money(v)},
    {key:'hourlyWage', label:'Hourly wage (₹/hr)', type:'number', fmt:v=>money(v)},
  ]},
  creditors: { label:'Creditor', collection:'creditors', list:()=>state.creditors, fields:(r)=>{
    const f = [
      {key:'name', label:'Name', type:'text'},
      {key:'phone', label:'Phone', type:'tel'},
      {key:'vehicleNo', label:'Default vehicle no.', type:'text'},
      {key:'creditLimit', label:'Credit limit (₹)', type:'number', fmt:v=>money(v)},
      {key:'balance', label:'Outstanding balance (₹) — manual correction', type:'number', fmt:v=>money(v)},
    ];
    if (r && r.isBowser) f.push(
      {key:'bowserCapacityL', label:'Bowser capacity (L)', type:'number', fmt:v=>liters(v)},
      {key:'bowserStockL', label:'Bowser stock (L) — manual correction', type:'number', fmt:v=>liters(v)}
    );
    return f;
  }},
  suppliers: { label:'Supplier', collection:'suppliers', list:()=>state.suppliers, fields:()=>[
    {key:'name', label:'Name', type:'text'},
    {key:'phone', label:'Phone', type:'tel'},
    {key:'notes', label:'Notes', type:'text'},
  ]},
  accounts: { label:'Account', collection:'accounts', list:()=>state.accounts, fields:()=>[
    {key:'name', label:'Account name', type:'text'},
    {key:'bankName', label:'Bank', type:'text'},
    {key:'accountNo', label:'Account number', type:'text'},
    {key:'balance', label:'Balance (₹) — manual correction', type:'number', fmt:v=>money(v)},
  ]},
};
function openSetupEditModal(kind, id){
  const cfg = SETUP_ENTITY[kind];
  if (!cfg) return;
  const record = cfg.list().find(x=>x.id===id);
  if (!record) return;
  const fields = cfg.fields(record);
  const values = {}; fields.forEach(f=>{ values[f.key] = record[f.key]; });
  openLineEditModal({
    title:`Edit ${cfg.label} — ${esc(record.name||'')}`,
    fields, values,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      const changes = diffFields(fields, record, out);
      await state.db.doc(cfg.collection+'/'+id).update(out);
      if (changes.length) await logActivity({entity:cfg.label, entityLabel:out.name||record.name||id, action:'edit', changes});
      renderSetup($('#viewMount'));
    }
  });
}

function renderSetup(mount){
  mount.innerHTML = `
    <h1 class="page-title">Setup</h1>
    <p class="page-sub">Master data for your station — tanks, nozzles, staff, shifts and today's rates.</p>
    <div class="subtabs" id="setupSubtabs">
      ${['tanks','nozzles','staff','creditors','suppliers','accounts','users','rates','tools'].map(t=>`<button data-t="${t}" class="${state.setupTab===t?'active':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
    </div>
    <div id="setupBody"></div>
  `;
  $$('#setupSubtabs button').forEach(b=>b.onclick=()=>{ state.setupTab=b.dataset.t; renderSetup(mount); });
  const body = $('#setupBody');
  switch(state.setupTab){
    case 'tanks': renderSetupTanks(body); break;
    case 'nozzles': renderSetupNozzles(body); break;
    case 'staff': renderSetupStaff(body); break;
    case 'creditors': renderSetupCreditors(body); break;
    case 'suppliers': renderSetupSuppliers(body); break;
    case 'accounts': renderSetupAccounts(body); break;
    case 'users': renderSetupUsers(body); break;
    case 'rates': renderSetupRates(body); break;
    case 'tools': renderSetupTools(body); break;
  }
}

function renderSetupTanks(body){
  body.innerHTML = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Tank name</label><input type="text" id="tkName" placeholder="e.g. Tank 1"></div>
        <div class="field"><label>Product</label><select id="tkProduct">${PRODUCT_KEYS.map(k=>`<option value="${k}">${esc(state.config.products[k]||k)}</option>`).join('')}</select></div>
        <div class="field"><label>Capacity (L)</label><input type="number" id="tkCap" placeholder="0"></div>
        <div class="field"><label>Opening stock (L)</label><input type="number" id="tkStock" placeholder="0"></div>
        <div class="field"><button class="btn primary" id="tkAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add tank</button></div>
      </div>
      <div id="tkMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Product</th><th class="num">Capacity</th><th class="num">Current stock</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.tanks.length? state.tanks.map(t=>`<tr>
        <td>${esc(t.name)}</td><td>${esc(state.config.products[t.product]||t.product)}</td>
        <td class="num">${liters(t.capacityL)}</td><td class="num">${liters(t.currentStockL)}</td>
        <td><span class="pill ${t.active!==false?'good':'neutral'}">${t.active!==false?'Active':'Inactive'}</span></td>
        <td><button class="btn ghost sm" data-edit="${t.id}">${icon('edit')}</button> <button class="btn ghost sm" data-toggle="${t.id}" data-cur="${t.active!==false}">${t.active!==false?'Deactivate':'Activate'}</button>${t.active===false?`<button class="btn danger sm" data-delete="${t.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="empty">No tanks yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('tanks', b.dataset.edit));
  $('#tkAdd').onclick = async ()=>{
    const name = $('#tkName').value.trim();
    if (!name){ $('#tkMsg').innerHTML = `<span style="color:var(--critical)">Name the tank.</span>`; return; }
    await state.db.collection('tanks').add({
      name, product: $('#tkProduct').value, capacityL: num($('#tkCap').value),
      currentStockL: num($('#tkStock').value), openingStockL: num($('#tkStock').value),
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Tank', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('tanks/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this tank?', body:'This permanently removes it from Setup. Any nozzles still linked to it will show as unlinked — unlink or delete those first if you plan to keep using them. Past duty and delivery records are kept as-is.', confirmLabel:'Delete tank'});
    if (!ok) return;
    const rec = state.tanks.find(t=>t.id===b.dataset.delete);
    await state.db.doc('tanks/'+b.dataset.delete).delete();
    await logActivity({entity:'Tank', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
}

function renderSetupNozzles(body){
  const activeTanks = state.tanks.filter(t=>t.active!==false);
  body.innerHTML = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Nozzle / PU name</label><input type="text" id="nzName" placeholder="e.g. PU1-N1"></div>
        <div class="field"><label>Linked tank</label><select id="nzTank">${activeTanks.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')||'<option value="">Add a tank first</option>'}</select></div>
        <div class="field"><label>Starting meter reading</label><input type="number" id="nzStart" placeholder="0"></div>
        <div class="field"><button class="btn primary" id="nzAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add nozzle</button></div>
      </div>
      <div id="nzMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Nozzle</th><th>Tank</th><th>Product</th><th class="num">Last closing</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.nozzles.length? state.nozzles.map(n=>{
        const tank = state.tanks.find(t=>t.id===n.tankId);
        return `<tr><td>${esc(n.name)}</td><td>${tank?esc(tank.name):'—'}</td><td>${tank?esc(state.config.products[tank.product]||tank.product):'—'}</td>
        <td class="num">${liters(n.lastClosing)}</td>
        <td><span class="pill ${n.active!==false?'good':'neutral'}">${n.active!==false?'Active':'Inactive'}</span></td>
        <td><button class="btn ghost sm" data-edit="${n.id}">${icon('edit')}</button> <button class="btn ghost sm" data-toggle="${n.id}" data-cur="${n.active!==false}">${n.active!==false?'Deactivate':'Activate'}</button>${n.active===false?`<button class="btn danger sm" data-delete="${n.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}</td></tr>`;
      }).join('') : `<tr><td colspan="6" class="empty">No nozzles yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('nozzles', b.dataset.edit));
  $('#nzAdd').onclick = async ()=>{
    const name = $('#nzName').value.trim(), tankId = $('#nzTank').value;
    if (!name || !tankId){ $('#nzMsg').innerHTML = `<span style="color:var(--critical)">Name the nozzle and pick a tank.</span>`; return; }
    await state.db.collection('nozzles').add({
      name, tankId, active:true, lastClosing:num($('#nzStart').value), lastReadingDate:null, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Nozzle', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('nozzles/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this nozzle?', body:'This permanently removes it from Setup. Past duty records that used it are kept as-is.', confirmLabel:'Delete nozzle'});
    if (!ok) return;
    const rec = state.nozzles.find(n=>n.id===b.dataset.delete);
    await state.db.doc('nozzles/'+b.dataset.delete).delete();
    await logActivity({entity:'Nozzle', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
}

function renderSetupStaff(body){
  body.innerHTML = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Name</label><input type="text" id="stName" placeholder="Staff name"></div>
        <div class="field"><label>Phone</label><input type="tel" id="stPhone" placeholder="Optional"></div>
        <div class="field"><label>Role</label><input type="text" id="stRole" placeholder="e.g. Pump Attendant"></div>
        <div class="field"><label>Monthly salary (₹)</label><input type="number" id="stSalary" placeholder="0"></div>
        <div class="field"><label>Hourly wage (₹/hr)</label><input type="number" id="stHourly" placeholder="0"></div>
        <div class="field"><button class="btn primary" id="stAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add staff</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">Set either a monthly salary or an hourly wage. Hourly staff have their pay calculated automatically from the duty hours logged in Duty Entry.</div>
      <div id="stMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th class="num">Monthly salary</th><th class="num">Hourly wage</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.staff.length? state.staff.map(s=>`<tr>
        <td>${esc(s.name)}</td><td>${esc(s.role||'—')}</td><td>${esc(s.phone||'—')}</td><td class="num">${s.monthlySalary?money(s.monthlySalary):'—'}</td><td class="num">${s.hourlyWage?money(s.hourlyWage):'—'}</td>
        <td><span class="pill ${s.active!==false?'good':'neutral'}">${s.active!==false?'Active':'Inactive'}</span></td>
        <td><button class="btn ghost sm" data-edit="${s.id}">${icon('edit')}</button> <button class="btn ghost sm" data-toggle="${s.id}" data-cur="${s.active!==false}">${s.active!==false?'Deactivate':'Activate'}</button>${s.active===false?`<button class="btn danger sm" data-delete="${s.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="7" class="empty">No staff yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('staff', b.dataset.edit));
  $('#stAdd').onclick = async ()=>{
    const name = $('#stName').value.trim();
    if (!name){ $('#stMsg').innerHTML = `<span style="color:var(--critical)">Enter a name.</span>`; return; }
    await state.db.collection('staff').add({
      name, phone:$('#stPhone').value.trim(), role:$('#stRole').value.trim(),
      monthlySalary:num($('#stSalary').value), hourlyWage:num($('#stHourly').value),
      active:true, joinDate:todayStr(), createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Staff', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('staff/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this staff member?', body:'This permanently removes them from Setup. Past duty and salary records keep their saved name as-is.', confirmLabel:'Delete staff'});
    if (!ok) return;
    const rec = state.staff.find(s=>s.id===b.dataset.delete);
    await state.db.doc('staff/'+b.dataset.delete).delete();
    await logActivity({entity:'Staff', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
}

function renderSetupCreditors(body){
  body.innerHTML = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Creditor / company name</label><input type="text" id="crName" placeholder="e.g. ABC Transports"></div>
        <div class="field"><label>Phone</label><input type="tel" id="crPhone" placeholder="Optional"></div>
        <div class="field"><label>Default vehicle no.</label><input type="text" id="crVeh" placeholder="Optional"></div>
        <div class="field"><label>Credit limit (₹, optional)</label><input type="number" id="crLimit" placeholder="0"></div>
      </div>
      <label class="toggle" style="margin-top:2px;"><input type="checkbox" id="crBowser"> This creditor is a Bowser (mobile delivery tank filled from a station nozzle)</label>
      <div class="form-grid" id="crBowserFields" style="margin-top:10px;display:none;">
        <div class="field"><label>Product it carries</label><select id="crBowserProduct">${PRODUCT_KEYS.map(k=>`<option value="${k}">${esc(state.config.products[k]||k)}</option>`).join('')}</select></div>
        <div class="field"><label>Bowser capacity (L, optional)</label><input type="number" id="crBowserCap" placeholder="0"></div>
      </div>
      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="crAdd" ${state.dbReady?'':'disabled'}>${icon('plus')} Add creditor</button>
      </div>
      <div id="crMsg" style="font-size:13px;margin-top:6px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Phone</th><th class="num">Outstanding balance</th><th class="num">Bowser stock</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.creditors.length? state.creditors.map(c=>`<tr>
        <td>${esc(c.name)}${c.isBowser?`<div class="hint" style="font-size:11px;color:var(--text-faint)">Bowser · ${esc(state.config.products[c.bowserProduct]||c.bowserProduct||'')}</div>`:''}</td>
        <td>${esc(c.phone||'—')}</td>
        <td class="num" ${num(c.balance)>0?'style="color:var(--critical);font-weight:600;"':''}>${money(c.balance||0)}</td>
        <td class="num">${c.isBowser? liters(c.bowserStockL||0) : '—'}</td>
        <td><span class="pill ${c.active!==false?'good':'neutral'}">${c.active!==false?'Active':'Inactive'}</span></td>
        <td>
          <button class="btn sm" data-pay="${c.id}">Record payment</button>
          <button class="btn ghost sm" data-history="${c.id}" style="margin-left:6px;">History</button>
          <button class="btn ghost sm" data-edit="${c.id}" style="margin-left:6px;">${icon('edit')}</button>
          <button class="btn ghost sm" data-toggle="${c.id}" data-cur="${c.active!==false}" style="margin-left:6px;">${c.active!==false?'Deactivate':'Activate'}</button>
          ${c.active===false?`<button class="btn danger sm" data-delete="${c.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="empty">No creditors yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('creditors', b.dataset.edit));
  $$('[data-history]', body).forEach(b=>b.onclick=()=>{
    const c = state.creditors.find(x=>x.id===b.dataset.history);
    if (c) openCreditorLedgerModal(c);
  });
  $('#crBowser').onchange = (e)=>{ $('#crBowserFields').style.display = e.target.checked ? 'grid' : 'none'; };
  $('#crAdd').onclick = async ()=>{
    const name = $('#crName').value.trim();
    if (!name){ $('#crMsg').innerHTML = `<span style="color:var(--critical)">Enter a name.</span>`; return; }
    const isBowser = $('#crBowser').checked;
    await state.db.collection('creditors').add({
      name, phone:$('#crPhone').value.trim(), vehicleNo:$('#crVeh').value.trim(),
      creditLimit:num($('#crLimit').value),
      isBowser, bowserProduct: isBowser?$('#crBowserProduct').value:null, bowserCapacityL: isBowser?num($('#crBowserCap').value):0,
      bowserStockL:0, balance:0, payments:[],
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Creditor', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('creditors/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this creditor?', body:'This permanently removes them from Setup. Past credit sale lines keep their saved name as-is.', confirmLabel:'Delete creditor'});
    if (!ok) return;
    const rec = state.creditors.find(c=>c.id===b.dataset.delete);
    await state.db.doc('creditors/'+b.dataset.delete).delete();
    await logActivity({entity:'Creditor', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
  $$('[data-pay]', body).forEach(b=>b.onclick=()=>{
    const c = state.creditors.find(x=>x.id===b.dataset.pay);
    if (c) openPaymentModal(c);
  });
}

function renderSetupSuppliers(body){
  body.innerHTML = `
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Supplier name</label><input type="text" id="spName" placeholder="e.g. HPCL"></div>
        <div class="field"><label>Phone</label><input type="tel" id="spPhone" placeholder="Optional"></div>
        <div class="field" style="grid-column:span 2;"><label>Notes</label><input type="text" id="spNotes" placeholder="Optional"></div>
        <div class="field"><button class="btn primary" id="spAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add supplier</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">Suppliers show up as suggestions on the fuel purchase form in Stock. Payables to suppliers aren't tracked here yet — purchases are settled outside the app for now.</div>
      <div id="spMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Phone</th><th>Notes</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.suppliers.length? state.suppliers.map(s=>`<tr>
        <td>${esc(s.name)}</td><td>${esc(s.phone||'—')}</td><td>${esc(s.notes||'—')}</td>
        <td><span class="pill ${s.active!==false?'good':'neutral'}">${s.active!==false?'Active':'Inactive'}</span></td>
        <td><button class="btn ghost sm" data-edit="${s.id}">${icon('edit')}</button> <button class="btn ghost sm" data-toggle="${s.id}" data-cur="${s.active!==false}">${s.active!==false?'Deactivate':'Activate'}</button>${s.active===false?`<button class="btn danger sm" data-delete="${s.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="5" class="empty">No suppliers yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('suppliers', b.dataset.edit));
  $('#spAdd').onclick = async ()=>{
    const name = $('#spName').value.trim();
    if (!name){ $('#spMsg').innerHTML = `<span style="color:var(--critical)">Enter a name.</span>`; return; }
    await state.db.collection('suppliers').add({
      name, phone:$('#spPhone').value.trim(), notes:$('#spNotes').value.trim(),
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Supplier', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('suppliers/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this supplier?', body:'This permanently removes them from Setup. Past purchase records keep their saved supplier text as-is.', confirmLabel:'Delete supplier'});
    if (!ok) return;
    const rec = state.suppliers.find(s=>s.id===b.dataset.delete);
    await state.db.doc('suppliers/'+b.dataset.delete).delete();
    await logActivity({entity:'Supplier', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
}

function renderSetupAccounts(body){
  const banks = state.accounts.filter(a=>a.kind==='bank');
  const receivables = state.accounts.filter(a=>a.kind==='receivable');
  body.innerHTML = `
    <div class="banner info">${icon('receipt')}Bank accounts collect POS and UPI settlement automatically when a duty is saved with that account selected. The HPCL receivable below is created automatically the first time an HP Card sale is saved, and tracks what HPCL owes the station until it's settled.</div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Account name</label><input type="text" id="acName" placeholder="e.g. SBI Current A/C"></div>
        <div class="field"><label>Bank</label><input type="text" id="acBank" placeholder="e.g. State Bank of India"></div>
        <div class="field"><label>Account number</label><input type="text" id="acNo" placeholder="Optional"></div>
        <div class="field"><label>Opening balance (₹)</label><input type="number" step="0.01" id="acOpen" placeholder="0.00"></div>
        <div class="field"><button class="btn primary" id="acAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add bank account</button></div>
      </div>
      <div id="acMsg" style="font-size:13px;"></div>
    </div>
    <div class="section-head"><h2>Bank accounts</h2></div>
    <div class="card" style="margin-bottom:16px;"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Bank</th><th>Account no.</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
      <tbody>${banks.length? banks.map(a=>`<tr>
        <td>${esc(a.name)}</td><td>${esc(a.bankName||'—')}</td><td>${esc(a.accountNo||'—')}</td>
        <td class="num" style="font-weight:600;">${money(a.balance||0)}</td>
        <td><span class="pill ${a.active!==false?'good':'neutral'}">${a.active!==false?'Active':'Inactive'}</span></td>
        <td>
          <button class="btn sm" data-deposit="${a.id}">Add deposit</button>
          <button class="btn ghost sm" data-ledger="${a.id}" style="margin-left:6px;">Ledger</button>
          <button class="btn ghost sm" data-edit="${a.id}" style="margin-left:6px;">${icon('edit')}</button>
          <button class="btn ghost sm" data-toggle="${a.id}" data-cur="${a.active!==false}" style="margin-left:6px;">${a.active!==false?'Deactivate':'Activate'}</button>
          ${a.active===false?`<button class="btn danger sm" data-delete="${a.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="empty">No bank accounts yet.</td></tr>`}</tbody>
    </table></div></div>
    <div class="section-head"><h2>Receivables</h2><span class="hint">money owed to the station by settlement partners</span></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th class="num">Outstanding</th><th></th></tr></thead>
      <tbody>${receivables.length? receivables.map(a=>`<tr>
        <td>${esc(a.name)}</td>
        <td class="num" ${num(a.balance)>0?'style="color:var(--critical);font-weight:600;"':''}>${money(a.balance||0)}</td>
        <td>
          <button class="btn sm" data-settle="${a.id}">Record settlement</button>
          <button class="btn ghost sm" data-ledger="${a.id}" style="margin-left:6px;">Ledger</button>
          <button class="btn ghost sm" data-edit="${a.id}" style="margin-left:6px;">${icon('edit')}</button>
        </td>
      </tr>`).join('') : `<tr><td colspan="3" class="empty">Nothing yet — created automatically once an HP Card sale is saved.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('accounts', b.dataset.edit));
  $$('[data-ledger]', body).forEach(b=>b.onclick=()=>{
    const a = state.accounts.find(x=>x.id===b.dataset.ledger);
    if (a) openAccountLedgerModal(a);
  });
  $('#acAdd').onclick = async ()=>{
    const name = $('#acName').value.trim();
    if (!name){ $('#acMsg').innerHTML = `<span style="color:var(--critical)">Name the account.</span>`; return; }
    await state.db.collection('accounts').add({
      name, kind:'bank', bankName:$('#acBank').value.trim(), accountNo:$('#acNo').value.trim(),
      balance:num($('#acOpen').value), ledger:[], active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Account', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('accounts/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this bank account?', body:'This permanently removes it from Setup. Past duty records that settled into it keep their saved reference as-is.', confirmLabel:'Delete account'});
    if (!ok) return;
    const rec = state.accounts.find(a=>a.id===b.dataset.delete);
    await state.db.doc('accounts/'+b.dataset.delete).delete();
    await logActivity({entity:'Account', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
  $$('[data-deposit]', body).forEach(b=>b.onclick=()=>{
    const a = state.accounts.find(x=>x.id===b.dataset.deposit);
    if (a) openAccountTxnModal(a, 'deposit');
  });
  $$('[data-settle]', body).forEach(b=>b.onclick=()=>{
    const a = state.accounts.find(x=>x.id===b.dataset.settle);
    if (a) openAccountTxnModal(a, 'settlement');
  });
}

function openAccountTxnModal(account, mode){
  const root = $('#modalRoot');
  if (!root) return;
  const isSettlement = mode==='settlement';
  const bankOptions = state.accounts.filter(a=>a.kind==='bank' && a.active!==false);
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>${isSettlement?'Record settlement':'Add deposit'} — ${esc(account.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">${isSettlement?'Outstanding':'Current balance'}: <strong class="mono">${money(account.balance||0)}</strong></p>
      <div class="field"><label>Date</label><input type="date" id="atDate" value="${todayStr()}" max="${todayStr()}"></div>
      <div class="field"><label>Amount (₹)</label><input type="number" step="0.01" id="atAmount" placeholder="0.00"></div>
      ${isSettlement && bankOptions.length? `<div class="field"><label>Deposit into bank account (optional)</label><select id="atBank"><option value="">— no bank entry —</option>${bankOptions.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>${isSettlement?'Paid by (optional)':'From party (optional)'}</label><input type="text" id="atFrom" placeholder="${isSettlement?'e.g. HPCL':'e.g. customer / party name'}"></div>
      <div class="field"><label>Note (optional)</label><input type="text" id="atNote" placeholder="Optional"></div>
      <div id="atMsg" style="font-size:13px;color:var(--critical);"></div>
      <div class="modal-actions">
        <button class="btn" id="atCancel">Cancel</button>
        <button class="btn primary" id="atSave">${isSettlement?'Record settlement':'Add deposit'}</button>
      </div>
    </div>
  </div>`;
  $('#atCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $('#atSave').onclick = async ()=>{
    if (!state.dbReady){ $('#atMsg').textContent = "Live data isn't connected."; return; }
    const amt = num($('#atAmount').value);
    if (!(amt>0)){ $('#atMsg').textContent = 'Enter an amount.'; return; }
    const date = $('#atDate').value, from = $('#atFrom').value.trim(), note = $('#atNote').value.trim();
    const bankId = isSettlement && $('#atBank') ? $('#atBank').value : '';
    $('#atSave').disabled = true;
    try{
      const ref = state.db.doc('accounts/'+account.id);
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : {};
      const ledger = (data.ledger||[]).concat([{id:uid(), date, type:isSettlement?'settlement':'deposit', amount:amt, from, note, savedAt:new Date().toISOString()}]);
      const balance = isSettlement ? num(data.balance) - amt : num(data.balance) + amt;
      await ref.update({ledger, balance});
      if (isSettlement && bankId){
        const bRef = state.db.doc('accounts/'+bankId);
        const bSnap = await bRef.get();
        const bData = bSnap.exists ? bSnap.data() : {};
        const bLedger = (bData.ledger||[]).concat([{id:uid(), date, type:'deposit', amount:amt, from:account.name, note:'Settlement from '+account.name, savedAt:new Date().toISOString()}]);
        await bRef.update({ledger:bLedger, balance:num(bData.balance)+amt});
      }
      closeModal();
    }catch(e){
      $('#atMsg').textContent = 'Could not save: '+(e.message||'error');
      $('#atSave').disabled = false;
    }
  };
}

async function renderSetupRates(body){
  const date = todayStr();
  const current = {};
  for (const k of PRODUCT_KEYS) current[k] = await getRateForDate(date, k);
  body.innerHTML = `
    <div class="banner info">${icon('receipt')}Set today's per-liter rate for each product. Rates apply from the date you save them until you change them again.</div>
    <div class="card card-pad">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="rtDate" value="${date}" max="${date}"></div>
        ${PRODUCT_KEYS.map(k=>`<div class="field"><label>${esc(state.config.products[k]||k)} (₹/L)</label><input type="number" step="0.01" class="rtVal" data-k="${k}" value="${current[k]??''}"></div>`).join('')}
        <div class="field"><button class="btn primary" id="rtSave" style="width:100%" ${state.dbReady?'':'disabled'}>Save rates</button></div>
      </div>
      <div id="rtMsg" style="font-size:13px;"></div>
    </div>
  `;
  $('#rtSave').onclick = async ()=>{
    const d = $('#rtDate').value;
    const rates = {};
    $$('.rtVal', body).forEach(inp=>{ if (inp.value!=='') rates[inp.dataset.k] = num(inp.value); });
    await setRateForDate(d, rates);
    $('#rtMsg').innerHTML = `<span style="color:var(--good)">Rates saved for ${fmtDateLabel(d)}.</span>`;
  };
}

function renderSetupUsers(body){
  const users = state.users.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const activeOwners = users.filter(u=>u.role==='owner' && u.active!==false).length;
  body.innerHTML = `
    <div class="banner info">${icon('gear')}Owner sees every tab including Setup. Manager gets daily operations (Duty, Stock, Expenses, Salary, Reports). Staff gets Dashboard and Duty Entry only. Passwords here are a front-door convenience, not encrypted security — this page is reachable by anyone with the link, so use passwords you don't use anywhere else and keep the link private.</div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Name</label><input type="text" id="usName" placeholder="e.g. Ravi Kumar"></div>
        <div class="field"><label>Username</label><input type="text" id="usUser" placeholder="e.g. ravi" autocomplete="off"></div>
        <div class="field"><label>Role</label><select id="usRole">
          <option value="owner">Owner — full access</option>
          <option value="manager">Manager — daily operations</option>
          <option value="staff" selected>Staff — Dashboard &amp; Duty Entry</option>
        </select></div>
        <div class="field"><label>Password</label><input type="password" id="usPass" autocomplete="new-password"></div>
        <div class="field"><button class="btn primary" id="usAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add user</button></div>
      </div>
      <div id="usMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
      <tbody>${users.length? users.map(u=>`<tr>
        <td>${esc(u.name)}${state.currentUser && state.currentUser.id===u.id?' <span class="hint" style="color:var(--text-faint);">(you)</span>':''}</td>
        <td class="mono">${esc(u.username||'—')}</td>
        <td><span class="pill neutral">${esc(ROLE_LABEL[u.role]||u.role)}</span></td>
        <td><span class="pill ${u.active!==false?'good':'neutral'}">${u.active!==false?'Active':'Inactive'}</span></td>
        <td>
          <button class="btn ghost sm" data-edit="${u.id}">${icon('edit')}</button>
          <button class="btn ghost sm" data-reset="${u.id}" style="margin-left:6px;">Reset password</button>
          <button class="btn ghost sm" data-toggle="${u.id}" data-cur="${u.active!==false}" style="margin-left:6px;">${u.active!==false?'Deactivate':'Activate'}</button>
          <button class="btn danger sm" data-delete="${u.id}" style="margin-left:6px;">${icon('trash')}</button>
        </td>
      </tr>`).join('') : `<tr><td colspan="5" class="empty">No users yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $('#usAdd').onclick = async ()=>{
    const msg = $('#usMsg');
    const name = $('#usName').value.trim();
    const username = $('#usUser').value.trim().toLowerCase().replace(/\s+/g,'');
    const role = $('#usRole').value;
    const pass = $('#usPass').value;
    if (!name || !username){ msg.innerHTML = `<span style="color:var(--critical)">Enter a name and a username.</span>`; return; }
    if (state.users.some(u=>String(u.username||'').toLowerCase()===username)){ msg.innerHTML = `<span style="color:var(--critical)">That username is already taken.</span>`; return; }
    if (!pass || pass.length<4){ msg.innerHTML = `<span style="color:var(--critical)">Password must be at least 4 characters.</span>`; return; }
    await state.db.collection('users').add({name, username, password:pass, role, active:true, createdAt:new Date().toISOString()});
    await logActivity({entity:'User', entityLabel:name, action:'add', summary:`Added as ${ROLE_LABEL[role]||role}`});
    renderSetup($('#viewMount'));
  };
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>{
    const u = state.users.find(x=>x.id===b.dataset.edit);
    if (u) openUserEditModal(u);
  });
  $$('[data-reset]', body).forEach(b=>b.onclick=()=>{
    const u = state.users.find(x=>x.id===b.dataset.reset);
    if (u) openResetPasswordModal(u);
  });
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    const u = state.users.find(x=>x.id===b.dataset.toggle);
    if (!u) return;
    const willDeactivate = b.dataset.cur==='true';
    if (willDeactivate && u.role==='owner' && activeOwners<=1){
      await confirmModal({title:"Can't deactivate the last Owner", body:'At least one active Owner account is needed so the station is never locked out of Setup. Make another user an Owner first.', confirmLabel:'OK', danger:false});
      return;
    }
    if (willDeactivate && state.currentUser && state.currentUser.id===u.id){
      const ok = await confirmModal({title:'Deactivate your own account?', body:"You'll be signed out immediately and won't be able to sign back in until another Owner reactivates you.", confirmLabel:'Deactivate me'});
      if (!ok) return;
    }
    await state.db.doc('users/'+u.id).update({active: !willDeactivate});
    await logActivity({entity:'User', entityLabel:u.name, action:'edit', summary: willDeactivate?'Deactivated':'Activated'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const u = state.users.find(x=>x.id===b.dataset.delete);
    if (!u) return;
    if (u.role==='owner' && activeOwners<=1){
      await confirmModal({title:"Can't delete the last Owner", body:'At least one Owner account is needed so the station is never locked out of Setup. Make another user an Owner first.', confirmLabel:'OK', danger:false});
      return;
    }
    const ok = await confirmModal({title:`Delete ${u.name}?`, body: state.currentUser && state.currentUser.id===u.id ? "This is your own account — you'll be signed out immediately." : 'This permanently removes their login. Past activity log entries keep their name as-is.', confirmLabel:'Delete user'});
    if (!ok) return;
    await state.db.doc('users/'+u.id).delete();
    await logActivity({entity:'User', entityLabel:u.name, action:'delete'});
  });
}
function openUserEditModal(user){
  const fields = [
    {key:'name', label:'Name', type:'text'},
    {key:'username', label:'Username', type:'text'},
    {key:'role', label:'Role', type:'select', options:[{value:'owner',label:'Owner — full access'},{value:'manager',label:'Manager — daily operations'},{value:'staff',label:'Staff — Dashboard & Duty Entry'}], fmt:v=>ROLE_LABEL[v]||v},
    {key:'active', label:'Active', type:'checkbox', fmt:v=>v?'Active':'Inactive'},
  ];
  const values = {name:user.name, username:user.username, role:user.role, active:user.active!==false};
  openLineEditModal({
    title:`Edit user — ${esc(user.name)}`,
    subtitle:'Password is managed separately via "Reset password".',
    fields, values,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      const username = String(out.username||'').trim().toLowerCase().replace(/\s+/g,'');
      if (!out.name || !username) throw new Error('Enter a name and a username.');
      if (state.users.some(u=>u.id!==user.id && String(u.username||'').toLowerCase()===username)) throw new Error('That username is already taken.');
      const activeOwners = state.users.filter(u=>u.role==='owner' && u.active!==false).length;
      const losesOwner = (user.role==='owner' && (out.role!=='owner' || out.active===false));
      if (losesOwner && activeOwners<=1) throw new Error("At least one active Owner is required — make another user an Owner first.");
      out.username = username;
      const changes = diffFields(fields, user, out);
      await state.db.doc('users/'+user.id).update(out);
      if (changes.length) await logActivity({entity:'User', entityLabel:out.name||user.name, action:'edit', changes});
      renderSetup($('#viewMount'));
    }
  });
}
function openResetPasswordModal(user){
  const root = $('#modalRoot');
  if (!root) return;
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>Reset password — ${esc(user.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">Sets a new password for this user immediately — they don't need to confirm their old one.</p>
      <div class="field"><label>New password</label><input type="password" id="rpNew" autocomplete="new-password"></div>
      <div class="field"><label>Confirm new password</label><input type="password" id="rpNew2" autocomplete="new-password"></div>
      <div id="rpMsg" style="font-size:13px;color:var(--critical);"></div>
      <div class="modal-actions">
        <button class="btn" id="rpCancel">Cancel</button>
        <button class="btn primary" id="rpSave">Reset password</button>
      </div>
    </div>
  </div>`;
  $('#rpCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  $('#rpSave').onclick = async ()=>{
    const msg = $('#rpMsg');
    const pass = $('#rpNew').value, pass2 = $('#rpNew2').value;
    if (!pass || pass.length<4){ msg.textContent = 'Password must be at least 4 characters.'; return; }
    if (pass!==pass2){ msg.textContent = 'Passwords do not match.'; return; }
    if (!state.dbReady){ msg.textContent = "Live data isn't connected."; return; }
    $('#rpSave').disabled = true;
    try{
      await state.db.doc('users/'+user.id).update({password:pass});
      await logActivity({entity:'User', entityLabel:user.name, action:'edit', summary:'Password reset'});
      closeModal();
    }catch(e){ msg.textContent = 'Could not save: '+(e.message||'error'); $('#rpSave').disabled = false; }
  };
}

function renderSetupTools(body){
  body.innerHTML = `
    <div class="card card-pad">
      <h3 style="margin-top:0;font-size:14px;">Recalculate tank stock</h3>
      <p class="hint" style="color:var(--text-muted);font-size:13px;">Rebuilds every tank's current stock from opening stock + all recorded purchases + all stock transferred in − all fuel dispensed (sold or transferred out). Use this if stock ever looks off after edits.</p>
      <button class="btn" id="toolRecalc" ${state.dbReady?'':'disabled'}>Recalculate now</button>
      <div id="toolMsg" style="font-size:13px;margin-top:8px;"></div>
    </div>
    <div class="card card-pad" style="margin-top:16px;">
      <h3 style="margin-top:0;font-size:14px;">Station name</h3>
      <div class="row">
        <input type="text" id="cfgName" value="${esc(state.config.stationName||'')}" style="max-width:320px;">
        <button class="btn" id="cfgSave" ${state.dbReady?'':'disabled'}>Save</button>
      </div>
    </div>
  `;
  $('#cfgSave').onclick = async ()=>{
    await state.db.doc('config/main').update({stationName:$('#cfgName').value.trim()}).catch(async ()=>{
      await state.db.doc('config/main').set(Object.assign({}, state.config, {stationName:$('#cfgName').value.trim()}));
    });
  };
  $('#toolRecalc').onclick = async ()=>{
    const msg = $('#toolMsg');
    msg.textContent = 'Recalculating…';
    try{
      const receiptsByTank = {};
      const monthsToScan = new Set();
      const now = new Date();
      let cursor = monthIdOf(todayStr());
      for (let i=0;i<36;i++){ monthsToScan.add(cursor); cursor = shiftMonth(cursor,-1); }
      for (const m of monthsToScan){
        const snap = await state.db.doc('stockReceiptsMonthly/'+m).get();
        if (snap.exists){ (snap.data().items||[]).forEach(it=>{ receiptsByTank[it.tankId] = (receiptsByTank[it.tankId]||0)+num(it.liters); }); }
      }
      const soldByTank = {};
      const transferredInByTank = {};
      const logsSnap = await state.db.collection('dailyLogs').limit(1000).get();
      logsSnap.docs.forEach(d=>{
        const data = d.data();
        Object.values(data.duties||{}).forEach(duty=>{
          Object.values(duty.nozzles||{}).forEach(nz=>{
            // drawLiters (sale + stock transfer) is what actually left the source tank; older
            // entries saved before stock transfers existed only have `liters`, which meant the same thing.
            const draw = nz.drawLiters!=null ? nz.drawLiters : nz.liters;
            if (nz.tankId) soldByTank[nz.tankId] = (soldByTank[nz.tankId]||0) + num(draw);
            if (nz.transferToTankId) transferredInByTank[nz.transferToTankId] = (transferredInByTank[nz.transferToTankId]||0) + num(nz.transferLiters);
          });
        });
      });
      for (const t of state.tanks){
        const newStock = num(t.openingStockL) + (receiptsByTank[t.id]||0) + (transferredInByTank[t.id]||0) - (soldByTank[t.id]||0);
        await state.db.doc('tanks/'+t.id).update({currentStockL: newStock});
      }
      msg.innerHTML = `<span style="color:var(--good)">Done — tank stock recalculated from history (including stock transfers between tanks).</span>`;
    }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">${esc(e.message||'Failed')}</span>`; }
  };
}

/* ============================== boot ============================== */
initDb();
})();
