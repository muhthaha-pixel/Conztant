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
// Names like "1-1", "1-2", "2-1", "B-1" should read in pump order, so digits inside a name compare
// as numbers rather than text — otherwise "10-1" sorts before "2-1".
const naturalCompare = (a, b) => String(a==null?'':a).localeCompare(String(b==null?'':b), undefined, {numeric:true, sensitivity:'base'});
const byName = (list) => (list||[]).slice().sort((x,y)=>naturalCompare(x.name, y.name));

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
    truck:'<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    inbox:'<path d="M12 3v10"/><path d="M8 9l4 4 4-4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4Z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7Z"/>',
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
        <tbody id="clTbody">${payments.length? payments.map(p=> p.receiptId ? `<tr data-id="${p.id}">
          <td>${fmtDateLabel(p.date)}</td><td class="num">${money(p.amount)}</td><td>${esc(p.note||'')}</td>
          <td><span class="hint" style="font-size:11.5px;color:var(--text-faint);">via Receipts — edit there</span></td>
        </tr>` : `<tr data-id="${p.id}">
          <td><input type="date" class="clDate" value="${p.date||''}" style="width:130px;"></td>
          <td class="num"><input type="number" step="0.01" class="clAmt" value="${p.amount||0}" style="width:110px;text-align:right;"></td>
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
          <td class="num"><input type="number" step="0.01" class="alAmt" value="${l.amount||0}" style="width:110px;text-align:right;"></td>
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
  tanks: [], nozzles: [], staff: [], creditors: [], suppliers: [], accounts: [], ledgers: [], oilProducts: [], fixedCosts: [],
  users: [], usersLoaded: false, currentUser: null,
  ratesFlat: {},        // 'YYYY-MM-DD' -> {p1,r2,p3}
  ratesLoadedMonths: new Set(),
  activeMonth: monthIdOf(todayStr()),
  dashDate: todayStr(),
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

  db.collection('fixedCosts').onSnapshot(qs=>{
    state.fixedCosts = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('oilProducts').onSnapshot(qs=>{
    state.oilProducts = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
    refreshView();
  }, ()=>{});

  db.collection('ledgers').onSnapshot(qs=>{
    state.ledgers = qs.docs.map(d=>Object.assign({id:d.id}, d.data()));
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
  owner:   ['dashboard','shift','purchase','expenses','reports','receipts','journal','activity','setup'],
  manager: ['dashboard','shift','purchase','expenses','reports','receipts','journal'],
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
  {id:'purchase', label:'Purchase', icon:'truck'},
  {id:'expenses', label:'Payments / Expenses', icon:'receipt'},
  {id:'reports', label:'Reports', icon:'chart'},
  {id:'receipts', label:'Receipts', icon:'inbox'},
  {id:'journal', label:'Journal', icon:'book'},
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
  // A render error used to leave the page blank with nothing but a console message — show it
  // instead, so a problem is reportable rather than mysterious, and the rest of the app stays usable.
  try{
    renderView(mount);
  }catch(e){
    mount.innerHTML = `<div class="card card-pad" style="max-width:560px;margin:32px auto;">
      <h2 style="margin-top:0;font-size:16px;">This page couldn't be displayed</h2>
      <p style="font-size:13.5px;color:var(--text-muted);">Something went wrong while drawing it. Your saved data is untouched — switch to another tab and try again, or send this message on:</p>
      <p class="mono" style="font-size:12.5px;background:var(--surface-2);padding:10px;border-radius:8px;">${esc(state.view)}: ${esc(e.message||String(e))}</p>
    </div>`;
  }
}

function renderView(mount){
  switch(state.view){
    case 'dashboard': renderDashboard(mount); break;
    case 'shift': renderShiftEntry(mount); break;
    case 'purchase': renderPurchase(mount); break;
    case 'expenses': renderExpenses(mount); break;
    case 'reports': renderReports(mount); break;
    case 'receipts': renderReceipts(mount); break;
    case 'journal': renderJournal(mount); break;
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
  const date = state.dashDate || todayStr();
  const isToday = date === todayStr();
  // Today's figures come from the live listener; any other day is fetched and cached.
  const log = isToday ? state.todayLog : state.dailyLogsCache[date];
  const loading = !isToday && log === undefined;
  const dayAmount = log ? (log.dayAmount||0) : 0;
  const dayLiters = log ? (log.dayLiters||0) : 0;
  const duties = log ? Object.values(log.duties||{}) : [];
  const when = isToday ? 'today' : 'that day';

  mount.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:flex-end;">
      <div>
        <h1 class="page-title">${isToday?'Today, ':''}${fmtDateLabel(date)}</h1>
        <p class="page-sub" style="margin-bottom:0;">${esc(state.config.stationName||'')}</p>
      </div>
      <div class="row" style="gap:6px;">
        <button class="btn ghost sm" id="dashPrev" title="Previous day">${icon('chevL')}</button>
        <input type="date" id="dashDate" value="${date}" max="${todayStr()}" style="width:150px;">
        <button class="btn ghost sm" id="dashNext" ${isToday?'disabled':''} title="Next day">${icon('chevR')}</button>
        ${isToday?'':`<button class="btn ghost sm" id="dashToday">Today</button>`}
      </div>
    </div>

    <div class="grid grid-kpi" style="margin-top:16px;">
      <div class="card kpi"><div class="label">Sales ${esc(when)}</div><div class="value">${loading?'…':money(dayAmount)}</div><div class="foot">${loading?'loading':liters(dayLiters)+' dispensed'}</div></div>
      <div class="card kpi"><div class="label">Duties logged</div><div class="value">${loading?'…':duties.length}</div><div class="foot">${loading?'loading':(duties.length? duties.map(d=>esc(d.staffName)).join(', ') : 'none yet')}</div></div>
      <div class="card kpi"><div class="label">Active nozzles</div><div class="value">${state.nozzles.filter(n=>n.active!==false).length}</div><div class="foot">across ${state.tanks.filter(t=>t.active!==false).length} tanks</div></div>
      <div class="card kpi"><div class="label">Staff on roll</div><div class="value">${state.staff.filter(s=>s.active!==false).length}</div><div class="foot">active</div></div>
    </div>

    <div class="section-head"><h2>Tank stock</h2><span class="hint">live, updates as duties are saved</span></div>
    <div class="grid grid-2" id="dashTanks"></div>

    <div class="section-head"><h2>Quick actions</h2></div>
    <div class="row">
      <button class="btn primary" id="qaShift">${icon('pump')} Log a duty${isToday?'':' for '+esc(fmtDateLabel(date))}</button>
      <button class="btn" id="qaExpense">${icon('receipt')} Log a payment / expense</button>
      <button class="btn" id="qaStock">${icon('truck')} Record fuel purchase</button>
    </div>
  `;
  renderTankCards($('#dashTanks'), {compact:true});
  const go = (d)=>{ if (d > todayStr()) return; state.dashDate = d; loadDashDate(d); };
  $('#dashDate').onchange = (e)=>go(e.target.value);
  $('#dashPrev').onclick = ()=>go(addDays(date,-1));
  $('#dashNext').onclick = ()=>go(addDays(date,1));
  if ($('#dashToday')) $('#dashToday').onclick = ()=>go(todayStr());
  // Opening Duty Entry from a past day lands on that day's list, which is what you want next.
  $('#qaShift').onclick = ()=>{ dutyListDate = date; dutyForm = null; state.view='shift'; renderAll(); };
  $('#qaExpense').onclick = ()=>{ state.view='expenses'; renderAll(); };
  $('#qaStock').onclick = ()=>{ state.view='purchase'; renderAll(); };
}
// Fetches a past day's log, then redraws — today's is already kept live by its own listener.
async function loadDashDate(date){
  renderCurrentView();
  if (date !== todayStr() && state.dailyLogsCache[date] === undefined){
    await getDailyLog(date);
    if (state.view === 'dashboard' && state.dashDate === date) renderCurrentView();
  }
}

function tankLevelStatus(pct){
  if (pct<=15) return {cls:'critical', label:'Low'};
  if (pct<=35) return {cls:'warning', label:'Refill soon'};
  return {cls:'good', label:'OK'};
}

function renderTankCards(el, opts){
  opts = opts||{};
  const tanks = byName(state.tanks.filter(t=>t.active!==false));
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
// Total of the denomination count, and whether a count was entered at all — an all-blank count
// means nobody counted, which is different from counting zero.
function countedCash(cashCount){
  return DENOMS.reduce((s,d)=>s + d*num((cashCount||{})[d]), 0);
}
function countedEntered(cashCount){
  return DENOMS.some(d=>String((cashCount||{})[d]??'').trim()!=='' && num((cashCount||{})[d])!==0);
}
// What a saved duty did with its cash. Duties saved before counted cash was posted carry no
// cashPosted/variance, but they do carry the denomination count — so the figures are derived from
// that, and reports show the shortage without every duty having to be opened and saved again.
// `postedHistorically` is what actually reached the ledger at the time, which is what a reversal
// must undo.
// A bowser is a mobile tank: its driver dispenses fuel and bills it to credit customers, holding no
// cash. Whatever the fuel dispensed is worth but was never billed is a fuel shortage, so it belongs
// in the P&L rather than sitting in Cash in hand as money nobody has.
function dutyIsBowser(duty){
  const entries = Object.values((duty && duty.nozzles) || {});
  if (!entries.length) return false;
  return entries.every(n=>{
    const t = n.tankId && state.tanks.find(x=>x.id===n.tankId);
    // A tank named "Bowser" is treated as one even before the box is ticked, so stations that
    // already run one do not have to set anything up for their figures to come out right.
    return t && (t.isBowser || /bowser/i.test(t.name||''));
  });
}
function dutyCashInfo(duty){
  const pay = (duty && duty.pay) || {};
  const expected = num(pay.cash);
  const hasCount = countedEntered(duty && duty.cashCount);
  const counted = hasCount ? countedCash(duty.cashCount) : null;
  const bowser = dutyIsBowser(duty);
  // On a bowser duty nothing is expected in the till unless cash was actually counted, so the whole
  // residual is the shortage. Elsewhere an uncounted duty posts what it should have taken.
  // A bowser driver with no count in front of them holds nothing, whatever an earlier save recorded
  // — so the stored figures are ignored in that case rather than leaving the gap unaccounted for.
  const bowserNoCash = bowser && !hasCount;
  const posted = bowserNoCash ? 0 : (pay.cashPosted!=null ? num(pay.cashPosted) : (hasCount ? counted : expected));
  const variance = bowserNoCash ? -expected : (pay.variance!=null ? num(pay.variance) : (posted - expected));
  return {expected, counted, hasCount, bowser, posted, variance,
          postedHistorically: pay.cashPosted!=null ? num(pay.cashPosted) : expected};
}
let dutyForm = null;      // null = list view; object = add/edit form
let dutyListDate = todayStr();

function newDutyForm(date){
  return { date, dutyId:null, staffId:'', startTime:'', endTime:'', nozzleIds:[], rows:{}, pos:0, upi:0, hpCard:0, bankAccountId:'', creditSales:[], expenses:[], oils:[], cashCount:{}, _amount:0, _liters:0 };
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
        <span><button class="btn ghost sm" data-edit="${id}">${icon('edit')}</button> <button class="btn ghost sm" data-del="${id}" title="Delete duty">${icon('trash')}</button></span>
      </div>
      <div class="row" style="justify-content:space-between;margin-top:10px;">
        <span class="mono" style="font-weight:600;">${money(d.dutyAmount)}${d.oilAmount?` <span class="hint" style="font-weight:400;color:var(--text-faint);font-size:11.5px;">incl. ${money(d.oilAmount)} oils</span>`:''}</span>
        <span class="hint" style="color:var(--text-muted);font-size:12.5px;">${liters(d.dutyLiters)}</span>
      </div>
    </div>`).join('')}</div>`;
  $$('[data-edit]', el).forEach(b=>b.onclick=()=>editDuty(dutyListDate, b.dataset.edit));
  $$('[data-del]', el).forEach(b=>b.onclick=()=>deleteDuty(dutyListDate, b.dataset.del));
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
    oils:(d.oils||[]).map(o=>Object.assign({}, o, {savedQty:num(o.qty)})),
    cashCount: Object.assign({}, d.cashCount||{}), _amount:(d.fuelAmount!=null?d.fuelAmount:d.dutyAmount)||0, _liters:d.dutyLiters||0,
  };
  renderCurrentView();
}

function renderDutyForm(mount){
  const activeNozzles = byName(state.nozzles.filter(n=>n.active!==false));
  mount.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:10px;">
      <h1 class="page-title" style="margin-bottom:0;">${dutyForm.dutyId?'Edit duty':'New duty'} — ${fmtDateLabel(dutyForm.date)}</h1>
      <span>${dutyForm.dutyId?`<button class="btn danger sm" id="dutyDelete">${icon('trash')} Delete duty</button> `:''}<button class="btn ghost sm" id="dutyBack">${icon('chevL')} Back to list</button></span>
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
      <div class="section-head" style="margin:0 0 8px;"><h2 style="font-size:13.5px;">Oil / lubricant sales</h2><button class="btn ghost sm" id="dfAddOil">${icon('plus')} Add oil sale</button></div>
      <div id="dfOilRows"></div>
    </div>

    <div class="card card-pad" style="margin-top:16px;">
      <h3 style="margin:0 0 12px;font-size:14px;">Closing — payment split</h3>
      <div class="form-grid">
        <div class="field"><label>Fuel sales (₹)</label><input type="text" id="dfFuelTotal" value="₹0" disabled></div>
        <div class="field"><label>Oil sales (₹)</label><input type="text" id="dfOilTotal" value="₹0" disabled></div>
        <div class="field"><label>POS / Card (₹)</label><input type="number" step="0.01" id="dfPos" value="${dutyForm.pos||0}"></div>
        <div class="field"><label>UPI (₹)</label><input type="number" step="0.01" id="dfUpi" value="${dutyForm.upi||0}"></div>
        <div class="field"><label>HP Card (₹)</label><input type="number" step="0.01" id="dfHp" value="${dutyForm.hpCard||0}">
          <div class="hint" style="font-size:11px;color:var(--text-faint);margin-top:3px;">${hpCardSupplier() ? 'reduces '+esc(hpCardSupplier().name)+"'s dues" : 'tick a supplier in Setup to net this off their dues'}</div></div>
        <div class="field"><label>Credit (₹)</label><input type="text" id="dfCreditTotal" value="₹0" disabled></div>
        <div class="field"><label>Payments (₹)</label><input type="text" id="dfExpenseTotal" value="₹0" disabled></div>
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

      <div class="section-head" style="margin:20px 0 8px;"><h2 style="font-size:13.5px;">Payments from till</h2><button class="btn ghost sm" id="dfAddExpense">${icon('plus')} Add payment</button></div>
      <div id="dfExpenseRows"></div>

      <div class="section-head" style="margin:20px 0 8px;"><h2 style="font-size:13.5px;">Cash denomination count</h2></div>
      <div class="denom-grid" id="dfDenoms"></div>
      <div class="row" style="justify-content:space-between;margin-top:10px;">
        <span class="hint">Counted cash</span><span class="mono" id="dfCounted">₹0</span>
      </div>
      <div class="row" style="justify-content:space-between;margin-top:4px;" id="dfVarianceRow"></div>
    </div>

    <div class="card card-pad row" style="justify-content:space-between;margin-top:16px;">
      <div class="stack"><span class="hint">Duty total (fuel + oils)</span><span class="mono" style="font-size:19px;font-weight:600" id="dfTotalAmt">₹0</span></div>
      <div class="stack" style="align-items:flex-end;"><span class="hint">Sale liters</span><span class="mono" id="dfTotalLtr">0 L</span></div>
      <button class="btn primary" id="dfSave" ${state.dbReady?'':'disabled'}>${icon('pump')} Save duty</button>
    </div>
    <div id="dfMsg" style="margin-top:10px;font-size:13px;"></div>
  `;

  $('#dutyBack').onclick = ()=>{ dutyForm=null; renderCurrentView(); };
  if ($('#dutyDelete')) $('#dutyDelete').onclick = ()=>deleteDuty(dutyForm.date, dutyForm.dutyId);
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
  $('#dfAddCredit').onclick = ()=>{ dutyForm.creditSales.push({id:uid(), creditorId:'', creditorName:'', product:'', rate:0, amount:0, liters:0, indentNo:'', vehicleNo:''}); renderCreditRows(); };
  $('#dfAddExpense').onclick = ()=>{ dutyForm.expenses.push({id:uid(), account:'', category:'', description:'', amount:0}); renderDutyExpenseRows(); };
  $('#dfAddOil').onclick = ()=>{ dutyForm.oils.push({id:uid(), productId:'', name:'', qty:0, rate:0, amount:0, savedQty:0}); renderOilRows(); };
  $('#dfSave').onclick = saveDutyEntry;

  renderDutyRows();
  renderCreditRows();
  renderDutyExpenseRows();
  renderOilRows();
  renderDenomGrid();
}

// Oil / lubricant sales are sold over the counter by the same staff member, so they're part of the
// duty total the cash reconciliation has to account for — but they're not fuel, so they stay out of
// liters, tank stock and the per-product fuel figures.
function renderOilRows(){
  const el = $('#dfOilRows'); if(!el) return;
  dutyForm.oils = dutyForm.oils || [];
  const products = state.oilProducts.filter(p=>p.active!==false);
  if (!dutyForm.oils.length){
    el.innerHTML = products.length
      ? `<div class="hint" style="color:var(--text-faint);font-size:12.5px;">No oil sales added.</div>`
      : `<div class="hint" style="color:var(--text-faint);font-size:12.5px;">No oil products set up yet — add them under <strong>Purchase → Oil &amp; lubricants</strong> to sell them here.</div>`;
    recomputeDutyTotals(); return;
  }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Rate (₹)</th><th class="num">Amount (₹)</th><th>Stock</th><th></th></tr></thead><tbody id="dfOilTbody"></tbody></table></div>
    <div class="hint" style="color:var(--text-faint);font-size:12px;margin-top:6px;">Selling rate fills in from the product; change it here if you sold at a different price. Saving the duty reduces that product's stock by the quantity sold.</div>`;
  const tbody = $('#dfOilTbody');
  dutyForm.oils.forEach(o=>{
    const tr = document.createElement('tr'); tr.dataset.id = o.id;
    tr.innerHTML = `<td><select class="oSel" style="width:190px;"><option value="">Select product…</option>${products.map(p=>`<option value="${p.id}" ${p.id===o.productId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></td>
      <td class="num"><input type="number" step="0.01" class="oQty" value="${o.qty||''}" placeholder="0" style="width:95px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="oRate" value="${o.rate||''}" placeholder="0.00" style="width:110px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="oAmt" value="${o.amount||0}" style="width:120px;text-align:right;"></td>
      <td class="oStock hint" style="font-size:11.5px;color:var(--text-faint);white-space:nowrap;"></td>
      <td><button class="btn ghost sm oRemove">${icon('trash')}</button></td>`;
    tbody.appendChild(tr);
    const sel = tr.querySelector('.oSel'), qtyEl = tr.querySelector('.oQty'), rateEl = tr.querySelector('.oRate'), amtEl = tr.querySelector('.oAmt'), stockEl = tr.querySelector('.oStock');
    // Stock left after this sale, counting what this duty already had saved for the product, so an
    // edit doesn't read as if the earlier quantity were being sold twice.
    const showStock = ()=>{
      const p = state.oilProducts.find(x=>x.id===o.productId);
      if (!p){ stockEl.textContent = ''; return; }
      const already = num(o.savedQty);
      const left = num(p.stockQty) + already - num(o.qty);
      stockEl.innerHTML = `${numFmt(left)} ${esc(p.unit||'')} left` + (left<0 ? ` <span class="pill critical">short</span>` : '');
    };
    const sync = (fromQtyOrRate)=>{
      o.productId = sel.value;
      o.name = oilProductName(sel.value, o.name);
      o.qty = num(qtyEl.value);
      o.rate = num(rateEl.value);
      if (fromQtyOrRate) { o.amount = o.qty * o.rate; amtEl.value = o.amount ? Math.round(o.amount*100)/100 : 0; }
      else o.amount = num(amtEl.value);
      showStock();
      recomputeDutyTotals();
    };
    sel.addEventListener('change', ()=>{
      const p = state.oilProducts.find(x=>x.id===sel.value);
      if (p && num(p.saleRate)) rateEl.value = p.saleRate;
      sync(true);
    });
    qtyEl.addEventListener('input', ()=>sync(true));
    rateEl.addEventListener('input', ()=>sync(true));
    amtEl.addEventListener('input', ()=>sync(false));
    tr.querySelector('.oRemove').onclick = ()=>{ dutyForm.oils = dutyForm.oils.filter(x=>x.id!==o.id); renderOilRows(); };
    showStock();
  });
  recomputeDutyTotals();
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

// The reading a nozzle should open at on `date`: the closing of the most recent duty that used it
// on or before that day, so entering 23 Sept picks up 22 Sept's close — and a second duty on the
// same day picks up the first one's. Falls back to the nozzle's stored last reading. Scans back a
// few months of daily logs, which are cached.
async function lastClosingBefore(nozzleId, date, excludeDutyId){
  let best = null;
  let m = monthIdOf(date);
  for (let i=0; i<4 && !best; i++){
    const docs = (await getMonthDailyLogs(m)).filter(doc=>doc.date && doc.date <= date)
      .sort((a,b)=>b.date.localeCompare(a.date));
    for (const doc of docs){
      // Several duties can share a day, and the order they were typed in says nothing about the
      // order they ran — a shift entered later can be an earlier one on the meter. A meter only
      // counts forward, so the last reading of the day is the HIGHEST closing on it.
      const closings = Object.entries(doc.duties||{})
        .filter(([id,d])=> id!==excludeDutyId && d.nozzles && d.nozzles[nozzleId] && d.nozzles[nozzleId].closing!=null)
        .map(([,d])=>num(d.nozzles[nozzleId].closing));
      if (closings.length){ best = {value:Math.max(...closings), date:doc.date}; break; }
    }
    m = shiftMonth(m, -1);
  }
  return best;
}
async function renderDutyRows(){
  const el = $('#dfRows'); if(!el) return;
  // Reading rows follow the same pump order as the chips above, whatever order they were ticked in.
  const ids = dutyForm.nozzleIds.slice().sort((a,b)=>{
    const na = state.nozzles.find(x=>x.id===a), nb = state.nozzles.find(x=>x.id===b);
    return naturalCompare(na&&na.name, nb&&nb.name);
  });
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
      const prior = await lastClosingBefore(nid, dutyForm.date, dutyForm.dutyId);
      dutyForm.rows[nid] = { opening: prior ? prior.value : num(n.lastClosing), openingFrom: prior ? prior.date : null,
        closing:'', testLiters:0, tankId:n.tankId, product:productKey, rate, transferOn:false, transferLiters:0, transferToTankId:'' };
    }
    const row = dutyForm.rows[nid];
    if (row.transferOn===undefined) row.transferOn = !!row.transferToTankId;
    const xferTanks = state.tanks.filter(t=>t.active!==false && t.product===row.product && t.id!==row.tankId);
    const tr = document.createElement('tr');
    tr.dataset.nozzle = nid;
    tr.innerHTML = `<td><strong>${esc(n.name)}</strong>${tank?`<div class="hint" style="font-size:11.5px;color:var(--text-faint)">${esc(tank.name)}</div>`:''}</td>
      <td class="num"><input type="number" step="0.01" class="rateIn" value="${row.rate??''}" placeholder="0.00" title="Rate for this nozzle on this duty — change it to override today's rate" style="width:115px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="opening" value="${row.opening??0}" style="width:140px;text-align:right;">${row.openingFrom?`<div class="hint" style="font-size:10.5px;color:var(--text-faint);text-align:right;">from ${esc(fmtDateLabel(row.openingFrom))}</div>`:''}</td>
      <td class="num"><input type="number" step="0.01" class="closing" value="${row.closing??''}" placeholder="0.00" style="width:140px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="testL" value="${row.testLiters||0}" style="width:95px;text-align:right;"></td>
      <td>
        <label class="toggle"><input type="checkbox" class="xferOn" ${row.transferOn?'checked':''}> Stock transfer</label>
        <div class="xferFields" style="display:${row.transferOn?'flex':'none'};flex-direction:column;gap:4px;margin-top:4px;">
          <input type="number" step="0.01" class="xferL" placeholder="Liters" value="${row.transferLiters||''}" style="width:110px;text-align:right;">
          <select class="xferTank" style="width:150px;">
            <option value="">To tank…</option>
            ${xferTanks.map(t=>`<option value="${t.id}" ${t.id===row.transferToTankId?'selected':''}>${esc(t.name)}</option>`).join('')}
          </select>
          ${!xferTanks.length?`<span class="hint" style="font-size:11px;color:var(--text-faint);">No other tank set up for this product.</span>`:''}
        </div>
      </td>
      <td class="num saleCell">—</td><td class="num amtCell">—</td>`;
    tbody.appendChild(tr);
    const upd = ()=>updateDutyRowCalc(nid, tr);
    tr.querySelector('.rateIn').addEventListener('input', upd);
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
  // The rate defaults to the one set for the date, but can be typed over for this duty.
  const rateEl = tr.querySelector('.rateIn');
  const rateRaw = rateEl ? rateEl.value : '';
  row.rate = rateRaw==='' ? null : num(rateRaw);
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
  const oilAmt = (dutyForm.oils||[]).reduce((s,o)=>s+num(o.amount),0);
  $('#dfTotalAmt') && ($('#dfTotalAmt').textContent = money(amt + oilAmt));
  $('#dfFuelTotal') && ($('#dfFuelTotal').value = money(amt));
  $('#dfOilTotal') && ($('#dfOilTotal').value = money(oilAmt));
  $('#dfTotalLtr') && ($('#dfTotalLtr').textContent = liters(ltr));
  recomputePayments();
}

function renderCreditRows(){
  const el = $('#dfCreditRows'); if(!el) return;
  if (!dutyForm.creditSales.length){ el.innerHTML = `<div class="hint" style="color:var(--text-faint);font-size:12.5px;">No credit sales added.</div>`; recomputePayments(); return; }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Creditor</th><th>Product</th><th>Indent No.</th><th>Vehicle No.</th><th class="num">Liters</th><th class="num">Rate</th><th class="num">Amount</th><th></th></tr></thead><tbody id="dfCreditTbody"></tbody></table></div>
    <div class="hint" style="color:var(--text-faint);font-size:12px;margin-top:6px;">Pick the product and the rate fills in from the day's rates — liters × rate gives the amount, and typing an amount directly overrides it. Liters also top up a Bowser's tracked stock when the creditor is one.</div>`;
  const tbody = $('#dfCreditTbody');
  dutyForm.creditSales.forEach(c=>{
    const tr = document.createElement('tr'); tr.dataset.id = c.id;
    tr.innerHTML = `<td><select class="cSel" style="max-width:170px;">${state.creditors.filter(x=>x.active!==false).map(x=>`<option value="${x.id}" ${x.id===c.creditorId?'selected':''}>${esc(x.name)}${x.isBowser?' (Bowser)':''}</option>`).join('')||'<option value="">Add creditors in Setup</option>'}</select></td>
      <td><select class="cProd" style="width:140px;"><option value="">—</option>${PRODUCT_KEYS.map(k=>`<option value="${k}" ${k===c.product?'selected':''}>${esc(state.config.products[k]||k)}</option>`).join('')}</select></td>
      <td><input type="text" class="cIndent" value="${esc(c.indentNo||'')}" style="width:90px;"></td>
      <td><input type="text" class="cVeh" value="${esc(c.vehicleNo||'')}" style="width:100px;"></td>
      <td class="num"><input type="number" step="0.01" class="cLtr" value="${c.liters||''}" placeholder="0" style="width:100px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="cRate" value="${c.rate||''}" placeholder="0.00" style="width:110px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="cAmt" value="${c.amount||0}" style="width:115px;text-align:right;"></td>
      <td><button class="btn ghost sm cRemove">${icon('trash')}</button></td>`;
    tbody.appendChild(tr);
    const sel = tr.querySelector('.cSel'), prodEl = tr.querySelector('.cProd');
    const ltrEl = tr.querySelector('.cLtr'), rateEl = tr.querySelector('.cRate'), amtEl = tr.querySelector('.cAmt');
    // `calc` is true when the edit was to liters or rate, so the amount is recomputed from them;
    // editing the amount itself leaves it alone.
    const sync = (calc)=>{
      c.creditorId = sel.value;
      c.creditorName = (state.creditors.find(x=>x.id===sel.value)||{}).name||'';
      c.product = prodEl.value;
      c.indentNo = tr.querySelector('.cIndent').value;
      c.vehicleNo = tr.querySelector('.cVeh').value;
      c.liters = num(ltrEl.value);
      c.rate = num(rateEl.value);
      if (calc && c.rate){ c.amount = Math.round(c.liters*c.rate*100)/100; amtEl.value = c.amount; }
      else c.amount = num(amtEl.value);
      recomputePayments();
    };
    prodEl.addEventListener('change', async ()=>{
      // Fill the rate from the day's rate for that product unless one was typed already.
      if (prodEl.value && !num(rateEl.value)){
        const r = await getRateForDate(dutyForm.date, prodEl.value);
        if (r!=null) rateEl.value = r;
      }
      sync(true);
    });
    sel.addEventListener('change', ()=>sync(false));
    tr.querySelector('.cIndent').addEventListener('input', ()=>sync(false));
    tr.querySelector('.cVeh').addEventListener('input', ()=>sync(false));
    ltrEl.addEventListener('input', ()=>sync(true));
    rateEl.addEventListener('input', ()=>sync(true));
    amtEl.addEventListener('input', ()=>sync(false));
    tr.querySelector('.cRemove').onclick = ()=>{ dutyForm.creditSales = dutyForm.creditSales.filter(x=>x.id!==c.id); renderCreditRows(); };
    sync(false);
  });
  recomputePayments();
}

// Cash paid out during the duty. The account is picked from the full ledger list, so a till payment
// can be a running cost, a staff advance, a supplier settlement — whatever it really was.
function dutyPayAccountOptions(sel){
  const groups = {};
  state.ledgers.filter(l=>l.active!==false && !l.cashInHand).forEach(l=>{
    const g = (LEDGER_GROUPS[l.group]||{}).label || 'Other';
    (groups[g] = groups[g]||[]).push({key:'led:'+l.id, label:l.name});
  });
  state.creditors.filter(c=>c.active!==false).forEach(c=>{ (groups['Creditors'] = groups['Creditors']||[]).push({key:'cred:'+c.id, label:c.name}); });
  state.suppliers.filter(s=>s.active!==false).forEach(s=>{ (groups['Suppliers'] = groups['Suppliers']||[]).push({key:'sup:'+s.id, label:s.name}); });
  const opts = Object.entries(groups).map(([g,list])=>
    `<optgroup label="${esc(g)}">${list.map(o=>`<option value="${esc(o.key)}" ${o.key===sel?'selected':''}>${esc(o.label)}</option>`).join('')}</optgroup>`).join('');
  // Categories remain for a quick entry when no ledger fits, and for duties saved before ledgers existed.
  const cats = `<optgroup label="Categories">${EXPENSE_CATEGORIES.map(c=>`<option value="cat:${esc(c)}" ${('cat:'+c)===sel?'selected':''}>${esc(c)}</option>`).join('')}</optgroup>`;
  return `<option value="">Select account…</option>` + opts + cats;
}
// The plain account name, without the "(Expense)" style suffix the posting picker adds.
function dutyPayLabel(key, fallback){
  if (!key) return fallback||'';
  if (key.startsWith('cat:')) return key.slice(4);
  const [kind, id] = key.split(':');
  const rec = kind==='led' ? state.ledgers.find(x=>x.id===id)
            : kind==='cred' ? state.creditors.find(x=>x.id===id)
            : kind==='sup' ? state.suppliers.find(x=>x.id===id) : null;
  return (rec && rec.name) || targetLabel(key) || fallback || key;
}
// A ledger can name what it is paid *for*, and picking it then asks which one. A staff link is more
// than a label: the amount is booked against that person's salary for the month as an advance.
// Ledgers created before this existed are matched on their name, so "Salary" or "Staff advance"
// work straight away.
const SUBJECT_KINDS = {
  staff:    {label:'For (staff member)', list:()=>state.staff,     placeholder:'Select staff…',    empty:'Add staff under Setup'},
  creditor: {label:'For (creditor)',     list:()=>state.creditors, placeholder:'Select creditor…', empty:'Add a creditor first'},
  supplier: {label:'For (supplier)',     list:()=>state.suppliers, placeholder:'Select supplier…', empty:'Add a supplier first'},
};
function ledgerSubjectType(key){
  if (!key || !key.startsWith('led:')) return '';
  const l = state.ledgers.find(x=>x.id===key.slice(4));
  if (!l) return '';
  if (l.linkTo) return SUBJECT_KINDS[l.linkTo] ? l.linkTo : '';
  return /salary|advance|wage/i.test(l.name||'') ? 'staff' : '';
}
function subjectRecords(type){
  const k = SUBJECT_KINDS[type];
  return k ? k.list().filter(x=>x.active!==false).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')) : [];
}
function subjectNameOf(type, id){ return ((subjectRecords(type).find(x=>x.id===id))||{}).name || ''; }
function subjectOptionsHtml(type, sel){
  const k = SUBJECT_KINDS[type]; if (!k) return '';
  return `<option value="">${esc(k.placeholder)}</option>` +
    subjectRecords(type).map(x=>`<option value="${x.id}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('');
}
function subjectPickList(type){
  return [{value:'', label:'— none —'}].concat(subjectRecords(type).map(x=>({value:x.id, label:x.name})));
}
function renderDutyExpenseRows(){
  const el = $('#dfExpenseRows'); if(!el) return;
  if (!dutyForm.expenses.length){ el.innerHTML = `<div class="hint" style="color:var(--text-faint);font-size:12.5px;">No payments added.</div>`; recomputePayments(); return; }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Account / category</th><th>For</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody id="dfExpenseTbody"></tbody></table></div>
    <div class="hint" style="color:var(--text-faint);font-size:12px;margin-top:6px;">Cash paid out during this duty (e.g. small repairs, tea, a staff advance) — it is deducted from the cash you should have in hand and posted to the account you pick. Pick a salary or advance account and the amount is booked to that staff member's salary sheet for the month. Manage the list under Setup → Ledgers.</div>`;
  const tbody = $('#dfExpenseTbody');
  dutyForm.expenses.forEach(e=>{
    const tr = document.createElement('tr'); tr.dataset.id = e.id;
    // Older rows stored only a category name; show them selected on the category option.
    const sel = e.account || (e.category ? 'cat:'+e.category : '');
    tr.innerHTML = `<td><select class="eCat" style="max-width:210px;">${dutyPayAccountOptions(sel)}</select></td>
      <td class="eForCell"></td>
      <td><input type="text" class="eDesc" value="${esc(e.description||'')}" style="width:140px;"></td>
      <td class="num"><input type="number" step="0.01" class="eAmt" value="${e.amount||0}" style="width:115px;text-align:right;"></td>
      <td><button class="btn ghost sm eRemove">${icon('trash')}</button></td>`;
    tbody.appendChild(tr);
    const forCell = tr.querySelector('.eForCell');
    const renderFor = ()=>{
      const type = ledgerSubjectType(e.account);
      if (type!=='staff'){ e.subjectType=''; e.subjectId=''; e.subjectName=''; forCell.innerHTML = `<span class="hint" style="color:var(--text-faint);font-size:11.5px;">—</span>`; return; }
      e.subjectType = 'staff';
      const staff = state.staff.filter(s=>s.active!==false);
      forCell.innerHTML = staff.length
        ? `<select class="eWho" style="width:150px;"><option value="">Select staff…</option>${staff.map(s=>`<option value="${s.id}" ${s.id===e.subjectId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`
        : `<span class="hint" style="color:var(--warning);font-size:11.5px;">Add staff in Setup</span>`;
      const who = forCell.querySelector('.eWho');
      if (who) who.addEventListener('change', ()=>{
        e.subjectId = who.value;
        e.subjectName = (state.staff.find(s=>s.id===who.value)||{}).name || '';
        recomputePayments();
      });
    };
    const sync = ()=>{
      const key = tr.querySelector('.eCat').value;
      const changedAccount = e.account !== key;
      e.account = key;
      e.category = dutyPayLabel(key, e.category);
      e.description = tr.querySelector('.eDesc').value;
      e.amount = num(tr.querySelector('.eAmt').value);
      if (changedAccount) renderFor();
      recomputePayments();
    };
    renderFor();
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

// A Bowser is billed by hand, so the amount entered can differ from what the fuel it took is worth
// (liters x rate). The creditor is still billed what was entered, but the till is only expected to
// account for the fuel's value — the difference is a gain or a loss, not missing cash, so it is
// carried to the P&L. Lines without a rate (or for ordinary creditors) are unaffected.
function creditSplit(creditSales){
  let billed = 0, valued = 0, bowserDiff = 0;
  (creditSales||[]).forEach(c=>{
    const amount = num(c.amount);
    billed += amount;
    const creditor = state.creditors.find(x=>x.id===c.creditorId);
    const isBowser = creditor && creditor.isBowser;
    const worth = num(c.liters) * num(c.rate);
    if (isBowser && num(c.liters) && num(c.rate)){
      valued += worth;
      bowserDiff += amount - worth;
    } else {
      valued += amount;
    }
  });
  return {billed, valued, bowserDiff};
}
function recomputePayments(){
  if (!dutyForm) return;
  const posEl=$('#dfPos'), upiEl=$('#dfUpi'), hpEl=$('#dfHp'), bankEl=$('#dfBank');
  const pos = posEl?num(posEl.value):dutyForm.pos||0;
  const upi = upiEl?num(upiEl.value):dutyForm.upi||0;
  const hp = hpEl?num(hpEl.value):dutyForm.hpCard||0;
  dutyForm.pos=pos; dutyForm.upi=upi; dutyForm.hpCard=hp;
  if (bankEl) dutyForm.bankAccountId = bankEl.value;
  const cs = creditSplit(dutyForm.creditSales);
  const expenses = dutyForm.expenses.reduce((s,e)=>s+num(e.amount),0);
  const oils = (dutyForm.oils||[]).reduce((s,o)=>s+num(o.amount),0);
  const total = (dutyForm._amount||0) + oils;
  // The till answers for the fuel's value, so a Bowser billed off-rate does not move expected cash.
  const cash = total - pos - upi - hp - cs.valued - expenses;
  $('#dfCreditTotal') && ($('#dfCreditTotal').value = money(cs.billed) + (Math.abs(cs.bowserDiff)>=0.005 ? ` (${cs.bowserDiff>0?'+':'−'}${money(Math.abs(cs.bowserDiff))} vs rate → P&L)` : ''));
  $('#dfExpenseTotal') && ($('#dfExpenseTotal').value = money(expenses));
  $('#dfCash') && ($('#dfCash').value = money(cash));
  let counted = 0;
  DENOMS.forEach(d=>{ counted += d*num(dutyForm.cashCount[d]); });
  $('#dfCounted') && ($('#dfCounted').textContent = money(counted));
  const varEl = $('#dfVarianceRow');
  if (varEl){
    const diff = counted - cash;
    const cls = Math.abs(diff)<0.5 ? 'good' : (Math.abs(diff)<=50?'warning':'critical');
    const counted2 = countedEntered(dutyForm.cashCount);
    varEl.innerHTML = `<span class="hint">Variance vs expected cash${counted2 ? ` <span style="color:var(--text-faint);font-size:11.5px;">— ${money(counted)} goes to Cash in hand; the ${diff<0?'shortfall':'excess'} is carried to the P&amp;L</span>` : ''}</span><span class="pill ${cls}">${diff>=0?'+':''}${money(diff)}</span>`;
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
      creditSales: dutyForm.creditSales.filter(c=>num(c.amount)>0 || num(c.liters)>0).map(c=>({id:c.id, creditorId:c.creditorId, creditorName:c.creditorName, product:c.product||'', rate:num(c.rate), liters:num(c.liters), amount:num(c.amount), indentNo:c.indentNo||'', vehicleNo:c.vehicleNo||''})),
      expenses: dutyForm.expenses.filter(e=>num(e.amount)>0).map(e=>({id:e.id, account:e.account||'', category:e.category||'', description:e.description||'', amount:num(e.amount), subjectType:e.subjectType||'', subjectId:e.subjectId||'', subjectName:e.subjectName||''})),
      oils: (dutyForm.oils||[]).filter(o=>num(o.amount)>0 || num(o.qty)>0)
        .map(o=>({id:o.id, productId:o.productId||'', name:o.name||'', qty:num(o.qty), rate:num(o.rate), amount:num(o.amount)})),
      cashCount: dutyForm.cashCount,
    });
    dutyForm = null;
    renderCurrentView();
  }catch(e){
    msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||e.code||'unknown error')}</span>`;
    const b=$('#dfSave'); if(b) b.disabled=false;
  }
}

async function saveDutyToDb({date, dutyId, staffId, staffName, startTime, endTime, nozzleIds, entries, pay, creditSales, expenses, oils, cashCount}){
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
  // Creditors are billed what was entered (`billed`); the till only answers for the fuel's value
  // (`valued`). For a Bowser the two can differ, and that difference is a P&L item.
  const cs = creditSplit(creditSales);
  const credit = cs.billed;
  const expenseTotal = (expenses||[]).reduce((s,e)=>s+num(e.amount),0);
  // dutyAmount is the staff member's full takings (fuel + oils) — what the cash split must reconcile
  // to. fuelAmount is kept separately so reports can still show fuel-only figures.
  const fuelAmount = dutyAmount;
  const oilAmount = (oils||[]).reduce((s,o)=>s+num(o.amount),0);
  dutyAmount = fuelAmount + oilAmount;
  const cash = dutyAmount - (pay.pos||0) - (pay.upi||0) - (pay.hpCard||0) - cs.valued - expenseTotal;
  // What the till should hold is `cash`; what was actually counted is the denomination total. When a
  // count has been entered it is the counted figure that goes into Cash in hand, because that is the
  // money the station really has — the shortfall or excess is carried to the P&L instead.
  const counted = countedCash(cashCount);
  const hasCount = countedEntered(cashCount);
  const cashPosted = hasCount ? counted : cash;
  const variance = hasCount ? counted - cash : 0;
  data.duties[id] = {
    staffId, staffName, startTime, endTime, nozzleIds, nozzles: entries, dutyAmount, fuelAmount, oilAmount, dutyLiters,
    pay: {pos:pay.pos||0, upi:pay.upi||0, hpCard:pay.hpCard||0, bankAccountId:pay.bankAccountId||'', credit, creditValued:cs.valued, bowserDiff:cs.bowserDiff, expenses:expenseTotal,
          cash, counted: hasCount ? counted : null, variance, cashPosted},
    creditSales, expenses: expenses||[], oils: oils||[], cashCount, savedAt: new Date().toISOString(),
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
    // Saving an earlier shift after a later one must not drag the stored reading backwards — only a
    // genuinely later date, or a higher reading on the same day, moves it on.
    const nz = state.nozzles.find(x=>x.id===nid);
    const seenDate = nz ? (nz.lastReadingDate||'') : '';
    const advances = !nz || !seenDate || date > seenDate || (date === seenDate && num(entry.closing) >= num(nz.lastClosing));
    if (!advances) continue;
    await state.db.doc('nozzles/'+nid).update({lastClosing: entry.closing, lastReadingDate: date}).catch(()=>{});
    if (nz){ nz.lastClosing = entry.closing; nz.lastReadingDate = date; }
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

  // A till payment made against a staff member's salary or advance is booked to that month's salary
  // sheet as an advance, so their net pay drops by what they have already been handed. Only the
  // CHANGE since the last save is applied, and the sheet row is created if it isn't there yet.
  const advBy = (arr)=>{ const m={}; (arr||[]).forEach(e=>{ if (e.subjectType==='staff' && e.subjectId) m[e.subjectId] = (m[e.subjectId]||0) + num(e.amount); }); return m; };
  const oldAdv = advBy((prev && prev.expenses) || []), newAdv = advBy(expenses);
  const advIds = new Set([...Object.keys(oldAdv), ...Object.keys(newAdv)]);
  if (advIds.size){
    const salMonth = monthIdOf(date);
    const salData = (await getMonthDoc('salaryMonthly', salMonth)) || {staff:{}};
    salData.staff = salData.staff || {};
    let touched = false;
    for (const sid of advIds){
      const delta = (newAdv[sid]||0) - (oldAdv[sid]||0);
      if (!delta) continue;
      const person = state.staff.find(s=>s.id===sid);
      if (!salData.staff[sid]){
        salData.staff[sid] = {name: person?person.name:'', wageType: person && num(person.hourlyWage)>0 ? 'hourly':'monthly', hoursWorked:null,
                              baseSalary: person ? num(person.monthlySalary) : 0, advance:0, deduction:0, netPaid:0, status:'pending', paidDate:null};
      }
      salData.staff[sid].advance = num(salData.staff[sid].advance) + delta;
      touched = true;
    }
    if (touched){
      recomputeSalaryTotals(salData);
      await setMonthDoc('salaryMonthly', salMonth, salData);
    }
  }

  // Till payments post to the account each line names (ledger, creditor or supplier) — the cash side
  // is already covered, because a duty's cash figure is net of these payments. Only the CHANGE since
  // the last save is applied, so re-saving an edit never double-posts.
  const tillBy = (arr)=>{ const m={}; (arr||[]).forEach(e=>{ if (e.account && !e.account.startsWith('cat:')) m[e.account] = (m[e.account]||0) + num(e.amount); }); return m; };
  const oldTill = tillBy((prev && prev.expenses) || []), newTill = tillBy(expenses);
  for (const key of new Set([...Object.keys(oldTill), ...Object.keys(newTill)])){
    const delta = (newTill[key]||0) - (oldTill[key]||0);
    if (delta) await applyPosting(key, delta, {date, narration:`Till payment — ${staffName}`, journalId:id});
  }

  // Oil sold on this duty comes out of that product's stock — only the CHANGE since this duty's
  // last save, so re-saving an edit never double-deducts, and switching product moves the deduction.
  const oilQtyBy = (arr)=>{ const m={}; (arr||[]).forEach(o=>{ if (o.productId) m[o.productId] = (m[o.productId]||0) + num(o.qty); }); return m; };
  const oldOilQty = oilQtyBy((prev && prev.oils) || []), newOilQty = oilQtyBy(oils);
  for (const pid of new Set([...Object.keys(oldOilQty), ...Object.keys(newOilQty)])){
    const delta = (newOilQty[pid]||0) - (oldOilQty[pid]||0);
    if (delta) await adjustOilStock(pid, -delta);
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

  // The duty's cash takings (after till expenses) go into the Cash in hand ledger — only the CHANGE
  // since this duty's last save, so re-saving an edit never double-counts. Bank deposits of that
  // cash are recorded via Journal (Dr Bank, Cr Cash in hand) or Receipts.
  // Older duties stored no cashPosted; their cash figure was what went in.
  const prevPosted = prevPay.cashPosted!=null ? num(prevPay.cashPosted) : num(prevPay.cash);
  const cashDelta = cashPosted - prevPosted;
  if (cashDelta) await applyPosting('cash', cashDelta, {date, narration:`Duty cash — ${staffName}`, journalId:id});

  // HP Card sales are not paid to the station on the day — the oil company nets them off against
  // what the station owes it. When a supplier is marked as settling HP Card, the amount reduces that
  // supplier's outstanding balance exactly as a payment to them would; otherwise it falls back to a
  // standing receivable account, created on first use.
  const hpDelta = num(pay.hpCard) - num(prevPay.hpCard);
  if (hpDelta) await postHpCard(hpDelta, {date, narration:`HP Card sales — ${staffName}`, journalId:id});

  await logActivity({
    entity:'Duty', entityLabel:`${staffName} · ${fmtDateLabel(date)}`,
    action: dutyId ? 'edit' : 'add',
    summary: `${dutyId?'Edited':'Saved'} duty totalling ${money(dutyAmount)}${startTime||endTime?` (${startTime||'—'}–${endTime||'—'})`:''}`,
  });
}

// Mirrors a duty's "expenses paid from till" lines into that month's expensesMonthly document,
// tagged with source:'duty' + dutyId so re-saving the same duty replaces its own lines instead of
// piling up duplicates. A manually-added expense (no dutyId) is never touched by this.
// Removes a duty and reverses everything its save applied: tank stock (draw + transfers),
// creditor balances / bowser stock, mirrored till expenses, bank settlement, HPCL receivable,
// Cash in hand, and each nozzle's last closing reading (only when this duty was the latest one).
async function deleteDuty(date, dutyId){
  const data = await getDailyLog(date);
  const d = data && data.duties && data.duties[dutyId];
  if (!d) return;
  const ok = await confirmModal({title:`Delete ${d.staffName}'s duty on ${fmtDateLabel(date)}?`, body:`This removes the duty (${money(d.dutyAmount)}) and reverses its effect on tank stock, creditor balances, bank / cash balances and the expenses list. Nozzle opening readings for the next duty will need checking.`, confirmLabel:'Delete duty'});
  if (!ok) return;

  // Tank stock: put back what left the source tanks, take back what transfers added.
  const stockDeltas = {};
  for (const [nid, n] of Object.entries(d.nozzles||{})){
    const draw = n.drawLiters!=null ? n.drawLiters : n.liters;
    if (n.tankId) stockDeltas[n.tankId] = (stockDeltas[n.tankId]||0) + num(draw);
    if (n.transferToTankId && num(n.transferLiters)) stockDeltas[n.transferToTankId] = (stockDeltas[n.transferToTankId]||0) - num(n.transferLiters);
  }
  for (const [tankId, delta] of Object.entries(stockDeltas)){
    if (!delta) continue;
    const tank = state.tanks.find(t=>t.id===tankId);
    const cur = tank ? num(tank.currentStockL) : 0;
    await state.db.doc('tanks/'+tankId).update({currentStockL: cur + delta}).catch(()=>{});
  }
  // Nozzle last closing: if no later duty has moved it on, roll it back to this duty's opening.
  for (const [nid, n] of Object.entries(d.nozzles||{})){
    const nz = state.nozzles.find(x=>x.id===nid);
    if (nz && Math.abs(num(nz.lastClosing) - num(n.closing)) < 0.005){
      await state.db.doc('nozzles/'+nid).update({lastClosing: num(n.opening)}).catch(()=>{});
    }
  }
  // Creditors: money owed and bowser liters.
  const byCreditor = {};
  (d.creditSales||[]).forEach(c=>{ if (!c.creditorId) return; const m = byCreditor[c.creditorId] = byCreditor[c.creditorId]||{amount:0, liters:0}; m.amount += num(c.amount); m.liters += num(c.liters); });
  for (const [cid, m] of Object.entries(byCreditor)){
    const creditor = state.creditors.find(c=>c.id===cid);
    if (!creditor) continue;
    const patch = {};
    if (m.amount) patch.balance = num(creditor.balance) - m.amount;
    if (m.liters && creditor.isBowser) patch.bowserStockL = num(creditor.bowserStockL) - m.liters;
    if (Object.keys(patch).length) await state.db.doc('creditors/'+cid).update(patch).catch(()=>{});
  }
  await syncDutyExpenses(date, dutyId, []);
  for (const o of (d.oils||[])) if (o.productId && num(o.qty)) await adjustOilStock(o.productId, num(o.qty));
  for (const e of (d.expenses||[])) if (e.account && !e.account.startsWith('cat:') && num(e.amount)) await applyPosting(e.account, -num(e.amount), {date, narration:`Deleted duty — ${d.staffName}`, journalId:dutyId});
  // Salary advances booked by this duty come back off the sheet.
  const advBack = {};
  (d.expenses||[]).forEach(e=>{ if (e.subjectType==='staff' && e.subjectId) advBack[e.subjectId] = (advBack[e.subjectId]||0) + num(e.amount); });
  if (Object.keys(advBack).length){
    const salMonth = monthIdOf(date);
    const salData = await getMonthDoc('salaryMonthly', salMonth);
    if (salData && salData.staff){
      Object.entries(advBack).forEach(([sid, amt])=>{ if (salData.staff[sid]) salData.staff[sid].advance = num(salData.staff[sid].advance) - amt; });
      recomputeSalaryTotals(salData);
      await setMonthDoc('salaryMonthly', salMonth, salData);
    }
  }
  const pay = d.pay || {};
  const bankAmt = num(pay.pos) + num(pay.upi);
  if (pay.bankAccountId && bankAmt){
    const acct = state.accounts.find(a=>a.id===pay.bankAccountId);
    if (acct) await state.db.doc('accounts/'+acct.id).update({balance: num(acct.balance) - bankAmt}).catch(()=>{});
  }
  if (num(pay.hpCard)) await postHpCard(-num(pay.hpCard), {date, narration:`Deleted duty — ${d.staffName}`, journalId:dutyId});
  const postedBack = pay.cashPosted!=null ? num(pay.cashPosted) : num(pay.cash);
  if (postedBack) await applyPosting('cash', -postedBack, {date, narration:`Deleted duty — ${d.staffName}`, journalId:dutyId});

  delete data.duties[dutyId];
  let dayAmount=0, dayLiters=0;
  Object.values(data.duties).forEach(x=>{ dayAmount+=x.dutyAmount||0; dayLiters+=x.dutyLiters||0; });
  data.dayAmount = dayAmount; data.dayLiters = dayLiters; data.updatedAt = new Date().toISOString();
  await setDailyLog(date, data);
  await logActivity({entity:'Duty', entityLabel:`${d.staffName} · ${fmtDateLabel(date)}`, action:'delete', summary:`Deleted duty totalling ${money(d.dutyAmount)}`});
  dutyForm = null;
  renderCurrentView();
}

// The supplier HP Card sales are netted off against, if one has been marked for it in Setup.
function hpCardSupplier(){ return state.suppliers.find(s=>s.hpCardSettles && s.active!==false) || null; }
function hpCardTargetKey(){
  const sup = hpCardSupplier();
  if (sup) return 'sup:'+sup.id;
  const acct = state.accounts.find(a=>a.system && a.hpcl);
  return acct ? 'acct:'+acct.id : '';
}
// Applies `delta` of HP Card value: to the designated supplier (reducing what is owed to them) or,
// failing that, to the standing HPCL receivable account.
async function postHpCard(delta, meta){
  if (!delta) return;
  const sup = hpCardSupplier();
  if (sup){ await applyPosting('sup:'+sup.id, delta, meta); return; }
  const hpAcct = state.accounts.find(a=>a.system && a.hpcl);
  if (hpAcct){
    await state.db.doc('accounts/'+hpAcct.id).update({balance: num(hpAcct.balance) + delta}).catch(()=>{});
    hpAcct.balance = num(hpAcct.balance) + delta;
    return;
  }
  const rec = {name:'HPCL — HP Card settlement', kind:'receivable', system:true, hpcl:true,
               bankName:'', accountNo:'', balance:delta, active:true, createdAt:new Date().toISOString()};
  const ref = await state.db.collection('accounts').add(rec);
  state.accounts.push(Object.assign({id:ref.id}, rec));
}

async function syncDutyExpenses(date, dutyId, expenseItems){
  const monthId = monthIdOf(date);
  const list = (expenseItems||[]).filter(e=>num(e.amount)>0);
  const existing = await getMonthDoc('expensesMonthly', monthId);
  if (!list.length && !existing) return;
  const data = existing || {items:[], total:0};
  const kept = (data.items||[]).filter(it=>it.dutyId!==dutyId);
  // A till payment against an expense ledger (or a plain category) is a running cost and counts in
  // the P&L expense line; one against an asset, liability, creditor or supplier is a balance-sheet
  // movement, so it is mirrored as a payment and stays out of the P&L.
  const isExpenseLine = (key)=>{
    if (!key || key.startsWith('cat:')) return true;
    if (!key.startsWith('led:')) return false;
    const l = state.ledgers.find(x=>x.id===key.slice(4));
    return !l || l.group==='expense';
  };
  const mine = list.map(e=>{
    const key = e.account||'';
    const label = dutyPayLabel(key, e.category) || EXPENSE_CATEGORIES[0];
    const who = e.subjectType==='staff' ? (e.subjectName || (state.staff.find(s=>s.id===e.subjectId)||{}).name || '') : '';
    const desc = [who, e.description].filter(Boolean).join(' — ');
    const base = {id:e.id||uid(), date, description:desc, amount:num(e.amount), source:'duty', dutyId,
                  account:key, ledger: key.startsWith('cat:') ? '' : key, mode:'Cash', paidFrom:'',
                  subjectType:e.subjectType||'', subjectId:e.subjectId||'', subjectName:who};
    // An advance handed to a staff member is money owed back until their salary falls due, so it is
    // a payment against that person — never an expense. The month's salary cost reaches the P&L
    // through the salary sheet instead.
    if (who) return Object.assign(base, {kind:'payment', party:who, item:'Staff advance', category:`${label} — ${who}`});
    return isExpenseLine(key)
      ? Object.assign(base, {kind:'expense', category:label})
      : Object.assign(base, {kind:'payment', party:label, item:'Other payment', category:label});
  });
  data.items = kept.concat(mine);
  data.total = data.items.reduce((s,it)=>s+num(it.amount),0);
  await setMonthDoc('expensesMonthly', monthId, data);
}

/* ============================== STOCK ============================== */
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

async function adjustTankStock(tankId, delta){
  if (!tankId || !delta) return;
  const tank = state.tanks.find(t=>t.id===tankId);
  const cur = tank ? num(tank.currentStockL) : 0;
  await state.db.doc('tanks/'+tankId).update({currentStockL: cur + delta});
}

/* ============================== PURCHASE ============================== */
// Fuel purchases (stockReceiptsMonthly). A purchase adds liters to its tank and, when bought on
// credit, adds the amount to that supplier's outstanding balance; paying cash/bank instead reduces
// that balance straight away. Supplier dues are settled later from Payments / Expenses.
function purchasePayOptions(sel){
  return `<option value="credit" ${sel==='credit'?'selected':''}>On credit (supplier due)</option>`
    + `<option value="cash" ${sel==='cash'?'selected':''}>Paid — Cash in hand</option>`
    + state.accounts.filter(a=>a.kind==='bank' && a.active!==false).map(a=>`<option value="acct:${a.id}" ${('acct:'+a.id)===sel?'selected':''}>Paid — ${esc(a.name)}</option>`).join('');
}
function purchasePayLabel(k){ return !k || k==='credit' ? 'On credit' : (k==='cash' ? 'Cash in hand' : ((state.accounts.find(a=>'acct:'+a.id===k)||{}).name || k)); }
function supplierName(id, fallback){ const s = state.suppliers.find(x=>x.id===id); return s ? s.name : (fallback||'—'); }
// sign +1 applies a purchase's money + stock effects, -1 reverses them.
async function applyPurchase(item, sign){
  const amt = num(item.amount) * sign;
  const ltr = num(item.liters) * sign;
  if (ltr) await adjustTankStock(item.tankId, ltr);
  if (!amt) return;
  const meta = {date:item.date, narration:`Fuel purchase — ${supplierName(item.supplierId, item.supplier)}${item.ref?' ('+item.ref+')':''}`, journalId:item.id};
  const payFrom = item.payFrom || 'credit';
  if (payFrom==='credit'){
    if (item.supplierId) await applyPosting('sup:'+item.supplierId, -amt, meta);  // we owe more
  } else {
    await applyPosting(payFrom, -amt, meta);                                       // money out
  }
}

function renderPurchase(mount){
  mount.innerHTML = `
    <h1 class="page-title">Purchase</h1>
    <p class="page-sub">Fuel bought from your suppliers — the tank is topped up and, on credit, the supplier's outstanding balance goes up. Settle dues from Payments / Expenses.</p>
    ${state.suppliers.filter(s=>s.active!==false).length ? '' : `<div class="banner">${icon('truck')}<div>No suppliers yet — add them below, with the balance you already owe them as the opening balance.</div></div>`}

    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="drDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field"><label>Supplier</label><select id="drSupplier"><option value="">Select supplier…</option>${state.suppliers.filter(s=>s.active!==false).map(s=>`<option value="${s.id}">${esc(s.name)} — ${money(s.balance||0)} due</option>`).join('')}</select></div>
        <div class="field"><label>Payment</label><select id="drPay">${purchasePayOptions('credit')}</select></div>
        <div class="field"><label>Invoice / DO ref</label><input type="text" id="drRef" placeholder="e.g. DO-4521"></div>
      </div>
      <div id="drLines" style="margin-top:12px;"></div>
      <div class="form-grid" style="margin-top:12px;">
        <div class="field"><label>Products total</label><input type="text" id="drLinesTotal" value="₹0" disabled></div>
        <div class="field"><label>Invoice total (₹)</label><input type="number" step="0.01" id="drTotal" placeholder="same as products total"></div>
        <div class="field"><button class="btn primary" id="drSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add purchase</button></div>
      </div>
      <div id="drTotalHint" style="font-size:12px;color:var(--text-faint);margin-top:6px;"></div>
      <div id="drMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>

    <div class="section-head"><h2>Purchases</h2><span id="stockMonthLabel"></span></div>
    <div id="stockList"></div>

    ${renderOilSection()}

    <div class="section-head"><h2>Suppliers</h2><span class="hint">outstanding balances, live</span></div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Supplier name</label><input type="text" id="spName" placeholder="e.g. HPCL"></div>
        <div class="field"><label>Phone</label><input type="tel" id="spPhone" placeholder="Optional"></div>
        <div class="field"><label>Opening balance (₹ already owed)</label><input type="number" step="0.01" id="spOpening" placeholder="0.00"></div>
        <div class="field" style="grid-column:span 2;"><label>Notes</label><input type="text" id="spNotes" placeholder="Optional"></div>
        <div class="field"><button class="btn primary" id="spAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add supplier</button></div>
      </div>
      <div id="spMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Supplier</th><th>Phone</th><th class="num">Opening</th><th class="num">Outstanding</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.suppliers.length? state.suppliers.map(s=>`<tr>
        <td>${esc(s.name)}${s.hpCardSettles?` <span class="pill good" title="HP Card sales reduce this supplier's balance">HP Card</span>`:''}${s.notes?`<div class="hint" style="font-size:11px;color:var(--text-faint)">${esc(s.notes)}</div>`:''}</td>
        <td>${esc(s.phone||'—')}</td>
        <td class="num">${money(s.openingBalance||0)}</td>
        <td class="num" ${num(s.balance)>0?'style="color:var(--critical);font-weight:600;"':''}>${money(s.balance||0)}</td>
        <td><span class="pill ${s.active!==false?'good':'neutral'}">${s.active!==false?'Active':'Inactive'}</span></td>
        <td style="white-space:nowrap;"><button class="btn sm" data-pay="${s.id}">Pay</button> <button class="btn ghost sm" data-openbal="${s.id}">Opening</button> <button class="btn ghost sm" data-edit="${s.id}">${icon('edit')}</button> <button class="btn ghost sm" data-toggle="${s.id}" data-cur="${s.active!==false}">${s.active!==false?'Deactivate':'Activate'}</button>${s.active===false?` <button class="btn danger sm" data-delsup="${s.id}">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="empty">No suppliers yet.</td></tr>`}</tbody>
      ${state.suppliers.length?`<tfoot><tr><td colspan="3" style="font-weight:700;">Total owed</td><td class="num" style="font-weight:700;">${money(state.suppliers.reduce((s,x)=>s+num(x.balance),0))}</td><td colspan="2"></td></tr></tfoot>`:''}
    </table></div></div>
  `;
  renderPurchaseLines();
  $('#drTotal').oninput = updateDrTotal;
  $('#drSave').onclick = addStockReceipt;
  $('#spAdd').onclick = addSupplierFromPurchase;
  $$('#viewMount [data-openbal]').forEach(b=>b.onclick=()=>openOpeningBalanceModal('supplier', b.dataset.openbal));
  $$('#viewMount [data-edit]').forEach(b=>b.onclick=()=>openSetupEditModal('suppliers', b.dataset.edit));
  $$('#viewMount [data-toggle]').forEach(b=>b.onclick=async ()=>{ await state.db.doc('suppliers/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'}); });
  $$('#viewMount [data-delsup]').forEach(b=>b.onclick=()=>deleteSupplier(b.dataset.delsup, ()=>renderPurchase($('#viewMount'))));
  $$('#viewMount [data-pay]').forEach(b=>b.onclick=()=>{
    const s = state.suppliers.find(x=>x.id===b.dataset.pay);
    if (!s) return;
    state.view = 'expenses'; renderAll();
    // Pre-fill the payment form for this supplier.
    if ($('#exParty')) $('#exParty').value = 'sup:'+s.id;
    if ($('#exAmt')) $('#exAmt').focus();
  });
  loadStockReceiptsList();
  wireOilSection();
}

// Shared by the Purchase tab and Setup → Suppliers. A supplier still owed money is worth a second
// warning, since deleting them drops that outstanding balance from the books.
async function deleteSupplier(id, after){
  const s = state.suppliers.find(x=>x.id===id);
  if (!s) return;
  const owed = num(s.balance);
  const ok = await confirmModal({
    title:`Delete ${s.name}?`,
    body: owed ? `This supplier still shows <strong>${money(owed)}</strong> outstanding. Deleting them permanently removes the supplier and that balance from your books — settle or write it off first if it's real. Past purchase records keep their saved supplier name.` : 'This permanently removes them from Setup. Past purchase records keep their saved supplier name.',
    confirmLabel:'Delete supplier',
  });
  if (!ok) return;
  await state.db.doc('suppliers/'+id).delete();
  await logActivity({entity:'Supplier', entityLabel:s.name, action:'delete', summary: owed?`Deleted with ${money(owed)} outstanding`:''});
  if (after) after();
}

/* ============================== OIL & LUBRICANT STOCK ============================== */
// Lubricants are counted in units (litre packs, pieces) rather than tank litres, so they get their
// own product master with a running stock quantity. Purchases add to that stock; oil lines on a
// duty subtract from it. Oil purchases live in oilPurchasesMonthly and settle against a supplier
// or cash/bank exactly like a fuel purchase.
const OIL_UNITS = ['L','ml','pc','box'];
function oilProductName(id, fallback){ const p = state.oilProducts.find(x=>x.id===id); return p ? p.name : (fallback||'—'); }
async function adjustOilStock(productId, delta){
  if (!productId || !delta) return;
  const p = state.oilProducts.find(x=>x.id===productId);
  if (!p) return;
  await state.db.doc('oilProducts/'+productId).update({stockQty: num(p.stockQty) + delta}).catch(()=>{});
  p.stockQty = num(p.stockQty) + delta;
}
async function applyOilPurchase(item, sign){
  const qty = num(item.qty) * sign, amt = num(item.amount) * sign;
  if (qty) await adjustOilStock(item.productId, qty);
  if (!amt) return;
  const meta = {date:item.date, narration:`Oil purchase — ${oilProductName(item.productId, item.productName)}`, journalId:item.id};
  const payFrom = item.payFrom || 'credit';
  if (payFrom==='credit'){ if (item.supplierId) await applyPosting('sup:'+item.supplierId, -amt, meta); }
  else await applyPosting(payFrom, -amt, meta);
}

function renderOilSection(){
  const products = state.oilProducts.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const stockValue = products.reduce((s,p)=>s+num(p.stockQty)*num(p.costRate),0);
  return `
    <div class="section-head"><h2>Oil &amp; lubricants</h2><span class="hint">stock value ${money(stockValue)}</span></div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <h3 style="margin:0 0 10px;font-size:14px;">Add stock (purchase)</h3>
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="opDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field"><label>Product</label><select id="opProduct"><option value="">Select product…</option>${products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${esc(p.name)} — ${numFmt(p.stockQty)} ${esc(p.unit||'')} in stock</option>`).join('')}</select></div>
        <div class="field"><label>Quantity</label><input type="number" step="0.01" id="opQty" placeholder="0"></div>
        <div class="field"><label>Rate (₹ per unit)</label><input type="number" step="0.01" id="opRate" placeholder="0.00"></div>
        <div class="field"><label>Total</label><input type="text" id="opTotal" value="₹0" disabled></div>
        <div class="field"><label>Supplier</label><select id="opSupplier"><option value="">—</option>${state.suppliers.filter(s=>s.active!==false).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Payment</label><select id="opPay">${purchasePayOptions('credit')}</select></div>
        <div class="field"><label>Invoice ref</label><input type="text" id="opRef" placeholder="Optional"></div>
        <div class="field"><button class="btn primary" id="opSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add oil stock</button></div>
      </div>
      <div id="opMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>

    <div class="card card-pad" style="margin-bottom:16px;">
      <h3 style="margin:0 0 10px;font-size:14px;">Oil products</h3>
      <div class="form-grid">
        <div class="field"><label>Product name</label><input type="text" id="oilName" placeholder="e.g. Servo 4T 20W-40 1L"></div>
        <div class="field"><label>Unit</label><select id="oilUnit">${OIL_UNITS.map(u=>`<option>${u}</option>`).join('')}</select></div>
        <div class="field"><label>Opening stock (qty)</label><input type="number" step="0.01" id="oilQty" placeholder="0"></div>
        <div class="field"><label>Cost rate (₹)</label><input type="number" step="0.01" id="oilCost" placeholder="0.00"></div>
        <div class="field"><label>Selling rate (₹)</label><input type="number" step="0.01" id="oilSale" placeholder="0.00"></div>
        <div class="field"><button class="btn" id="oilAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add product</button></div>
      </div>
      <div id="oilMsg" style="font-size:13px;"></div>
    </div>
    <div class="card" style="margin-bottom:16px;"><div class="table-wrap"><table>
      <thead><tr><th>Product</th><th>Unit</th><th class="num">Stock</th><th class="num">Cost rate</th><th class="num">Selling rate</th><th class="num">Stock value</th><th>Status</th><th></th></tr></thead>
      <tbody>${products.length? products.map(p=>`<tr>
        <td>${esc(p.name)}</td><td>${esc(p.unit||'')}</td>
        <td class="num" ${num(p.stockQty)<=0?'style="color:var(--critical);font-weight:600;"':''}>${numFmt(p.stockQty)}</td>
        <td class="num">${money(p.costRate)}</td><td class="num">${money(p.saleRate)}</td>
        <td class="num">${money(num(p.stockQty)*num(p.costRate))}</td>
        <td><span class="pill ${p.active!==false?'good':'neutral'}">${p.active!==false?'Active':'Inactive'}</span></td>
        <td style="white-space:nowrap;"><button class="btn ghost sm" data-oedit="${p.id}">${icon('edit')}</button> <button class="btn ghost sm" data-otoggle="${p.id}" data-cur="${p.active!==false}">${p.active!==false?'Deactivate':'Activate'}</button>${p.active===false?` <button class="btn danger sm" data-odel="${p.id}">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="8" class="empty">No oil products yet — add one above, then its stock can be bought and sold.</td></tr>`}</tbody>
      ${products.length?`<tfoot><tr><td colspan="5" style="font-weight:700;">Total stock value</td><td class="num" style="font-weight:700;">${money(stockValue)}</td><td colspan="2"></td></tr></tfoot>`:''}
    </table></div></div>

    <div class="section-head"><h2>Oil purchases</h2><span id="oilMonthLabel"></span></div>
    <div id="oilPurchaseList"></div>
  `;
}

function wireOilSection(){
  const upd = ()=>{ const t=$('#opTotal'); if (t) t.value = money(num($('#opQty').value)*num($('#opRate').value)); };
  $('#opQty').oninput = upd; $('#opRate').oninput = upd;
  $('#opProduct').onchange = ()=>{
    const p = state.oilProducts.find(x=>x.id===$('#opProduct').value);
    if (p && num(p.costRate) && !num($('#opRate').value)){ $('#opRate').value = p.costRate; upd(); }
  };
  $('#opSave').onclick = addOilPurchase;
  $('#oilAdd').onclick = addOilProduct;
  $$('#viewMount [data-oedit]').forEach(b=>b.onclick=()=>openSetupEditModal('oilProducts', b.dataset.oedit));
  $$('#viewMount [data-otoggle]').forEach(b=>b.onclick=async ()=>{ await state.db.doc('oilProducts/'+b.dataset.otoggle).update({active: b.dataset.cur!=='true'}); });
  $$('#viewMount [data-odel]').forEach(b=>b.onclick=async ()=>{
    const p = state.oilProducts.find(x=>x.id===b.dataset.odel);
    if (!p) return;
    const ok = await confirmModal({title:`Delete ${p.name}?`, body: num(p.stockQty) ? `This product still shows <strong>${numFmt(p.stockQty)} ${esc(p.unit||'')}</strong> in stock. Deleting it removes that stock from your books. Past sales and purchases keep their saved product name.` : 'This permanently removes the product. Past sales and purchases keep their saved product name.', confirmLabel:'Delete product'});
    if (!ok) return;
    await state.db.doc('oilProducts/'+p.id).delete();
    await logActivity({entity:'Oil product', entityLabel:p.name, action:'delete'});
    renderPurchase($('#viewMount'));
  });
  loadOilPurchaseList();
}

async function addOilProduct(){
  const msg = $('#oilMsg');
  const name = $('#oilName').value.trim();
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!name){ msg.innerHTML = `<span style="color:var(--critical)">Name the product.</span>`; return; }
  if (state.oilProducts.some(p=>String(p.name||'').toLowerCase()===name.toLowerCase())){ msg.innerHTML = `<span style="color:var(--critical)">A product with that name already exists.</span>`; return; }
  const qty = num($('#oilQty').value);
  await state.db.collection('oilProducts').add({
    name, unit:$('#oilUnit').value, stockQty:qty, openingQty:qty,
    costRate:num($('#oilCost').value), saleRate:num($('#oilSale').value),
    active:true, createdAt:new Date().toISOString(),
  });
  await logActivity({entity:'Oil product', entityLabel:name, action:'add', summary: qty?`Opening stock ${numFmt(qty)}`:''});
  renderPurchase($('#viewMount'));
}

async function addOilPurchase(){
  const msg = $('#opMsg');
  const productId = $('#opProduct').value, qty = num($('#opQty').value), rate = num($('#opRate').value);
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!productId){ msg.innerHTML = `<span style="color:var(--critical)">Select the oil product.</span>`; return; }
  if (!(qty>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter the quantity.</span>`; return; }
  $('#opSave').disabled = true;
  try{
    const date = $('#opDate').value;
    const item = {id:uid(), date, productId, productName:oilProductName(productId), qty, rate, amount:qty*rate,
      supplierId:$('#opSupplier').value, supplier:supplierName($('#opSupplier').value,''), payFrom:$('#opPay').value,
      ref:$('#opRef').value.trim(), by: state.currentUser?state.currentUser.name:''};
    const monthId = monthIdOf(date);
    const data = (await getMonthDoc('oilPurchasesMonthly', monthId)) || {items:[]};
    data.items = (data.items||[]).concat([item]);
    data.totalAmount = data.items.reduce((s,i)=>s+num(i.amount),0);
    await setMonthDoc('oilPurchasesMonthly', monthId, data);
    await applyOilPurchase(item, +1);
    // Keep the product's cost rate current so stock valuation uses what was last paid.
    if (rate) await state.db.doc('oilProducts/'+productId).update({costRate:rate}).catch(()=>{});
    await logActivity({entity:'Oil purchase', entityLabel:item.productName, action:'add', summary:`Added ${numFmt(qty)} for ${money(item.amount)}`});
    renderPurchase($('#viewMount'));
  }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`; const b=$('#opSave'); if (b) b.disabled=false; }
}

function oilPurchaseEditFields(){
  return [
    {key:'date', label:'Date', type:'date'},
    {key:'productId', label:'Product', type:'select', options:state.oilProducts.map(p=>({value:p.id,label:p.name})), fmt:v=>oilProductName(v)},
    {key:'qty', label:'Quantity', type:'number', fmt:v=>numFmt(v)},
    {key:'rate', label:'Rate (₹)', type:'number', fmt:v=>money(v)},
    {key:'supplierId', label:'Supplier', type:'select', options:[{value:'',label:'—'}].concat(state.suppliers.map(s=>({value:s.id,label:s.name}))), fmt:v=>v?supplierName(v):'—'},
    {key:'payFrom', label:'Payment', type:'select', options:[{value:'credit',label:'On credit (supplier due)'},{value:'cash',label:'Paid — Cash in hand'}].concat(state.accounts.filter(a=>a.kind==='bank').map(a=>({value:'acct:'+a.id,label:'Paid — '+a.name}))), fmt:v=>purchasePayLabel(v)},
    {key:'ref', label:'Invoice ref', type:'text'},
  ];
}
function editOilPurchase(monthId, item){
  const fields = oilPurchaseEditFields();
  openLineEditModal({
    title:'Edit oil purchase', fields, values:Object.assign({payFrom:'credit'}, item),
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      if (!(num(out.qty)>0)) throw new Error('Enter the quantity.');
      const changes = diffFields(fields, item, out);
      const newItem = Object.assign({}, item, out, {id:item.id, amount:num(out.qty)*num(out.rate), productName:oilProductName(out.productId), supplier:out.supplierId?supplierName(out.supplierId):''});
      const newMonth = monthIdOf(out.date);
      await applyOilPurchase(item, -1);
      const oldData = await getMonthDoc('oilPurchasesMonthly', monthId);
      if (oldData){ oldData.items = (oldData.items||[]).filter(i=>i.id!==item.id); oldData.totalAmount = oldData.items.reduce((s,i)=>s+num(i.amount),0); await setMonthDoc('oilPurchasesMonthly', monthId, oldData); }
      const newData = (newMonth===monthId && oldData) ? oldData : ((await getMonthDoc('oilPurchasesMonthly', newMonth)) || {items:[]});
      newData.items = (newData.items||[]).concat([newItem]);
      newData.totalAmount = newData.items.reduce((s,i)=>s+num(i.amount),0);
      await setMonthDoc('oilPurchasesMonthly', newMonth, newData);
      await applyOilPurchase(newItem, +1);
      if (changes.length) await logActivity({entity:'Oil purchase', entityLabel:newItem.productName, action:'edit', changes});
      renderPurchase($('#viewMount'));
    }
  });
}
async function removeOilPurchase(monthId, item){
  const ok = await confirmModal({title:'Delete this oil purchase?', body:'This removes it, takes the quantity back out of stock and reverses the supplier or cash / bank effect.', confirmLabel:'Delete purchase'});
  if (!ok) return;
  const data = await getMonthDoc('oilPurchasesMonthly', monthId);
  if (!data) return;
  data.items = (data.items||[]).filter(i=>i.id!==item.id);
  data.totalAmount = data.items.reduce((s,i)=>s+num(i.amount),0);
  await setMonthDoc('oilPurchasesMonthly', monthId, data);
  await applyOilPurchase(item, -1);
  await logActivity({entity:'Oil purchase', entityLabel:item.productName||'', action:'delete', summary:`Removed ${numFmt(item.qty)}`});
  renderPurchase($('#viewMount'));
}

async function loadOilPurchaseList(){
  const el = $('#oilPurchaseList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#oilMonthLabel') && ($('#oilMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('oilPurchasesMonthly', monthId);
  const items = ((data&&data.items)||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Product</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Total</th><th>Supplier</th><th>Payment</th><th>Ref</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr>
      <td style="white-space:nowrap;">${fmtDateLabel(it.date)}</td>
      <td>${esc(oilProductName(it.productId, it.productName))}</td>
      <td class="num">${numFmt(it.qty)}</td><td class="num">${money(it.rate)}</td><td class="num">${money(it.amount)}</td>
      <td>${esc(it.supplierId?supplierName(it.supplierId, it.supplier):'—')}</td>
      <td><span class="pill ${(!it.payFrom||it.payFrom==='credit')?'warning':'good'}">${esc(purchasePayLabel(it.payFrom))}</span></td>
      <td>${esc(it.ref||'—')}</td>
      <td style="white-space:nowrap;"><button class="btn ghost sm" data-oped="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-oprm="${it.id}">${icon('trash')}</button></td>
    </tr>`).join('') : `<tr><td colspan="9" class="empty">No oil purchases for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="4" style="font-weight:700;">Total</td><td class="num" style="font-weight:700;">${money(data.totalAmount)}</td><td colspan="4"></td></tr></tfoot>`:''}
  </table></div></div>`;
  $$('#oilPurchaseList [data-oped]').forEach(b=>b.onclick=()=>{ const it = items.find(x=>x.id===b.dataset.oped); if (it) editOilPurchase(monthId, it); });
  $$('#oilPurchaseList [data-oprm]').forEach(b=>b.onclick=()=>{ const it = items.find(x=>x.id===b.dataset.oprm); if (it) removeOilPurchase(monthId, it); });
  wireMonthSwitcher(()=>{ loadOilPurchaseList(); });
}

async function addSupplierFromPurchase(){
  const msg = $('#spMsg');
  const name = $('#spName').value.trim();
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!name){ msg.innerHTML = `<span style="color:var(--critical)">Enter a name.</span>`; return; }
  if (state.suppliers.some(s=>String(s.name||'').toLowerCase()===name.toLowerCase())){ msg.innerHTML = `<span style="color:var(--critical)">A supplier with that name already exists.</span>`; return; }
  const opening = num($('#spOpening').value);
  await state.db.collection('suppliers').add({
    name, phone:$('#spPhone').value.trim(), notes:$('#spNotes').value.trim(),
    openingBalance:opening, balance:opening, active:true, createdAt:new Date().toISOString(),
  });
  await logActivity({entity:'Supplier', entityLabel:name, action:'add', summary: opening?`Opening balance ${money(opening)}`:''});
  renderPurchase($('#viewMount'));
}

// One Purchase entry covers a whole invoice: several products sharing the date, supplier, payment
// and DO reference, and a total that can be set to what the invoice actually says.
let purchaseForm = {lines:[]};
function newPurchaseLine(){ return {id:uid(), product:PRODUCT_KEYS[0], tankId:'', liters:'', rate:''}; }
function purchaseLineAmount(L){ return num(L.liters) * num(L.rate); }
// The invoice total wins when it is given: the difference is shared across the products in
// proportion to their own value, so the line amounts always add up to what the supplier billed.
// With no rates typed the split falls back to quantity, then to an even split.
function apportionPurchase(lines, invoiceTotal){
  const raw = lines.map(purchaseLineAmount);
  const rawTotal = raw.reduce((s,v)=>s+v,0);
  const target = num(invoiceTotal)>0 ? num(invoiceTotal) : rawTotal;
  if (!target) return raw.map(()=>0);
  let weights = raw, wTotal = rawTotal;
  if (!wTotal){ weights = lines.map(L=>num(L.liters)); wTotal = weights.reduce((s,v)=>s+v,0); }
  if (!wTotal){ weights = lines.map(()=>1); wTotal = lines.length; }
  const out = weights.map(w=>Math.round(w/wTotal*target*100)/100);
  // Rounding crumbs land on the largest line, so the total comes out exact.
  const diff = Math.round((target - out.reduce((s,v)=>s+v,0))*100)/100;
  if (diff){ let k = 0; out.forEach((v,i)=>{ if (v>out[k]) k = i; }); out[k] = Math.round((out[k]+diff)*100)/100; }
  return out;
}
function renderPurchaseLines(){
  const el = $('#drLines'); if (!el) return;
  if (!purchaseForm.lines.length) purchaseForm.lines = [newPurchaseLine()];
  el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Product</th><th>Tank</th><th class="num">Quantity (L)</th><th class="num">Rate (₹/L)</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody id="drLineBody"></tbody></table></div>
    <div style="margin-top:8px;"><button class="btn ghost sm" id="drAddLine">${icon('plus')} Add product</button></div>`;
  const tbody = $('#drLineBody');
  purchaseForm.lines.forEach(L=>{
    const tanks = state.tanks.filter(t=>t.active!==false && t.product===L.product);
    if (!tanks.some(t=>t.id===L.tankId)) L.tankId = tanks.length ? tanks[0].id : '';
    const tr = document.createElement('tr'); tr.dataset.id = L.id;
    tr.innerHTML = `
      <td><select class="pProduct" style="max-width:170px;">${PRODUCT_KEYS.map(k=>`<option value="${k}" ${k===L.product?'selected':''}>${esc(state.config.products[k]||k)}</option>`).join('')}</select></td>
      <td><select class="pTank" style="max-width:170px;">${tanks.length ? tanks.map(t=>`<option value="${t.id}" ${t.id===L.tankId?'selected':''}>${esc(t.name)}</option>`).join('') : `<option value="">No tank for this product</option>`}</select></td>
      <td class="num"><input type="number" step="0.01" class="pLtr" value="${esc(String(L.liters))}" placeholder="0.00" style="width:130px;text-align:right;"></td>
      <td class="num"><input type="number" step="0.01" class="pRate" value="${esc(String(L.rate))}" placeholder="0.00" style="width:130px;text-align:right;"></td>
      <td class="num pAmt">${money(purchaseLineAmount(L))}</td>
      <td>${purchaseForm.lines.length>1 ? `<button class="btn ghost sm pRemove">${icon('trash')}</button>` : ''}</td>`;
    tbody.appendChild(tr);
    const read = ()=>{
      L.liters = tr.querySelector('.pLtr').value;
      L.rate = tr.querySelector('.pRate').value;
      tr.querySelector('.pAmt').textContent = money(purchaseLineAmount(L));
      updateDrTotal();
    };
    tr.querySelector('.pLtr').oninput = read;
    tr.querySelector('.pRate').oninput = read;
    tr.querySelector('.pProduct').onchange = (e)=>{ L.product = e.target.value; L.tankId = ''; renderPurchaseLines(); };
    tr.querySelector('.pTank').onchange = (e)=>{ L.tankId = e.target.value; };
    const drop = tr.querySelector('.pRemove');
    if (drop) drop.onclick = ()=>{ purchaseForm.lines = purchaseForm.lines.filter(x=>x.id!==L.id); renderPurchaseLines(); };
  });
  $('#drAddLine').onclick = ()=>{ purchaseForm.lines.push(newPurchaseLine()); renderPurchaseLines(); };
  updateDrTotal();
}
function updateDrTotal(){
  const linesEl = $('#drLinesTotal'), totalEl = $('#drTotal'), hint = $('#drTotalHint');
  if (!linesEl || !totalEl) return;
  const raw = purchaseForm.lines.reduce((s,L)=>s+purchaseLineAmount(L), 0);
  linesEl.value = money(raw);
  if (!hint) return;
  const typed = num(totalEl.value);
  const diff = Math.round((typed - raw)*100)/100;
  hint.innerHTML = (typed>0 && diff)
    ? `Invoice total is ${money(Math.abs(diff))} ${diff>0?'more':'less'} than the products add up to — the difference is shared across them in proportion to their value.`
    : 'Leave the invoice total empty to use the products total. Set it to match the DO when tax or rounding makes it differ.';
}
// Each product on the invoice is still stored as its own purchase line — that is what tops up a
// tank and values its stock — but they share a batchId so the entry can be read back as one invoice.
async function addStockReceipt(){
  const msg = $('#drMsg');
  const date = $('#drDate').value;
  const supplierId = $('#drSupplier').value, payFrom = $('#drPay').value, ref = $('#drRef').value.trim();
  const lines = purchaseForm.lines.filter(L=>num(L.liters)>0);
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!supplierId){ msg.innerHTML = `<span style="color:var(--critical)">Select the supplier.</span>`; return; }
  if (!lines.length){ msg.innerHTML = `<span style="color:var(--critical)">Enter the quantity for at least one product.</span>`; return; }
  const noTank = lines.find(L=>!L.tankId);
  if (noTank){ msg.innerHTML = `<span style="color:var(--critical)">No tank is set up for ${esc(state.config.products[noTank.product]||noTank.product)} yet — add one in Setup → Tanks.</span>`; return; }
  $('#drSave').disabled = true;
  try{
    const amounts = apportionPurchase(lines, $('#drTotal').value);
    const batchId = uid();
    const items = lines.map((L,i)=>{
      const tank = state.tanks.find(t=>t.id===L.tankId);
      const ltr = num(L.liters), amount = amounts[i];
      // The rate stored is what the line actually worked out at, so rate x quantity always equals
      // the amount; the rate as typed is kept beside it when an invoice total moved it.
      const rate = ltr ? Math.round(amount/ltr*10000)/10000 : num(L.rate);
      return {id:uid(), batchId, date, product:L.product, tankId:L.tankId, tankName: tank?tank.name:'',
        liters:ltr, rate, rateEntered:num(L.rate), amount,
        supplierId, supplier:supplierName(supplierId), payFrom, ref, by: state.currentUser?state.currentUser.name:''};
    });
    const monthId = monthIdOf(date);
    const data = (await getMonthDoc('stockReceiptsMonthly', monthId)) || {items:[], totalLiters:0, totalAmount:0};
    data.items = (data.items||[]).concat(items);
    data.totalLiters = data.items.reduce((s,i)=>s+num(i.liters),0);
    data.totalAmount = data.items.reduce((s,i)=>s+num(i.amount),0);
    await setMonthDoc('stockReceiptsMonthly', monthId, data);
    for (const it of items) await applyPurchase(it, +1);
    const totalLtr = items.reduce((s,i)=>s+num(i.liters),0);
    const totalAmt = items.reduce((s,i)=>s+num(i.amount),0);
    await logActivity({entity:'Purchase', entityLabel:supplierName(supplierId)+' · '+fmtDateLabel(date), action:'add',
      summary:`Added ${items.length} product(s), ${liters(totalLtr)} for ${money(totalAmt)} (${purchasePayLabel(payFrom)})`});
    msg.innerHTML = `<span style="color:var(--good)">Purchase recorded — ${items.length} product(s) totalling ${money(totalAmt)}; stock updated${payFrom==='credit'?' and supplier balance increased':''}.</span>`;
    purchaseForm.lines = [newPurchaseLine()];
    renderPurchase($('#viewMount'));
  }catch(e){
    msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`;
  } finally { const b=$('#drSave'); if (b) b.disabled = false; }
}

function stockReceiptEditFields(){
  return [
    {key:'date', label:'Date', type:'date'},
    {key:'supplierId', label:'Supplier', type:'select', options:state.suppliers.map(s=>({value:s.id,label:s.name})), fmt:v=>supplierName(v)},
    {key:'product', label:'Product', type:'select', options:PRODUCT_KEYS.map(k=>({value:k,label:state.config.products[k]||k})), fmt:v=>state.config.products[v]||v||'—'},
    {key:'tankId', label:'Tank', type:'select', options:state.tanks.filter(t=>t.active!==false).map(t=>({value:t.id,label:t.name})), fmt:v=>{ const t=state.tanks.find(x=>x.id===v); return t?t.name:(v||'—'); }},
    {key:'liters', label:'Quantity (L)', type:'number', fmt:v=>liters(v)},
    {key:'rate', label:'Rate (₹/L)', type:'number', fmt:v=>money(v)},
    {key:'payFrom', label:'Payment', type:'select', options:[{value:'credit',label:'On credit (supplier due)'},{value:'cash',label:'Paid — Cash in hand'}].concat(state.accounts.filter(a=>a.kind==='bank').map(a=>({value:'acct:'+a.id,label:'Paid — '+a.name}))), fmt:v=>purchasePayLabel(v)},
    {key:'ref', label:'Invoice / DO ref', type:'text'},
  ];
}
function editStockReceipt(monthId, item){
  const fields = stockReceiptEditFields();
  openLineEditModal({
    title:'Edit purchase', fields, values:Object.assign({payFrom:'credit'}, item),
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      if (!(num(out.liters)>0)) throw new Error('Enter the quantity.');
      const changes = diffFields(fields, item, out);
      // A line that came off an invoice total carries an amount the rate alone cannot reproduce to
      // the paisa. Leave it alone unless the quantity or rate is what actually changed.
      const priced = num(out.liters)!==num(item.liters) || num(out.rate)!==num(item.rate);
      const amount = priced ? num(out.liters)*num(out.rate) : num(item.amount);
      const newItem = Object.assign({}, item, out, {id:item.id, amount, supplier:supplierName(out.supplierId), tankName:(state.tanks.find(t=>t.id===out.tankId)||{}).name||''});
      const newMonth = monthIdOf(out.date);
      // Reverse the old purchase in full, then apply the new one — covers a changed tank, supplier,
      // payment source, quantity or month in one path.
      await applyPurchase(item, -1);
      const oldData = await getMonthDoc('stockReceiptsMonthly', monthId);
      if (oldData){
        oldData.items = (oldData.items||[]).filter(i=>i.id!==item.id);
        oldData.totalLiters = oldData.items.reduce((s,i)=>s+num(i.liters),0);
        oldData.totalAmount = oldData.items.reduce((s,i)=>s+num(i.amount),0);
        await setMonthDoc('stockReceiptsMonthly', monthId, oldData);
      }
      const newData = (newMonth===monthId && oldData) ? oldData : ((await getMonthDoc('stockReceiptsMonthly', newMonth)) || {items:[], totalLiters:0, totalAmount:0});
      newData.items = (newData.items||[]).concat([newItem]);
      newData.totalLiters = newData.items.reduce((s,i)=>s+num(i.liters),0);
      newData.totalAmount = newData.items.reduce((s,i)=>s+num(i.amount),0);
      await setMonthDoc('stockReceiptsMonthly', newMonth, newData);
      await applyPurchase(newItem, +1);
      if (changes.length) await logActivity({entity:'Purchase', entityLabel:newItem.supplier+' · '+fmtDateLabel(newItem.date), action:'edit', changes});
      renderPurchase($('#viewMount'));
    }
  });
}
async function removeStockReceipt(monthId, item){
  const ok = await confirmModal({title:'Delete this purchase?', body:'This removes it, takes the liters back out of the tank and reverses the supplier or cash / bank effect.', confirmLabel:'Delete purchase'});
  if (!ok) return;
  const data = await getMonthDoc('stockReceiptsMonthly', monthId);
  if (!data) return;
  data.items = (data.items||[]).filter(i=>i.id!==item.id);
  data.totalLiters = data.items.reduce((s,i)=>s+num(i.liters),0);
  data.totalAmount = data.items.reduce((s,i)=>s+num(i.amount),0);
  await setMonthDoc('stockReceiptsMonthly', monthId, data);
  await applyPurchase(item, -1);
  await logActivity({entity:'Purchase', entityLabel:(item.supplier||item.tankName||'')+' · '+fmtDateLabel(item.date), action:'delete', summary:`Removed ${liters(item.liters)}`});
  renderPurchase($('#viewMount'));
}

async function loadStockReceiptsList(){
  const el = $('#stockList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#stockMonthLabel') && ($('#stockMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('stockReceiptsMonthly', monthId);
  const items = (data && data.items || []).slice().sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Supplier</th><th>Product</th><th>Tank</th><th class="num">Liters</th><th class="num">Rate</th><th class="num">Amount</th><th>Payment</th><th>Ref</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr>
      <td style="white-space:nowrap;">${fmtDateLabel(it.date)}</td>
      <td>${esc(supplierName(it.supplierId, it.supplier))}</td>
      <td>${esc(state.config.products[it.product]||it.product||'—')}</td>
      <td>${esc(it.tankName||'—')}</td>
      <td class="num">${liters(it.liters)}</td>
      <td class="num">${it.rate?money(it.rate):'—'}${num(it.rateEntered) && Math.abs(num(it.rateEntered)-num(it.rate))>0.0001?`<div class="hint" style="font-size:11px;color:var(--text-faint)">billed at ${money(it.rateEntered)}</div>`:''}</td>
      <td class="num">${it.amount?money(it.amount):'—'}</td>
      <td><span class="pill ${(!it.payFrom||it.payFrom==='credit')?'warning':'good'}">${esc(purchasePayLabel(it.payFrom))}</span></td>
      <td>${esc(it.ref||'—')}</td>
      <td style="white-space:nowrap;"><button class="btn ghost sm" data-pedit="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-rm="${it.id}">${icon('trash')}</button></td>
    </tr>`).join('') : `<tr><td colspan="10" class="empty">No purchases logged for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="4" style="font-weight:700;">Total</td><td class="num" style="font-weight:700;">${liters(data.totalLiters)}</td><td></td><td class="num" style="font-weight:700;">${money(data.totalAmount)}</td><td colspan="3"></td></tr></tfoot>`:''}
  </table></div></div>`;
  $$('#stockList [data-pedit]').forEach(b=>b.onclick=()=>{
    const it = items.find(x=>x.id===b.dataset.pedit);
    if (it) editStockReceipt(monthId, it);
  });
  $$('#stockList [data-rm]').forEach(b=>b.onclick=()=>{
    const it = items.find(x=>x.id===b.dataset.rm);
    if (it) removeStockReceipt(monthId, it);
  });
  wireMonthSwitcher(()=>{ loadStockReceiptsList(); });
}

/* ============================== PAYMENTS / EXPENSES ============================== */
const EXPENSE_CATEGORIES = ['Electricity','Maintenance & Repairs','Rent','Statutory / Tax','Bank & Card Charges','Transport','Miscellaneous'];
// Payments / Expenses share one monthly document (expensesMonthly). An item is either
//   kind:'expense'  — a running cost by category; counts in the P&L expenses line
//   kind:'payment'  — money paid to a party (supplier, lender, staff advance, owner…), optionally
//                     debited to a ledger so it settles a payable / records an advance / hits P&L.
// Both record the mode and where the money came from (Cash in hand or a bank account), and post
// the outflow there. Items with source:'duty' are mirrored from Duty Entry and edited there.
function expenseKind(it){ return it.kind==='payment' ? 'payment' : 'expense'; }
function paidFromLabel(k){ return !k ? 'Not tracked' : k==='cash' ? 'Cash in hand' : ((state.accounts.find(a=>'acct:'+a.id===k)||{}).name || k); }
async function applyExpenseItem(item, sign){
  const amt = num(item.amount) * sign;
  if (!amt) return;
  const who = expenseKind(item)==='payment' ? [item.item, item.party].filter(Boolean).join(' — ')||'payment' : (item.category||'expense');
  const meta = {date:item.date, narration:`${expenseKind(item)==='payment'?'Payment to':'Expense —'} ${who}${item.description?' — '+item.description:''}`, journalId:item.id};
  if (item.paidFrom) await applyPosting(item.paidFrom, -amt, meta);            // money out
  if (expenseKind(item)==='payment' && item.ledger) await applyPosting(item.ledger, amt, meta); // settles / records on the ledger
}

function renderExpenses(mount){
  mount.innerHTML = `
    <h1 class="page-title">Payments / Expenses</h1>
    <p class="page-sub">Money going out. Pick the account it is <strong>paid to</strong> — an expense ledger, a payable, an advance or a supplier — and that account is debited while the cash or bank you paid from is credited.</p>

    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="exDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field" style="grid-column:span 2;"><label>Paid to</label><select id="exParty">${payToOptions('')}</select></div>
        <div class="field" id="exSubjectWrap" style="display:none;"><label id="exSubjectLbl">For</label><select id="exSubject"></select></div>
        <div class="field" style="grid-column:span 2;"><label>Description</label><input type="text" id="exDesc" placeholder="e.g. July electricity bill / Invoice DO-4521"></div>
        <div class="field"><label>Amount (₹)</label><input type="number" step="0.01" id="exAmt" placeholder="0.00"></div>
        <div class="field"><label>Mode</label><select id="exMode">${RECEIPT_MODES.map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="field"><label>Paid from</label><select id="exFrom"><option value="">Not tracked</option>${receiptIntoOptions('cash')}</select></div>
        <div class="field"><button class="btn primary" id="exSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} <span id="exSaveLbl">Add payment</span></button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">"Paid from" reduces that cash / bank balance. Under "Paid to", an <strong>Expense</strong> ledger hits the P&amp;L, a <strong>Liability / Payable</strong> ledger settles a due, an <strong>Asset</strong> ledger records an advance or deposit, and a <strong>Supplier</strong> or <strong>Creditor</strong> clears what is owed. A ledger that links to a person — salary or an advance — then asks who it is for, and the amount goes onto that month's salary sheet as an advance.</div>
      <div id="exMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>

    <div class="section-head"><h2>This period</h2><span id="exMonthLabel"></span></div>
    <div id="exList"></div>
  `;
  // A ledger that links to staff, a creditor or a supplier asks which one as soon as it is picked.
  const syncPayTo = ()=>{
    const type = ledgerSubjectType($('#exParty').value);
    const wrap = $('#exSubjectWrap'), sel = $('#exSubject');
    sel.dataset.type = type || '';
    if (!type){ wrap.style.display = 'none'; sel.innerHTML = ''; return; }
    wrap.style.display = '';
    $('#exSubjectLbl').textContent = SUBJECT_KINDS[type].label;
    const opts = subjectOptionsHtml(type, '');
    sel.innerHTML = subjectRecords(type).length ? opts : `<option value="">${esc(SUBJECT_KINDS[type].empty)}</option>`;
  };
  $('#exParty').onchange = syncPayTo; syncPayTo();
  $('#exSave').onclick = addExpense;
  loadExpensesList();
}

// A payment made for a staff member is an advance against their pay: it lands on that month's
// salary sheet so their net drops by what they have already been handed. Only the change is applied,
// and the row is created if the sheet doesn't have that person yet.
async function bookSalaryAdvance(staffId, delta, date){
  if (!staffId || !delta || !date) return;
  const salMonth = monthIdOf(date);
  const salData = (await getMonthDoc('salaryMonthly', salMonth)) || {staff:{}};
  salData.staff = salData.staff || {};
  if (!salData.staff[staffId]){
    const person = state.staff.find(s=>s.id===staffId);
    salData.staff[staffId] = {name: person?person.name:'', wageType: person && num(person.hourlyWage)>0 ? 'hourly':'monthly', hoursWorked:null,
                              baseSalary: person ? num(person.monthlySalary) : 0, advance:0, deduction:0, netPaid:0, status:'pending', paidDate:null};
  }
  salData.staff[staffId].advance = num(salData.staff[staffId].advance) + delta;
  recomputeSalaryTotals(salData);
  await setMonthDoc('salaryMonthly', salMonth, salData);
}
// What a payment line puts on the salary sheet — nothing unless it names a staff member.
function expenseAdvance(it){ return (it && it.subjectType==='staff' && it.subjectId) ? num(it.amount) : 0; }

// Every entry is a payment posted against the account it was paid to; that account carries the
// classification the old category field used to, so an expense ledger still reaches the P&L.
async function addExpense(){
  const msg = $('#exMsg');
  const ledger = $('#exParty').value;
  const subjectType = ledgerSubjectType(ledger);
  const subjectId = subjectType ? ($('#exSubject').value || '') : '';
  const item = {
    id:uid(), date:$('#exDate').value, kind:'payment',
    category:'', party: targetLabel(ledger) || '', item:'', ledger,
    subjectType: subjectType||'', subjectId, subjectName: subjectNameOf(subjectType, subjectId),
    description:$('#exDesc').value.trim(), amount:num($('#exAmt').value),
    mode:$('#exMode').value, paidFrom:$('#exFrom').value,
    by: state.currentUser?state.currentUser.name:'', savedAt:new Date().toISOString(),
  };
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!ledger){ msg.innerHTML = `<span style="color:var(--critical)">Choose the account this was paid to.</span>`; return; }
  if (subjectType && !subjectId){ msg.innerHTML = `<span style="color:var(--critical)">Choose who this payment is for.</span>`; return; }
  if (!(item.amount>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter an amount.</span>`; return; }
  $('#exSave').disabled = true;
  try{
    const monthId = monthIdOf(item.date);
    const data = (await getMonthDoc('expensesMonthly', monthId)) || {items:[], total:0};
    data.items = (data.items||[]).concat([item]);
    data.total = data.items.reduce((s,i)=>s+num(i.amount),0);
    await setMonthDoc('expensesMonthly', monthId, data);
    await applyExpenseItem(item, +1);
    await bookSalaryAdvance(item.subjectId, expenseAdvance(item), item.date);
    await logActivity({entity:'Payment', entityLabel:[item.party, item.subjectName].filter(Boolean).join(' · ')+(item.description?' · '+item.description:''), action:'add', summary:`Added ${money(item.amount)} by ${item.mode}${item.paidFrom?' from '+paidFromLabel(item.paidFrom):''}`});
    msg.innerHTML = `<span style="color:var(--good)">Payment added — ${esc(item.party)} debited ${money(item.amount)}.${expenseAdvance(item)?` Booked to ${esc(item.subjectName)}'s salary for ${monthLabel(monthIdOf(item.date))} as an advance.`:''}</span>`;
    $('#exDesc').value=''; $('#exAmt').value=''; $('#exParty').value='';
    $('#exParty').onchange();
    loadExpensesList();
  }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`; }
  finally{ $('#exSave').disabled=false; }
}

async function removeExpense(monthId, itemId){
  const data = await getMonthDoc('expensesMonthly', monthId);
  if (!data) return;
  const item = (data.items||[]).find(i=>i.id===itemId);
  if (!item) return;
  const ok = await confirmModal({title:`Delete this ${expenseKind(item)}?`, body: item.paidFrom ? 'This removes it and adds the amount back to '+paidFromLabel(item.paidFrom)+'.' : 'This removes it from the list.', confirmLabel:'Delete'});
  if (!ok) return;
  data.items = (data.items||[]).filter(i=>i.id!==itemId);
  data.total = data.items.reduce((s,i)=>s+num(i.amount),0);
  await setMonthDoc('expensesMonthly', monthId, data);
  await applyExpenseItem(item, -1);
  await bookSalaryAdvance(item.subjectId, -expenseAdvance(item), item.date);
  await logActivity({entity: expenseKind(item)==='payment'?'Payment':'Expense', entityLabel:(item.party||item.category||'')+(item.description?' · '+item.description:''), action:'delete', summary:`Removed ${money(item.amount)}`});
  loadExpensesList();
}

function expenseEditFields(item){
  const fromOpts = [{value:'', label:'Not tracked'},{value:'cash', label:'Cash in hand'}].concat(state.accounts.filter(a=>a.kind==='bank').map(a=>({value:'acct:'+a.id, label:a.name})));
  return [
    {key:'date', label:'Date', type:'date'},
    ...(expenseKind(item)==='payment'
      ? [{key:'ledger', label:'Paid to', type:'select', options:payToList(), fmt:v=>targetLabel(v)||'—'}]
          .concat(ledgerSubjectType(item.ledger)
            ? [{key:'subjectId', label:SUBJECT_KINDS[ledgerSubjectType(item.ledger)].label, type:'select',
                options:subjectPickList(ledgerSubjectType(item.ledger)), fmt:v=>subjectNameOf(ledgerSubjectType(item.ledger), v)||'—'}] : [])
      : [{key:'category', label:'Category', type:'select', options:EXPENSE_CATEGORIES.map(c=>({value:c,label:c}))}]),
    {key:'description', label:'Description', type:'text'},
    {key:'amount', label:'Amount (₹)', type:'number', fmt:v=>money(v)},
    {key:'mode', label:'Mode', type:'select', options:RECEIPT_MODES.map(m=>({value:m,label:m}))},
    {key:'paidFrom', label:'Paid from', type:'select', options:fromOpts, fmt:v=>paidFromLabel(v)},
  ];
}
function editExpense(monthId, item){
  const fields = expenseEditFields(item);
  openLineEditModal({
    title:`Edit ${expenseKind(item)}`, fields, values:Object.assign({mode:'Cash', paidFrom:''}, item),
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      if (!(num(out.amount)>0)) throw new Error('Enter an amount.');
      if (expenseKind(item)==='payment' && !out.ledger) throw new Error('Choose the account this was paid to.');
      const changes = diffFields(fields, item, out);
      const newItem = Object.assign({}, item, out, {id:item.id});
      // The party is just the readable name of the account, kept in step so lists and exports read right.
      if (expenseKind(newItem)==='payment'){
        newItem.party = targetLabel(newItem.ledger) || newItem.party || '';
        // Moving the payment to an account that asks for a different sub-item drops the old one.
        const st = ledgerSubjectType(newItem.ledger);
        newItem.subjectType = st;
        newItem.subjectId = st ? (newItem.subjectId||'') : '';
        newItem.subjectName = st ? subjectNameOf(st, newItem.subjectId) : '';
      }
      const newMonth = monthIdOf(out.date);
      await applyExpenseItem(item, -1);
      await bookSalaryAdvance(item.subjectId, -expenseAdvance(item), item.date);
      const oldData = await getMonthDoc('expensesMonthly', monthId);
      if (oldData){ oldData.items = (oldData.items||[]).filter(i=>i.id!==item.id); oldData.total = oldData.items.reduce((s,i)=>s+num(i.amount),0); await setMonthDoc('expensesMonthly', monthId, oldData); }
      const newData = (newMonth===monthId && oldData) ? oldData : ((await getMonthDoc('expensesMonthly', newMonth)) || {items:[], total:0});
      newData.items = (newData.items||[]).concat([newItem]);
      newData.total = newData.items.reduce((s,i)=>s+num(i.amount),0);
      await setMonthDoc('expensesMonthly', newMonth, newData);
      await applyExpenseItem(newItem, +1);
      await bookSalaryAdvance(newItem.subjectId, expenseAdvance(newItem), newItem.date);
      if (changes.length) await logActivity({entity: expenseKind(item)==='payment'?'Payment':'Expense', entityLabel:(newItem.party||newItem.category||'')+(newItem.description?' · '+newItem.description:''), action:'edit', changes});
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
  const expTotal = items.filter(i=>expenseKind(i)==='expense').reduce((s,i)=>s+num(i.amount),0);
  const payTotal = items.filter(i=>expenseKind(i)==='payment').reduce((s,i)=>s+num(i.amount),0);
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Type</th><th>Category / Party</th><th>Description</th><th>Mode</th><th>Paid from</th><th class="num">Amount</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr>
      <td style="white-space:nowrap;">${fmtDateLabel(it.date)}</td>
      <td><span class="pill ${expenseKind(it)==='payment'?'neutral':'warning'}">${expenseKind(it)==='payment'?'Payment':'Expense'}</span></td>
      <td>${esc(expenseKind(it)==='payment' ? (it.party||'—') : (it.category||'—'))}${it.subjectName?`<div class="hint" style="font-size:11px;color:var(--text-faint)">for ${esc(it.subjectName)}${it.subjectType==='staff'?' (salary advance)':''}</div>`:''}${it.item?`<div class="hint" style="font-size:11px;color:var(--text-faint)">${esc(it.item)}</div>`:''}${it.ledger && targetLabel(it.ledger)!==it.party?`<div class="hint" style="font-size:11px;color:var(--text-faint)">→ ${esc(targetLabel(it.ledger)||'')}</div>`:''}</td>
      <td>${esc(it.description||'—')}${it.source==='duty'?`<div class="hint" style="font-size:11px;color:var(--text-faint)">from a duty entry (paid from till)</div>`:''}</td>
      <td>${esc(it.mode||(it.source==='duty'?'Cash':'—'))}</td>
      <td>${esc(it.source==='duty' ? 'Duty till' : paidFromLabel(it.paidFrom))}</td>
      <td class="num">${money(it.amount)}</td>
      <td style="white-space:nowrap;">${it.source==='duty' ? `<span class="hint" style="font-size:11px;color:var(--text-faint)">Edit via the duty</span>` : `<button class="btn ghost sm" data-edit="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-rm="${it.id}">${icon('trash')}</button>`}</td>
    </tr>`).join('') : `<tr><td colspan="8" class="empty">Nothing logged for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="6" style="font-weight:700;">Expenses ${money(expTotal)} · Payments ${money(payTotal)}</td><td class="num" style="font-weight:700;">${money(expTotal+payTotal)}</td><td></td></tr></tfoot>`:''}
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
    <div class="banner info">${icon('wallet')}<div>Monthly salary sheet for your team. Pay figures come from Setup → Staff — monthly salary, or hourly wage times the duty hours logged that month.</div></div>
    <div class="section-head" style="margin-top:0;"><h2 id="salMonthTitle"></h2><span id="salMonthLabel"></span></div>
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
    <td class="num"><input type="number" class="adv" value="${s.advance||0}" style="width:110px;text-align:right;" ${paid?'disabled':''}></td>
    <td class="num"><input type="number" class="ded" value="${s.deduction||0}" style="width:110px;text-align:right;" ${paid?'disabled':''}></td>
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
// Report builder: any date range (presets or custom), optional comparison period, filters
// (staff / product / nozzle / creditor / payment method) and a pick-list of sections. The same
// configuration drives the on-screen report and the Excel export. Settings are remembered per
// browser in localStorage as a convenience.
// A report is chosen from one dropdown; each type maps to the sections it shows, so the on-screen
// report and the Excel export stay in step.
const REPORT_SECTIONS = [
  {id:'summary',     label:'P&L summary'},
  {id:'balances',    label:'Cash & bank balances'},
  {id:'products',    label:'Sales by product'},
  {id:'trend',       label:'Daily revenue trend'},
  {id:'collections', label:'Collections by method'},
  {id:'duties',      label:'Duties list'},
  {id:'credit',      label:'Credit sales'},
  {id:'oils',        label:'Oil sales'},
  {id:'stock',       label:'Tank stock'},
  {id:'purchases',   label:'Fuel purchases'},
  {id:'creditors',   label:'Creditor balances'},
  {id:'suppliers',   label:'Supplier balances'},
  {id:'expenses',    label:'Expenses'},
  {id:'payments',    label:'Payments'},
  {id:'salary',      label:'Salary'},
  {id:'journal',     label:'Journal entries'},
  {id:'receipts',    label:'Receipts'},
  {id:'ledger',      label:'Ledger statements'},
];
const REPORT_TYPES = [
  {id:'full',     label:'Full report — everything', sections:REPORT_SECTIONS.map(s=>s.id)},
  {id:'pl',       label:'Profit & Loss', sections:['summary','products','trend','collections']},
  {id:'sales',    label:'Sales & duties', sections:['summary','duties','products','trend','oils','collections']},
  {id:'stock',    label:'Stock & purchases', sections:['stock','purchases','suppliers']},
  {id:'creditors', label:'Creditors — balances & dues', sections:['creditors','credit','receipts']},
  {id:'credit',   label:'Credit sales & receipts', sections:['credit','receipts']},
  {id:'expense',  label:'Payments & expenses', sections:['expenses','payments']},
  {id:'salary',   label:'Salary', sections:['salary']},
  {id:'journal',  label:'Journal', sections:['journal']},
  {id:'ledger',   label:'Ledger statements', sections:['ledger']},
  {id:'balances', label:'Balances', sections:['balances','suppliers']},
];
function reportSections(cfg){
  const t = REPORT_TYPES.find(x=>x.id===cfg.report) || REPORT_TYPES[0];
  // Asking for one creditor is really asking for their account, so their statement comes with it.
  if (cfg.report==='creditors' && cfg.creditor) return t.sections.concat(['ledger']);
  return t.sections;
}
const REPORT_CFG_KEY = 'fuelLedgerReportCfg';
function defaultReportCfg(){
  return { report:'full', basis:'cash', preset:'thisMonth', from:'', to:'', compare:'none', staff:'', product:'', nozzle:'', creditor:'', method:'', ledgerPick:'all' };
}
let repCfg = null;
function loadReportCfg(){
  if (repCfg) return repCfg;
  repCfg = defaultReportCfg();
  try{
    const saved = JSON.parse(localStorage.getItem(REPORT_CFG_KEY)||'null');
    if (saved && typeof saved==='object') repCfg = Object.assign(repCfg, saved);
  }catch(e){}
  return repCfg;
}
function saveReportCfg(){ try{ localStorage.setItem(REPORT_CFG_KEY, JSON.stringify(repCfg)); }catch(e){} }

function addDays(dateStr, n){ const d = new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+n); return ymd(d); }
function daysBetween(from, to){ return Math.round((new Date(to+'T00:00:00') - new Date(from+'T00:00:00'))/86400000) + 1; }
function monthEnd(monthId){ return monthId+'-'+pad2(daysInMonth(monthId)); }
function monthsBetween(from, to){
  const out = []; let m = monthIdOf(from); const last = monthIdOf(to);
  while (m<=last){ out.push(m); m = shiftMonth(m,1); if (out.length>120) break; }
  return out;
}
// Indian financial year: April–March.
function presetRange(preset){
  const today = todayStr(); const [y,m] = [Number(today.slice(0,4)), Number(today.slice(5,7))];
  const thisMonth = monthIdOf(today);
  switch(preset){
    case 'thisMonth': return {from:thisMonth+'-01', to:today};
    case 'lastMonth': { const lm = shiftMonth(thisMonth,-1); return {from:lm+'-01', to:monthEnd(lm)}; }
    case 'last3': { const s = shiftMonth(thisMonth,-2); return {from:s+'-01', to:today}; }
    case 'thisQuarter': { const q = Math.floor(((m-4+12)%12)/3); let sm = 4+q*3, sy = y; if (m<4) sy = y-1; if (sm>12){ sm-=12; sy++; } return {from:sy+'-'+pad2(sm)+'-01', to:today}; }
    case 'fy': { const sy = m>=4 ? y : y-1; return {from:sy+'-04-01', to: (m>=4 ? today : today)}; }
    case 'lastFy': { const sy = m>=4 ? y-1 : y-2; return {from:sy+'-04-01', to:(sy+1)+'-03-31'}; }
    default: return null;
  }
}
function comparisonRange(from, to, mode){
  if (mode==='lastYear'){
    const shift = (d)=>{ const yy = Number(d.slice(0,4))-1; const rest = d.slice(4); return (rest==='-02-29') ? yy+'-02-28' : yy+rest; };
    return {from:shift(from), to:shift(to)};
  }
  if (mode==='previous'){
    // Month-aligned ranges step back whole months so "this month vs last month" is exact.
    const aligned = from.slice(8)==='01' && (to===monthEnd(monthIdOf(to)) || to===todayStr());
    if (aligned){
      const n = monthsBetween(from,to).length;
      const f = shiftMonth(monthIdOf(from), -n);
      const t = shiftMonth(monthIdOf(to), -n);
      const toDay = to===todayStr() ? Math.min(Number(to.slice(8)), daysInMonth(t)) : daysInMonth(t);
      return {from:f+'-01', to:t+'-'+pad2(toDay)};
    }
    const n = daysBetween(from,to);
    return {from:addDays(from,-n), to:addDays(to,-n)};
  }
  return null;
}
function rangeLabel(from, to){
  if (from.slice(0,7)===to.slice(0,7) && from.slice(8)==='01' && to===monthEnd(monthIdOf(to))) return monthLabel(monthIdOf(from));
  return fmtDateLabel(from)+' – '+fmtDateLabel(to);
}

async function computeReport(from, to, f){
  const months = monthsBetween(from, to);
  const inRange = (d)=> d>=from && d<=to;
  const dayDocs = [];
  for (const m of months){ (await getMonthDailyLogs(m)).forEach(doc=>{ if (doc.date && inRange(doc.date)) dayDocs.push(doc); }); }
  const nozzleFilter = f.nozzle, productFilter = f.product;
  const entryFiltered = !!(nozzleFilter || productFilter);
  const r = { from, to, days:daysBetween(from,to), revenue:0, fuelRevenue:0, oilRevenue:0, liters:0,
    byProduct:{p1:{liters:0,amount:0}, p2:{liters:0,amount:0}, p3:{liters:0,amount:0}}, byDay:{},
    payTotals: entryFiltered ? null : {pos:0, upi:0, hpCard:0, credit:0, cash:0, expenses:0},
    cashVariance:0, bowserDiff:0, duties:[], creditSales:[], oils:[], purchases:[], oilPurchases:[], expenses:[], payments:[], salaryRows:[], salary:0, salaryPaid:0, salaryAdvance:0, journal:[], receipts:[], nozzleRows:[] };
  dayDocs.forEach(doc=>{
    Object.entries(doc.duties||{}).forEach(([dutyId,x])=>{
      if (f.staff && x.staffId!==f.staff) return;
      const entries = Object.entries(x.nozzles||{}).filter(([nid,n])=> (!nozzleFilter || nid===nozzleFilter) && (!productFilter || n.product===productFilter));
      if (entryFiltered && !entries.length) return;
      let dFuel, dOil, dLtr;
      if (entryFiltered){
        dFuel = entries.reduce((s,[,n])=>s+num(n.amount),0); dOil = 0; dLtr = entries.reduce((s,[,n])=>s+num(n.liters),0);
      } else {
        dFuel = x.fuelAmount!=null ? num(x.fuelAmount) : num(x.dutyAmount) - num(x.oilAmount); dOil = num(x.oilAmount); dLtr = num(x.dutyLiters);
      }
      r.fuelRevenue += dFuel; r.oilRevenue += dOil; r.liters += dLtr;
      r.byDay[doc.date] = (r.byDay[doc.date]||0) + dFuel + dOil;
      entries.forEach(([nid,n])=>{
        if (n.product && r.byProduct[n.product]){ r.byProduct[n.product].liters += num(n.liters); r.byProduct[n.product].amount += num(n.amount); }
        const nz = state.nozzles.find(z=>z.id===nid);
        r.nozzleRows.push({date:doc.date, staffName:x.staffName, nozzle: nz?nz.name:nid, tankId:n.tankId, product:n.product, opening:n.opening, closing:n.closing, testLiters:n.testLiters, transferLiters:n.transferLiters, liters:n.liters, rate:n.rate, amount:n.amount});
      });
      if (r.payTotals){ const p = x.pay||{}; r.payTotals.pos += num(p.pos); r.payTotals.upi += num(p.upi); r.payTotals.hpCard += num(p.hpCard); r.payTotals.credit += num(p.credit); r.payTotals.cash += num(p.cash); r.payTotals.expenses += num(p.expenses); }
      // A bowser duty puts nothing in the till, so its gap never reaches the cash ledger — but it is
      // reported with the other shortages on one line rather than sitting on its own.
      r.cashVariance += dutyCashInfo(x).variance;
      r.bowserDiff += num((x.pay||{}).bowserDiff);
      r.duties.push(Object.assign({date:doc.date, id:dutyId, fuelAmount:dFuel, oilAmount:dOil, liters:dLtr}, {staffName:x.staffName, startTime:x.startTime, endTime:x.endTime, nozzleCount:(x.nozzleIds||[]).length, total:dFuel+dOil, pay:x.pay||{},
        // Carried across because the report's copy has no nozzles or cash count of its own to work it out from.
        cashInfo:dutyCashInfo(x)}));
      if (!entryFiltered){
        (x.creditSales||[]).forEach(c=>{ if (!f.creditor || c.creditorId===f.creditor) r.creditSales.push(Object.assign({date:doc.date, staffName:x.staffName}, c)); });
        (x.oils||[]).forEach(o=>r.oils.push(Object.assign({date:doc.date, staffName:x.staffName}, o)));
      }
    });
  });
  r.revenue = r.fuelRevenue + r.oilRevenue;
  for (const m of months){
    const st = await getMonthDoc('stockReceiptsMonthly', m);
    ((st&&st.items)||[]).forEach(it=>{ if (inRange(it.date) && (!productFilter || it.product===productFilter)) r.purchases.push(it); });
    const op = await getMonthDoc('oilPurchasesMonthly', m);
    ((op&&op.items)||[]).forEach(it=>{ if (inRange(it.date)) r.oilPurchases.push(it); });
    const ex = await getMonthDoc('expensesMonthly', m);
    ((ex&&ex.items)||[]).forEach(it=>{ if (!inRange(it.date)) return; if (expenseKind(it)==='payment') r.payments.push(it); else r.expenses.push(it); });
    const jn = await getMonthDoc('journalMonthly', m);
    ((jn&&jn.items)||[]).forEach(it=>{ if (inRange(it.date)) r.journal.push(it); });
    const rc = await getMonthDoc('receiptsMonthly', m);
    ((rc&&rc.items)||[]).forEach(it=>{ if (inRange(it.date) && (!f.creditor || it.creditorId===f.creditor)) r.receipts.push(it); });
    // Salary is a monthly sheet — a month counts when any part of it falls in the range.
    const sal = await getMonthDoc('salaryMonthly', m);
    // Salary is the cost EARNED in the month (base less any deduction), not what was handed over:
    // an advance already paid out is a prepayment, and the balance is still owed. Both sit on the
    // balance sheet, so the P&L carries the full month's salary either way.
    if (sal && sal.staff){ Object.entries(sal.staff).forEach(([sid,s])=>{ if (!f.staff || sid===f.staff){ r.salaryRows.push(Object.assign({month:m}, s)); r.salary += Math.max(0, num(s.baseSalary) - num(s.deduction)); r.salaryPaid += num(s.netPaid); r.salaryAdvance += num(s.advance); } }); }
  }
  r.fuelCost = r.purchases.reduce((s,i)=>s+num(i.amount),0);
  r.oilPurchaseCost = r.oilPurchases.reduce((s,i)=>s+num(i.amount),0);
  r.purchaseTotal = r.fuelCost + r.oilPurchaseCost;
  r.stockRates = await latestPurchaseRates(to);
  r.stockValue = stockValuation(r.stockRates);
  // Accrual basis: each fixed cost contributes its share of the period, and the actual payments
  // settling those costs step out of the P&L so the charge is never counted twice. What was really
  // paid is kept alongside, so the report can show whether the station is ahead or behind on each.
  r.basis = f.basis==='accrual' ? 'accrual' : 'cash';
  const schedule = state.fixedCosts.filter(fc=>fc.active!==false);
  r.fixedLines = schedule.map(fc=>{
    const accrued = accrueFixedCost(fc, from, to);
    const paid = r.expenses.concat(r.payments).filter(it=>matchesFixedCost(fc, it)).reduce((s,it)=>s+num(it.amount),0);
    return {id:fc.id, name:fc.name, account:fixedCostAccountLabel(fc), frequency:fc.frequency, perMonth:fixedMonthlyAmount(fc), accrued, paid, diff:paid-accrued};
  });
  r.fixedAccrued = r.fixedLines.reduce((s,x)=>s+x.accrued,0);
  r.fixedPaid = r.fixedLines.reduce((s,x)=>s+x.paid,0);
  if (r.basis==='accrual' && schedule.length){
    r.expensesSettlingFixed = r.expenses.filter(it=>schedule.some(fc=>matchesFixedCost(fc, it)));
    r.expenses = r.expenses.filter(it=>!schedule.some(fc=>matchesFixedCost(fc, it)));
  } else {
    r.expensesSettlingFixed = [];
  }
  r.expenseTotal = r.expenses.reduce((s,i)=>s+num(i.amount),0) + (r.basis==='accrual' ? r.fixedAccrued : 0);
  const pl = journalPL({items:r.journal}, {items:r.receipts}, {items:r.payments});
  r.otherIncome = pl.income; r.otherExpense = pl.expense; r.reversedPostings = pl.reversed;
  r.otherExpenseDetail = pl.byExpense; r.otherIncomeDetail = pl.byIncome;

  // Trading account:
  //   Gross P&L = Sales + Closing stock − Opening stock − Purchases
  //   Net P&L   = Gross P&L + Other income − Total expenses (expenses + salary + other expenses)
  // Opening stock is the position at the end of the day before the period starts.
  r.openingStock = await stockSnapshot(addDays(from, -1));
  r.closingStock = await stockSnapshot(to);
  r.stockChange = r.closingStock.totalValue - r.openingStock.totalValue;
  r.grossMargin = r.revenue + r.closingStock.totalValue - r.openingStock.totalValue - r.purchaseTotal;
  // A till that came up short is a cost; one that came up over is a small gain. Both belong in the
  // P&L, because the cash ledger already holds the counted figure rather than the expected one.
  // A Bowser billed below the fuel's value is a loss; billed above it, a gain.
  r.bowserLoss = Math.max(0, -r.bowserDiff);
  r.bowserGain = Math.max(0, r.bowserDiff);
  r.cashShort = Math.max(0, -r.cashVariance);
  r.cashOver = Math.max(0, r.cashVariance);
  r.totalExpenses = r.expenseTotal + r.salary + r.otherExpense + r.cashShort + r.bowserLoss;
  r.net = r.grossMargin + r.otherIncome + r.cashOver + r.bowserGain - r.totalExpenses;
  return r;
}

// ---- ledger statements -------------------------------------------------------------------
// Every account the app posts to is addressed by the same key used in Journal (cash, led:, acct:,
// cred:, sup:). Ledgers are grouped by their accounting group; cash/bank, creditors and suppliers
// form their own groups so a "group report" covers the whole book.
function ledgerGroupKeys(){
  return Object.entries(LEDGER_GROUPS).map(([k,g])=>({key:k, label:g.label}))
    .concat([{key:'cashbank', label:'Cash & bank'}, {key:'creditors', label:'Creditors (receivable)'}, {key:'suppliers', label:'Suppliers (payable)'}]);
}
function ledgerAccountList(){
  const out = [];
  // openingDate/openingBalance are carried through so a statement can be anchored to a confirmed
  // figure. Supplier balances are held as "what we owe", the opposite sign to the debit-positive
  // convention used here, so both the balance and its opening are flipped.
  const cash = state.ledgers.find(l=>l.cashInHand);
  if (cash) out.push({key:'cash', label:'Cash in hand', group:'cashbank', balance:num(cash.balance), balanceKind:'dr', openingDate:cash.openingDate||'', openingBalance:cash.openingBalance});
  state.accounts.filter(a=>a.kind==='bank').forEach(a=>out.push({key:'acct:'+a.id, label:a.name+' (Bank)', group:'cashbank', balance:num(a.balance), balanceKind:'dr', openingDate:a.openingDate||'', openingBalance:a.openingBalance}));
  state.accounts.filter(a=>a.kind==='receivable').forEach(a=>out.push({key:'acct:'+a.id, label:a.name, group:'creditors', balance:num(a.balance), balanceKind:'dr', openingDate:a.openingDate||'', openingBalance:a.openingBalance}));
  state.ledgers.filter(l=>!l.cashInHand).forEach(l=>out.push({key:'led:'+l.id, label:l.name, group:l.group||'asset', balance:num(l.balance), balanceKind:'dr', openingDate:l.openingDate||'', openingBalance:l.openingBalance}));
  state.creditors.forEach(c=>out.push({key:'cred:'+c.id, label:c.name+' (Creditor)', group:'creditors', balance:num(c.balance), balanceKind:'dr', openingDate:c.openingDate||'', openingBalance:c.openingBalance}));
  state.suppliers.forEach(s=>out.push({key:'sup:'+s.id, label:s.name+' (Supplier)', group:'suppliers', balance:-num(s.balance), balanceKind:'cr', openingDate:s.openingDate||'', openingBalance:s.openingBalance==null?null:-num(s.openingBalance)}));
  return out;
}
// Turns everything recorded in the period into double-entry postings: {key, date, particulars, dr, cr}.
// dr is positive for a debit, cr positive for a credit. Fuel sales and purchases post against
// synthetic Sales / Purchases accounts so each real account's statement balances.
function buildLedgerPostings(r){
  const p = [];
  const add = (key, date, particulars, dr, cr, ref)=>{ if (key && (num(dr)||num(cr))) p.push({key, date, particulars, dr:num(dr), cr:num(cr), ref:ref||''}); };
  r.duties.forEach(d=>{
    const who = `Duty — ${d.staffName}`;
    const ci = d.cashInfo || dutyCashInfo(d);
    if (ci.posted) add('cash', d.date, who + (ci.hasCount ? ' (counted)' : ''), ci.posted, 0);
    if (num(d.pay.pos)+num(d.pay.upi) && d.pay.bankAccountId) add('acct:'+d.pay.bankAccountId, d.date, who+' (POS + UPI)', num(d.pay.pos)+num(d.pay.upi), 0);
    if (num(d.pay.hpCard)){ const k = hpCardTargetKey(); if (k) add(k, d.date, who+' (HP Card)', d.pay.hpCard, 0); }
  });
  r.creditSales.forEach(c=>{ if (c.creditorId) add('cred:'+c.creditorId, c.date, `Credit sale — ${c.staffName}${c.vehicleNo?' · '+c.vehicleNo:''}`, c.amount, 0, c.indentNo||''); });
  r.purchases.forEach(it=>{
    const who = `Fuel purchase — ${it.tankName||''}`;
    if (!it.payFrom || it.payFrom==='credit'){ if (it.supplierId) add('sup:'+it.supplierId, it.date, who, 0, it.amount, it.ref||''); }
    else add(it.payFrom, it.date, who, 0, it.amount, it.ref||'');
  });
  r.expenses.concat(r.payments).forEach(it=>{
    const who = expenseKind(it)==='payment' ? `Payment — ${[it.party, it.item].filter(Boolean).join(' · ')}` : `Expense — ${it.category||''}`;
    const label = who + (it.description?' · '+it.description:'');
    if (it.paidFrom) add(it.paidFrom, it.date, label, 0, it.amount);
    // Payments debit the account they settle; a duty till payment does the same through its ledger.
    if (it.ledger && (expenseKind(it)==='payment' || it.source==='duty')) add(it.ledger, it.date, label, it.amount, 0);
  });
  r.receipts.forEach(it=>{
    const label = `Receipt — ${receiptFromLabel(it)}${it.narration?' · '+it.narration:''}`;
    add(it.into||'cash', it.date, label, it.amount, 0, it.reference||'');
    if (it.type==='creditor' && it.creditorId) add('cred:'+it.creditorId, it.date, label, 0, it.amount, it.reference||'');
    else if (it.ledger) add(it.ledger, it.date, label, 0, it.amount, it.reference||'');
  });
  // Deposits and settlements entered straight onto an account (Setup → Accounts → Add deposit /
  // Record settlement) move its balance without going through any of the sources above. Entries
  // written BY a posting carry a journalId and are already covered, so only manual ones are added —
  // otherwise the opening balance quietly absorbs whatever these moved.
  state.accounts.forEach(a=>{
    (a.ledger||[]).forEach(l=>{
      if (l.journalId || !l.date || l.date < r.from || l.date > r.to) return;
      const label = `${l.type==='deposit'?'Deposit':'Settlement'} — ${l.from||l.note||a.name}`;
      if (l.type==='deposit') add('acct:'+a.id, l.date, label, num(l.amount), 0);
      else add('acct:'+a.id, l.date, label, 0, num(l.amount));
    });
  });
  // Likewise a payment recorded straight on a creditor (Setup → Creditors → Record payment); the
  // ones raised through Receipts carry a receiptId and are already counted above.
  state.creditors.forEach(c=>{
    (c.payments||[]).forEach(pm=>{
      if (pm.receiptId || !pm.date || pm.date < r.from || pm.date > r.to) return;
      add('cred:'+c.id, pm.date, `Payment received — ${c.name}${pm.note?' · '+pm.note:''}`, 0, num(pm.amount));
    });
  });
  r.journal.forEach(it=>{
    const label = it.narration || `${targetLabel(it.debit)||it.debitLabel||''} / ${targetLabel(it.credit)||it.creditLabel||''}`;
    add(it.debit, it.date, 'Journal — '+label, it.amount, 0);
    add(it.credit, it.date, 'Journal — '+label, 0, it.amount);
  });
  p.sort((a,b)=>a.date.localeCompare(b.date));
  return p;
}
// Only today's balances are stored, so a period's opening and closing are derived: wind the live
// balance back over everything posted after the period ends to get the closing, then back over the
// period's own movement to get the opening. Reports ending today skip the first step entirely.
async function ledgerPeriodBalances(r){
  const movementAfter = {};
  if (r.to < todayStr()){
    const trailing = await computeReport(addDays(r.to, 1), todayStr(), {});
    buildLedgerPostings(trailing).forEach(p=>{ movementAfter[p.key] = (movementAfter[p.key]||0) + p.dr - p.cr; });
  }
  const movementIn = {};
  buildLedgerPostings(r).forEach(p=>{ movementIn[p.key] = (movementIn[p.key]||0) + p.dr - p.cr; });
  // An account whose opening balance has been confirmed against a statement is anchored to that
  // figure and built forward, rather than wound back from today's balance — so the report no longer
  // depends on the live balance being right. Where the two disagree, the difference is reported.
  const anchored = {};
  const withAnchor = ledgerAccountList().filter(a=>a.openingDate && a.openingBalance!=null && r.from >= a.openingDate);
  if (withAnchor.length){
    const earliest = withAnchor.map(a=>a.openingDate).sort()[0];
    const since = earliest <= r.to ? buildLedgerPostings(await computeReport(earliest, r.to, {})) : [];
    withAnchor.forEach(a=>{
      let before = 0, within = 0;
      since.forEach(p=>{
        if (p.key !== a.key || p.date < a.openingDate) return;
        if (p.date < r.from) before += p.dr - p.cr; else within += p.dr - p.cr;
      });
      const opening = num(a.openingBalance) + before;
      anchored[a.key] = {opening, closing: opening + within, movement: within, anchored:true};
    });
  }
  const out = {};
  ledgerAccountList().forEach(a=>{
    if (anchored[a.key]){ out[a.key] = anchored[a.key]; return; }
    const closing = num(a.balance) - (movementAfter[a.key]||0);
    out[a.key] = {closing, opening: closing - (movementIn[a.key]||0), movement: movementIn[a.key]||0};
  });
  return out;
}
function ledgerStatements(r, pick){
  const postings = buildLedgerPostings(r);
  const accounts = ledgerAccountList();
  const byKey = {};
  postings.forEach(x=>{ (byKey[x.key] = byKey[x.key]||[]).push(x); });
  let list = accounts;
  if (pick && pick!=='all'){
    if (pick.startsWith('grp:')){ const g = pick.slice(4); list = accounts.filter(a=>a.group===g); }
    else list = accounts.filter(a=>a.key===pick);
  }
  // With "all", skip accounts that had no movement and carry no balance, so the report stays readable.
  const bal = r.periodBalances || {};
  return list.map(a=>{
    const rows = (byKey[a.key]||[]);
    const dr = rows.reduce((s,x)=>s+x.dr,0), cr = rows.reduce((s,x)=>s+x.cr,0);
    const b = bal[a.key] || {};
    return Object.assign({}, a, {rows, dr, cr, movement:dr-cr,
      opening: b.opening!=null ? b.opening : null, closing: b.closing!=null ? b.closing : num(a.balance), anchored: !!b.anchored});
  }).filter(a=> (pick && pick!=='all' && !pick.startsWith('grp:')) ? true : (a.rows.length || num(a.balance) || num(a.opening)));
}
// ---- stock valuation ---------------------------------------------------------------------
// Fuel in a tank is valued at the most recent purchase rate for that tank, falling back to the
// latest rate seen for the same product. Scans back up to 24 months from the report's end date.
async function latestPurchaseRates(uptoDate){
  const byTank = {}, byProduct = {};
  let cursor = monthIdOf(uptoDate);
  for (let i=0; i<24; i++){
    const data = await getMonthDoc('stockReceiptsMonthly', cursor);
    // Months are scanned newest-first, so only a genuinely later purchase may replace what's held —
    // otherwise an older month would overwrite the rate found in a newer one.
    const keepLater = (map, key, it)=>{ if (!map[key] || it.date > map[key].date) map[key] = {rate:num(it.rate), date:it.date}; };
    ((data&&data.items)||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(it=>{
      if (it.date > uptoDate || !num(it.rate)) return;
      if (it.tankId) keepLater(byTank, it.tankId, it);
      if (it.product) keepLater(byProduct, it.product, it);
    });
    cursor = shiftMonth(cursor, -1);
  }
  return {byTank, byProduct};
}
// Latest purchase for the tank, else the latest for that product, else the standing cost rate set
// in Setup → Rates. Without any of those, fuel on hand would be valued at zero and the trading
// account would read as if it were free, so the report flags rows that fall through to 0.
function valuationRate(rates, tankId, product){
  const t = rates && rates.byTank[tankId];
  if (t) return t.rate;
  const p = rates && rates.byProduct[product];
  if (p) return p.rate;
  const tank = tankId && state.tanks.find(x=>x.id===tankId);
  if (tank && num(tank.costRate)) return num(tank.costRate);       // rate entered for the stock already in the tank
  return num((state.config.costRates||{})[product]);               // station-wide fallback
}
// Quantity and cost of every litre the station is holding — tanks plus any bowser stock.
function stockValuation(rates){
  const tanks = state.tanks.filter(t=>t.active!==false).map(t=>{
    const rate = valuationRate(rates, t.id, t.product);
    const qty = num(t.currentStockL);
    return {id:t.id, name:t.name, product:t.product, qty, rate, value:qty*rate, capacityL:num(t.capacityL)};
  });
  const bowsers = state.creditors.filter(c=>c.isBowser && c.active!==false).map(c=>{
    const rate = valuationRate(rates, null, c.bowserProduct);
    const qty = num(c.bowserStockL);
    return {id:c.id, name:c.name, product:c.bowserProduct, qty, rate, value:qty*rate, bowser:true};
  });
  const rows = tanks.concat(bowsers);
  // Lubricants carry their own cost rate on the product record.
  const oils = state.oilProducts.filter(p=>p.active!==false).map(p=>({
    id:p.id, name:p.name, unit:p.unit||'', qty:num(p.stockQty), rate:num(p.costRate), value:num(p.stockQty)*num(p.costRate), saleRate:num(p.saleRate),
  }));
  return {rows, totalQty:rows.reduce((s,x)=>s+x.qty,0), totalValue:rows.reduce((s,x)=>s+x.value,0),
          tankQty:tanks.reduce((s,x)=>s+x.qty,0), tankValue:tanks.reduce((s,x)=>s+x.value,0),
          oils, oilValue:oils.reduce((s,x)=>s+x.value,0)};
}

// ---- stock as at a date (for opening / closing stock in the trading account) ---------------
// Only live quantities are stored, so a past position is reconstructed by rolling those back over
// every movement recorded AFTER the date: undo purchases received, undo transfers in, add back
// what was dispensed or sold. Valued at the purchase rate ruling on that date.
async function stockSnapshot(dateStr){
  const tankBack = {}, oilBack = {}, bowserBack = {};   // movements strictly after dateStr
  const startMonth = monthIdOf(dateStr), nowMonth = monthIdOf(todayStr());
  let m = startMonth;
  for (let i=0; i<=60 && m<=nowMonth; i++){
    const fuel = await getMonthDoc('stockReceiptsMonthly', m);
    ((fuel&&fuel.items)||[]).forEach(it=>{ if (it.date>dateStr && it.tankId) tankBack[it.tankId] = (tankBack[it.tankId]||0) + num(it.liters); });
    const oilP = await getMonthDoc('oilPurchasesMonthly', m);
    ((oilP&&oilP.items)||[]).forEach(it=>{ if (it.date>dateStr && it.productId) oilBack[it.productId] = (oilBack[it.productId]||0) + num(it.qty); });
    (await getMonthDailyLogs(m)).forEach(doc=>{
      if (!doc.date || doc.date<=dateStr) return;
      Object.values(doc.duties||{}).forEach(d=>{
        Object.values(d.nozzles||{}).forEach(n=>{
          const draw = n.drawLiters!=null ? n.drawLiters : n.liters;
          if (n.tankId) tankBack[n.tankId] = (tankBack[n.tankId]||0) - num(draw);            // dispensed → add back
          if (n.transferToTankId) tankBack[n.transferToTankId] = (tankBack[n.transferToTankId]||0) + num(n.transferLiters);
        });
        (d.oils||[]).forEach(o=>{ if (o.productId) oilBack[o.productId] = (oilBack[o.productId]||0) - num(o.qty); });
        (d.creditSales||[]).forEach(c=>{ if (c.creditorId && num(c.liters)) bowserBack[c.creditorId] = (bowserBack[c.creditorId]||0) + num(c.liters); });
      });
    });
    m = shiftMonth(m, 1);
  }
  const rates = await latestPurchaseRates(dateStr);
  const oilRates = await latestOilRates(dateStr);
  const rows = [];
  state.tanks.forEach(t=>{
    const qty = num(t.currentStockL) - (tankBack[t.id]||0);
    const rate = valuationRate(rates, t.id, t.product);
    rows.push({kind:'tank', id:t.id, name:t.name, product:t.product, qty, rate, value:qty*rate});
  });
  state.creditors.filter(c=>c.isBowser).forEach(c=>{
    const qty = num(c.bowserStockL) - (bowserBack[c.id]||0);
    const rate = valuationRate(rates, null, c.bowserProduct);
    rows.push({kind:'bowser', id:c.id, name:c.name, product:c.bowserProduct, qty, rate, value:qty*rate});
  });
  state.oilProducts.forEach(p=>{
    const qty = num(p.stockQty) - (oilBack[p.id]||0);
    const rate = oilRates[p.id]!=null ? oilRates[p.id] : num(p.costRate);
    rows.push({kind:'oil', id:p.id, name:p.name, unit:p.unit||'', qty, rate, value:qty*rate});
  });
  const sum = (k)=>rows.filter(x=>k==='all'||x.kind===k).reduce((s,x)=>s+x.value,0);
  return {date:dateStr, rows, fuelValue:sum('tank')+sum('bowser'), oilValue:sum('oil'), totalValue:sum('all')};
}
// Latest oil purchase rate per product on or before a date; the product's current cost rate is the
// fallback when it was never bought through the app.
async function latestOilRates(uptoDate){
  const seen = {};   // productId -> {rate, date}; newest-first scan, so only a later date replaces
  let m = monthIdOf(uptoDate);
  for (let i=0; i<24; i++){
    const data = await getMonthDoc('oilPurchasesMonthly', m);
    ((data&&data.items)||[]).forEach(it=>{
      if (it.date>uptoDate || !it.productId || !num(it.rate)) return;
      if (!seen[it.productId] || it.date > seen[it.productId].date) seen[it.productId] = {rate:num(it.rate), date:it.date};
    });
    m = shiftMonth(m, -1);
  }
  const out = {};
  Object.entries(seen).forEach(([k,v])=>{ out[k] = v.rate; });
  return out;
}

// Litres/units held, so a zero VALUE with stock on hand (no cost rate known) is obvious rather
// than looking like an empty tank.
function stockQtyNote(snap){
  const fuelQty = (snap.rows||[]).filter(x=>x.kind!=='oil').reduce((s,x)=>s+num(x.qty),0);
  const oilQty = (snap.rows||[]).filter(x=>x.kind==='oil').reduce((s,x)=>s+num(x.qty),0);
  return liters(fuelQty) + (oilQty ? ' · oil '+numFmt(oilQty) : '');
}
// Rows holding stock that valued at zero because no purchase rate is known for them.
function unvaluedStock(snap){
  return (snap.rows||[]).filter(x=>num(x.qty)>0 && !num(x.rate));
}

function deltaPill(cur, prev, opts){
  opts = opts||{};
  const d = num(cur) - num(prev);
  if (!d && !num(prev)) return '';
  const pct = num(prev) ? Math.round((d/Math.abs(num(prev)))*100) : null;
  const good = opts.lowerIsBetter ? d<0 : d>0;
  const cls = Math.abs(d)<0.5 ? 'neutral' : (good ? 'good' : 'critical');
  return `<span class="pill ${cls}" style="margin-left:6px;">${d>=0?'+':'−'}${moneyShort(Math.abs(d))}${pct!=null?` (${pct>=0?'+':''}${pct}%)`:''}</span>`;
}
function kpi(label, cur, prev, foot, opts){
  opts = opts||{};
  const fmt = opts.fmt || moneyShort;
  const cls = opts.signColor ? (num(cur)>=0?'good':'critical') : '';
  return `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value ${cls}">${fmt(cur)}</div><div class="foot">${prev!==undefined && prev!==null ? `prev ${fmt(prev)} ${deltaPill(cur, prev, opts)}` : (foot||'')}</div></div>`;
}

async function renderReports(mount){
  const cfg = loadReportCfg();
  const sel = (id, opts, cur, allLabel)=>`<select id="${id}"><option value="">${esc(allLabel)}</option>${opts.map(o=>`<option value="${esc(o.value)}" ${o.value===cur?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
  mount.innerHTML = `
    <h1 class="page-title">Reports</h1>
    <p class="page-sub">Pick the report you need, the period it covers, and any filters. The Excel export follows the same settings.</p>
    <div class="card card-pad no-print" id="rpControls" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field" style="grid-column:span 2;"><label>Report</label><select id="rpReport">
          ${REPORT_TYPES.map(t=>`<option value="${t.id}" ${cfg.report===t.id?'selected':''}>${esc(t.label)}</option>`).join('')}
        </select></div>
        <div class="field" id="rpLedgerWrap" style="grid-column:span 2;display:${cfg.report==='ledger'?'':'none'};"><label>Ledger / group</label><select id="rpLedgerPick">
          <option value="all" ${cfg.ledgerPick==='all'?'selected':''}>All groups (grouped summary + statements)</option>
          ${ledgerGroupKeys().map(g=>`<option value="grp:${g.key}" ${cfg.ledgerPick==='grp:'+g.key?'selected':''}>Group — ${esc(g.label)}</option>`).join('')}
          ${ledgerAccountList().map(a=>`<option value="${esc(a.key)}" ${cfg.ledgerPick===a.key?'selected':''}>${esc(a.label)}</option>`).join('')}
        </select></div>
        <div class="field" id="rpCreditorWrap" style="grid-column:span 2;display:${cfg.report==='creditors'?'':'none'};"><label>Creditor</label><select id="rpCreditorPick">
          <option value="">All creditors</option>
          ${byName(state.creditors).map(c=>`<option value="${c.id}" ${cfg.creditor===c.id?'selected':''}>${esc(c.name)}${c.isBowser?' (Bowser)':''} — ${money(c.balance||0)} due</option>`).join('')}
        </select></div>
        <div class="field"><label>Period</label><select id="rpPreset">
          ${[['thisMonth','This month'],['lastMonth','Last month'],['last3','Last 3 months'],['thisQuarter','This quarter (FY)'],['fy','This financial year'],['lastFy','Last financial year'],['custom','Custom dates']].map(([v,l])=>`<option value="${v}" ${cfg.preset===v?'selected':''}>${l}</option>`).join('')}
        </select></div>
        <div class="field"><label>From</label><input type="date" id="rpFrom" value="${cfg.from||''}" max="${todayStr()}"></div>
        <div class="field"><label>To</label><input type="date" id="rpTo" value="${cfg.to||''}" max="${todayStr()}"></div>
        <div class="field"><label>Expense basis</label><select id="rpBasis">
          <option value="cash" ${cfg.basis!=="accrual"?"selected":""}>As paid (cash)</option>
          <option value="accrual" ${cfg.basis==="accrual"?"selected":""}>Accrued (spread fixed costs)</option>
        </select></div>
        <div class="field"><label>Compare with</label><select id="rpCompare">
          ${[['none','No comparison'],['previous','Previous period'],['lastYear','Same period last year']].map(([v,l])=>`<option value="${v}" ${cfg.compare===v?'selected':''}>${l}</option>`).join('')}
        </select></div>
      </div>
      <div class="form-grid" style="margin-top:4px;">
        <div class="field"><label>Staff</label>${sel('rpStaff', state.staff.map(s=>({value:s.id,label:s.name})), cfg.staff, 'All staff')}</div>
        <div class="field"><label>Product</label>${sel('rpProduct', PRODUCT_KEYS.map(k=>({value:k,label:state.config.products[k]||k})), cfg.product, 'All products')}</div>
        <div class="field"><label>Nozzle</label>${sel('rpNozzle', byName(state.nozzles).map(n=>({value:n.id,label:n.name})), cfg.nozzle, 'All nozzles')}</div>
        <div class="field"><label>Creditor</label>${sel('rpCreditor', state.creditors.map(c=>({value:c.id,label:c.name})), cfg.creditor, 'All creditors')}</div>
        <div class="field"><label>Payment method</label>${sel('rpMethod', [['cash','Cash'],['pos','POS / Card'],['upi','UPI'],['hpCard','HP Card'],['credit','Credit']].map(([v,l])=>({value:v,label:l})), cfg.method, 'All methods')}</div>
      </div>
      <div class="hint" id="rpIncludes" style="color:var(--text-faint);font-size:12px;margin-top:8px;"></div>
      <div class="row" style="margin-top:14px;">
        <button class="btn primary" id="rpRun">${icon('chart')} Run report</button>
        <button class="btn" id="rpExport" ${window.XLSX?'':'disabled title="Excel library did not load"'}>Export to Excel</button>
        <button class="btn" id="rpPrint">Save as PDF / Print</button>
        <button class="btn ghost" id="rpReset">Reset</button>
        <span class="hint" id="rpNote" style="color:var(--text-faint);font-size:12px;"></span>
      </div>
    </div>
    <div id="printHead" class="print-only"></div>
    <div id="repBody"><div class="card empty">Crunching the numbers…</div></div>
  `;
  const syncReport = ()=>{
    cfg.report = $('#rpReport').value;
    $('#rpLedgerWrap').style.display = cfg.report==='ledger' ? '' : 'none';
    $('#rpCreditorWrap').style.display = cfg.report==='creditors' ? '' : 'none';
    const ids = reportSections(cfg);
    $('#rpIncludes').textContent = 'Includes: ' + ids.map(id=>(REPORT_SECTIONS.find(s=>s.id===id)||{}).label).filter(Boolean).join(' · ');
  };
  $('#rpReport').onchange = ()=>{ syncReport(); };
  $('#rpLedgerPick').onchange = (e)=>{ cfg.ledgerPick = e.target.value; };
  // The creditor can be chosen from the report's own box or the filter row; keep the two in step.
  const syncCreditor = (v)=>{
    cfg.creditor = v;
    if ($('#rpCreditorPick')) $('#rpCreditorPick').value = v;
    if ($('#rpCreditor')) $('#rpCreditor').value = v;
  };
  $('#rpCreditorPick').onchange = (e)=>syncCreditor(e.target.value);
  syncReport();
  const syncPreset = ()=>{
    const p = $('#rpPreset').value; cfg.preset = p;
    const rng = presetRange(p);
    if (rng){ cfg.from = rng.from; cfg.to = rng.to; $('#rpFrom').value = rng.from; $('#rpTo').value = rng.to; }
    $('#rpFrom').disabled = $('#rpTo').disabled = p!=='custom';
  };
  $('#rpPreset').onchange = ()=>{ syncPreset(); };
  if (cfg.preset!=='custom' || !cfg.from || !cfg.to) syncPreset(); else { $('#rpFrom').disabled = $('#rpTo').disabled = false; }
  $('#rpFrom').onchange = (e)=>{ cfg.from = e.target.value; };
  $('#rpTo').onchange = (e)=>{ cfg.to = e.target.value; };
  $('#rpCompare').onchange = (e)=>{ cfg.compare = e.target.value; };
  $('#rpBasis').onchange = (e)=>{ cfg.basis = e.target.value; };
  [['rpStaff','staff'],['rpProduct','product'],['rpNozzle','nozzle'],['rpMethod','method']].forEach(([id,key])=>{ $('#'+id).onchange = (e)=>{ cfg[key] = e.target.value; }; });
  $('#rpCreditor').onchange = (e)=>syncCreditor(e.target.value);




  $('#rpReset').onclick = ()=>{ repCfg = defaultReportCfg(); saveReportCfg(); renderReports(mount); };
  $('#rpRun').onclick = ()=>runReport();
  $('#rpExport').onclick = ()=>runReport(true);
  $('#rpPrint').onclick = ()=>printReport();
  await runReport();
}

let lastReport = null;
async function runReport(exportAfter){
  const cfg = loadReportCfg();
  const body = $('#repBody'); if (!body) return;
  if (!cfg.from || !cfg.to || cfg.from>cfg.to){ body.innerHTML = `<div class="card empty">Pick a valid From / To range.</div>`; return; }
  saveReportCfg();
  body.innerHTML = `<div class="card empty">Crunching the numbers…</div>`;
  const filters = {staff:cfg.staff, product:cfg.product, nozzle:cfg.nozzle, creditor:cfg.creditor, method:cfg.method, basis:cfg.basis};
  const main = await computeReport(cfg.from, cfg.to, filters);
  // Opening / closing per account, used by the ledger, creditor and supplier sections.
  main.periodBalances = await ledgerPeriodBalances(main);
  const cmpRange = comparisonRange(cfg.from, cfg.to, cfg.compare);
  const cmp = cmpRange ? await computeReport(cmpRange.from, cmpRange.to, filters) : null;
  lastReport = {cfg:Object.assign({}, cfg), main, cmp};
  renderReportBody(body, cfg, main, cmp);
  const notes = [];
  if (cfg.product || cfg.nozzle) notes.push('Product / nozzle filters apply to fuel figures only — oils, collections and credit sales are hidden.');
  if (cfg.creditor) notes.push('Creditor filter applies to credit sales and receipts.');
  if (cfg.staff) notes.push('Staff filter applies to duties and salary.');
  $('#rpNote') && ($('#rpNote').textContent = notes.join(' '));
  if (exportAfter) exportReportExcel(lastReport);
}

function renderReportBody(body, cfg, r, c){
  const has = (id)=>reportSections(cfg).includes(id);
  const title = rangeLabel(r.from, r.to) + (c ? ` <span class="hint" style="font-size:13px;color:var(--text-muted);">vs ${rangeLabel(c.from, c.to)}</span>` : '');
  const filt = [cfg.staff && 'Staff: '+((state.staff.find(s=>s.id===cfg.staff)||{}).name||''), cfg.product && 'Product: '+(state.config.products[cfg.product]||''), cfg.nozzle && 'Nozzle: '+((state.nozzles.find(n=>n.id===cfg.nozzle)||{}).name||''), cfg.creditor && 'Creditor: '+((state.creditors.find(x=>x.id===cfg.creditor)||{}).name||''), cfg.method && 'Method: '+cfg.method].filter(Boolean);
  const table = (title, head, rows, foot)=> `<div class="section-head"><h2>${title}</h2><span class="hint">${rows.length} row${rows.length===1?'':'s'}</span></div>
    <div class="card"><div class="table-wrap"><table><thead><tr>${head.map(h=>`<th class="${h.num?'num':''}">${esc(h.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length? rows.map(row=>`<tr>${row.map((v,i)=>`<td class="${head[i].num?'num':''}">${v}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" class="empty">Nothing in this period.</td></tr>`}</tbody>
    ${foot?`<tfoot><tr>${foot.map((v,i)=>`<td class="${head[i].num?'num':''}" style="font-weight:700;">${v}</td>`).join('')}</tr></tfoot>`:''}</table></div></div>`;
  const sortD = (a,b)=>b.date.localeCompare(a.date);
  const P = (k)=> c ? c[k] : null;
  // Stock figures are objects, so comparisons read their total.
  const P2 = (cmp, k)=> cmp && cmp[k] ? cmp[k].totalValue : null;
  const parts = [];
  parts.push(`<div class="section-head"><h2>${title}</h2><span class="hint">${r.days} day${r.days===1?'':'s'}${filt.length?' · '+esc(filt.join(' · ')):''}</span></div>`);


  if (has('summary')){
    parts.push(`<div class="grid grid-kpi" style="margin-bottom:22px;">
      ${kpi('Sales', r.revenue, P('revenue'), `fuel ${moneyShort(r.fuelRevenue)} · oil ${moneyShort(r.oilRevenue)}`)}
      ${kpi('Purchases', r.purchaseTotal, P('purchaseTotal'), `fuel ${moneyShort(r.fuelCost)} · oil ${moneyShort(r.oilPurchaseCost)}`, {lowerIsBetter:true})}
      ${kpi('Opening stock', r.openingStock.totalValue, P2(c,'openingStock'), fmtDateLabel(r.openingStock.date)+' · '+stockQtyNote(r.openingStock))}
      ${kpi('Closing stock', r.closingStock.totalValue, P2(c,'closingStock'), fmtDateLabel(r.closingStock.date)+' · '+stockQtyNote(r.closingStock))}
      ${kpi('Gross P&L', r.grossMargin, P('grossMargin'), 'sales + closing − opening − purchases', {signColor:true})}
      ${kpi('Expenses', r.totalExpenses, P('totalExpenses'), `running ${moneyShort(r.expenseTotal)} · salary ${moneyShort(r.salary)} (earned) · other ${moneyShort(r.otherExpense)}`, {lowerIsBetter:true})}
      ${kpi('Other income', r.otherIncome, P('otherIncome'), 'journal + receipts')}
      ${kpi('Net P&L', r.net, P('net'), 'gross + other income − expenses', {signColor:true})}
      ${kpi('Fuel liters', r.liters, P('liters'), '', {fmt:liters})}
    </div>`);
    // Presented the way a trading and profit & loss account is written up: debit side on the left,
    // credit side on the right, each half totalling to the same figure.
    const tRow = (dr, drAmt, cr, crAmt, opts)=>{
      opts = opts||{};
      const cell = (label, amt, bold)=> label==null
        ? `<td></td><td class="num"></td>`
        : `<td${bold?' style="font-weight:700;"':''}>${label}</td><td class="num"${bold?' style="font-weight:700;"':''}>${amt==null?'':money(amt)}</td>`;
      return `<tr${opts.top?' style="border-top:2px solid var(--border);"':''}>${cell(dr, drAmt, opts.bold)}${cell(cr, crAmt, opts.bold)}</tr>`;
    };
    const sub = (text)=>`<div class="hint" style="font-size:11px;color:var(--text-faint);">${text}</div>`;
    const gross = r.grossMargin, net = r.net;
    const tradingDrTotal = r.openingStock.totalValue + r.purchaseTotal + Math.max(gross, 0);
    const tradingCrTotal = r.revenue + r.closingStock.totalValue + Math.max(-gross, 0);
    // A gross profit is brought down to the credit side of the P&L account; a gross loss to the
    // debit side. Each side is built as its own list and the two are paired row by row.
    const plDr = [], plCr = [];
    if (gross < 0) plDr.push(['To Gross Loss b/d', -gross]); else plCr.push(['By Gross Profit b/d', gross]);
    // Expenses are listed head by head rather than as one "running expenses" figure, largest first.
    if (r.basis==='accrual') (r.fixedLines||[]).forEach(fx=>{ if (num(fx.accrued)) plDr.push([`To ${esc(fx.name)} (accrued)`, fx.accrued]); });
    const byHead = {};
    r.expenses.forEach(it=>{ const k = it.category || 'Other'; byHead[k] = (byHead[k]||0) + num(it.amount); });
    Object.entries(byHead).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>plDr.push([`To ${esc(k)}`, v]));
    if (num(r.salary)) plDr.push(['To Salary', r.salary]);
    if (num(r.cashShort)) plDr.push(['To Cash shortage', r.cashShort]);
    if (num(r.bowserLoss)) plDr.push(['To Bowser fuel shortage', r.bowserLoss]);
    Object.entries(r.otherExpenseDetail||{}).filter(([,v])=>num(v)).sort((a,b)=>b[1]-a[1])
      .forEach(([k,v])=>plDr.push([`To ${esc(k)}`, v]));
    // Nothing at all on the debit side still needs a line, so the account reads sensibly.
    if (!plDr.length) plDr.push(['To Expenses', 0]);
    if (num(r.cashOver)) plCr.push(['By Cash excess', r.cashOver]);
    if (num(r.bowserGain)) plCr.push(['By Bowser fuel excess', r.bowserGain]);
    const incomeHeads = Object.entries(r.otherIncomeDetail||{}).filter(([,v])=>num(v)).sort((a,b)=>b[1]-a[1]);
    if (incomeHeads.length) incomeHeads.forEach(([k,v])=>plCr.push([`By ${esc(k)}`, v]));
    else plCr.push(['By Other income', r.otherIncome]);
    if (net >= 0) plDr.push(['To Net Profit', net]); else plCr.push(['By Net Loss', -net]);
    const plRows = Array.from({length: Math.max(plDr.length, plCr.length)}, (_, i)=>[plDr[i]||null, plCr[i]||null]);
    const plDrTotal = plDr.reduce((s,x)=>s+num(x[1]), 0);
    const plCrTotal = plCr.reduce((s,x)=>s+num(x[1]), 0);
    parts.push(`
      ${(()=>{
        // Stock with no known cost rate values at zero, which inflates gross profit — say so plainly.
        const bad = [...new Set(unvaluedStock(r.openingStock).concat(unvaluedStock(r.closingStock)).map(x=>x.name))];
        if (!bad.length && r.purchaseTotal) return '';
        const msgs = [];
        if (bad.length) msgs.push(`<strong>${esc(bad.join(', '))}</strong> hold stock but no purchase rate is known, so they are valued at ₹0 — which overstates gross profit. Enter what that stock cost in <strong>Setup → Tanks → Stock cost rates</strong>, or record the delivery on the <strong>Purchase</strong> tab.`);
        if (!r.purchaseTotal) msgs.push('No purchases are recorded in this period, so the whole of sales shows as gross profit. Enter deliveries on the <strong>Purchase</strong> tab for a true figure.');
        return `<div class="banner">${icon('receipt')}<div>${msgs.join('<br>')}</div></div>`;
      })()}
      ${(()=>{
        // An expense total that has gone negative (or income negative) means entries were posted the
        // wrong way round — which would otherwise show up as extra profit. Name them so they can be fixed.
        const rev = r.reversedPostings || [];
        if (!rev.length && r.totalExpenses >= 0 && r.otherIncome >= 0) return '';
        const lines = rev.map(x=>`<li style="font-size:12.5px;">${esc(fmtDateLabel(x.date))} · <strong>${esc(x.source)}</strong> ${esc(x.label||'')} — ${money(x.amount)} <span style="color:var(--text-faint);">(${esc(x.why)})</span></li>`).join('');
        return `<div class="banner">${icon('book')}<div>
          <strong>Check these entries — they look posted in the reverse direction.</strong>
          An expense ledger should be <strong>debited</strong> when you incur a cost and an income ledger <strong>credited</strong> when you earn.
          Posted the other way they reduce expenses (or income), which makes profit look higher than it is.
          ${r.totalExpenses<0?`<br>Expenses for this period total <strong>${money(r.totalExpenses)}</strong> — a negative total is almost always a reversed entry.`:''}
          ${lines?`<ul style="margin:6px 0 0;padding-left:18px;">${lines}</ul>`:''}
          <div style="font-size:12.5px;margin-top:6px;">Fix them in <strong>Journal</strong>, <strong>Receipts</strong> or <strong>Payments / Expenses</strong> — swap the debit and credit, or record a plain expense under Payments / Expenses instead.</div>
        </div></div>`;
      })()}
      ${r.basis==='accrual' ? `<div class="banner info">${icon('chart')}<div><strong>Accrued basis.</strong> Fixed costs are charged to this period by its share of each month — a full calendar month carries the whole amount, a part month its proportion — and the payments settling them are left out of the expense lines. Cash movement is unchanged; only the P&amp;L view differs.</div></div>` : ''}
      <div class="section-head"><h2>Trading Account</h2><span class="hint">${esc(rangeLabel(r.from, r.to))}${r.basis==='accrual'?' · accrued basis':''}</span></div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Particulars (Dr)</th><th class="num">Amount</th><th>Particulars (Cr)</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${tRow(`To Opening stock${sub(fmtDateLabel(r.openingStock.date)+' · fuel '+moneyShort(r.openingStock.fuelValue)+' · oil '+moneyShort(r.openingStock.oilValue))}`, r.openingStock.totalValue,
                 `By Sales${sub('fuel '+moneyShort(r.fuelRevenue)+' · oil '+moneyShort(r.oilRevenue))}`, r.revenue)}
          ${tRow(`To Purchases${sub('fuel '+moneyShort(r.fuelCost)+' · oil '+moneyShort(r.oilPurchaseCost))}`, r.purchaseTotal,
                 `By Closing stock${sub(fmtDateLabel(r.closingStock.date)+' · fuel '+moneyShort(r.closingStock.fuelValue)+' · oil '+moneyShort(r.closingStock.oilValue))}`, r.closingStock.totalValue)}
          ${gross>=0
            ? tRow('To Gross Profit c/d', gross, null, null)
            : tRow(null, null, 'By Gross Loss c/d', -gross)}
          ${tRow('Total', tradingDrTotal, 'Total', tradingCrTotal, {bold:true, top:true})}
        </tbody>
      </table></div></div>

      <div class="section-head"><h2>Profit &amp; Loss Account</h2><span class="hint">${esc(rangeLabel(r.from, r.to))}</span></div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Particulars (Dr)</th><th class="num">Amount</th><th>Particulars (Cr)</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${plRows.map(([dr, cr])=>tRow(dr?dr[0]:null, dr?dr[1]:null, cr?cr[0]:null, cr?cr[1]:null)).join('')}
          ${tRow('Total', plDrTotal, 'Total', plCrTotal, {bold:true, top:true})}
        </tbody>
      </table></div></div>
      <div class="row" style="justify-content:space-between;margin-top:10px;">
        <span class="hint" style="color:var(--text-faint);font-size:12px;">Stock is valued at cost — the purchase rate ruling on each date — across tanks, bowsers and lubricants.</span>
        <span class="pill ${net>=0?'good':'critical'}" style="font-size:13px;">${net>=0?'Net Profit':'Net Loss'} ${money(Math.abs(net))}</span>
      </div>`);
    if ((r.fixedLines||[]).length){
      // Accrued against actually paid, per charge — a positive difference means the station has paid
      // ahead, a negative one that the charge is still owed for this period.
      const accrued = r.basis==='accrual';
      parts.push(`<div class="section-head"><h2>Fixed costs</h2><span class="hint">${accrued?'accrued into this P&amp;L':'shown for reference — this report is on the as-paid basis'}</span></div>`);
      parts.push(table(accrued?'Accrued vs paid':'Fixed cost schedule', [{label:'Cost'},{label:'Charged to'},{label:'Per month',num:true},{label:'Accrued for period',num:true},{label:'Actually paid',num:true},{label:'Difference',num:true},{label:'Position'}],
        r.fixedLines.map(x=>[esc(x.name), esc(x.account), money(x.perMonth), money(x.accrued), money(x.paid), money(x.diff),
          Math.abs(x.diff)<1 ? '<span class="pill good">in line</span>'
            : (x.diff>0 ? `<span class="pill neutral">paid ahead</span>` : `<span class="pill warning">still to pay</span>`)]),
        ['Total','','', money(r.fixedAccrued), money(r.fixedPaid), money(r.fixedPaid-r.fixedAccrued), '']));
      if (accrued && (r.expensesSettlingFixed||[]).length)
        parts.push(`<div class="hint" style="color:var(--text-faint);font-size:12px;margin:-4px 0 4px;">${r.expensesSettlingFixed.length} payment(s) totalling ${money(r.expensesSettlingFixed.reduce((s,i)=>s+num(i.amount),0))} settle these charges and are excluded from the expense lines above, so nothing is counted twice.</div>`);
      else if (!accrued && r.fixedLines.some(x=>Math.abs(x.diff)>1))
        parts.push(`<div class="hint" style="color:var(--text-faint);font-size:12px;margin:-4px 0 4px;">Switch <strong>Expense basis</strong> to <em>Accrued</em> above to charge each of these to the period it belongs to instead of the date it was paid.</div>`);
    }
    if (c){
      // Period-on-period comparison of the same lines, since the T-format itself holds one period.
      const cmpLine = (label, cur, prev, lower)=>[label, money(cur), money(prev), deltaPill(cur, prev, {lowerIsBetter:lower})];
      parts.push(table(`Compared with ${esc(rangeLabel(c.from, c.to))}`, [{label:'Item'},{label:'This period',num:true},{label:'Previous',num:true},{label:'Change'}], [
        cmpLine('Sales', r.revenue, c.revenue),
        cmpLine('Purchases', r.purchaseTotal, c.purchaseTotal, true),
        cmpLine('Opening stock', r.openingStock.totalValue, c.openingStock.totalValue),
        cmpLine('Closing stock', r.closingStock.totalValue, c.closingStock.totalValue),
        cmpLine('Gross P&L', r.grossMargin, c.grossMargin),
        cmpLine('Other income', r.otherIncome, c.otherIncome),
        cmpLine('Expenses', r.totalExpenses, c.totalExpenses, true),
        cmpLine('Net P&L', r.net, c.net),
      ]));
    }
  }

  if (has('balances')){
    const cash = state.ledgers.find(l=>l.cashInHand);
    const banks = state.accounts.filter(a=>a.kind==='bank' && a.active!==false);
    const receivables = state.accounts.filter(a=>a.kind==='receivable');
    const cards = [`<div class="card kpi"><div class="label">Cash in hand</div><div class="value ${cash&&num(cash.balance)<0?'critical':''}">${moneyShort(cash?num(cash.balance):0)}</div><div class="foot">${cash?'duty cash + receipts + journal':'no cash postings yet'}</div></div>`];
    banks.forEach(a=>cards.push(`<div class="card kpi"><div class="label">${esc(a.name)}</div><div class="value ${num(a.balance)<0?'critical':''}">${moneyShort(a.balance)}</div><div class="foot">${esc(a.bankName||'bank account')}</div></div>`));
    if (banks.length>1) cards.push(`<div class="card kpi"><div class="label">All banks</div><div class="value">${moneyShort(banks.reduce((s,a)=>s+num(a.balance),0))}</div><div class="foot">${banks.length} accounts</div></div>`);
    receivables.forEach(a=>cards.push(`<div class="card kpi"><div class="label">${esc(a.name)}</div><div class="value">${moneyShort(a.balance)}</div><div class="foot">receivable</div></div>`));
    if (!banks.length) cards.push(`<div class="card kpi"><div class="label">Bank</div><div class="value">—</div><div class="foot">add one in Setup → Accounts</div></div>`);
    const sv = r.stockValue || {rows:[], totalQty:0, totalValue:0};
    cards.push(`<div class="card kpi"><div class="label">Stock on hand</div><div class="value">${moneyShort(sv.totalValue)}</div><div class="foot">fuel ${liters(sv.totalQty)}</div></div>`);
    cards.push(`<div class="card kpi"><div class="label">Oil & lubricant stock</div><div class="value">${moneyShort(sv.oilValue||0)}</div><div class="foot">${(sv.oils||[]).length} product(s)</div></div>`);
    const creditorDue = state.creditors.reduce((s,x)=>s+num(x.balance),0);
    const supplierDue = state.suppliers.reduce((s,x)=>s+num(x.balance),0);
    cards.push(`<div class="card kpi"><div class="label">Receivable from creditors</div><div class="value">${moneyShort(creditorDue)}</div><div class="foot">${state.creditors.filter(x=>num(x.balance)).length} with dues</div></div>`);
    cards.push(`<div class="card kpi"><div class="label">Payable to suppliers</div><div class="value ${supplierDue?'critical':''}">${moneyShort(supplierDue)}</div><div class="foot">${state.suppliers.filter(x=>num(x.balance)).length} with dues</div></div>`);
    parts.push(`<div class="section-head"><h2>Balances</h2><span class="hint">live, as of now</span></div><div class="grid grid-kpi" style="margin-bottom:8px;">${cards.join('')}</div>`);
    parts.push(table('Stock on hand — quantity &amp; cost', [{label:'Tank / Bowser'},{label:'Product'},{label:'Quantity',num:true},{label:'Cost rate',num:true},{label:'Value',num:true},{label:'Rate from'}],
      sv.rows.map(x=>{
        const src = x.bowser ? (r.stockRates.byProduct[x.product]||null) : (r.stockRates.byTank[x.id] || r.stockRates.byProduct[x.product] || null);
        return [esc(x.name)+(x.bowser?' <span class="hint" style="color:var(--text-faint);">(bowser)</span>':''), esc(state.config.products[x.product]||x.product||'—'), liters(x.qty), x.rate?money(x.rate):'<span class="pill warning">no purchase rate</span>', money(x.value), src?fmtDateLabel(src.date):'—'];
      }),
      ['Total','', liters(sv.totalQty), '', money(sv.totalValue), '']));
    parts.push(table('Oil &amp; lubricant stock', [{label:'Product'},{label:'Unit'},{label:'Quantity',num:true},{label:'Cost rate',num:true},{label:'Value',num:true},{label:'Selling rate',num:true}],
      (sv.oils||[]).map(x=>[esc(x.name), esc(x.unit), numFmt(x.qty)+(num(x.qty)<=0?' <span class="pill critical">out of stock</span>':''), money(x.rate), money(x.value), money(x.saleRate)]),
      ['Total','', '', '', money(sv.oilValue||0), '']));
  }

  if (has('products') || has('trend')) parts.push(`<div class="grid grid-2" style="margin-top:14px;">
    ${has('products')?`<div class="card"><div class="chart-wrap"><h3 style="margin:0 0 10px;font-size:14px;">Sales by product</h3><div id="chartProduct"></div>${c?`<div class="legend"><span class="item">prev: ${PRODUCT_KEYS.map(k=>esc((state.config.products[k]||k)+' '+moneyShort(c.byProduct[k].amount))).join(' · ')}</span></div>`:''}</div></div>`:''}
    ${has('trend')?`<div class="card"><div class="chart-wrap"><h3 style="margin:0 0 10px;font-size:14px;">Daily revenue trend</h3><div id="chartTrend"></div></div></div>`:''}
  </div>`);

  if (has('collections')){
    const methods = [['cash','Cash'],['pos','POS / Card'],['upi','UPI'],['hpCard','HP Card'],['credit','Credit'],['expenses','Till expenses']].filter(([k])=>!cfg.method || k===cfg.method || k==='expenses' && !cfg.method);
    parts.push(`<div class="section-head"><h2>Collections by payment method</h2></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Method</th><th class="num">Amount</th>${c?'<th class="num">Previous</th><th>Change</th>':''}</tr></thead><tbody>
      ${r.payTotals ? methods.map(([k,l])=>`<tr><td>${l}</td><td class="num">${money(r.payTotals[k])}</td>${c?`<td class="num">${money(c.payTotals?c.payTotals[k]:0)}</td><td>${deltaPill(r.payTotals[k], c.payTotals?c.payTotals[k]:0)}</td>`:''}</tr>`).join('') : `<tr><td colspan="${c?4:2}" class="empty">Not available with a product or nozzle filter.</td></tr>`}
      </tbody></table></div></div>`);
  }


  if (has('duties')){
    const rows = r.duties.slice().sort(sortD);
    const mcol = cfg.method ? [{label:{cash:'Cash',pos:'POS',upi:'UPI',hpCard:'HP Card',credit:'Credit'}[cfg.method], num:true}] : [];
    parts.push(table('Duties', [{label:'Date'},{label:'Staff'},{label:'Time'},{label:'Nozzles',num:true},{label:'Liters',num:true},{label:'Fuel',num:true},{label:'Oils',num:true},{label:'Total',num:true},...mcol],
      rows.map(d=>[fmtDateLabel(d.date), esc(d.staffName), esc((d.startTime||'—')+'–'+(d.endTime||'—')), d.nozzleCount, liters(d.liters), money(d.fuelAmount), money(d.oilAmount), money(d.total), ...(cfg.method?[money(d.pay[cfg.method])]:[])]),
      ['Total','','','', liters(r.liters), money(r.fuelRevenue), money(r.oilRevenue), money(r.revenue), ...(cfg.method?[money(rows.reduce((s,d)=>s+num(d.pay[cfg.method]),0))]:[])]));
  }
  if (has('creditors')){
    // Movement in the period, per creditor. The closing figure is the live balance; the opening is
    // that balance wound back over this period's sales, receipts and journal postings.
    const soldTo = {}, ltrTo = {}, recdFrom = {}, jnlTo = {};
    r.creditSales.forEach(x=>{ if (x.creditorId){ soldTo[x.creditorId] = (soldTo[x.creditorId]||0) + num(x.amount); ltrTo[x.creditorId] = (ltrTo[x.creditorId]||0) + num(x.liters); } });
    r.receipts.forEach(x=>{ if (x.type==='creditor' && x.creditorId) recdFrom[x.creditorId] = (recdFrom[x.creditorId]||0) + num(x.amount); });
    r.journal.forEach(it=>{
      if ((it.debit||'').startsWith('cred:')) jnlTo[it.debit.slice(5)] = (jnlTo[it.debit.slice(5)]||0) + num(it.amount);
      if ((it.credit||'').startsWith('cred:')) jnlTo[it.credit.slice(5)] = (jnlTo[it.credit.slice(5)]||0) - num(it.amount);
    });
    const list = state.creditors.filter(c=> cfg.creditor ? c.id===cfg.creditor : true);
    const rows = list.map(c=>{
      const sold = soldTo[c.id]||0, recd = recdFrom[c.id]||0, jnl = jnlTo[c.id]||0;
      // Closing is the balance at the period's end (today's balance wound back over anything posted
      // since), and opening is that less the period's own movement.
      const pb = (r.periodBalances||{})['cred:'+c.id];
      const closing = pb ? pb.closing : num(c.balance);
      const opening = pb ? pb.opening : (closing - sold + recd - jnl);
      const overLimit = num(c.creditLimit) && closing > num(c.creditLimit);
      return {c, sold, recd, jnl, opening, closing, overLimit};
    });
    const t = (k)=>rows.reduce((s,x)=>s+num(x[k]),0);
    parts.push(table('Creditor balances', [{label:'Creditor'},{label:'Phone'},{label:'Opening',num:true},{label:'Credit sales',num:true},{label:'Received',num:true},{label:'Closing',num:true},{label:'Credit limit',num:true},{label:'Status'}],
      rows.map(x=>[
        esc(x.c.name) + (x.c.isBowser?' <span class="hint" style="color:var(--text-faint);">(bowser)</span>':'') + (num(ltrTo[x.c.id])?`<div class="hint" style="font-size:11px;color:var(--text-faint)">${liters(ltrTo[x.c.id])} taken</div>`:''),
        esc(x.c.phone||'—'), money(x.opening), money(x.sold), money(x.recd),
        `<strong>${money(x.closing)}</strong>`,
        num(x.c.creditLimit)?money(x.c.creditLimit):'—',
        x.overLimit ? '<span class="pill critical">over limit</span>' : (x.closing>0 ? '<span class="pill warning">due</span>' : '<span class="pill good">settled</span>'),
      ]),
      ['Total','', money(t('opening')), money(t('sold')), money(t('recd')), money(t('closing')), '', '']));
    const due = rows.filter(x=>x.closing>0).length, over = rows.filter(x=>x.overLimit).length;
    parts.push(`<div class="hint" style="color:var(--text-faint);font-size:12px;margin:-4px 0 4px;">${rows.length} creditor(s) · ${due} with dues · ${over} over their credit limit. Opening and closing are the balances at the start and end of the period, derived by winding today's balance back over everything posted since. A per-creditor statement with every transaction is under the <strong>Ledger statements</strong> report.</div>`);
  }
  if (has('credit')){
    const rows = r.creditSales.slice().sort(sortD);
    parts.push(table('Credit sales', [{label:'Date'},{label:'Creditor'},{label:'Product'},{label:'Staff'},{label:'Indent'},{label:'Vehicle'},{label:'Liters',num:true},{label:'Rate',num:true},{label:'Amount',num:true}],
      rows.map(x=>[fmtDateLabel(x.date), esc(x.creditorName), esc(state.config.products[x.product]||x.product||'—'), esc(x.staffName), esc(x.indentNo||'—'), esc(x.vehicleNo||'—'), liters(x.liters), x.rate?money(x.rate):'—', money(x.amount)]),
      ['Total','','','','','', liters(rows.reduce((s,x)=>s+num(x.liters),0)), '', money(rows.reduce((s,x)=>s+num(x.amount),0))]));
  }
  if (has('oils')){
    const rows = r.oils.slice().sort(sortD);
    parts.push(table('Oil sales', [{label:'Date'},{label:'Staff'},{label:'Product'},{label:'Qty',num:true},{label:'Rate',num:true},{label:'Amount',num:true}],
      rows.map(o=>[fmtDateLabel(o.date), esc(o.staffName), esc(oilProductName(o.productId, o.name)||'—'), o.qty?numFmt(o.qty):'—', o.rate?money(o.rate):'—', money(o.amount)]),
      ['Total','','', numFmt(rows.reduce((s,o)=>s+num(o.qty),0)), '', money(r.oilRevenue)]));
    // Per-product totals, so fast and slow movers are obvious.
    const byProd = {};
    rows.forEach(o=>{ const k = oilProductName(o.productId, o.name)||'—'; const m = byProd[k] = byProd[k]||{qty:0, amount:0}; m.qty += num(o.qty); m.amount += num(o.amount); });
    parts.push(table('Oil sales by product', [{label:'Product'},{label:'Qty sold',num:true},{label:'Amount',num:true},{label:'Stock left',num:true}],
      Object.entries(byProd).sort((a,b)=>b[1].amount-a[1].amount).map(([k,v])=>{
        const p = state.oilProducts.find(x=>x.name===k);
        return [esc(k), numFmt(v.qty), money(v.amount), p?`${numFmt(p.stockQty)} ${esc(p.unit||'')}`:'—'];
      })));
  }
  if (has('purchases')){
    const rows = r.purchases.slice().sort(sortD);
    parts.push(table('Fuel purchases', [{label:'Date'},{label:'Product'},{label:'Tank'},{label:'Supplier'},{label:'Ref'},{label:'Liters',num:true},{label:'Rate',num:true},{label:'Amount',num:true}],
      rows.map(it=>[fmtDateLabel(it.date), esc(state.config.products[it.product]||it.product||'—'), esc(it.tankName||'—'), esc(it.supplier||'—'), esc(it.ref||'—'), liters(it.liters), money(it.rate), money(it.amount)]),
      ['Total','','','','', liters(rows.reduce((s,i)=>s+num(i.liters),0)), '', money(r.fuelCost)]));
  }
  if (has('expenses')){
    const rows = r.expenses.slice().sort(sortD);
    parts.push(table('Expenses', [{label:'Date'},{label:'Category'},{label:'Description'},{label:'Source'},{label:'Amount',num:true}],
      rows.map(it=>[fmtDateLabel(it.date), esc(it.category||''), esc(it.description||'—'), it.source==='duty'?'Duty till':'Manual', money(it.amount)]), ['Total','','','', money(r.expenseTotal)]));
  }
  if (has('payments')){
    const rows = r.payments.slice().sort(sortD);
    parts.push(table('Payments', [{label:'Date'},{label:'Paid to'},{label:'Payment for'},{label:'Description'},{label:'Mode'},{label:'Paid from'},{label:'Ledger'},{label:'Amount',num:true}],
      rows.map(it=>[fmtDateLabel(it.date), esc(it.party||'—'), esc(it.item||'—'), esc(it.description||'—'), esc(it.mode||'—'), esc(paidFromLabel(it.paidFrom)), esc(targetLabel(it.ledger)||'—'), money(it.amount)]), ['Total','','','','','','', money(rows.reduce((s,i)=>s+num(i.amount),0))]));
    // Totals per payment head, so recurring outflows are visible at a glance.
    const byItem = {};
    rows.forEach(it=>{ const k = it.item||'—'; byItem[k] = (byItem[k]||0) + num(it.amount); });
    parts.push(table('Payments by head', [{label:'Payment for'},{label:'Count',num:true},{label:'Amount',num:true}],
      Object.entries(byItem).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[esc(k), rows.filter(x=>(x.item||'—')===k).length, money(v)]),
      ['Total', rows.length, money(rows.reduce((s,i)=>s+num(i.amount),0))]));
  }
  if (has('salary')){
    const rows = r.salaryRows.slice().sort((a,b)=>b.month.localeCompare(a.month) || (a.name||'').localeCompare(b.name||''));
    parts.push(table('Salary', [{label:'Month'},{label:'Staff'},{label:'Base',num:true},{label:'Advance paid',num:true},{label:'Deduction',num:true},{label:'Cost to P&L',num:true},{label:'Still to pay',num:true},{label:'Status'}],
      rows.map(s=>[monthLabel(s.month), esc(s.name), money(s.baseSalary), money(s.advance), money(s.deduction),
        money(Math.max(0, num(s.baseSalary)-num(s.deduction))), money(s.netPaid),
        `<span class="pill ${s.status==='paid'?'good':'neutral'}">${s.status==='paid'?'Paid':'Pending'}</span>`]),
      ['Total','', money(rows.reduce((a,s)=>a+num(s.baseSalary),0)), money(r.salaryAdvance), money(rows.reduce((a,s)=>a+num(s.deduction),0)), money(r.salary), money(r.salaryPaid), '']));
    parts.push(`<div class="hint" style="color:var(--text-faint);font-size:12px;margin:-4px 0 4px;">The P&amp;L carries the salary <strong>earned</strong> in the month (base less deductions). An advance handed out from the till is a prepayment — it reduces what is still to pay, not the cost.</div>`);
  }
  if (has('journal')){
    const rows = r.journal.slice().sort(sortD);
    parts.push(table('Journal entries', [{label:'Date'},{label:'Debit'},{label:'Credit'},{label:'Amount',num:true},{label:'Narration'},{label:'By'}],
      rows.map(it=>[fmtDateLabel(it.date), esc(targetLabel(it.debit)||it.debitLabel||''), esc(targetLabel(it.credit)||it.creditLabel||''), money(it.amount), esc(it.narration||'—'), esc(it.by||'—')])));
  }
  if (has('receipts')){
    const rows = r.receipts.slice().sort(sortD);
    parts.push(table('Receipts', [{label:'Date'},{label:'From'},{label:'Type'},{label:'Amount',num:true},{label:'Into'},{label:'Mode'},{label:'Reference / narration'}],
      rows.map(it=>[fmtDateLabel(it.date), esc(receiptFromLabel(it)), it.type==='creditor'?'Creditor':'Other', money(it.amount), esc(it.into==='cash'?'Cash in hand':((state.accounts.find(a=>'acct:'+a.id===it.into)||{}).name||'')), esc(it.mode||''), esc([it.reference,it.narration].filter(Boolean).join(' · ')||'—')]),
      ['Total','','', money(rows.reduce((s,i)=>s+num(i.amount),0)), '','','']));
  }
  if (has('stock')){
    parts.push(`<div class="section-head"><h2>Tank levels</h2><span class="hint">live, as of now</span></div>
      <div class="grid grid-2" id="repTankCards" style="margin-bottom:8px;"></div>
      <div class="grid grid-2" id="repBowserCards" style="margin-bottom:8px;"></div>`);
    const tanks = byName(state.tanks.filter(t=>t.active!==false));
    const purchasedByTank = {};
    r.purchases.forEach(it=>{ purchasedByTank[it.tankId] = (purchasedByTank[it.tankId]||0) + num(it.liters); });
    const soldByTank = {};
    r.nozzleRows.forEach(n=>{ const tid = n.tankId; if (tid) soldByTank[tid] = (soldByTank[tid]||0) + num(n.liters); });
    parts.push(table('Tank stock', [{label:'Tank'},{label:'Product'},{label:'Capacity',num:true},{label:'Received (period)',num:true},{label:'Sold (period)',num:true},{label:'Current stock',num:true},{label:'Cost rate',num:true},{label:'Stock value',num:true},{label:'Fill'}],
      tanks.map(t=>{
        const cap = num(t.capacityL)||1, cur = num(t.currentStockL);
        const pct = clamp((cur/cap)*100,0,100), st = tankLevelStatus(pct);
        const rate = valuationRate(r.stockRates, t.id, t.product);
        return [esc(t.name), esc(state.config.products[t.product]||t.product||'—'), liters(t.capacityL), liters(purchasedByTank[t.id]||0), liters(soldByTank[t.id]||0), liters(cur), rate?money(rate):'—', money(cur*rate), `<span class="pill ${st.cls}">${pct.toFixed(0)}% · ${st.label}</span>`];
      }),
      ['Total','','','','', liters((r.stockValue||{}).tankQty), '', money((r.stockValue||{}).tankValue), '']));
    const bowsers = state.creditors.filter(c=>c.isBowser);
    if (bowsers.length) parts.push(table('Bowsers', [{label:'Bowser'},{label:'Product'},{label:'Capacity',num:true},{label:'Stock',num:true},{label:'Outstanding',num:true}],
      bowsers.map(c=>[esc(c.name), esc(state.config.products[c.bowserProduct]||c.bowserProduct||'—'), liters(c.bowserCapacityL), liters(c.bowserStockL), money(c.balance)])));
  }
  if (has('suppliers')){
    const purchasedBySup = {}, paidBySup = {};
    r.purchases.forEach(it=>{ if (it.supplierId) purchasedBySup[it.supplierId] = (purchasedBySup[it.supplierId]||0) + num(it.amount); });
    r.payments.forEach(it=>{ if ((it.ledger||'').startsWith('sup:')) { const id = it.ledger.slice(4); paidBySup[id] = (paidBySup[id]||0) + num(it.amount); } });
    // Supplier keys hold a debit-positive balance, so a payable reads as negative there — flip it
    // back to "what we owe" for display.
    const supBal = (id, which)=>{ const pb = (r.periodBalances||{})['sup:'+id]; return pb ? -num(pb[which]) : null; };
    const rows = state.suppliers.map(s=>{
      const closing = supBal(s.id,'closing')!=null ? supBal(s.id,'closing') : num(s.balance);
      const opening = supBal(s.id,'opening')!=null ? supBal(s.id,'opening') : (closing - (purchasedBySup[s.id]||0) + (paidBySup[s.id]||0));
      return {s, opening, closing};
    });
    const t = (k)=>rows.reduce((a,x)=>a+num(x[k]),0);
    parts.push(table('Supplier balances', [{label:'Supplier'},{label:'Phone'},{label:'Opening',num:true},{label:'Purchased (period)',num:true},{label:'Paid (period)',num:true},{label:'Closing',num:true}],
      rows.map(x=>[esc(x.s.name), esc(x.s.phone||'—'), money(x.opening), money(purchasedBySup[x.s.id]||0), money(paidBySup[x.s.id]||0), `<strong>${money(x.closing)}</strong>`]),
      ['Total','', money(t('opening')), money(Object.values(purchasedBySup).reduce((a,b)=>a+b,0)), money(Object.values(paidBySup).reduce((a,b)=>a+b,0)), money(t('closing'))]));
  }
  if (has('ledger')){
    const pick = (cfg.report==='creditors' && cfg.creditor) ? 'cred:'+cfg.creditor : (cfg.ledgerPick || 'all');
    const stmts = ledgerStatements(r, pick);
    const groups = {};
    stmts.forEach(s=>{ (groups[s.group] = groups[s.group]||[]).push(s); });
    const groupLabel = (k)=>(ledgerGroupKeys().find(g=>g.key===k)||{}).label||k;
    parts.push(`<div class="section-head"><h2>Ledger statements</h2><span class="hint">${stmts.length} account${stmts.length===1?'':'s'} · period transactions with running total</span></div>
      <div class="banner info">${icon('book')}<div>Each statement opens with the balance brought forward, lists the period's transactions with a running total, and closes with the balance at the period end — today's balance is also shown when it has moved since. Dr = value received by the account, Cr = value given.</div></div>`);
    // Group summary first, then a statement per account.
    const sum = (list, k)=>list.reduce((s,x)=>s+num(x[k]),0);
    parts.push(table('Group summary', [{label:'Group'},{label:'Accounts',num:true},{label:'Opening',num:true},{label:'Debits',num:true},{label:'Credits',num:true},{label:'Net movement',num:true},{label:'Closing',num:true}],
      Object.entries(groups).map(([g,list])=>[esc(groupLabel(g)), list.length, ledgerBalanceLabel(sum(list,'opening')), money(sum(list,'dr')), money(sum(list,'cr')), money(sum(list,'movement')), ledgerBalanceLabel(sum(list,'closing'))]),
      ['Total', stmts.length, ledgerBalanceLabel(sum(stmts,'opening')), money(sum(stmts,'dr')), money(sum(stmts,'cr')), money(sum(stmts,'movement')), ledgerBalanceLabel(sum(stmts,'closing'))]));
    Object.entries(groups).forEach(([g,list])=>{
      parts.push(`<div class="section-head"><h2 style="font-size:14px;">${esc(groupLabel(g))}</h2></div>`);
      list.forEach(a=>{
        // The running column starts at the opening balance, so the last row is the closing balance.
        let run = num(a.opening);
        const rows = a.rows.map(x=>{ run += x.dr - x.cr; return [fmtDateLabel(x.date), esc(x.particulars), esc(x.ref||'—'), x.dr?money(x.dr):'—', x.cr?money(x.cr):'—', ledgerBalanceLabel(run)]; });
        parts.push(`<div class="card card-pad" style="margin-bottom:12px;">
          <div class="row" style="justify-content:space-between;margin-bottom:8px;">
            <strong>${esc(a.label)}</strong>
            <span class="hint" style="color:var(--text-muted);font-size:12.5px;">Opening <strong class="mono">${ledgerBalanceLabel(a.opening)}</strong> · Closing <strong class="mono">${ledgerBalanceLabel(a.closing)}</strong>${num(a.balance)!==num(a.closing)?` · Today <strong class="mono">${ledgerBalanceLabel(a.balance)}</strong>`:''}</span>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Date</th><th>Particulars</th><th>Ref</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Running</th></tr></thead>
            <tbody>
              <tr><td colspan="3" style="font-style:italic;color:var(--text-muted);">Opening balance — ${esc(fmtDateLabel(r.from))}${a.openingDate && r.from < a.openingDate ? ` <span class="pill warning" title="This period starts before the balance you confirmed, so the opening is worked back from today rather than from a figure you verified">derived</span>` : ''}</td><td class="num">—</td><td class="num">—</td><td class="num">${ledgerBalanceLabel(a.opening)}</td></tr>
              ${rows.length? rows.map(row=>`<tr>${row.map((v,i)=>`<td class="${i>=3?'num':''}">${v}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="6" class="empty">No transactions in this period.</td></tr>`}
            </tbody>
            <tfoot><tr><td colspan="3" style="font-weight:700;">Closing balance</td><td class="num" style="font-weight:700;">${money(a.dr)}</td><td class="num" style="font-weight:700;">${money(a.cr)}</td><td class="num" style="font-weight:700;">${ledgerBalanceLabel(a.closing)}</td></tr></tfoot>
          </table></div>
          ${a.openingDate && r.from < a.openingDate ? `<div class="hint" style="color:var(--warning);font-size:12px;margin-top:8px;">This period starts before ${esc(fmtDateLabel(a.openingDate))}, the date your confirmed balance of <strong>${money(a.openingBalance)}</strong> applies to. Anything that happened before your records begin is rolled into the opening figure above, so it will not match a bank statement. Run the report from ${esc(fmtDateLabel(a.openingDate))} for figures that tie out.</div>` : ''}
          ${a.anchored ? `<div class="hint" style="font-size:12px;margin-top:8px;color:${Math.abs(num(a.closing)-num(a.balance))<0.5?'var(--text-faint)':'var(--warning)'};">Built forward from your confirmed balance of <strong>${money(a.openingBalance)}</strong> on ${esc(fmtDateLabel(a.openingDate))}.${Math.abs(num(a.closing)-num(a.balance))<0.5 ? ' It agrees with the running balance the app holds.' : ` The app's live balance is <strong>${money(a.balance)}</strong> — a difference of <strong>${money(num(a.balance)-num(a.closing))}</strong>, which usually means something was recorded without a date in this range, or the live balance was corrected by hand.`}</div>` : ''}
        </div>`);
      });
    });
  }
  // Detail the Excel export carries but the screen shows as charts or leaves out. Printed only, so
  // the PDF is as complete as the spreadsheet without burying the screen in rows.
  if (has('trend')){
    const days = []; for (let dd=r.from; dd<=r.to; dd=addDays(dd,1)) days.push(dd);
    const byDayDuties = {};
    r.duties.forEach(x=>{ (byDayDuties[x.date] = byDayDuties[x.date]||[]).push(x); });
    const rows = days.filter(dd=>num(r.byDay[dd]) || (byDayDuties[dd]||[]).length).map(dd=>{
      const list = byDayDuties[dd]||[];
      const fuel = list.reduce((s,x)=>s+num(x.fuelAmount),0), oil = list.reduce((s,x)=>s+num(x.oilAmount),0);
      return [fmtDateLabel(dd), list.length, liters(list.reduce((s,x)=>s+num(x.liters),0)), money(fuel), money(oil), money(fuel+oil)];
    });
    parts.push(`<div class="print-only">${table('Daily sales', [{label:'Date'},{label:'Duties',num:true},{label:'Liters',num:true},{label:'Fuel',num:true},{label:'Oils',num:true},{label:'Total',num:true}],
      rows, ['Total','', liters(r.liters), money(r.fuelRevenue), money(r.oilRevenue), money(r.revenue)])}</div>`);
  }
  if (has('duties') || has('products')){
    const rows = r.nozzleRows.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(n=>[
      fmtDateLabel(n.date), esc(n.staffName), esc(n.nozzle), esc(state.config.products[n.product]||n.product||'—'),
      numFmt(n.opening), numFmt(n.closing), liters(n.testLiters), liters(n.transferLiters), liters(n.liters), money(n.rate), money(n.amount)]);
    parts.push(`<div class="print-only">${table('Nozzle readings', [{label:'Date'},{label:'Staff'},{label:'Nozzle'},{label:'Product'},{label:'Opening',num:true},{label:'Closing',num:true},{label:'Test',num:true},{label:'Transfer',num:true},{label:'Sale',num:true},{label:'Rate',num:true},{label:'Amount',num:true}],
      rows)}</div>`);
  }
  body.innerHTML = parts.join('');
  if (has('stock')){
    if ($('#repTankCards')) renderTankCards($('#repTankCards'), {});
    if ($('#repBowserCards')) renderBowserCards($('#repBowserCards'));
  }
  if (has('products')) drawProductChart($('#chartProduct'), r.byProduct);
  if (has('trend')) drawTrendChart($('#chartTrend'), r.byDay, r.from, r.to, c ? {byDay:c.byDay, from:c.from, to:c.to} : null);
}

// Builds a multi-sheet .xlsx for the current report entirely in the browser (SheetJS) and
// triggers the download. Numbers are written as numbers so Excel can total them.
// Every report type renders into the same body, so one print path covers all of them. The browser's
// own print dialog turns it into a PDF, which keeps the text selectable and needs no extra library.
function printReport(){
  const head = $('#printHead');
  if (!head || !lastReport){ window.print(); return; }
  const {cfg, main:r, cmp:c} = lastReport;
  const type = (REPORT_TYPES.find(t=>t.id===cfg.report)||{}).label || 'Report';
  const filt = [
    cfg.staff && 'Staff: '+((state.staff.find(s=>s.id===cfg.staff)||{}).name||''),
    cfg.product && 'Product: '+(state.config.products[cfg.product]||''),
    cfg.nozzle && 'Nozzle: '+((state.nozzles.find(n=>n.id===cfg.nozzle)||{}).name||''),
    cfg.creditor && 'Creditor: '+((state.creditors.find(x=>x.id===cfg.creditor)||{}).name||''),
    cfg.method && 'Method: '+cfg.method,
    cfg.basis==='accrual' && 'Accrued basis',
  ].filter(Boolean);
  head.innerHTML = `
    <div style="border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:14px;">
      <div style="font-size:18px;font-weight:800;">${esc(state.config.stationName||'Fuel Ledger')}</div>
      <div style="font-size:14px;margin-top:2px;">${esc(type)} — ${esc(rangeLabel(r.from, r.to))}${c?` (compared with ${esc(rangeLabel(c.from, c.to))})`:''}</div>
      ${filt.length?`<div style="font-size:11.5px;margin-top:2px;">${esc(filt.join(' · '))}</div>`:''}
      <div style="font-size:11px;margin-top:4px;">Printed ${esc(fmtDateLabel(todayStr()))}${state.currentUser?' by '+esc(state.currentUser.name):''}</div>
    </div>`;
  window.print();
}
function exportReportExcel(rep){
  if (!rep || !window.XLSX) return;
  const {cfg, main:r, cmp:c} = rep;
  const has = (id)=>reportSections(cfg).includes(id);
  const r2 = (n)=> Math.round(num(n)*100)/100;
  const wb = XLSX.utils.book_new();
  const addSheet = (name, rows, widths)=>{
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (widths) ws['!cols'] = widths.map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  const station = state.config.stationName || 'Fuel Ledger';
  const label = rangeLabel(r.from, r.to);
  const filt = [cfg.staff && 'Staff: '+((state.staff.find(s=>s.id===cfg.staff)||{}).name||''), cfg.product && 'Product: '+(state.config.products[cfg.product]||''), cfg.nozzle && 'Nozzle: '+((state.nozzles.find(n=>n.id===cfg.nozzle)||{}).name||''), cfg.creditor && 'Creditor: '+((state.creditors.find(x=>x.id===cfg.creditor)||{}).name||''), cfg.method && 'Method: '+cfg.method].filter(Boolean);

  if (has('summary') || has('collections') || has('products') || has('balances')){
    // '_opening' / '_closing' read the stock snapshot objects and are shown as deductions/additions.
    const v = (o,k)=> !o ? 0 : (k==='_opening' ? -num(o.openingStock&&o.openingStock.totalValue) : k==='_opening2' ? num(o.openingStock&&o.openingStock.totalValue) : k==='_closing' ? num(o.closingStock&&o.closingStock.totalValue) : num(o[k]));
    const line = (name, k)=> c ? [name, r2(v(r,k)), r2(v(c,k)), r2(v(r,k)-v(c,k))] : [name, r2(v(r,k))];
    const rows = [[station], [`Report — ${label}`], filt.length?['Filters', filt.join(' · ')]:[], []];
    if (has('summary')){
      // Trading and P&L accounts in the same two-sided layout as the screen.
      const g = num(r.grossMargin), n = num(r.net);
      rows.push(['TRADING ACCOUNT — '+label + (r.basis==='accrual'?' (accrued basis)':'')], ['Particulars (Dr)', 'Amount (₹)', 'Particulars (Cr)', 'Amount (₹)'],
        ['To Opening stock', r2(r.openingStock.totalValue), 'By Sales', r2(r.revenue)],
        ['   fuel', r2(r.openingStock.fuelValue), '   fuel', r2(r.fuelRevenue)],
        ['   oil', r2(r.openingStock.oilValue), '   oil', r2(r.oilRevenue)],
        ['To Purchases', r2(r.purchaseTotal), 'By Closing stock', r2(r.closingStock.totalValue)],
        ['   fuel', r2(r.fuelCost), '   fuel', r2(r.closingStock.fuelValue)],
        ['   oil', r2(r.oilPurchaseCost), '   oil', r2(r.closingStock.oilValue)],
        g>=0 ? ['To Gross Profit c/d', r2(g), '', ''] : ['', '', 'By Gross Loss c/d', r2(-g)],
        ['Total', r2(r.openingStock.totalValue + r.purchaseTotal + Math.max(g,0)), 'Total', r2(r.revenue + r.closingStock.totalValue + Math.max(-g,0))],
        [],
        ['PROFIT & LOSS ACCOUNT — '+label], ['Particulars (Dr)', 'Amount (₹)', 'Particulars (Cr)', 'Amount (₹)'],
        ...(function(){
          // Same pairing as on screen: gross loss sits on the debit side, gross profit on the credit side.
          const dr = [], cr = [];
          if (g < 0) dr.push(['To Gross Loss b/d', r2(-g)]); else cr.push(['By Gross Profit b/d', r2(g)]);
          if (r.basis==='accrual') (r.fixedLines||[]).forEach(fx=>{ if (num(fx.accrued)) dr.push([`To ${fx.name} (accrued)`, r2(fx.accrued)]); });
          const byHead = {};
          r.expenses.forEach(it=>{ const k = it.category || 'Other'; byHead[k] = (byHead[k]||0) + num(it.amount); });
          Object.entries(byHead).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>dr.push([`To ${k}`, r2(v)]));
          if (num(r.salary)) dr.push(['To Salary', r2(r.salary)]);
          if (num(r.cashShort)) dr.push(['To Cash shortage', r2(r.cashShort)]);
          if (num(r.bowserLoss)) dr.push(['To Bowser fuel shortage', r2(r.bowserLoss)]);
          Object.entries(r.otherExpenseDetail||{}).filter(([,v])=>num(v)).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>dr.push([`To ${k}`, r2(v)]));
          if (!dr.length) dr.push(['To Expenses', 0]);
          if (num(r.cashOver)) cr.push(['By Cash excess', r2(r.cashOver)]);
          if (num(r.bowserGain)) cr.push(['By Bowser fuel excess', r2(r.bowserGain)]);
          const incHeads = Object.entries(r.otherIncomeDetail||{}).filter(([,v])=>num(v)).sort((a,b)=>b[1]-a[1]);
          if (incHeads.length) incHeads.forEach(([k,v])=>cr.push([`By ${k}`, r2(v)]));
          else cr.push(['By Other income', r2(r.otherIncome)]);
          if (n >= 0) dr.push(['To Net Profit', r2(n)]); else cr.push(['By Net Loss', r2(-n)]);
          const out = [];
          for (let i=0; i<Math.max(dr.length, cr.length); i++) out.push([(dr[i]||['',''])[0], (dr[i]||['',''])[1], (cr[i]||['',''])[0], (cr[i]||['',''])[1]]);
          out.push(['Total', dr.reduce((s,x)=>s+num(x[1]),0), 'Total', cr.reduce((s,x)=>s+num(x[1]),0)]);
          return out;
        })(),
        [], ['Fuel liters sold', r2(r.liters)], []);
      if (c) rows.push(['COMPARISON', 'This period', 'Previous ('+rangeLabel(c.from,c.to)+')', 'Change'],
        line('Sales','revenue'), line('Purchases','purchaseTotal'), line('Opening stock','_opening2'), line('Closing stock','_closing'),
        line('Gross P&L','grossMargin'), line('Other income','otherIncome'), line('Expenses','totalExpenses'), line('Net P&L','net'), []);
    }
    if (has('collections') && r.payTotals){
      rows.push(c?['Collections by method','This period','Previous','Change']:['Collections by method', 'Amount (₹)']);
      [['cash','Cash'],['pos','POS / Card'],['upi','UPI'],['hpCard','HP Card'],['credit','Credit'],['expenses','Till expenses']].forEach(([k,l])=>{ if (!cfg.method || k===cfg.method) rows.push(c?[l, r2(r.payTotals[k]), r2(c.payTotals?c.payTotals[k]:0), r2(r.payTotals[k]-(c.payTotals?c.payTotals[k]:0))]:[l, r2(r.payTotals[k])]); });
      rows.push([]);
    }
    if (has('products')){
      rows.push(c?['Sales by product','Liters','Amount (₹)','Prev liters','Prev amount']:['Sales by product', 'Liters', 'Amount (₹)']);
      PRODUCT_KEYS.forEach(k=>rows.push(c?[state.config.products[k]||k, r2(r.byProduct[k].liters), r2(r.byProduct[k].amount), r2(c.byProduct[k].liters), r2(c.byProduct[k].amount)]:[state.config.products[k]||k, r2(r.byProduct[k].liters), r2(r.byProduct[k].amount)]));
      rows.push([]);
    }
    if (has('balances')){
      const cash = state.ledgers.find(l=>l.cashInHand);
      const sv = r.stockValue || {totalQty:0, totalValue:0};
      rows.push(['Balances (as of export)', 'Amount (₹)'], ['Cash in hand', r2(cash?cash.balance:0)]);
      state.accounts.filter(a=>a.kind==='bank').forEach(a=>rows.push([a.name+' (bank)', r2(a.balance)]));
      state.accounts.filter(a=>a.kind==='receivable').forEach(a=>rows.push([a.name+' (receivable)', r2(a.balance)]));
      rows.push(['Stock on hand (L)', r2(sv.totalQty)], ['Stock on hand (value)', r2(sv.totalValue)],
        ['Receivable from creditors', r2(state.creditors.reduce((s,x)=>s+num(x.balance),0))],
        ['Payable to suppliers', r2(state.suppliers.reduce((s,x)=>s+num(x.balance),0))]);
    }
    addSheet('Summary', rows, [32, 18, 32, 18, 14]);
  }
  if (has('trend')){
    const days = []; for (let d=r.from; d<=r.to; d=addDays(d,1)) days.push(d);
    addSheet('Daily sales', [c?['Date','Sales (₹)','Prev date','Prev sales (₹)']:['Date', 'Sales (₹)'], ...days.map((d,i)=>{ const row=[d, r2(r.byDay[d]||0)]; if (c){ const pd = addDays(c.from,i); row.push(pd<=c.to?pd:'', pd<=c.to?r2(c.byDay[pd]||0):''); } return row; })], [12, 14, 12, 14]);
  }
  if (has('duties')) addSheet('Duties', [
    ['Date', 'Staff', 'Start', 'End', 'Nozzles', 'Liters', 'Fuel (₹)', 'Oils (₹)', 'Total (₹)', 'Cash', 'POS', 'UPI', 'HP Card', 'Credit', 'Till expenses'],
    ...r.duties.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(d=>[d.date, d.staffName, d.startTime||'', d.endTime||'', d.nozzleCount, r2(d.liters), r2(d.fuelAmount), r2(d.oilAmount), r2(d.total), r2(d.pay.cash), r2(d.pay.pos), r2(d.pay.upi), r2(d.pay.hpCard), r2(d.pay.credit), r2(d.pay.expenses)]),
  ], [12, 18, 7, 7, 8, 10, 12, 10, 12, 12, 10, 10, 10, 10, 12]);
  if (has('duties') || has('products')) addSheet('Nozzle readings', [
    ['Date', 'Staff', 'Nozzle', 'Product', 'Opening', 'Closing', 'Test (L)', 'Transfer (L)', 'Sale (L)', 'Rate', 'Amount (₹)'],
    ...r.nozzleRows.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(n=>[n.date, n.staffName, n.nozzle, state.config.products[n.product]||n.product||'', r2(n.opening), r2(n.closing), r2(n.testLiters), r2(n.transferLiters), r2(n.liters), r2(n.rate), r2(n.amount)]),
  ], [12, 18, 12, 14, 12, 12, 9, 11, 10, 9, 12]);
  if (has('credit')) addSheet('Credit sales', [['Date', 'Creditor', 'Product', 'Staff', 'Indent No.', 'Vehicle No.', 'Liters', 'Rate (₹)', 'Amount (₹)'], ...r.creditSales.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date, x.creditorName, state.config.products[x.product]||x.product||'', x.staffName, x.indentNo||'', x.vehicleNo||'', r2(x.liters), r2(x.rate), r2(x.amount)])], [12, 22, 14, 18, 12, 14, 10, 12, 14]);
  if (has('oils')) addSheet('Oil sales', [['Date', 'Staff', 'Product', 'Qty', 'Rate (₹)', 'Amount (₹)'], ...r.oils.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(o=>[o.date, o.staffName, oilProductName(o.productId, o.name), r2(o.qty), r2(o.rate), r2(o.amount)])], [12, 18, 26, 10, 12, 14]);
  if (has('purchases')) addSheet('Purchases', [['Date', 'Product', 'Tank', 'Supplier', 'Invoice / DO', 'Liters', 'Rate', 'Amount (₹)'], ...r.purchases.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(it=>[it.date, state.config.products[it.product]||it.product||'', it.tankName||'', it.supplier||'', it.ref||'', r2(it.liters), r2(it.rate), r2(it.amount)])], [12, 14, 12, 16, 14, 10, 9, 12]);
  if (has('summary') && (r.fixedLines||[]).length) addSheet('Fixed costs', [
    ['Cost', 'Charged to', 'Frequency', 'Per month (₹)', 'Accrued for period (₹)', 'Actually paid (₹)', 'Difference (₹)'],
    ...r.fixedLines.map(x=>[x.name, x.account, (FIXED_FREQ[x.frequency]||{}).label||x.frequency||'', r2(x.perMonth), r2(x.accrued), r2(x.paid), r2(x.diff)]),
    ['Total', '', '', '', r2(r.fixedAccrued), r2(r.fixedPaid), r2(r.fixedPaid-r.fixedAccrued)],
  ], [26, 22, 12, 16, 20, 18, 16]);
  if (has('expenses')) addSheet('Expenses', [['Date', 'Category', 'Description', 'Source', 'Amount (₹)'], ...r.expenses.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(it=>[it.date, it.category||'', it.description||'', it.source==='duty'?'Duty till':'Manual', r2(it.amount)])], [12, 22, 30, 10, 12]);
  if (has('payments')) addSheet('Payments', [['Date', 'Paid to', 'Payment for', 'Description', 'Mode', 'Paid from', 'Ledger', 'Amount (₹)'], ...r.payments.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(it=>[it.date, it.party||'', it.item||'', it.description||'', it.mode||'', paidFromLabel(it.paidFrom), targetLabel(it.ledger)||'', r2(it.amount)])], [12, 22, 20, 30, 12, 16, 22, 12]);
  if (has('salary')) addSheet('Salary', [['Month', 'Staff', 'Wage type', 'Hours', 'Base (₹)', 'Advance paid (₹)', 'Deduction (₹)', 'Cost to P&L (₹)', 'Still to pay (₹)', 'Status', 'Paid date'], ...r.salaryRows.map(s=>[s.month, s.name, s.wageType||'monthly', s.hoursWorked!=null?r2(s.hoursWorked):'', r2(s.baseSalary), r2(s.advance), r2(s.deduction), r2(Math.max(0,num(s.baseSalary)-num(s.deduction))), r2(s.netPaid), s.status||'', s.paidDate||''])], [10, 18, 10, 8, 12, 15, 13, 16, 15, 9, 12]);
  if (has('journal')) addSheet('Journal', [['Date', 'Debit (Dr)', 'Credit (Cr)', 'Amount (₹)', 'Narration', 'By'], ...r.journal.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(it=>[it.date, targetLabel(it.debit)||it.debitLabel||'', targetLabel(it.credit)||it.creditLabel||'', r2(it.amount), it.narration||'', it.by||''])], [12, 28, 28, 12, 36, 14]);
  if (has('receipts')) addSheet('Receipts', [['Date', 'From', 'Type', 'Amount (₹)', 'Into', 'Mode', 'Reference', 'Narration', 'Ledger', 'By'], ...r.receipts.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(it=>[it.date, receiptFromLabel(it), it.type==='creditor'?'Creditor':'Other', r2(it.amount), it.into==='cash'?'Cash in hand':((state.accounts.find(a=>'acct:'+a.id===it.into)||{}).name||''), it.mode||'', it.reference||'', it.narration||'', targetLabel(it.ledger)||'', it.by||''])], [12, 24, 10, 12, 18, 12, 14, 30, 22, 14]);
  if (has('stock')) addSheet('Oil stock', [
    ['Product', 'Unit', 'Quantity', 'Cost rate (₹)', 'Value (₹)', 'Selling rate (₹)'],
    ...((r.stockValue&&r.stockValue.oils)||[]).map(x=>[x.name, x.unit, r2(x.qty), r2(x.rate), r2(x.value), r2(x.saleRate)]),
    ['Total', '', '', '', r2((r.stockValue||{}).oilValue), ''],
  ], [28, 10, 12, 14, 14, 16]);
  if (has('stock')) addSheet('Tank stock', [
    ['Tank', 'Product', 'Capacity (L)', 'Current stock (L)', 'Fill %'],
    ...state.tanks.map(t=>[t.name, state.config.products[t.product]||t.product||'', r2(t.capacityL), r2(t.currentStockL), num(t.capacityL)?Math.round((num(t.currentStockL)/num(t.capacityL))*100):'']),
    [], ['Bowser', 'Product', 'Capacity (L)', 'Stock (L)', 'Outstanding (₹)'],
    ...state.creditors.filter(c=>c.isBowser).map(c=>[c.name, state.config.products[c.bowserProduct]||c.bowserProduct||'', r2(c.bowserCapacityL), r2(c.bowserStockL), r2(c.balance)]),
  ], [20, 16, 14, 16, 10]);
  if (has('creditors')) addSheet('Creditors', [
    ['Creditor', 'Phone', 'Vehicle', 'Credit limit (₹)', 'Opening (₹)', 'Credit sales (₹)', 'Received (₹)', 'Closing (₹)', 'Bowser stock (L)', 'Status'],
    ...state.creditors.filter(c=>cfg.creditor?c.id===cfg.creditor:true).map(c=>{
      const pb = (r.periodBalances||{})['cred:'+c.id] || {};
      const closing = pb.closing!=null ? pb.closing : num(c.balance);
      const sold = r.creditSales.filter(x=>x.creditorId===c.id).reduce((s,x)=>s+num(x.amount),0);
      const recd = r.receipts.filter(x=>x.type==='creditor' && x.creditorId===c.id).reduce((s,x)=>s+num(x.amount),0);
      return [c.name, c.phone||'', c.vehicleNo||'', r2(c.creditLimit), r2(pb.opening!=null?pb.opening:closing-sold+recd), r2(sold), r2(recd), r2(closing), c.isBowser?r2(c.bowserStockL):'',
        num(c.creditLimit)&&closing>num(c.creditLimit)?'Over limit':(closing>0?'Due':'Settled')];
    }),
  ], [24, 14, 14, 16, 16, 16, 16, 16, 16, 12]);
  if (has('suppliers')) addSheet('Suppliers', [
    ['Supplier', 'Phone', 'Opening (₹)', 'Purchased (₹)', 'Paid (₹)', 'Closing (₹)', 'Notes'],
    ...state.suppliers.map(s=>{
      const pb = (r.periodBalances||{})['sup:'+s.id] || {};
      const closing = pb.closing!=null ? -num(pb.closing) : num(s.balance);
      const purchased = r.purchases.filter(x=>x.supplierId===s.id).reduce((a,x)=>a+num(x.amount),0)
        + r.oilPurchases.filter(x=>x.supplierId===s.id).reduce((a,x)=>a+num(x.amount),0);
      const paid = r.payments.filter(x=>x.ledger==='sup:'+s.id).reduce((a,x)=>a+num(x.amount),0);
      return [s.name, s.phone||'', r2(pb.opening!=null?-num(pb.opening):closing-purchased+paid), r2(purchased), r2(paid), r2(closing), s.notes||''];
    }),
  ], [24, 14, 16, 16, 16, 16, 30]);
  if (has('ledger')){
    const stmts = ledgerStatements(r, cfg.ledgerPick||'all');
    const groupLabel = (k)=>(ledgerGroupKeys().find(g=>g.key===k)||{}).label||k;
    const rows = [['Group', 'Account', 'Date', 'Particulars', 'Ref', 'Debit (₹)', 'Credit (₹)', 'Running (₹)']];
    stmts.forEach(a=>{
      let run = num(a.opening);
      rows.push([groupLabel(a.group), a.label, r.from, 'OPENING BALANCE', '', '', '', r2(run)]);
      a.rows.forEach(x=>{ run += x.dr - x.cr; rows.push([groupLabel(a.group), a.label, x.date, x.particulars, x.ref||'', r2(x.dr), r2(x.cr), r2(run)]); });
      rows.push([groupLabel(a.group), a.label, r.to, 'CLOSING BALANCE', '', r2(a.dr), r2(a.cr), r2(a.closing)], []);
    });
    addSheet('Ledger', rows, [22, 26, 12, 40, 14, 14, 14, 16]);
    addSheet('Ledger summary', [
      ['Group', 'Account', 'Opening (₹)', 'Debits (₹)', 'Credits (₹)', 'Net movement (₹)', 'Closing (₹)', 'Balance today (₹)'],
      ...stmts.map(a=>[groupLabel(a.group), a.label, r2(a.opening), r2(a.dr), r2(a.cr), r2(a.movement), r2(a.closing), r2(a.balance)]),
    ], [22, 26, 16, 14, 14, 18, 16, 18]);
  }
  if (has('balances')) addSheet('Balances', [
    ['Ledgers', 'Group', 'Balance (₹, Dr +/Cr −)'],
    ...state.ledgers.map(l=>[l.name, (LEDGER_GROUPS[l.group]||{}).label||l.group||'', r2(l.balance)]),
    [], ['Creditors', 'Phone', 'Outstanding (₹)', 'Bowser stock (L)'],
    ...state.creditors.map(cr=>[cr.name, cr.phone||'', r2(cr.balance), cr.isBowser?r2(cr.bowserStockL):'']),
    [], ['Accounts', 'Kind', 'Balance (₹)'],
    ...state.accounts.map(a=>[a.name, a.kind||'', r2(a.balance)]),
    [], ['Suppliers', 'Phone', 'Payable (₹)'],
    ...state.suppliers.map(s=>[s.name, s.phone||'', r2(s.balance)]),
    [], ['Stock on hand', 'Product', 'Quantity (L)', 'Cost rate (₹/L)', 'Value (₹)', 'Capacity (L)'],
    ...((r.stockValue&&r.stockValue.rows)||[]).map(x=>[x.name+(x.bowser?' (bowser)':''), state.config.products[x.product]||x.product||'', r2(x.qty), r2(x.rate), r2(x.value), x.capacityL?r2(x.capacityL):'']),
    ['Total', '', r2((r.stockValue||{}).totalQty), '', r2((r.stockValue||{}).totalValue), ''],
  ], [24, 16, 16, 18, 16, 16]);
  if (!wb.SheetNames.length) addSheet('Summary', [[station], [`Report — ${label}`], ['No sections selected.']]);

  const safeName = station.replace(/[^\w]+/g,'-').replace(/^-|-$/g,'');
  XLSX.writeFile(wb, `${safeName}-${r.from}-to-${r.to}.xlsx`);
  logActivity({entity:'Report', entityLabel:label, action:'add', summary:'Exported report to Excel'});
}

function drawProductChart(el, byProduct){
  if (!el) return;
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

// Line of daily revenue across the range; a comparison period is drawn as a faint dashed line
// aligned by day number.
function drawTrendChart(el, byDay, from, to, cmp){
  if (!el) return;
  const W=520,H=180,padL=8,padR=8,padT=10,padB=24;
  const series = (bd, f, t)=>{ const v=[]; for (let d=f; d<=t; d=addDays(d,1)) v.push(bd[d]||0); return v; };
  const vals = series(byDay, from, to);
  const cvals = cmp ? series(cmp.byDay, cmp.from, cmp.to) : [];
  const n = Math.max(vals.length, cvals.length, 2);
  const max = Math.max(1, ...vals, ...cvals);
  const innerW = W-padL-padR, innerH = H-padT-padB;
  const toPts = (v)=> v.map((y,i)=>[padL + (i/(n-1))*innerW, padT + innerH - (y/max)*innerH]);
  const path = (pts)=> pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const pts = toPts(vals);
  const line = path(pts);
  const area = line + ` L${pts[pts.length-1][0].toFixed(1)},${padT+innerH} L${pts[0][0].toFixed(1)},${padT+innerH} Z`;
  const lastPt = pts[pts.length-1];
  const gridLines = [0,0.5,1].map(f=>padT+innerH*f).map(y=>`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`).join('');
  const labels = `<text x="${padL}" y="${H-6}" font-size="11">${esc(fmtDateLabel(from))}</text><text x="${W-padR}" y="${H-6}" font-size="11" text-anchor="end">${esc(fmtDateLabel(to))}</text>`;
  const cmpPath = cvals.length ? `<path d="${path(toPts(cvals))}" fill="none" stroke="var(--text-faint)" stroke-width="1.5" stroke-dasharray="4 3"/>` : '';
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
    ${gridLines}${cmpPath}
    <path d="${area}" fill="var(--brand)" opacity="0.12" stroke="none"/>
    <path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="3.5" fill="var(--brand)"/>
    ${labels}
  </svg>${cvals.length?`<div class="legend"><span class="item"><span class="dot" style="background:var(--brand)"></span>this period</span><span class="item"><span class="dot" style="background:var(--text-faint)"></span>comparison</span></div>`:''}`;
}

/* ============================== LEDGERS & JOURNAL ============================== */
// Double-entry journal. Every entry debits one "posting target" and credits another. Targets are:
//   led:<id>   a user-created ledger (Setup → Ledgers). Its group decides the P&L effect:
//              income / expense hit the monthly P&L; asset / liability / capital are balance-sheet only.
//   cash       the built-in "Cash in hand" ledger (created on first use).
//   acct:<id>  a bank account from Setup → Accounts (debit = money in, credit = money out).
//   cred:<id>  a creditor (debit = they owe more, credit = they owe less — e.g. a discount allowed).
// Ledger balances are stored debit-positive (a credit balance is negative) and shown as Dr / Cr.
const LEDGER_GROUPS = {
  income:    {label:'Income',               pl:'income',  normal:'cr', hint:'Discount received, commission, interest earned, other income'},
  expense:   {label:'Expense',              pl:'expense', normal:'dr', hint:'Discount allowed, interest paid, bank charges, other running costs'},
  asset:     {label:'Asset / Receivable',   pl:null,      normal:'dr', hint:'Advances given, deposits, amounts due to the station'},
  liability: {label:'Liability / Payable',  pl:null,      normal:'cr', hint:'Dues payable to suppliers, loans, advances received'},
  capital:   {label:'Capital / Drawings',   pl:null,      normal:'cr', hint:"Owner's capital introduced or withdrawn"},
};
function ledgerBalanceLabel(bal){
  const n = num(bal);
  if (!n) return money(0);
  return money(Math.abs(n)) + (n>0 ? ' Dr' : ' Cr');
}
function postingTargets(){
  const t = [{key:'cash', label:'Cash in hand', kind:'cash'}];
  state.accounts.filter(a=>a.kind==='bank' && a.active!==false).forEach(a=>t.push({key:'acct:'+a.id, label:a.name+' (Bank)', kind:'acct', id:a.id}));
  state.ledgers.filter(l=>l.active!==false && !l.cashInHand).forEach(l=>t.push({key:'led:'+l.id, label:l.name+' ('+(LEDGER_GROUPS[l.group]||{}).label+')', kind:'led', id:l.id, group:l.group}));
  state.creditors.filter(c=>c.active!==false).forEach(c=>t.push({key:'cred:'+c.id, label:c.name+' (Creditor)', kind:'cred', id:c.id}));
  state.suppliers.filter(s=>s.active!==false).forEach(s=>t.push({key:'sup:'+s.id, label:s.name+' (Supplier)', kind:'sup', id:s.id}));
  return t;
}
function targetLabel(key){
  const t = postingTargets().find(x=>x.key===key);
  return t ? t.label : null;
}
async function ensureCashLedger(){
  let cash = state.ledgers.find(l=>l.cashInHand);
  if (cash) return cash;
  const ref = await state.db.collection('ledgers').add({name:'Cash in hand', group:'asset', system:true, cashInHand:true, openingBalance:0, balance:0, active:true, createdAt:new Date().toISOString()});
  cash = {id:ref.id, name:'Cash in hand', group:'asset', system:true, cashInHand:true, openingBalance:0, balance:0, active:true};
  state.ledgers.push(cash);
  return cash;
}
// Applies a debit of `dr` (negative = credit) to one target, updating the live balance it maps to.
async function applyPosting(key, dr, meta){
  if (!dr) return;
  if (key==='cash'){
    const cash = await ensureCashLedger();
    await state.db.doc('ledgers/'+cash.id).update({balance: num(cash.balance) + dr});
    cash.balance = num(cash.balance) + dr;
    return;
  }
  const [kind, id] = key.split(':');
  if (kind==='led'){
    const l = state.ledgers.find(x=>x.id===id); if (!l) return;
    await state.db.doc('ledgers/'+id).update({balance: num(l.balance) + dr});
    l.balance = num(l.balance) + dr;
  } else if (kind==='acct'){
    const ref = state.db.doc('accounts/'+id);
    const snap = await ref.get(); if (!snap.exists) return;
    const data = snap.data();
    const ledger = (data.ledger||[]).concat([{id:uid(), date:meta.date, type: dr>0?'deposit':'settlement', amount:Math.abs(dr), from:meta.narration||'Journal', note:'Journal: '+(meta.narration||''), journalId:meta.journalId, savedAt:new Date().toISOString()}]);
    await ref.update({ledger, balance: num(data.balance) + dr});
  } else if (kind==='cred'){
    const c = state.creditors.find(x=>x.id===id); if (!c) return;
    await state.db.doc('creditors/'+id).update({balance: num(c.balance) + dr});
    c.balance = num(c.balance) + dr;
  } else if (kind==='sup'){
    // Supplier balances are stored as "amount we still owe them", so a debit (paying them) lowers it.
    const s = state.suppliers.find(x=>x.id===id); if (!s) return;
    await state.db.doc('suppliers/'+id).update({balance: num(s.balance) - dr});
    s.balance = num(s.balance) - dr;
  }
}
async function applyJournalItem(item, sign){
  const amt = num(item.amount) * sign;
  const meta = {date:item.date, narration:item.narration, journalId:item.id};
  await applyPosting(item.debit, amt, meta);
  await applyPosting(item.credit, -amt, meta);
}
// P&L effect of a month's journal: income = net credits to income ledgers, expense = net debits to expense ledgers.
// Income and expense reaching the P&L from the ledger side. An expense ledger is normally DEBITED
// and an income ledger CREDITED; the opposite direction is a valid reversal (a refund), but is far
// more often an entry posted the wrong way round — so those items are returned in `reversed` for the
// report to flag rather than silently turning an expense into extra profit.
function journalPL(journalData, receiptsData, paymentsData){
  let income=0, expense=0;
  const reversed = [];
  const groupOf = (key)=>{ if (!key || !key.startsWith('led:')) return null; const l = state.ledgers.find(x=>x.id===key.slice(4)); return l ? l.group : null; };
  const ledName = (key)=>targetLabel(key) || key || '';
  // Per-ledger totals as well, so the P&L can list each account rather than one lump.
  const byExpense = {}, byIncome = {};
  const plainName = (key)=>{ const l = state.ledgers.find(x=>x.id===String(key).slice(4)); return (l&&l.name) || ledName(key); };
  const bump = (map, key, amt)=>{ const n = plainName(key); map[n] = (map[n]||0) + amt; };
  ((journalData&&journalData.items)||[]).forEach(it=>{
    const a = num(it.amount);
    const dg = groupOf(it.debit), cg = groupOf(it.credit);
    if (dg==='income'){ income -= a; reversed.push({source:'Journal', date:it.date, label:it.narration||ledName(it.debit), amount:a, why:`debits the income ledger ${ledName(it.debit)}`}); }
    if (cg==='income'){ income += a; bump(byIncome, it.credit, a); }
    if (dg==='expense'){ expense += a; bump(byExpense, it.debit, a); }
    if (cg==='expense'){ expense -= a; bump(byExpense, it.credit, -a); reversed.push({source:'Journal', date:it.date, label:it.narration||ledName(it.credit), amount:a, why:`credits the expense ledger ${ledName(it.credit)}`}); }
  });
  ((receiptsData&&receiptsData.items)||[]).forEach(it=>{
    const g = groupOf(it.ledger); const a = num(it.amount);
    if (g==='income'){ income += a; bump(byIncome, it.ledger, a); }
    if (g==='expense'){ expense -= a; bump(byExpense, it.ledger, -a); reversed.push({source:'Receipt', date:it.date, label:receiptFromLabel(it), amount:a, why:`credits the expense ledger ${ledName(it.ledger)}`}); }
  });
  ((paymentsData&&paymentsData.items)||[]).forEach(it=>{
    // A staff advance is a prepayment whatever ledger it was posted to — the cost is recognised on
    // the salary sheet when the salary falls due, so it never reaches the P&L here.
    if (it.subjectType==='staff') return;
    const g = groupOf(it.ledger); const a = num(it.amount);
    if (g==='expense'){ expense += a; bump(byExpense, it.ledger, a); }
    if (g==='income'){ income -= a; reversed.push({source:'Payment', date:it.date, label:it.party||it.item||'', amount:a, why:`debits the income ledger ${ledName(it.ledger)}`}); }
  });
  return {income, expense, reversed, byExpense, byIncome};
}

function renderSetupLedgers(body){
  const ledgers = state.ledgers.slice().sort((a,b)=>(a.group||'').localeCompare(b.group||'') || (a.name||'').localeCompare(b.name||''));
  body.innerHTML = `
    <div class="banner info">${icon('book')}<div>Ledgers are the accounts you post journal entries to. <strong>Income</strong> and <strong>Expense</strong> ledgers flow into the monthly P&amp;L; Asset, Liability and Capital ledgers only carry a balance. Bank accounts and creditors don't need a ledger here — they're already available in Journal Entry.</div></div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Ledger name</label><input type="text" id="lgName" placeholder="e.g. Discount allowed"></div>
        <div class="field"><label>Group</label><select id="lgGroup">${Object.entries(LEDGER_GROUPS).map(([k,g])=>`<option value="${k}">${esc(g.label)}</option>`).join('')}</select></div>
        <div class="field"><label>Links to</label><select id="lgLink"><option value="">Nothing — plain ledger</option><option value="staff">A staff member (salary / advance)</option><option value="creditor">A creditor</option><option value="supplier">A supplier</option></select></div>
        <div class="field"><label>Opening balance (₹)</label><input type="number" step="0.01" id="lgOpen" placeholder="0.00"></div>
        <div class="field"><label>Opening side</label><select id="lgSide"><option value="dr">Debit (Dr)</option><option value="cr">Credit (Cr)</option></select></div>
        <div class="field"><button class="btn primary" id="lgAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add ledger</button></div>
      </div>
      <div class="hint" id="lgHint" style="color:var(--text-faint);font-size:12px;"></div>
      <div id="lgMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Group</th><th>P&amp;L</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
      <tbody>${ledgers.length? ledgers.map(l=>{ const g = LEDGER_GROUPS[l.group]||{}; return `<tr>
        <td>${esc(l.name)}${l.system?' <span class="hint" style="color:var(--text-faint);">(built-in)</span>':''}</td>
        <td>${esc(g.label||l.group||'—')}</td>
        <td>${g.pl? `<span class="pill ${g.pl==='income'?'good':'warning'}">${g.pl==='income'?'Income':'Expense'}</span>` : '<span class="pill neutral">Balance only</span>'}</td>
        <td class="num">${ledgerBalanceLabel(l.balance)}</td>
        <td><span class="pill ${l.active!==false?'good':'neutral'}">${l.active!==false?'Active':'Inactive'}</span></td>
        <td><button class="btn ghost sm" data-openbal="${l.id}">Opening</button> <button class="btn ghost sm" data-edit="${l.id}">${icon('edit')}</button> ${l.system?'' : `<button class="btn ghost sm" data-toggle="${l.id}" data-cur="${l.active!==false}">${l.active!==false?'Deactivate':'Activate'}</button>${l.active===false?`<button class="btn danger sm" data-delete="${l.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}`}</td>
      </tr>`; }).join('') : `<tr><td colspan="6" class="empty">No ledgers yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  const hint = ()=>{ $('#lgHint').textContent = (LEDGER_GROUPS[$('#lgGroup').value]||{}).hint||''; const g = LEDGER_GROUPS[$('#lgGroup').value]; if (g) $('#lgSide').value = g.normal; };
  $('#lgGroup').onchange = hint; hint();
  $$('[data-openbal]', body).forEach(b=>b.onclick=()=>openOpeningBalanceModal('ledger', b.dataset.openbal));
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('ledgers', b.dataset.edit));
  $('#lgAdd').onclick = async ()=>{
    const name = $('#lgName').value.trim();
    if (!name){ $('#lgMsg').innerHTML = `<span style="color:var(--critical)">Name the ledger.</span>`; return; }
    if (state.ledgers.some(l=>String(l.name||'').toLowerCase()===name.toLowerCase())){ $('#lgMsg').innerHTML = `<span style="color:var(--critical)">A ledger with that name already exists.</span>`; return; }
    const open = num($('#lgOpen').value) * ($('#lgSide').value==='cr' ? -1 : 1);
    await state.db.collection('ledgers').add({name, group:$('#lgGroup').value, linkTo:$('#lgLink').value, openingBalance:open, balance:open, active:true, createdAt:new Date().toISOString()});
    await logActivity({entity:'Ledger', entityLabel:name, action:'add', summary: open?`Opening balance ${ledgerBalanceLabel(open)}`:''});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('ledgers/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=async ()=>{
    const ok = await confirmModal({title:'Delete this ledger?', body:'This permanently removes it from Setup. Past journal entries keep their saved name; their P&L effect for past months is lost.', confirmLabel:'Delete ledger'});
    if (!ok) return;
    const rec = state.ledgers.find(l=>l.id===b.dataset.delete);
    await state.db.doc('ledgers/'+b.dataset.delete).delete();
    await logActivity({entity:'Ledger', entityLabel:rec?rec.name:b.dataset.delete, action:'delete'});
    renderSetup($('#viewMount'));
  });
}

function renderJournal(mount){
  const targets = postingTargets();
  const opts = (sel)=> `<option value="">Select…</option>` + targets.map(t=>`<option value="${t.key}" ${t.key===sel?'selected':''}>${esc(t.label)}</option>`).join('');
  mount.innerHTML = `
    <h1 class="page-title">Journal Entry</h1>
    <p class="page-sub">Record any transaction outside daily sales — discounts, advances, dues, receivables, payables, owner's capital. Debit the account that receives value, credit the account that gives it.</p>
    ${state.ledgers.filter(l=>!l.cashInHand).length ? '' : `<div class="banner">${icon('book')}<div>No ledgers yet — create Income / Expense / Asset / Liability ledgers under <strong>Setup → Ledgers</strong> first. Bank accounts, creditors and Cash in hand are available already.</div></div>`}
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="jeDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field" style="grid-column:span 2;"><label>Debit (Dr) — account receiving</label><select id="jeDebit">${opts('')}</select></div>
        <div class="field" style="grid-column:span 2;"><label>Credit (Cr) — account giving</label><select id="jeCredit">${opts('')}</select></div>
        <div class="field"><label>Amount (₹)</label><input type="number" step="0.01" id="jeAmt" placeholder="0.00"></div>
        <div class="field" style="grid-column:span 3;"><label>Narration</label><input type="text" id="jeNarr" placeholder="e.g. Discount allowed to ABC Transports on Aug bill"></div>
        <div class="field"><button class="btn primary" id="jeSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Post entry</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">Examples — Discount to a creditor: Dr <em>Discount allowed</em>, Cr <em>Creditor</em>. Advance to staff from till: Dr <em>Advance – Ravi</em>, Cr <em>Cash in hand</em>. Supplier bill payable: Dr <em>an Expense ledger</em>, Cr <em>Supplier payable</em>; when paid: Dr <em>Supplier payable</em>, Cr <em>Bank</em>. Interest credited by bank: Dr <em>Bank</em>, Cr <em>Interest income</em>.</div>
      <div id="jeWarn" style="font-size:12.5px;margin-top:6px;color:var(--warning);"></div>
      <div id="jeMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>
    <div class="section-head"><h2>Entries</h2><span id="jeMonthLabel"></span></div>
    <div id="jeList"></div>
    <div class="section-head"><h2>Ledger balances</h2><span class="hint">live, all time</span></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Ledger</th><th>Group</th><th class="num">Balance</th></tr></thead>
      <tbody>${state.ledgers.length? state.ledgers.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(l=>`<tr><td>${esc(l.name)}</td><td>${esc((LEDGER_GROUPS[l.group]||{}).label||'')}</td><td class="num">${ledgerBalanceLabel(l.balance)}</td></tr>`).join('') : `<tr><td colspan="3" class="empty">No ledgers yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  // Flags the reversed direction as the accounts are picked, before the entry is posted.
  const jeCheck = ()=>{
    const w = $('#jeWarn'); if (!w) return;
    const grp = (k)=>{ if (!k || !k.startsWith('led:')) return null; const l = state.ledgers.find(x=>x.id===k.slice(4)); return l?l.group:null; };
    const dg = grp($('#jeDebit').value), cg = grp($('#jeCredit').value);
    const msgs = [];
    if (cg==='expense') msgs.push('Crediting an expense ledger <strong>reduces</strong> that expense — to record a cost, put the expense ledger on the <strong>Debit</strong> side.');
    if (dg==='income') msgs.push('Debiting an income ledger <strong>reduces</strong> that income — to record earnings, put the income ledger on the <strong>Credit</strong> side.');
    w.innerHTML = msgs.join('<br>');
  };
  $('#jeDebit').addEventListener('change', jeCheck);
  $('#jeCredit').addEventListener('change', jeCheck);
  $('#jeSave').onclick = addJournalEntry;
  loadJournalList();
}

async function addJournalEntry(){
  const msg = $('#jeMsg');
  const date = $('#jeDate').value, debit = $('#jeDebit').value, credit = $('#jeCredit').value;
  const amount = num($('#jeAmt').value), narration = $('#jeNarr').value.trim();
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (!debit || !credit){ msg.innerHTML = `<span style="color:var(--critical)">Pick both a debit and a credit account.</span>`; return; }
  if (debit===credit){ msg.innerHTML = `<span style="color:var(--critical)">Debit and credit can't be the same account.</span>`; return; }
  if (!(amount>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter an amount.</span>`; return; }
  $('#jeSave').disabled = true;
  try{
    const monthId = monthIdOf(date);
    const item = {id:uid(), date, debit, debitLabel:targetLabel(debit)||debit, credit, creditLabel:targetLabel(credit)||credit, amount, narration, by: state.currentUser?state.currentUser.name:'', savedAt:new Date().toISOString()};
    const data = (await getMonthDoc('journalMonthly', monthId)) || {items:[]};
    data.items = (data.items||[]).concat([item]);
    await setMonthDoc('journalMonthly', monthId, data);
    await applyJournalItem(item, +1);
    await logActivity({entity:'Journal', entityLabel:narration||`${item.debitLabel} / ${item.creditLabel}`, action:'add', summary:`Dr ${item.debitLabel} · Cr ${item.creditLabel} · ${money(amount)}`});
    msg.innerHTML = `<span style="color:var(--good)">Entry posted.</span>`;
    $('#jeAmt').value=''; $('#jeNarr').value='';
    renderJournal($('#viewMount'));
  }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`; }
  finally{ const b=$('#jeSave'); if (b) b.disabled=false; }
}

async function removeJournalEntry(monthId, item){
  const ok = await confirmModal({title:'Delete this journal entry?', body:'This removes it and reverses its effect on both account balances.', confirmLabel:'Delete entry'});
  if (!ok) return;
  const data = await getMonthDoc('journalMonthly', monthId);
  if (!data) return;
  data.items = (data.items||[]).filter(i=>i.id!==item.id);
  await setMonthDoc('journalMonthly', monthId, data);
  await applyJournalItem(item, -1);
  await logActivity({entity:'Journal', entityLabel:item.narration||`${item.debitLabel} / ${item.creditLabel}`, action:'delete', summary:`Removed ${money(item.amount)}`});
  renderJournal($('#viewMount'));
}

function editJournalEntry(monthId, item){
  const targets = postingTargets().map(t=>({value:t.key, label:t.label}));
  const fields = [
    {key:'date', label:'Date', type:'date'},
    {key:'debit', label:'Debit (Dr)', type:'select', options:targets, fmt:v=>targetLabel(v)},
    {key:'credit', label:'Credit (Cr)', type:'select', options:targets, fmt:v=>targetLabel(v)},
    {key:'amount', label:'Amount (₹)', type:'number', fmt:v=>money(v)},
    {key:'narration', label:'Narration', type:'text'},
  ];
  openLineEditModal({
    title:'Edit journal entry', fields, values:item,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      if (!out.debit || !out.credit) throw new Error('Pick both accounts.');
      if (out.debit===out.credit) throw new Error("Debit and credit can't be the same account.");
      if (!(num(out.amount)>0)) throw new Error('Enter an amount.');
      const changes = diffFields(fields, item, out);
      const newItem = Object.assign({}, item, out, {debitLabel:targetLabel(out.debit)||item.debitLabel, creditLabel:targetLabel(out.credit)||item.creditLabel});
      const newMonth = monthIdOf(out.date);
      // Reverse the old posting, then apply the new one — handles a change of account, amount or month.
      await applyJournalItem(item, -1);
      const oldData = await getMonthDoc('journalMonthly', monthId);
      if (oldData){ oldData.items = (oldData.items||[]).filter(i=>i.id!==item.id); await setMonthDoc('journalMonthly', monthId, oldData); }
      const newData = (newMonth===monthId && oldData) ? oldData : ((await getMonthDoc('journalMonthly', newMonth)) || {items:[]});
      newData.items = (newData.items||[]).concat([newItem]);
      await setMonthDoc('journalMonthly', newMonth, newData);
      await applyJournalItem(newItem, +1);
      if (changes.length) await logActivity({entity:'Journal', entityLabel:newItem.narration||`${newItem.debitLabel} / ${newItem.creditLabel}`, action:'edit', changes});
      renderJournal($('#viewMount'));
    }
  });
}

async function loadJournalList(){
  const el = $('#jeList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#jeMonthLabel') && ($('#jeMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('journalMonthly', monthId);
  const items = ((data&&data.items)||[]).slice().sort((a,b)=>b.date.localeCompare(a.date) || (b.savedAt||'').localeCompare(a.savedAt||''));
  const pl = journalPL(data);
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Debit (Dr)</th><th>Credit (Cr)</th><th class="num">Amount</th><th>Narration</th><th>By</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr>
      <td style="white-space:nowrap;">${fmtDateLabel(it.date)}</td>
      <td>${esc(targetLabel(it.debit)||it.debitLabel)}</td>
      <td>${esc(targetLabel(it.credit)||it.creditLabel)}</td>
      <td class="num">${money(it.amount)}</td>
      <td>${esc(it.narration||'—')}</td>
      <td style="white-space:nowrap;">${esc(it.by||'—')}</td>
      <td style="white-space:nowrap;"><button class="btn ghost sm" data-edit="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-rm="${it.id}">${icon('trash')}</button></td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty">No journal entries for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="7" style="font-size:12.5px;color:var(--text-muted);">P&amp;L effect this month: other income <strong class="mono">${money(pl.income)}</strong> · other expenses <strong class="mono">${money(pl.expense)}</strong></td></tr></tfoot>`:''}
  </table></div></div>`;
  $$('#jeList [data-edit]').forEach(b=>b.onclick=()=>{ const it = items.find(x=>x.id===b.dataset.edit); if (it) editJournalEntry(monthId, it); });
  $$('#jeList [data-rm]').forEach(b=>b.onclick=()=>{ const it = items.find(x=>x.id===b.dataset.rm); if (it) removeJournalEntry(monthId, it); });
  wireMonthSwitcher(()=>{ loadJournalList(); });
}

/* ============================== RECEIPTS ============================== */
// Money received by the station. A creditor receipt reduces that creditor's outstanding balance
// (and appears in their payment history); an "other" receipt is a manual entry from any party,
// optionally credited to a ledger (e.g. an Income ledger so it reaches the P&L). Either way the
// money lands in Cash in hand or a bank account. Stored per month in receiptsMonthly.
const RECEIPT_MODES = ['Cash','UPI','Bank transfer','Cheque','Card'];
function receiptIntoOptions(sel){
  const opts = [{key:'cash', label:'Cash in hand'}].concat(state.accounts.filter(a=>a.kind==='bank' && a.active!==false).map(a=>({key:'acct:'+a.id, label:a.name})));
  return opts.map(o=>`<option value="${o.key}" ${o.key===sel?'selected':''}>${esc(o.label)}</option>`).join('');
}
function receiptLedgerOptions(sel){
  return `<option value="">— none —</option>` + state.ledgers.filter(l=>l.active!==false && !l.cashInHand).map(l=>`<option value="led:${l.id}" ${('led:'+l.id)===sel?'selected':''}>${esc(l.name)} (${esc((LEDGER_GROUPS[l.group]||{}).label||'')})</option>`).join('');
}
// Payments can also settle a supplier's outstanding bill, so their options include suppliers.
function payLedgerOptions(sel){
  return receiptLedgerOptions(sel) + state.suppliers.filter(s=>s.active!==false).map(s=>`<option value="sup:${s.id}" ${('sup:'+s.id)===sel?'selected':''}>${esc(s.name)} (Supplier — ${money(s.balance||0)} due)</option>`).join('');
}
// "Paid to" on the Payments screen is one list of every account a payment can land on: each
// ledger under its own group heading, plus suppliers, so settling a bill needs no second field.
// Expense ledgers lead because that is what most payments are.
const PAY_TO_ORDER = ['expense','liability','asset','capital','income'];
function payToGroups(){
  const groups = PAY_TO_ORDER.map(k=>({
    label: (LEDGER_GROUPS[k]||{}).label || k,
    items: state.ledgers.filter(l=>l.active!==false && !l.cashInHand && (l.group||'asset')===k)
      .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
      .map(l=>({value:'led:'+l.id, label:l.name})),
  }));
  groups.push({label:'Creditors', items: state.creditors.filter(c=>c.active!==false)
    .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''))
    .map(c=>({value:'cred:'+c.id, label:c.name+' — '+money(c.balance||0)+' due'}))});
  groups.push({label:'Suppliers', items: state.suppliers.filter(s=>s.active!==false)
    .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''))
    .map(s=>({value:'sup:'+s.id, label:s.name+' — '+money(s.balance||0)+' due'}))});
  return groups.filter(g=>g.items.length);
}
function payToOptions(sel){
  return `<option value="">Select account…</option>` + payToGroups().map(g=>
    `<optgroup label="${esc(g.label)}">${g.items.map(o=>`<option value="${o.value}" ${o.value===sel?'selected':''}>${esc(o.label)}</option>`).join('')}</optgroup>`).join('');
}
function payToList(){
  const out = [{value:'', label:'— none —'}];
  payToGroups().forEach(g=>g.items.forEach(o=>out.push({value:o.value, label:g.label+' · '+o.label})));
  return out;
}
function payLedgerList(){
  return [{value:'',label:'— none —'}]
    .concat(state.ledgers.filter(l=>!l.cashInHand).map(l=>({value:'led:'+l.id, label:l.name})))
    .concat(state.suppliers.map(s=>({value:'sup:'+s.id, label:s.name+' (Supplier)'})));
}
function receiptFromLabel(it){
  if (it.type==='creditor'){ const c = state.creditors.find(x=>x.id===it.creditorId); return c ? c.name : (it.creditorName||'—'); }
  return it.fromName || '—';
}
// sign +1 applies the receipt's effects, -1 reverses them.
async function applyReceipt(item, sign){
  const amt = num(item.amount) * sign;
  if (!amt) return;
  const meta = {date:item.date, narration:'Receipt from '+receiptFromLabel(item)+(item.narration?' — '+item.narration:''), journalId:item.id};
  // Where the money went: debit cash / bank.
  await applyPosting(item.into||'cash', amt, meta);
  if (item.type==='creditor' && item.creditorId){
    const ref = state.db.doc('creditors/'+item.creditorId);
    const snap = await ref.get();
    if (snap.exists){
      const data = snap.data();
      let payments = (data.payments||[]).filter(p=>p.receiptId!==item.id);
      if (sign>0) payments = payments.concat([{id:uid(), receiptId:item.id, date:item.date, amount:num(item.amount), note:[item.mode, item.reference, item.narration].filter(Boolean).join(' · '), savedAt:new Date().toISOString()}]);
      await ref.update({payments, balance: num(data.balance) - amt});
      const c = state.creditors.find(x=>x.id===item.creditorId); if (c) c.balance = num(c.balance) - amt;
    }
  } else if (item.ledger){
    // Credit the chosen ledger (income → P&L, receivable → reduces what's owed, etc.)
    await applyPosting(item.ledger, -amt, meta);
  }
}

function renderReceipts(mount){
  mount.innerHTML = `
    <h1 class="page-title">Receipts</h1>
    <p class="page-sub">Money received — from credit customers (their outstanding balance is adjusted automatically) or from anyone else as a manual entry.</p>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Date</label><input type="date" id="rcDate" value="${todayStr()}" max="${todayStr()}"></div>
        <div class="field"><label>Received from</label><select id="rcType"><option value="creditor">Creditor (credit customer)</option><option value="other">Other party (manual)</option></select></div>
        <div class="field" id="rcCreditorWrap"><label>Creditor</label><select id="rcCreditor"><option value="">Select creditor…</option>${state.creditors.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${esc(c.name)} — ${money(c.balance||0)} due</option>`).join('')}</select></div>
        <div class="field" id="rcFromWrap" style="display:none;"><label>Party name</label><input type="text" id="rcFrom" placeholder="e.g. Rent from tenant / Insurance claim"></div>
        <div class="field" id="rcLedgerWrap" style="display:none;"><label>Credit to ledger (optional)</label><select id="rcLedger">${receiptLedgerOptions('')}</select></div>
        <div class="field"><label>Amount (₹)</label><input type="number" step="0.01" id="rcAmt" placeholder="0.00"></div>
        <div class="field"><label>Received into</label><select id="rcInto">${receiptIntoOptions('cash')}</select></div>
        <div class="field"><label>Mode</label><select id="rcMode">${RECEIPT_MODES.map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="field"><label>Reference (cheque / UTR no.)</label><input type="text" id="rcRef" placeholder="Optional"></div>
        <div class="field" style="grid-column:span 2;"><label>Narration</label><input type="text" id="rcNarr" placeholder="Optional"></div>
        <div class="field"><button class="btn primary" id="rcSave" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Save receipt</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">For "Other party", pick an <strong>Income</strong> ledger to count the receipt in the P&amp;L, or an <strong>Asset / Receivable</strong> ledger when it settles an amount that was owed. Leave it as "none" for a plain cash/bank receipt.</div>
      <div id="rcWarn" style="font-size:12.5px;margin-top:6px;color:var(--warning);"></div>
      <div id="rcMsg" style="font-size:13px;margin-top:4px;"></div>
    </div>
    <div class="section-head"><h2>Receipts</h2><span id="rcMonthLabel"></span></div>
    <div id="rcList"></div>
  `;
  const syncType = ()=>{
    const other = $('#rcType').value==='other';
    $('#rcCreditorWrap').style.display = other ? 'none' : '';
    $('#rcFromWrap').style.display = other ? '' : 'none';
    $('#rcLedgerWrap').style.display = other ? '' : 'none';
  };
  $('#rcType').onchange = syncType; syncType();
  const rcCheck = ()=>{
    const w = $('#rcWarn'); if (!w) return;
    const k = $('#rcLedger') ? $('#rcLedger').value : '';
    const l = k.startsWith('led:') && state.ledgers.find(x=>x.id===k.slice(4));
    w.innerHTML = (l && l.group==='expense')
      ? 'Crediting an expense ledger <strong>reduces</strong> that expense and raises profit. For money earned, pick an <strong>Income</strong> ledger; for a refund of a cost, this is correct.'
      : '';
  };
  if ($('#rcLedger')) $('#rcLedger').addEventListener('change', rcCheck);
  $('#rcSave').onclick = addReceipt;
  loadReceiptsList();
}

async function addReceipt(){
  const msg = $('#rcMsg');
  const type = $('#rcType').value;
  const item = {
    id:uid(), date:$('#rcDate').value, type,
    creditorId: type==='creditor' ? $('#rcCreditor').value : '',
    creditorName: '', fromName: type==='other' ? $('#rcFrom').value.trim() : '',
    ledger: type==='other' ? $('#rcLedger').value : '',
    amount:num($('#rcAmt').value), into:$('#rcInto').value, mode:$('#rcMode').value,
    reference:$('#rcRef').value.trim(), narration:$('#rcNarr').value.trim(),
    by: state.currentUser?state.currentUser.name:'', savedAt:new Date().toISOString(),
  };
  if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
  if (type==='creditor' && !item.creditorId){ msg.innerHTML = `<span style="color:var(--critical)">Select the creditor.</span>`; return; }
  if (type==='other' && !item.fromName){ msg.innerHTML = `<span style="color:var(--critical)">Enter who the money was received from.</span>`; return; }
  if (!(item.amount>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter an amount.</span>`; return; }
  if (type==='creditor'){ const c = state.creditors.find(x=>x.id===item.creditorId); item.creditorName = c ? c.name : ''; }
  $('#rcSave').disabled = true;
  try{
    const monthId = monthIdOf(item.date);
    const data = (await getMonthDoc('receiptsMonthly', monthId)) || {items:[]};
    data.items = (data.items||[]).concat([item]);
    await setMonthDoc('receiptsMonthly', monthId, data);
    await applyReceipt(item, +1);
    await logActivity({entity:'Receipt', entityLabel:receiptFromLabel(item), action:'add', summary:`Received ${money(item.amount)} by ${item.mode}`});
    msg.innerHTML = `<span style="color:var(--good)">Receipt saved${type==='creditor'?' — creditor balance updated':''}.</span>`;
    renderReceipts($('#viewMount'));
    $('#rcMsg').innerHTML = `<span style="color:var(--good)">Receipt saved${type==='creditor'?' — creditor balance updated':''}.</span>`;
  }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">Couldn't save: ${esc(e.message||'error')}</span>`; const b=$('#rcSave'); if (b) b.disabled=false; }
}

async function removeReceipt(monthId, item){
  const ok = await confirmModal({title:'Delete this receipt?', body: item.type==='creditor' ? "This removes it and adds the amount back to the creditor's outstanding balance." : 'This removes it and reverses its effect on the cash / bank balance.', confirmLabel:'Delete receipt'});
  if (!ok) return;
  const data = await getMonthDoc('receiptsMonthly', monthId);
  if (!data) return;
  data.items = (data.items||[]).filter(i=>i.id!==item.id);
  await setMonthDoc('receiptsMonthly', monthId, data);
  await applyReceipt(item, -1);
  await logActivity({entity:'Receipt', entityLabel:receiptFromLabel(item), action:'delete', summary:`Removed ${money(item.amount)}`});
  renderReceipts($('#viewMount'));
}

function editReceipt(monthId, item){
  const intoOpts = [{value:'cash', label:'Cash in hand'}].concat(state.accounts.filter(a=>a.kind==='bank').map(a=>({value:'acct:'+a.id, label:a.name})));
  const fields = [
    {key:'date', label:'Date', type:'date'},
    ...(item.type==='creditor'
      ? [{key:'creditorId', label:'Creditor', type:'select', options:state.creditors.map(c=>({value:c.id,label:c.name})), fmt:v=>{ const c=state.creditors.find(x=>x.id===v); return c?c.name:(v||'—'); }}]
      : [{key:'fromName', label:'Party name', type:'text'}, {key:'ledger', label:'Credit to ledger', type:'select', options:[{value:'',label:'— none —'}].concat(state.ledgers.filter(l=>!l.cashInHand).map(l=>({value:'led:'+l.id,label:l.name}))), fmt:v=>targetLabel(v)||'—'}]),
    {key:'amount', label:'Amount (₹)', type:'number', fmt:v=>money(v)},
    {key:'into', label:'Received into', type:'select', options:intoOpts, fmt:v=>(intoOpts.find(o=>o.value===v)||{}).label||v},
    {key:'mode', label:'Mode', type:'select', options:RECEIPT_MODES.map(m=>({value:m,label:m}))},
    {key:'reference', label:'Reference', type:'text'},
    {key:'narration', label:'Narration', type:'text'},
  ];
  openLineEditModal({
    title:'Edit receipt', fields, values:item,
    onSave: async (out)=>{
      if (!state.dbReady) throw new Error("Live data isn't connected.");
      if (!(num(out.amount)>0)) throw new Error('Enter an amount.');
      if (item.type==='creditor' && !out.creditorId) throw new Error('Select the creditor.');
      const changes = diffFields(fields, item, out);
      const newItem = Object.assign({}, item, out);
      if (newItem.type==='creditor'){ const c = state.creditors.find(x=>x.id===newItem.creditorId); newItem.creditorName = c ? c.name : ''; }
      const newMonth = monthIdOf(out.date);
      await applyReceipt(item, -1);
      const oldData = await getMonthDoc('receiptsMonthly', monthId);
      if (oldData){ oldData.items = (oldData.items||[]).filter(i=>i.id!==item.id); await setMonthDoc('receiptsMonthly', monthId, oldData); }
      const newData = (newMonth===monthId && oldData) ? oldData : ((await getMonthDoc('receiptsMonthly', newMonth)) || {items:[]});
      newData.items = (newData.items||[]).concat([newItem]);
      await setMonthDoc('receiptsMonthly', newMonth, newData);
      await applyReceipt(newItem, +1);
      if (changes.length) await logActivity({entity:'Receipt', entityLabel:receiptFromLabel(newItem), action:'edit', changes});
      renderReceipts($('#viewMount'));
    }
  });
}

async function loadReceiptsList(){
  const el = $('#rcList'); if(!el) return;
  el.innerHTML = `<div class="card empty">Loading…</div>`;
  const monthId = state.activeMonth;
  $('#rcMonthLabel') && ($('#rcMonthLabel').innerHTML = monthSwitcherHtml());
  const data = await getMonthDoc('receiptsMonthly', monthId);
  const items = ((data&&data.items)||[]).slice().sort((a,b)=>b.date.localeCompare(a.date) || (b.savedAt||'').localeCompare(a.savedAt||''));
  const total = items.reduce((s,i)=>s+num(i.amount),0);
  const intoLabel = (k)=> k==='cash' ? 'Cash in hand' : ((state.accounts.find(a=>'acct:'+a.id===k)||{}).name || k || '—');
  el.innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>From</th><th>Type</th><th class="num">Amount</th><th>Into</th><th>Mode</th><th>Reference / narration</th><th>By</th><th></th></tr></thead>
    <tbody>${items.length? items.map(it=>`<tr>
      <td style="white-space:nowrap;">${fmtDateLabel(it.date)}</td>
      <td>${esc(receiptFromLabel(it))}</td>
      <td><span class="pill ${it.type==='creditor'?'good':'neutral'}">${it.type==='creditor'?'Creditor':'Other'}</span>${it.ledger?`<div class="hint" style="font-size:11px;color:var(--text-faint)">→ ${esc(targetLabel(it.ledger)||'')}</div>`:''}</td>
      <td class="num">${money(it.amount)}</td>
      <td>${esc(intoLabel(it.into))}</td>
      <td>${esc(it.mode||'—')}</td>
      <td>${esc([it.reference, it.narration].filter(Boolean).join(' · ')||'—')}</td>
      <td style="white-space:nowrap;">${esc(it.by||'—')}</td>
      <td style="white-space:nowrap;"><button class="btn ghost sm" data-edit="${it.id}">${icon('edit')}</button> <button class="btn ghost sm" data-rm="${it.id}">${icon('trash')}</button></td>
    </tr>`).join('') : `<tr><td colspan="9" class="empty">No receipts for ${monthLabel(monthId)}.</td></tr>`}</tbody>
    ${items.length?`<tfoot><tr><td colspan="3" style="font-weight:700;">Total</td><td class="num" style="font-weight:700;">${money(total)}</td><td colspan="5"></td></tr></tfoot>`:''}
  </table></div></div>`;
  $$('#rcList [data-edit]').forEach(b=>b.onclick=()=>{ const it = items.find(x=>x.id===b.dataset.edit); if (it) editReceipt(monthId, it); });
  $$('#rcList [data-rm]').forEach(b=>b.onclick=()=>{ const it = items.find(x=>x.id===b.dataset.rm); if (it) removeReceipt(monthId, it); });
  wireMonthSwitcher(()=>{ loadReceiptsList(); });
}

/* ============================== FIXED COSTS (accrual) ============================== */
// Rent, electricity and the like land on whatever date they are paid, which makes a half-month or
// quarterly P&L misleading. A fixed cost states what the charge is worth per month, and the report
// can spread it across the days of the period instead — a whole calendar month always accrues
// exactly the stated amount, never a fraction of it.
const FIXED_FREQ = {monthly:{label:'Monthly', months:1}, quarterly:{label:'Quarterly', months:3}, yearly:{label:'Yearly', months:12}};
function fixedMonthlyAmount(fc){ return num(fc.amount) / ((FIXED_FREQ[fc.frequency]||FIXED_FREQ.monthly).months); }
function fixedCostAccountLabel(fc){
  if (!fc.account) return fc.category || '—';
  if (fc.account.startsWith('cat:')) return fc.account.slice(4);
  return dutyPayLabel(fc.account, fc.category);
}
// Days of `monthId` that fall inside [from,to] and inside the cost's own start/end dates.
function coveredDaysInMonth(monthId, from, to, startDate, endDate){
  const mStart = monthId+'-01', mEnd = monthEnd(monthId);
  const lo = [mStart, from, startDate||'0000-01-01'].sort().pop();
  const hi = [mEnd, to, endDate||'9999-12-31'].sort()[0];
  if (lo > hi) return 0;
  return daysBetween(lo, hi);
}
// What one fixed cost accrues over [from,to]. Each calendar month contributes its monthly amount
// scaled by the share of that month's days the period covers, so full months come out exact.
function accrueFixedCost(fc, from, to){
  if (fc.active===false) return 0;
  const monthly = fixedMonthlyAmount(fc);
  if (!monthly) return 0;
  let total = 0;
  monthsBetween(from, to).forEach(m=>{
    const days = coveredDaysInMonth(m, from, to, fc.startDate, fc.endDate);
    if (!days) return;
    total += monthly * (days / daysInMonth(m));
  });
  return Math.round(total*100)/100;
}
// True when an actual expense/payment line settles this fixed cost, so accrual mode can leave it
// out of the P&L (it becomes settlement of the accrued charge) and report it as "paid" instead.
function matchesFixedCost(fc, item){
  const acc = fc.account || '';
  if (acc && !acc.startsWith('cat:')) return (item.ledger||item.account||'') === acc;
  const cat = acc.startsWith('cat:') ? acc.slice(4) : (fc.category||'');
  if (!cat) return false;
  return String(item.category||'').toLowerCase() === cat.toLowerCase();
}

function renderSetupFixedCosts(body){
  const list = state.fixedCosts.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const monthlyTotal = list.filter(f=>f.active!==false).reduce((s,f)=>s+fixedMonthlyAmount(f),0);
  body.innerHTML = `
    <div class="banner info">${icon('receipt')}<div>Recurring charges such as rent, electricity, insurance or a loan EMI. A report run on the <strong>Accrued</strong> basis spreads these across the days of the period you pick — a half month carries half the rent, a quarter carries exactly three months — instead of showing whatever happened to be paid in those dates. Reports stay on the <strong>As paid</strong> basis unless you switch them.</div></div>
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-grid">
        <div class="field"><label>Name</label><input type="text" id="fcName" placeholder="e.g. Shop rent"></div>
        <div class="field"><label>Charged to</label><select id="fcAccount">${dutyPayAccountOptions('')}</select></div>
        <div class="field"><label>Amount (₹)</label><input type="number" step="0.01" id="fcAmount" placeholder="0.00"></div>
        <div class="field"><label>Frequency</label><select id="fcFreq">${Object.entries(FIXED_FREQ).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('')}</select></div>
        <div class="field"><label>Applies from</label><input type="date" id="fcStart" value="${monthIdOf(todayStr())}-01"></div>
        <div class="field"><label>Until (optional)</label><input type="date" id="fcEnd"></div>
        <div class="field"><button class="btn primary" id="fcAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add fixed cost</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">Enter the charge for one full period — a monthly rent as Monthly, an annual insurance premium as Yearly. Leave "Until" empty while it is still running.</div>
      <div id="fcMsg" style="font-size:13px;"></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Charged to</th><th class="num">Amount</th><th>Frequency</th><th class="num">Per month</th><th>Period</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.length? list.map(f=>`<tr>
        <td>${esc(f.name)}</td>
        <td>${esc(fixedCostAccountLabel(f))}</td>
        <td class="num">${money(f.amount)}</td>
        <td>${esc((FIXED_FREQ[f.frequency]||{}).label||f.frequency||'')}</td>
        <td class="num">${money(fixedMonthlyAmount(f))}</td>
        <td style="white-space:nowrap;font-size:12.5px;">${f.startDate?fmtDateLabel(f.startDate):'—'} → ${f.endDate?fmtDateLabel(f.endDate):'ongoing'}</td>
        <td><span class="pill ${f.active!==false?'good':'neutral'}">${f.active!==false?'Active':'Inactive'}</span></td>
        <td style="white-space:nowrap;"><button class="btn ghost sm" data-fedit="${f.id}">${icon('edit')}</button> <button class="btn ghost sm" data-ftoggle="${f.id}" data-cur="${f.active!==false}">${f.active!==false?'Deactivate':'Activate'}</button>${f.active===false?` <button class="btn danger sm" data-fdel="${f.id}">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="8" class="empty">No fixed costs yet.</td></tr>`}</tbody>
      ${list.length?`<tfoot><tr><td colspan="4" style="font-weight:700;">Total per month</td><td class="num" style="font-weight:700;">${money(monthlyTotal)}</td><td colspan="3"></td></tr></tfoot>`:''}
    </table></div></div>
  `;
  $('#fcAdd').onclick = async ()=>{
    const msg = $('#fcMsg');
    const name = $('#fcName').value.trim();
    if (!state.dbReady){ msg.innerHTML = `<span style="color:var(--critical)">Live data isn't connected.</span>`; return; }
    if (!name){ msg.innerHTML = `<span style="color:var(--critical)">Name the cost.</span>`; return; }
    if (!(num($('#fcAmount').value)>0)){ msg.innerHTML = `<span style="color:var(--critical)">Enter the amount.</span>`; return; }
    const account = $('#fcAccount').value;
    await state.db.collection('fixedCosts').add({
      name, account, category: fixedCostAccountLabel({account}), amount:num($('#fcAmount').value),
      frequency:$('#fcFreq').value, startDate:$('#fcStart').value, endDate:$('#fcEnd').value||'',
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Fixed cost', entityLabel:name, action:'add', summary:`${money($('#fcAmount').value)} ${(FIXED_FREQ[$('#fcFreq').value]||{}).label||''}`});
    renderSetup($('#viewMount'));
  };
  $$('[data-fedit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('fixedCosts', b.dataset.fedit));
  $$('[data-ftoggle]', body).forEach(b=>b.onclick=async ()=>{ await state.db.doc('fixedCosts/'+b.dataset.ftoggle).update({active: b.dataset.cur!=='true'}); });
  $$('[data-fdel]', body).forEach(b=>b.onclick=async ()=>{
    const f = state.fixedCosts.find(x=>x.id===b.dataset.fdel);
    if (!f) return;
    const ok = await confirmModal({title:`Delete ${f.name}?`, body:'This removes the schedule. Reports run on the accrued basis will no longer spread this charge; payments already recorded are untouched.', confirmLabel:'Delete fixed cost'});
    if (!ok) return;
    await state.db.doc('fixedCosts/'+f.id).delete();
    await logActivity({entity:'Fixed cost', entityLabel:f.name, action:'delete'});
    renderSetup($('#viewMount'));
  });
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
    {key:'costRate', label:'Stock cost rate (₹/L)', type:'number', fmt:v=>money(v)},
    {key:'isBowser', label:'This is a bowser (mobile tank)', type:'checkbox', fmt:v=>v?'Yes':'No'},
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
  oilProducts: { label:'Oil product', collection:'oilProducts', list:()=>state.oilProducts, fields:()=>[
    {key:'name', label:'Product name', type:'text'},
    {key:'unit', label:'Unit', type:'select', options:OIL_UNITS.map(u=>({value:u,label:u}))},
    {key:'stockQty', label:'Stock quantity — manual correction', type:'number', fmt:v=>numFmt(v)},
    {key:'costRate', label:'Cost rate (₹)', type:'number', fmt:v=>money(v)},
    {key:'saleRate', label:'Selling rate (₹)', type:'number', fmt:v=>money(v)},
  ]},
  suppliers: { label:'Supplier', collection:'suppliers', list:()=>state.suppliers, fields:()=>[
    {key:'balance', label:'Outstanding (₹) — manual correction', type:'number', fmt:v=>money(v)},
    {key:'name', label:'Name', type:'text'},
    {key:'phone', label:'Phone', type:'tel'},
    {key:'notes', label:'Notes', type:'text'},
    {key:'hpCardSettles', label:'HP Card sales settle against this supplier', type:'checkbox', fmt:v=>v?'Yes':'No'},
  ]},
  fixedCosts: { label:'Fixed cost', collection:'fixedCosts', list:()=>state.fixedCosts, fields:()=>[
    {key:'name', label:'Name', type:'text'},
    {key:'amount', label:'Amount (₹)', type:'number', fmt:v=>money(v)},
    {key:'frequency', label:'Frequency', type:'select', options:Object.entries(FIXED_FREQ).map(([k,v])=>({value:k,label:v.label}))},
    {key:'startDate', label:'Applies from', type:'date'},
    {key:'endDate', label:'Until (optional)', type:'date'},
  ]},
  ledgers: { label:'Ledger', collection:'ledgers', list:()=>state.ledgers, fields:()=>[
    {key:'name', label:'Ledger name', type:'text'},
    {key:'group', label:'Group', type:'select', options:Object.entries(LEDGER_GROUPS).map(([k,g])=>({value:k,label:g.label})), fmt:v=>(LEDGER_GROUPS[v]||{}).label||v||'—'},
    {key:'linkTo', label:'Links to', type:'select', options:[{value:'',label:'Nothing — plain ledger'},{value:'staff',label:'A staff member (salary / advance)'},{value:'creditor',label:'A creditor'},{value:'supplier',label:'A supplier'}], fmt:v=>({staff:'Staff member',creditor:'Creditor',supplier:'Supplier'})[v]||'—'},
    {key:'balance', label:'Balance (₹, Dr positive / Cr negative) — manual correction', type:'number', fmt:v=>ledgerBalanceLabel(v)},
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
      ${['tanks','nozzles','staff','salary','creditors','suppliers','accounts','ledgers','fixed','users','rates','tools'].map(t=>`<button data-t="${t}" class="${state.setupTab===t?'active':''}">${t==='fixed'?'Fixed costs':t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
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
    case 'salary': renderSalary(body); break;
    case 'rates': renderSetupRates(body); break;
    case 'ledgers': renderSetupLedgers(body); break;
    case 'fixed': renderSetupFixedCosts(body); break;
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
        <div class="field"><label>Purchase rate of that stock (₹/L)</label><input type="number" step="0.01" id="tkCost" placeholder="0.00"></div>
        <div class="field"><label class="toggle" style="margin-top:18px;"><input type="checkbox" id="tkBowser"> This is a bowser (mobile tank)</label></div>
        <div class="field"><button class="btn primary" id="tkAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add tank</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">The purchase rate is what the fuel already in the tank cost you. It values opening and closing stock in the P&amp;L until a delivery is recorded on the Purchase tab, after which the latest purchase rate is used automatically.</div>
      <div id="tkMsg" style="font-size:13px;"></div>
    </div>
    ${(()=>{
      // Quick way to price stock that was in the tanks before the app was in use — the figure the
      // trading account needs for opening and closing stock.
      const active = state.tanks.filter(t=>t.active!==false);
      if (!active.length) return '';
      const missing = active.filter(t=>num(t.currentStockL)>0 && !valuationRate(null, t.id, t.product));
      return `<div class="section-head"><h2>Stock cost rates</h2><span class="hint">used to value opening &amp; closing stock</span></div>
      ${missing.length?`<div class="banner">${icon('tank')}<div><strong>${esc(missing.map(t=>t.name).join(', '))}</strong> hold stock with no known cost, so the P&amp;L values them at ₹0 and overstates profit. Enter what that fuel cost per litre below.</div></div>`:''}
      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="table-wrap"><table>
          <thead><tr><th>Tank</th><th>Product</th><th class="num">Stock now</th><th class="num">Cost rate (₹/L)</th><th class="num">Stock value</th><th>Rate source</th></tr></thead>
          <tbody>${active.map(t=>{
            const eff = valuationRate(null, t.id, t.product);
            const own = num(t.costRate);
            return `<tr data-tank="${t.id}">
              <td>${esc(t.name)}</td><td>${esc(state.config.products[t.product]||t.product)}</td>
              <td class="num">${liters(t.currentStockL)}</td>
              <td class="num"><input type="number" step="0.01" class="tkRate" value="${own||''}" placeholder="0.00" style="width:100px;text-align:right;"></td>
              <td class="num tkVal">${money(num(t.currentStockL)*eff)}</td>
              <td class="hint" style="font-size:11.5px;color:var(--text-faint);">${own ? 'this rate' : (eff ? 'a recorded purchase' : '<span class="pill warning">none</span>')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="row" style="margin-top:10px;"><button class="btn primary" id="tkRatesSave" ${state.dbReady?'':'disabled'}>Save cost rates</button><span id="tkRatesMsg" style="font-size:13px;"></span></div>
      </div>`;
    })()}
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Product</th><th class="num">Capacity</th><th class="num">Current stock</th><th class="num">Cost rate</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.tanks.length? byName(state.tanks).map(t=>`<tr>
        <td>${esc(t.name)}${t.isBowser?` <span class="pill neutral">bowser</span>`:''}</td><td>${esc(state.config.products[t.product]||t.product)}</td>
        <td class="num">${liters(t.capacityL)}</td><td class="num">${liters(t.currentStockL)}</td>
        <td class="num">${num(t.costRate)?money(t.costRate):'—'}</td>
        <td><span class="pill ${t.active!==false?'good':'neutral'}">${t.active!==false?'Active':'Inactive'}</span></td>
        <td><button class="btn ghost sm" data-openstock="${t.id}">Opening stock</button> <button class="btn ghost sm" data-edit="${t.id}">${icon('edit')}</button> <button class="btn ghost sm" data-toggle="${t.id}" data-cur="${t.active!==false}">${t.active!==false?'Deactivate':'Activate'}</button>${t.active===false?`<button class="btn danger sm" data-delete="${t.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}</td>
      </tr>`).join('') : `<tr><td colspan="7" class="empty">No tanks yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('.tkRate', body).forEach(inp=>inp.addEventListener('input', ()=>{
    const tr = inp.closest('tr');
    const t = state.tanks.find(x=>x.id===tr.dataset.tank);
    if (!t) return;
    const rate = num(inp.value) || valuationRate(null, t.id, t.product);
    tr.querySelector('.tkVal').textContent = money(num(t.currentStockL)*rate);
  }));
  if ($('#tkRatesSave')) $('#tkRatesSave').onclick = async ()=>{
    const msg = $('#tkRatesMsg');
    try{
      for (const inp of $$('.tkRate', body)){
        const id = inp.closest('tr').dataset.tank;
        const t = state.tanks.find(x=>x.id===id);
        const rate = num(inp.value);
        if (!t || num(t.costRate)===rate) continue;
        await state.db.doc('tanks/'+id).update({costRate:rate});
        await logActivity({entity:'Tank', entityLabel:t.name, action:'edit', changes:[{field:'Cost rate', from:money(t.costRate), to:money(rate)}]});
      }
      msg.innerHTML = `<span style="color:var(--good);margin-left:8px;">Saved — opening and closing stock now value at these rates.</span>`;
    }catch(e){ msg.innerHTML = `<span style="color:var(--critical);margin-left:8px;">${esc(e.message||'Could not save')}</span>`; }
  };
  $$('[data-openstock]', body).forEach(b=>b.onclick=()=>openTankOpeningModal(b.dataset.openstock));
  $$('[data-edit]', body).forEach(b=>b.onclick=()=>openSetupEditModal('tanks', b.dataset.edit));
  $('#tkAdd').onclick = async ()=>{
    const name = $('#tkName').value.trim();
    if (!name){ $('#tkMsg').innerHTML = `<span style="color:var(--critical)">Name the tank.</span>`; return; }
    await state.db.collection('tanks').add({
      name, product: $('#tkProduct').value, capacityL: num($('#tkCap').value),
      currentStockL: num($('#tkStock').value), openingStockL: num($('#tkStock').value),
      costRate: num($('#tkCost').value), isBowser: $('#tkBowser').checked,
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Tank', entityLabel:name, action:'add', summary: num($('#tkCost').value)?`Opening stock ${liters($('#tkStock').value)} at ${money($('#tkCost').value)}/L`:''});
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


// Litres in and out of a tank from `fromDate` to today: deliveries and transfers in, less what the
// nozzles drew. Used to set a tank's current stock from a dipped opening figure.
async function tankMovementSince(tankId, fromDate){
  let received = 0, drawn = 0, transferredIn = 0;
  let m = monthIdOf(fromDate);
  const last = monthIdOf(todayStr());
  for (let i=0; i<=60 && m<=last; i++){
    const st = await getMonthDoc('stockReceiptsMonthly', m);
    ((st&&st.items)||[]).forEach(it=>{ if (it.tankId===tankId && it.date>=fromDate) received += num(it.liters); });
    (await getMonthDailyLogs(m)).forEach(doc=>{
      if (!doc.date || doc.date < fromDate) return;
      Object.values(doc.duties||{}).forEach(d=>Object.values(d.nozzles||{}).forEach(nz=>{
        const draw = nz.drawLiters!=null ? nz.drawLiters : nz.liters;
        if (nz.tankId===tankId) drawn += num(draw);
        if (nz.transferToTankId===tankId) transferredIn += num(nz.transferLiters);
      }));
    });
    m = shiftMonth(m, 1);
  }
  return {received, drawn, transferredIn, net: received + transferredIn - drawn};
}
function openTankOpeningModal(tankId){
  const root = $('#modalRoot');
  const tank = state.tanks.find(t=>t.id===tankId);
  if (!root || !tank) return;
  const defDate = tank.openingStockDate || (monthIdOf(todayStr())+'-01');
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>Opening stock — ${esc(tank.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">The dip reading for this tank on a given date. Deliveries and sales recorded since are applied to it, so the current stock follows and a recalculation rebuilds from the right starting point.</p>
      <div class="field"><label>Stock was (L)</label><input type="number" step="0.01" id="tsQty" value="${num(tank.openingStockL)||''}" placeholder="0.00"></div>
      <div class="field"><label>As at (start of this day)</label><input type="date" id="tsDate" value="${defDate}" max="${todayStr()}"></div>
      <div class="field"><label>Cost rate of that stock (₹/L, optional)</label><input type="number" step="0.01" id="tsRate" value="${num(tank.costRate)||''}" placeholder="0.00"></div>
      <div class="card card-pad" style="background:var(--surface-2);margin-bottom:12px;">
        <div class="row" style="justify-content:space-between;font-size:13px;"><span>Received since</span><strong class="mono" id="tsIn">—</strong></div>
        <div class="row" style="justify-content:space-between;font-size:13px;margin-top:4px;"><span>Dispensed since</span><strong class="mono" id="tsOut">—</strong></div>
        <div class="row" style="justify-content:space-between;font-size:13px;margin-top:4px;"><span>Current stock would become</span><strong class="mono" id="tsNew">—</strong></div>
        <div class="row" style="justify-content:space-between;font-size:12.5px;margin-top:4px;color:var(--text-muted);"><span>Current stock now</span><span class="mono">${liters(tank.currentStockL)}</span></div>
      </div>
      <div id="tsMsg" style="font-size:13px;color:var(--critical);"></div>
      <div class="modal-actions">
        <button class="btn" id="tsCancel">Cancel</button>
        <button class="btn primary" id="tsSave">Set opening stock</button>
      </div>
    </div>
  </div>`;
  $('#tsCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  let mv = {received:0, drawn:0, transferredIn:0, net:0};
  const show = ()=>{
    const total = num($('#tsQty').value) + mv.net;
    $('#tsNew').innerHTML = liters(total) + (total<0 ? ' <span class="pill critical">negative</span>' : '');
  };
  const recalc = async ()=>{
    const from = $('#tsDate').value;
    if (!from) return;
    $('#tsIn').textContent = $('#tsOut').textContent = 'calculating…';
    mv = await tankMovementSince(tankId, from);
    $('#tsIn').textContent = liters(mv.received + mv.transferredIn);
    $('#tsOut').textContent = liters(mv.drawn);
    show();
  };
  $('#tsDate').onchange = recalc;
  $('#tsQty').oninput = show;
  recalc();
  $('#tsSave').onclick = async ()=>{
    if (!state.dbReady){ $('#tsMsg').textContent = "Live data isn't connected."; return; }
    const from = $('#tsDate').value;
    if (!from){ $('#tsMsg').textContent = 'Pick the date this reading applies to.'; return; }
    $('#tsSave').disabled = true;
    try{
      mv = await tankMovementSince(tankId, from);
      const opening = num($('#tsQty').value);
      const patch = {openingStockL:opening, openingStockDate:from, currentStockL: opening + mv.net};
      if (num($('#tsRate').value)) patch.costRate = num($('#tsRate').value);
      await state.db.doc('tanks/'+tankId).update(patch);
      await logActivity({entity:'Tank', entityLabel:tank.name, action:'edit',
        changes:[{field:'Opening stock', from:liters(tank.openingStockL), to:`${liters(opening)} as at ${fmtDateLabel(from)}`},
                 {field:'Current stock', from:liters(tank.currentStockL), to:liters(opening + mv.net)}]});
      closeModal();
      try{ if ($('#viewMount')) renderSetup($('#viewMount')); }catch(e){}
    }catch(e){
      const msg = $('#tsMsg'), btn = $('#tsSave');
      if (msg) msg.textContent = 'Could not save: '+(e.message||'error');
      if (btn) btn.disabled = false;
    }
  };
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
      <tbody>${state.nozzles.length? byName(state.nozzles).map(n=>{
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
        <div class="field"><label>Opening balance (₹ already owed)</label><input type="number" step="0.01" id="crOpening" placeholder="0.00"></div>
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
          <button class="btn ghost sm" data-openbal="${c.id}" style="margin-left:6px;">Opening</button>
          <button class="btn ghost sm" data-edit="${c.id}" style="margin-left:6px;">${icon('edit')}</button>
          <button class="btn ghost sm" data-toggle="${c.id}" data-cur="${c.active!==false}" style="margin-left:6px;">${c.active!==false?'Deactivate':'Activate'}</button>
          ${c.active===false?`<button class="btn danger sm" data-delete="${c.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="empty">No creditors yet.</td></tr>`}</tbody>
    </table></div></div>
  `;
  $$('[data-openbal]', body).forEach(b=>b.onclick=()=>openOpeningBalanceModal('creditor', b.dataset.openbal));
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
    const openingBalance = num($('#crOpening').value);
    await state.db.collection('creditors').add({
      name, phone:$('#crPhone').value.trim(), vehicleNo:$('#crVeh').value.trim(),
      creditLimit:num($('#crLimit').value),
      isBowser, bowserProduct: isBowser?$('#crBowserProduct').value:null, bowserCapacityL: isBowser?num($('#crBowserCap').value):0,
      bowserStockL:0, openingBalance, balance:openingBalance, payments:[],
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Creditor', entityLabel:name, action:'add', summary: openingBalance?`Opening balance ${money(openingBalance)}`:''});
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
        <div class="field"><label>Opening balance (₹ already owed)</label><input type="number" step="0.01" id="spOpening" placeholder="0.00"></div>
        <div class="field" style="grid-column:span 2;"><label>Notes</label><input type="text" id="spNotes" placeholder="Optional"></div>
        <div class="field"><button class="btn primary" id="spAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add supplier</button></div>
      </div>
      <div class="hint" style="color:var(--text-faint);font-size:12px;">Suppliers are picked on the Purchase tab; what you owe each one is tracked as their outstanding balance and settled from Payments / Expenses.</div>
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
      name, phone:$('#spPhone').value.trim(), notes:$('#spNotes').value.trim(), openingBalance:num($('#spOpening').value), balance:num($('#spOpening').value),
      active:true, createdAt:new Date().toISOString(),
    });
    await logActivity({entity:'Supplier', entityLabel:name, action:'add'});
    renderSetup($('#viewMount'));
  };
  $$('[data-toggle]', body).forEach(b=>b.onclick=async ()=>{
    await state.db.doc('suppliers/'+b.dataset.toggle).update({active: b.dataset.cur!=='true'});
  });
  $$('[data-delete]', body).forEach(b=>b.onclick=()=>deleteSupplier(b.dataset.delete, ()=>renderSetup($('#viewMount'))));
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
        <div class="field"><label>Opening balance as at</label><input type="date" id="acOpenDate" value="${monthIdOf(todayStr())}-01" max="${todayStr()}"></div>
        <div class="field"><button class="btn primary" id="acAdd" style="width:100%" ${state.dbReady?'':'disabled'}>${icon('plus')} Add bank account</button></div>
      </div>
      <div id="acMsg" style="font-size:13px;"></div>
    </div>
    <div class="section-head"><h2>Bank accounts</h2></div>
    <div class="card" style="margin-bottom:16px;"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Bank</th><th>Account no.</th><th class="num">Opening</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
      <tbody>${banks.length? banks.map(a=>`<tr>
        <td>${esc(a.name)}</td><td>${esc(a.bankName||'—')}</td><td>${esc(a.accountNo||'—')}</td>
        <td class="num">${a.openingDate?`${money(a.openingBalance)}<div class="hint" style="font-size:11px;color:var(--text-faint)">as at ${fmtDateLabel(a.openingDate)}</div>`:'—'}</td>
        <td class="num" style="font-weight:600;">${money(a.balance||0)}</td>
        <td><span class="pill ${a.active!==false?'good':'neutral'}">${a.active!==false?'Active':'Inactive'}</span></td>
        <td>
          <button class="btn sm" data-deposit="${a.id}">Add deposit</button>
          <button class="btn ghost sm" data-opening="${a.id}" style="margin-left:6px;">Opening balance</button>
          <button class="btn ghost sm" data-ledger="${a.id}" style="margin-left:6px;">Ledger</button>
          <button class="btn ghost sm" data-edit="${a.id}" style="margin-left:6px;">${icon('edit')}</button>
          <button class="btn ghost sm" data-toggle="${a.id}" data-cur="${a.active!==false}" style="margin-left:6px;">${a.active!==false?'Deactivate':'Activate'}</button>
          ${a.active===false?`<button class="btn danger sm" data-delete="${a.id}" style="margin-left:6px;">${icon('trash')}</button>`:''}
        </td>
      </tr>`).join('') : `<tr><td colspan="7" class="empty">No bank accounts yet.</td></tr>`}</tbody>
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
      balance:num($('#acOpen').value), openingBalance:num($('#acOpen').value), openingDate:$('#acOpenDate').value||'', ledger:[], active:true, createdAt:new Date().toISOString(),
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
  $$('[data-opening]', body).forEach(b=>b.onclick=()=>{
    const a = state.accounts.find(x=>x.id===b.dataset.opening);
    if (a) openAccountOpeningModal(a);
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


// Setting an account's balance by hand is the usual way an opening figure gets entered, but that
// field is the balance TODAY — type the 1st-of-month figure into it and every report's opening comes
// out short by whatever has been posted since. This asks for the balance and the date it applies to,
// then works the current balance out from the movements in between.
async function accountMovementSince(accountKey, fromDate){
  if (fromDate > todayStr()) return 0;
  const r = await computeReport(fromDate, todayStr(), {});
  return buildLedgerPostings(r).filter(p=>p.key===accountKey).reduce((s,p)=>s + p.dr - p.cr, 0);
}
// The key a ledger's postings are filed under. Cash in hand is addressed as 'cash' everywhere.
function ledgerPostingKey(id){
  const l = state.ledgers.find(x=>x.id===id);
  return (l && l.cashInHand) ? 'cash' : 'led:'+id;
}
// Every account a statement can be run for — bank, ledger, creditor, supplier — can have its
// opening balance confirmed against a statement. Balances are held debit-positive internally, but a
// creditor's dues and a supplier's payable read more naturally as plain amounts, so each kind
// declares how to convert between the two.
const OPENING_KINDS = {
  account:  {collection:'accounts',   list:()=>state.accounts,   key:id=>'acct:'+id, sign:1,  label:'Bank account', hint:'Balance as your bank statement showed it.'},
  // Cash in hand posts under the bare key 'cash', never 'led:<id>' — looking its movement
  // up by the ledger id finds nothing, which would reset the balance to the bare opening figure.
  ledger:   {collection:'ledgers',    list:()=>state.ledgers,    key:ledgerPostingKey, sign:1,  label:'Ledger',       hint:'Debit balances are positive, credit balances negative.', side:true},
  creditor: {collection:'creditors',  list:()=>state.creditors,  key:id=>'cred:'+id, sign:1,  label:'Creditor',     hint:'What this customer owed the station on that date.'},
  supplier: {collection:'suppliers',  list:()=>state.suppliers,  key:id=>'sup:'+id,  sign:-1, label:'Supplier',     hint:'What the station owed this supplier on that date.'},
};
function openOpeningBalanceModal(kind, id){
  const cfg = OPENING_KINDS[kind];
  const root = $('#modalRoot');
  if (!cfg || !root) return;
  const rec = cfg.list().find(x=>x.id===id);
  if (!rec) return;
  const key = cfg.key(id);
  const defDate = rec.openingDate || (monthIdOf(todayStr())+'-01');
  // What the user types is always a plain positive amount; `side` turns it into a debit or credit.
  const storedOpening = num(rec.openingBalance);
  const shownOpening = cfg.side ? Math.abs(storedOpening) : storedOpening;
  root.innerHTML = `<div class="modal-backdrop" id="mbDrop">
    <div class="modal">
      <h3>Opening balance — ${esc(rec.name)}</h3>
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px;">${esc(cfg.hint)} Everything recorded since is added on, so the balance today stays right and reports open from the figure you confirmed.</p>
      <div class="field"><label>Balance was</label><input type="number" step="0.01" id="obAmount" value="${shownOpening||''}" placeholder="0.00"></div>
      ${cfg.side?`<div class="field"><label>Side</label><select id="obSide"><option value="dr" ${storedOpening>=0?'selected':''}>Debit (Dr)</option><option value="cr" ${storedOpening<0?'selected':''}>Credit (Cr)</option></select></div>`:''}
      <div class="field"><label>As at (start of this day)</label><input type="date" id="obDate" value="${defDate}" max="${todayStr()}"></div>
      <div class="card card-pad" style="background:var(--surface-2);margin-bottom:12px;">
        <div class="row" style="justify-content:space-between;font-size:13px;"><span>Recorded since that date</span><strong class="mono" id="obMove">—</strong></div>
        <div class="row" style="justify-content:space-between;font-size:13px;margin-top:4px;"><span>Balance today would become</span><strong class="mono" id="obNew">—</strong></div>
        <div class="row" style="justify-content:space-between;font-size:12.5px;margin-top:4px;color:var(--text-muted);"><span>Balance today now</span><span class="mono">${money(rec.balance)}</span></div>
      </div>
      <div id="obMsg" style="font-size:13px;color:var(--critical);"></div>
      <div class="modal-actions">
        <button class="btn" id="obCancel">Cancel</button>
        <button class="btn primary" id="obSave">Set opening balance</button>
      </div>
    </div>
  </div>`;
  $('#obCancel').onclick = closeModal;
  $('#mbDrop').addEventListener('click', (e)=>{ if (e.target.id==='mbDrop') closeModal(); });
  // Typed amount -> the debit-positive figure the ledger works in.
  const typedAsDr = ()=>{
    const v = num($('#obAmount').value);
    return (cfg.side && $('#obSide') && $('#obSide').value==='cr') ? -v : v * (cfg.sign<0 ? -1 : 1);
  };
  const toStored = (dr)=> cfg.sign<0 ? -dr : dr;   // what goes in the record's own convention
  let movement = 0;
  const show = ()=>{ $('#obNew').textContent = money(toStored(typedAsDr() + movement)); };
  const recalc = async ()=>{
    const from = $('#obDate').value;
    if (!from) return;
    $('#obMove').textContent = 'calculating…';
    movement = await accountMovementSince(key, from);
    $('#obMove').textContent = money(toStored(movement));
    show();
  };
  $('#obDate').onchange = recalc;
  $('#obAmount').oninput = show;
  if ($('#obSide')) $('#obSide').onchange = show;
  recalc();
  $('#obSave').onclick = async ()=>{
    if (!state.dbReady){ $('#obMsg').textContent = "Live data isn't connected."; return; }
    const from = $('#obDate').value;
    if (!from){ $('#obMsg').textContent = 'Pick the date this balance applies to.'; return; }
    $('#obSave').disabled = true;
    try{
      movement = await accountMovementSince(key, from);
      const openingStored = toStored(typedAsDr());
      const balance = toStored(typedAsDr() + movement);
      await state.db.doc(cfg.collection+'/'+id).update({openingBalance:openingStored, openingDate:from, balance});
      await logActivity({entity:cfg.label, entityLabel:rec.name, action:'edit',
        changes:[{field:'Opening balance', from:money(rec.openingBalance), to:`${money(openingStored)} as at ${fmtDateLabel(from)}`},
                 {field:'Balance today', from:money(rec.balance), to:money(balance)}]});
      closeModal();
      // The save is already done at this point; a failure to redraw must not read as a failed save.
      try{ if ($('#viewMount')) renderSetup($('#viewMount')); }catch(e){}
    }catch(e){
      const msg = $('#obMsg'), btn = $('#obSave');
      if (msg) msg.textContent = 'Could not save: '+(e.message||'error');
      if (btn) btn.disabled = false;
    }
  };
}
function openAccountOpeningModal(account){ openOpeningBalanceModal('account', account.id); }
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

    <div class="section-head"><h2>Cost rates (purchase price)</h2><span class="hint">used to value stock</span></div>
    <div class="banner info">${icon('tank')}<div>Stock in your tanks is valued at the rate you last <strong>bought</strong> it for. Until a purchase is recorded on the Purchase tab, these figures stand in — without them, fuel on hand values at ₹0 and the trading account overstates profit. Any purchase you record later takes precedence automatically.</div></div>
    <div class="card card-pad">
      <div class="form-grid">
        ${PRODUCT_KEYS.map(k=>`<div class="field"><label>${esc(state.config.products[k]||k)} cost (₹/L)</label><input type="number" step="0.01" class="ctVal" data-k="${k}" value="${num((state.config.costRates||{})[k])||''}" placeholder="0.00"></div>`).join('')}
        <div class="field"><button class="btn primary" id="ctSave" style="width:100%" ${state.dbReady?'':'disabled'}>Save cost rates</button></div>
      </div>
      <div id="ctMsg" style="font-size:13px;"></div>
    </div>
  `;
  $('#rtSave').onclick = async ()=>{
    const d = $('#rtDate').value;
    const rates = {};
    $$('.rtVal', body).forEach(inp=>{ if (inp.value!=='') rates[inp.dataset.k] = num(inp.value); });
    await setRateForDate(d, rates);
    $('#rtMsg').innerHTML = `<span style="color:var(--good)">Rates saved for ${fmtDateLabel(d)}.</span>`;
  };
  $('#ctSave').onclick = async ()=>{
    const costRates = Object.assign({}, state.config.costRates||{});
    $$('.ctVal', body).forEach(inp=>{ costRates[inp.dataset.k] = num(inp.value); });
    await state.db.doc('config/main').update({costRates}).catch(async ()=>{
      await state.db.doc('config/main').set(Object.assign({}, state.config, {costRates}));
    });
    state.config.costRates = costRates;
    await logActivity({entity:'Config', entityLabel:'Cost rates', action:'edit', summary:PRODUCT_KEYS.map(k=>`${state.config.products[k]||k} ${money(costRates[k])}`).join(' · ')});
    $('#ctMsg').innerHTML = `<span style="color:var(--good)">Cost rates saved — stock valuation will use these until a purchase is recorded.</span>`;
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
      <h3 style="margin-top:0;font-size:14px;">Recalculate Cash in hand</h3>
      <p class="hint" style="color:var(--text-muted);font-size:13px;">Rebuilds the Cash in hand ledger from its opening balance + every duty's cash takings + receipts into cash − payments &amp; expenses paid from cash + journal postings to cash. Run this once after upgrading (duties saved before cash tracking existed aren't in the balance yet), or whenever the figure looks off.</p>
      <button class="btn" id="toolRecalcCash" ${state.dbReady?'':'disabled'}>Recalculate cash</button>
      <div id="toolCashMsg" style="font-size:13px;margin-top:8px;"></div>
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
  $('#toolRecalcCash').onclick = async ()=>{
    const msg = $('#toolCashMsg');
    msg.textContent = 'Recalculating…';
    try{
      const cashLedger = await ensureCashLedger();
      const months = [];
      let cursor = monthIdOf(todayStr());
      for (let i=0;i<36;i++){ months.push(cursor); cursor = shiftMonth(cursor,-1); }
      // Only what happened on or after the confirmed opening date counts, or history from before it
      // would be added on top of an opening balance that already includes it.
      const since = cashLedger.openingDate || '';
      const counts = (d)=> !since || (d||'') >= since;
      let dutyCash=0, receiptCash=0, journalCash=0, paidCash=0;
      const logsSnap = await state.db.collection('dailyLogs').limit(1000).get();
      // Duties saved before counted cash was posted are brought into line here: the counted figure
      // and its variance are written onto them from the denomination count they already hold, so
      // reports and the rebuilt balance agree from now on.
      let migrated = 0;
      for (const doc of logsSnap.docs){
        const data = cloneDoc(doc.data());
        let changed = false;
        Object.values(data.duties||{}).forEach(x=>{
          const ci = dutyCashInfo(x);
          if (counts(doc.id)) dutyCash += ci.posted;
          if (x.pay && x.pay.cashPosted==null && ci.hasCount){
            x.pay.counted = ci.counted; x.pay.variance = ci.variance; x.pay.cashPosted = ci.posted;
            changed = true; migrated++;
          }
        });
        if (changed){
          await state.db.doc('dailyLogs/'+doc.id).set(data);
          state.dailyLogsCache[doc.id] = data;
          delete state.monthLogsCache[monthIdOf(doc.id)];
        }
      }
      for (const m of months){
        const r = await state.db.doc('receiptsMonthly/'+m).get();
        if (r.exists) (r.data().items||[]).forEach(it=>{ if ((it.into||'cash')==='cash' && counts(it.date)) receiptCash += num(it.amount); });
        const ex = await state.db.doc('expensesMonthly/'+m).get();
        if (ex.exists) (ex.data().items||[]).forEach(it=>{ if (it.paidFrom==='cash' && counts(it.date)) paidCash += num(it.amount); });
        const j = await state.db.doc('journalMonthly/'+m).get();
        if (j.exists) (j.data().items||[]).forEach(it=>{ if (!counts(it.date)) return; if (it.debit==='cash') journalCash += num(it.amount); if (it.credit==='cash') journalCash -= num(it.amount); });
      }
      const balance = num(cashLedger.openingBalance) + dutyCash + receiptCash - paidCash + journalCash;
      await state.db.doc('ledgers/'+cashLedger.id).update({balance});
      await logActivity({entity:'Ledger', entityLabel:'Cash in hand', action:'edit', changes:[{field:'Balance', from:ledgerBalanceLabel(cashLedger.balance), to:ledgerBalanceLabel(balance)}], summary:'Recalculated from history'});
      msg.innerHTML = `<span style="color:var(--good)">Done — Cash in hand is now ${ledgerBalanceLabel(balance)} (opening ${money(cashLedger.openingBalance)} + duty cash ${money(dutyCash)} + receipts ${money(receiptCash)} − payments/expenses from cash ${money(paidCash)} ${journalCash<0?'−':'+'} journal ${money(Math.abs(journalCash))}).${migrated?` ${migrated} earlier duty line(s) were brought onto their counted cash.`:''}</span>`;
    }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">${esc(e.message||'Failed')}</span>`; }
  };
  $('#toolRecalc').onclick = async ()=>{
    const msg = $('#toolMsg');
    msg.textContent = 'Recalculating…';
    try{
      // A tank whose opening stock was dipped on a date only counts what moved from that date on —
      // otherwise history from before the dip would be subtracted from it a second time.
      const afterOpening = (tankId, date)=>{
        const t = state.tanks.find(x=>x.id===tankId);
        return !t || !t.openingStockDate || (date && date >= t.openingStockDate);
      };
      const receiptsByTank = {};
      const monthsToScan = new Set();
      const now = new Date();
      let cursor = monthIdOf(todayStr());
      for (let i=0;i<36;i++){ monthsToScan.add(cursor); cursor = shiftMonth(cursor,-1); }
      for (const m of monthsToScan){
        const snap = await state.db.doc('stockReceiptsMonthly/'+m).get();
        if (snap.exists){ (snap.data().items||[]).forEach(it=>{ if (afterOpening(it.tankId, it.date)) receiptsByTank[it.tankId] = (receiptsByTank[it.tankId]||0)+num(it.liters); }); }
      }
      const soldByTank = {};
      const transferredInByTank = {};
      const logsSnap = await state.db.collection('dailyLogs').limit(1000).get();
      // The highest closing recorded per nozzle, and the day it belongs to — used to repair a stored
      // last reading that a shift entered out of order had dragged backwards.
      const lastByNozzle = {};
      logsSnap.docs.forEach(d=>{
        const data = d.data();
        Object.values(data.duties||{}).forEach(duty=>{
          Object.entries(duty.nozzles||{}).forEach(([nid, nz])=>{
            // drawLiters (sale + stock transfer) is what actually left the source tank; older
            // entries saved before stock transfers existed only have `liters`, which meant the same thing.
            const draw = nz.drawLiters!=null ? nz.drawLiters : nz.liters;
            const dutyDate = data.date || d.id;
            if (nz.tankId && afterOpening(nz.tankId, dutyDate)) soldByTank[nz.tankId] = (soldByTank[nz.tankId]||0) + num(draw);
            if (nz.transferToTankId && afterOpening(nz.transferToTankId, dutyDate)) transferredInByTank[nz.transferToTankId] = (transferredInByTank[nz.transferToTankId]||0) + num(nz.transferLiters);
            if (nz.closing!=null){
              const date = data.date || d.id;
              const seen = lastByNozzle[nid];
              if (!seen || date > seen.date || (date === seen.date && num(nz.closing) > num(seen.value))) lastByNozzle[nid] = {value:num(nz.closing), date};
            }
          });
        });
      });
      let nozzlesFixed = 0;
      for (const [nid, info] of Object.entries(lastByNozzle)){
        const nz = state.nozzles.find(x=>x.id===nid);
        if (!nz || (num(nz.lastClosing)===num(info.value) && (nz.lastReadingDate||'')===info.date)) continue;
        await state.db.doc('nozzles/'+nid).update({lastClosing:info.value, lastReadingDate:info.date}).catch(()=>{});
        nz.lastClosing = info.value; nz.lastReadingDate = info.date;
        nozzlesFixed++;
      }
      // A tank that ends up negative has sold more than its opening stock plus its deliveries — the
      // opening stock or some purchases are missing, so it is left untouched and reported rather
      // than overwritten with a figure that cannot be true.
      const skipped = [];
      for (const t of state.tanks){
        const newStock = num(t.openingStockL) + (receiptsByTank[t.id]||0) + (transferredInByTank[t.id]||0) - (soldByTank[t.id]||0);
        if (newStock < 0){ skipped.push({name:t.name, would:newStock, sold:(soldByTank[t.id]||0), opening:num(t.openingStockL), received:(receiptsByTank[t.id]||0)}); continue; }
        await state.db.doc('tanks/'+t.id).update({currentStockL: newStock});
      }
      msg.innerHTML = `<span style="color:var(--good)">Done — tank stock recalculated from history (including stock transfers between tanks).${nozzlesFixed?` &nbsp;${nozzlesFixed} nozzle last-reading(s) corrected.`:''}</span>`
        + (skipped.length ? `<div class="banner" style="margin-top:10px;">${icon('tank')}<div><strong>${esc(skipped.map(s=>s.name).join(', '))}</strong> would come out negative, so ${skipped.length>1?'they were':'it was'} left unchanged.
            ${skipped.map(s=>`<div style="font-size:12.5px;margin-top:4px;">${esc(s.name)}: opening ${liters(s.opening)} + received ${liters(s.received)} − dispensed ${liters(s.sold)} = <strong>${liters(s.would)}</strong></div>`).join('')}
            <div style="font-size:12.5px;margin-top:6px;">Either the opening stock was never entered or some deliveries are missing. Set the dip reading with <strong>Opening stock</strong> on the tank, or record the purchases, then run this again.</div></div></div>` : '');
    }catch(e){ msg.innerHTML = `<span style="color:var(--critical)">${esc(e.message||'Failed')}</span>`; }
  };
}

/* ============================== boot ============================== */
initDb();
})();
