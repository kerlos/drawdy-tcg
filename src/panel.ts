// The webview: Library editor, Hand, Deck actions and Action Log. Runs on one Player's device only.
// The script below must not contain backticks or dollar-brace sequences (it lives in a template literal).
// The driver swaps /*__THEME__*/ for Drawdy's --dd-* tokens; every colour here falls back to a dark theme without them.
export const PANEL_HTML = /* html */ `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style id="tk">:root{/*__THEME__*/}</style><style>
*{box-sizing:border-box}
:root{
--bg:var(--dd-surface-panel,#1b1b20);--sec:var(--dd-surface-section,#25252c);
--tx:var(--dd-text-primary,#ececf1);--tx3:var(--dd-text-tertiary,#9a9aa8);
--bds:var(--dd-border-subtle,#363640);--div:var(--dd-divider,#30303a);
--ctl:var(--dd-control-surface,rgba(255,255,255,.12));--bdx:var(--dd-border-strong,rgba(255,255,255,.18));--hov:var(--dd-interaction-hover,rgba(255,255,255,.1));
--acc:var(--dd-accent,#9bd400);--acch:var(--dd-accent-hover,#aee31a);--onacc:var(--dd-on-accent,#111);
--dan:var(--dd-status-danger,#ff7b7b);--dans:var(--dd-status-danger-subtle,rgba(255,90,90,.15));
--wrn:var(--dd-status-warning,#e8b84a);--wrns:var(--dd-status-warning-subtle,rgba(232,184,74,.15));
--ring:var(--dd-focus-ring,#9aa0aa)}
body{margin:0;background:var(--bg);color:var(--tx);font:13px/1.45 var(--dd-font-sans,system-ui,sans-serif)}
.tabs{position:sticky;top:0;z-index:2;display:flex;gap:6px;padding:8px 12px;background:var(--bg);border-bottom:1px solid var(--div)}
#app{padding:0 12px 24px}
.b{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:0 14px;border:1px solid var(--bdx);border-radius:8px;background:var(--ctl);color:var(--tx);font:inherit;font-weight:500;text-align:center;cursor:pointer;user-select:none}
.b:hover:not(:disabled){background-image:linear-gradient(var(--hov),var(--hov))}.b:active:not(:disabled){filter:brightness(.88);transform:translateY(1px)}
.b:disabled{opacity:.45;cursor:not-allowed}
.b.sm{min-height:30px;padding:0 10px;border-radius:6px}
.b.pri,.tabs .b.on{background:var(--acc);border-color:var(--acc);color:var(--onacc);font-weight:600}.b.pri:hover:not(:disabled){background:var(--acch)}
.b.dng{color:var(--dan);border-color:transparent;background:transparent}.b.dng:hover:not(:disabled){background:var(--dans)}
.b.dng.yes{background:var(--dan);color:#fff}.b.dng.yes:hover:not(:disabled){background:var(--dan);filter:brightness(1.1)}
.tabs .b{flex:1;padding:0 4px;min-width:0}.grow{flex:1}
.b:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible,.b:has(:focus-visible){outline:2px solid var(--ring);outline-offset:2px}
textarea{display:block;width:100%;min-height:96px;margin-top:8px;background:var(--bg);color:var(--tx);border:1px solid var(--bdx);border-radius:8px;padding:8px 10px;font:12px/1.5 ui-monospace,Consolas,monospace;resize:vertical}
.pill{display:inline-block;margin-left:6px;padding:0 8px;border-radius:99px;background:var(--acc);color:var(--onacc);font-size:11px;font-weight:600;vertical-align:1px}
input[type=text],input[type=number],select{min-height:36px;background:var(--bg);color:var(--tx);border:1px solid var(--bdx);border-radius:8px;padding:0 10px;font:inherit}
input[type=text]{flex:1;min-width:0}
select{min-height:30px;border-radius:6px;padding:0 6px}
.vh{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none}
.sec{background:var(--sec);border:1px solid var(--bds);border-radius:10px;padding:12px;margin:12px 0}
h3{margin:0 0 8px;font-size:12px;font-weight:600}
.dim{color:var(--tx3);font-size:12px;line-height:1.4;margin:0}
.hdr{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 0}.hdr h3{margin:0}
.row{display:flex;gap:8px;align-items:center;margin-top:8px}
.btns{display:flex;flex-wrap:wrap;gap:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;margin-top:8px}.grid .b{width:100%}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chip{flex:1;min-width:84px;background:var(--sec);border:1px solid var(--bds);border-radius:10px;padding:8px 10px}
.chip b{display:block;font-size:18px;line-height:1.2}.chip span{color:var(--tx3);font-size:11px}
.msg,.warn{border:1px solid;border-radius:8px;padding:8px 10px;margin:10px 0}
.msg{background:var(--wrns);border-color:var(--wrn)}.warn{background:var(--dans);border-color:var(--dan)}
.card{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--div)}
.card img{flex:none;height:auto;border-radius:4px;box-shadow:0 0 0 1px var(--bds)}
.cb{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.nm{overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.acts{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.acts select{flex:1;min-width:0;max-width:none}.acts .dng{margin-left:auto}
.step{display:inline-flex;align-items:center;gap:4px}.step input{width:52px;min-height:30px;text-align:center;padding:0 4px;border-radius:6px}
details>summary{display:flex;align-items:center;gap:8px;min-height:30px;font-weight:600;cursor:pointer;list-style:none}
details>summary::-webkit-details-marker{display:none}
details>summary::after{content:"";margin:-3px 4px 0 auto;width:7px;height:7px;border:solid var(--tx3);border-width:0 2px 2px 0;transform:rotate(45deg)}
details[open]>summary::after{margin-top:3px;transform:rotate(-135deg)}
details[open]>summary{margin-bottom:4px}
.empty{margin-top:10px;padding:16px 8px;text-align:center;color:var(--tx3);border:1px dashed var(--bdx);border-radius:8px}
.switch{display:inline-flex;gap:8px;align-items:center;min-height:30px;cursor:pointer}.switch input{width:18px;height:18px;margin:0;accent-color:var(--acc)}
.log{max-height:200px;overflow:auto;font-size:12px}.log div{padding:2px 0}
.p1{color:#2f8fd8}.p2{color:#d8692f}
.big{display:block;max-width:100%;margin:8px 0;border-radius:10px}
a{color:var(--acc)}
</style></head><body><div class="tabs" role="tablist"><button class="b" role="tab" data-a="ui:tab" data-v="table" id="t-table">Table</button><button class="b" role="tab" data-a="ui:tab" data-v="decks" id="t-decks">Decks</button><button class="b" role="tab" data-a="ui:tab" data-v="lib" id="t-lib">Library</button><button class="b" role="tab" data-a="ui:tab" data-v="create" id="t-create">Creator</button></div><div id="app"></div>
<script>
var api = acquireDrawdyApi();
var S = null, LIB = {deck:[],tokens:[],customs:[]}, tab = 'table', NV = 0, searching = false, filter = '', note = '', ddcName = 'My Library', exp = null, lastS = '', OPEN = {};
// Decks and the Creator draft. DT is Deck list text being typed (null: show the Deck as text), ASK the button waiting for a second click.
var DECKS = [], ACTIVE = '', edit = '', DT = null, NN = '', NT = '', pick = '', onlyIn = false, libFilter = '', ASK = '';
var DRAFT = {deck:[],tokens:[],customs:[]}, dname = '';
var KINDS = ['deck','tokens','customs'], ROWS = 40;
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function find(id){var k=['deck','tokens','customs'];for(var i=0;i<3;i++){var l=LIB[k[i]];for(var j=0;j<l.length;j++)if(l[j].id===id)return l[j]}return null}
function thumb(id,w){var c=find(id);return c?'<img alt="" src="'+c.img+'" width="'+(w||44)+'">':'<span style="width:'+(w||44)+'px;flex:none"></span>'}
function nm(id){var c=find(id);return c?esc(c.name):'?'}
function uid(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function btn(a,label,o){o=o||{};var d='';for(var k in o){if(k!=='cls'&&k!=='dis'&&k!=='aria')d+=' data-'+k+'="'+esc(o[k])+'"'}return '<button class="b'+(o.cls?' '+o.cls:'')+'" data-a="'+a+'"'+d+(o.aria?' aria-label="'+esc(o.aria)+'"':'')+(o.dis?' disabled':'')+'>'+label+'</button>'}
function sec(title,body){return '<section class="sec">'+(title?'<h3>'+title+'</h3>':'')+body+'</section>'}
function isOpen(k,def){return OPEN[k]===undefined?def:OPEN[k]}
function det(k,title,body,def){return '<section class="sec"><details data-k="'+k+'"'+(isOpen(k,def)?' open':'')+'><summary>'+title+'</summary>'+body+'</details></section>'}
function chip(label,val){return '<div class="chip"><b>'+val+'</b><span>'+label+'</span></div>'}
function stepper(dec,inc,input,o){return '<span class="step">'+btn(dec,'&minus;',o.dec)+input+btn(inc,'+',o.inc)+'</span>'}

// One Card in a list: a main button, and every other move in a menu.
var MV=[['play','Play'],['playdown','Play face down'],['hand','To Hand'],['top','Top of Deck'],['bottom','Bottom of Deck'],['discard','Discard']];
function cardRow(c,from,main){
  var o='<option value="">More&hellip;</option>',label='';
  MV.forEach(function(m){if(m[0]===main)label=m[1];else if(!(m[0]==='hand'&&from==='hand'))o+='<option value="'+m[0]+'">'+m[1]+'</option>'});
  return '<div class="card">'+thumb(c.libId,44)+'<div class="cb"><span class="nm">'+nm(c.libId)+'</span><div class="acts">'+
    btn('move',label,{from:from,iid:c.iid,to:main,cls:'pri sm'})+
    '<select class="mv" data-from="'+from+'" data-iid="'+esc(c.iid)+'" aria-label="More actions for '+nm(c.libId)+'">'+o+'</select></div></div></div>'}
function pileRow(img,name){return '<div class="card">'+(img?'<img alt="" src="'+img+'" width="32">':'<span style="width:32px;flex:none"></span>')+'<span class="nm">'+esc(name)+'</span></div>'}

function tableTab(){
  if(!S) return '<p class="dim" style="margin-top:12px">Connecting to the board&hellip;</p>';
  var h='';
  if(S.msg) h+='<div class="msg" role="status">'+esc(S.msg)+'</div>';
  if(!S.seat){
    var b='<p class="dim">You always play at the bottom of your view. Without a Side you are a spectator.</p><div class="btns" style="margin-top:8px">';
    [1,2].forEach(function(n){var s=S.seats[n],busy=s&&s.online;
      b+=btn('claim','Side '+n+(s?' - '+esc(s.name)+(busy?' (taken)':' (away: take over)'):' (free)'),{seat:n,dis:busy,cls:busy?'':'pri'})});
    return h+sec('Take a Side',b+'</div>')+logSec();
  }
  var opp=S.seats[S.seat===1?2:1];
  h+='<div class="hdr"><div><b>Player '+S.seat+'</b> <span class="dim">Match '+S.matchNo+'</span></div><div class="btns">'+btn('flyHome','Center view',{cls:'sm'})+btn('release','Leave Side',{cls:'sm dng'})+'</div></div>';
  if(S.status==='stale') h+='<div class="warn">This device cannot resume the Match you were playing. Restart the Match to play here.</div>';
  if(S.restart===S.seat) h+='<div class="row"><span class="dim grow">Waiting for the opponent to accept the Restart&hellip;</span>'+btn('restartDecline','Cancel',{cls:'sm'})+'</div>';
  else if(S.restart) h+='<div class="msg"><b>Opponent asks to Restart the Match.</b><div class="btns" style="margin-top:8px">'+btn('restartAccept','Accept',{cls:'sm pri'})+btn('restartDecline','Decline',{cls:'sm'})+'</div></div>';
  else h+='<div class="row">'+btn('restartRequest','Restart Match',{cls:'sm'})+'<span class="dim">Needs the opponent to accept.</span></div>';
  if(S.status!=='ready') return h+logSec();
  h+='<div class="chips">'+chip('Your Deck',S.deck.length)+chip('Your Hand',S.hand.length)+(opp?chip('Opponent Deck / Hand',opp.deck+' / '+opp.hand):chip('Opponent','no one yet'))+'</div>';
  if(S.drop) h+='<div class="msg">Card dropped on your Deck.<div class="btns" style="margin-top:8px">'+btn('dropDeck','Put on top',{to:'top',cls:'sm pri'})+btn('dropDeck','Put on bottom',{to:'bottom',cls:'sm'})+btn('dropDeck','Cancel',{to:'cancel',cls:'sm'})+'</div></div>';
  if(S.look) h+=sec('Face-down Card (only you see this)','<img class="big" alt="" src="'+(find(S.look)?find(S.look).img:'')+'">'+btn('closeLook','Close',{cls:'sm'}));

  var canLoad=!(S.deck.length||S.hand.length||!S.deckSize);
  var d=deckPicker()+'<div class="row">'+btn('draw','Draw',{cls:(canLoad?'':'pri ')+'grow'})+
    stepper('ui:nv','ui:nv','<input type="number" id="n" min="0" placeholder="1" value="'+(NV||'')+'" aria-label="How many cards">',{dec:{d:-1,cls:'sm',aria:'Fewer cards'},inc:{d:1,cls:'sm',aria:'More cards'}})+'</div>';
  d+='<div class="grid">'+btn('loadDeck','Load Deck',{dis:!canLoad,cls:canLoad?'pri':''})+btn('shuffle','Shuffle')+btn('mulligan','Mulligan')+btn('peek','Peek top')+btn('reveal','Reveal top')+btn('ui:search','Search Deck')+'</div>';
  d+='<p class="dim" style="margin-top:8px">'+(!S.deckSize&&!S.deck.length&&!S.hand.length?'Pick a Deck with cards in the Library, then Load Deck. ':'')+'The chosen Deck loads when a Match starts. The amount applies to Draw, Peek and Reveal. Mulligan with no amount uses your Hand size.</p>';
  h+=sec('Deck',d);

  if(S.held){
    var hh='';S.held.cards.forEach(function(c){hh+=cardRow(c,'held','hand')});
    h+=sec(S.held.mode==='peek'?'Peeking (private)':'Revealed to both',hh+'<div style="margin-top:8px">'+btn('closeHeld','Done: put the rest back on top',{cls:'sm'})+'</div>');
  }
  if(searching){
    var sh='<input type="text" id="filter" placeholder="Filter by name" aria-label="Filter the Deck by name" value="'+esc(filter)+'" style="width:100%">',shown=0;
    S.deck.forEach(function(c){var n=(find(c.libId)||{name:''}).name;
      if(filter&&n.toLowerCase().indexOf(filter.toLowerCase())<0)return;
      if(shown++<60)sh+=cardRow(c,'deck','hand')});
    h+=sec('Search Deck',sh+'<div style="margin-top:8px">'+btn('ui:closeSearch','Close and shuffle',{cls:'sm pri'})+'</div>');
  }

  var hd='<div class="hdr" style="margin:0 0 4px"><h3>Hand ('+S.hand.length+')</h3><label class="switch"><input type="checkbox" data-a="toggleShown"'+(S.shown?' checked':'')+'> Show my Hand to opponent</label></div>';
  if(!S.hand.length)hd+='<div class="empty">Your Hand is empty. Draw a card to start.</div>';
  S.hand.forEach(function(c){hd+=cardRow(c,'hand','play')});
  h+=sec('',hd);

  var dm='<h3 style="margin-top:8px">Yours ('+S.discard.mine.length+')</h3>',op='<h3 style="margin-top:12px">Opponent ('+S.discard.opp.length+')</h3>';
  if(!S.discard.mine.length)dm+='<p class="dim">Empty.</p>';if(!S.discard.opp.length)op+='<p class="dim">Empty.</p>';
  S.discard.mine.forEach(function(c){dm+=pileRow(find(c.libId)&&find(c.libId).img,find(c.libId)?find(c.libId).name:'?')});
  S.discard.opp.forEach(function(c){op+=pileRow(c.img,c.name)});
  h+=det('discard','Discard piles ('+S.discard.mine.length+' yours, '+S.discard.opp.length+' opponent)',dm+op,false);
  return h+logSec();
}

function logSec(){
  var h='<div class="log">';
  if(!S||!S.log.length)h+='<span class="dim">Nothing yet.</span>';
  else S.log.slice(-40).reverse().forEach(function(e){var d=new Date(e.t);
    h+='<div class="p'+e.seat+'">'+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+' P'+e.seat+' '+esc(e.text)+'</div>'});
  return det('log','Action Log',h+'</div>',true);
}

function known(){var m=Object.create(null);LIB.deck.forEach(function(c){m[c.name.toLowerCase()]=1});return m}
function deckOf(id){for(var i=0;i<DECKS.length;i++)if(DECKS[i].id===id)return DECKS[i];return null}
function total(d){var n=0;d.cards.forEach(function(c){n+=c.count});return n}
function lack(d){var k=known();return d.cards.filter(function(c){return !k[c.name.toLowerCase()]})}
function deckText(d){return d.cards.map(function(c){return c.count+'x '+c.name}).join('\\n')}
function more(n){return n>0?'<p class="dim" style="margin-top:8px">'+n+' more. Search to narrow the list.</p>':''}
function noteBox(){return note?'<div class="msg" role="status">'+esc(note)+'</div>':''}
// A destructive button asks twice: the first click arms it, the second does it.
function sure(key,label,yesA,o){
  if(ASK!==key)return btn('ui:ask',label,{k:key,cls:'sm dng'});
  var y={cls:'sm dng yes'};for(var k in o||{})y[k]=o[k];
  return btn(yesA,'Yes, '+label.toLowerCase(),y)+btn('ui:ask','Keep',{k:'',cls:'sm'})}
function expBox(from){
  if(!exp||exp.from!==from)return '';
  return '<div class="msg">Exported '+exp.cards+' cards as <a href="'+esc(exp.url)+'" download="'+esc(exp.file)+'">'+esc(exp.file)+'</a> ('+exp.size+'). If nothing was saved, your browser blocked the download inside the panel. Use <button class="b sm" data-a="ui:copyDdc">Copy file text</button> and paste it into a text file named '+esc(exp.file)+'. That copy is uncompressed, so it is larger.</div>'}

// Table tab: which Deck loads.
function deckPicker(){
  if(!DECKS.length)return '<div class="row" style="margin-top:0"><span class="dim grow">No Deck yet.</span>'+btn('ui:tab','Build a Deck',{v:'decks',cls:'sm pri'})+'</div>';
  var o='';DECKS.forEach(function(d){o+='<option value="'+esc(d.id)+'"'+(d.id===ACTIVE?' selected':'')+'>'+esc(d.name)+' ('+total(d)+')</option>'});
  return '<div class="row" style="margin-top:0"><label class="dim" for="deck-sel">Deck</label><select id="deck-sel" class="dsel grow" aria-label="Deck to play">'+o+'</select></div>'}

// Decks tab: list, and the builder for one Deck.
function deckList(){
  var h='<p class="dim" style="margin-top:12px">A Deck is a list of cards from your Library. Choose which one to play on the Table tab.</p>';
  h+=sec('New Deck','<div class="row" style="margin-top:0"><input type="text" id="nd-name" placeholder="Deck name" aria-label="Name for the new Deck" value="'+esc(NN)+'">'+btn('ui:newDeck','Create',{cls:'sm pri'})+'</div>'+
    '<details data-k="nd-list"'+(isOpen('nd-list',false)?' open':'')+' style="margin-top:8px"><summary>Start from a list</summary><textarea id="nd-text" rows="5" spellcheck="false" placeholder="4x Card A&#10;2x Card B" aria-label="Deck list to start from">'+esc(NT)+'</textarea></details>');
  if(!DECKS.length)return h+'<div class="empty">No Decks yet. Create one above, or import a .ddc file in the Library tab.</div>';
  var rows='';
  DECKS.forEach(function(d){var m=lack(d).length;
    rows+='<div class="card"><div class="cb"><span class="nm"><b>'+esc(d.name)+'</b>'+(d.id===ACTIVE?'<span class="pill">Playing</span>':'')+'</span>'+
      '<span class="dim">'+total(d)+' cards'+(m?', '+m+' not in your Library':'')+'</span>'+
      '<div class="acts">'+btn('ui:edit','Edit',{id:d.id,cls:'sm pri'})+(d.id===ACTIVE?'':btn('ui:use','Use',{id:d.id,cls:'sm'}))+sure('del:'+d.id,'Delete','ui:delDeck',{id:d.id})+'</div></div></div>'});
  return h+sec('Your Decks ('+DECKS.length+')',rows);
}
function dkRow(img,name,n){
  return '<div class="card">'+(img?'<img alt="" src="'+img+'" width="40">':'<span style="width:40px;flex:none"></span>')+'<div class="cb"><span class="nm">'+esc(name)+(img?'':' <span class="dim">(not in Library)</span>')+'</span><div class="acts">'+
    stepper('ui:dk','ui:dk','<input type="number" min="0" max="99" value="'+n+'" class="dkc" data-n="'+esc(name)+'" aria-label="Copies of '+esc(name)+'">',{dec:{n:name,d:-1,cls:'sm',aria:'Fewer copies of '+name},inc:{n:name,d:1,cls:'sm',aria:'More copies of '+name}})+'</div></div></div>'}
function editor(d){
  var m=lack(d),h='<div class="hdr"><div class="btns">'+btn('ui:back','&larr; Decks',{cls:'sm'})+'</div>'+sure('del:'+d.id,'Delete','ui:delDeck',{id:d.id})+'</div>';
  h+='<div class="row"><input type="text" id="dk-name" value="'+esc(d.name)+'" aria-label="Deck name">'+(d.id===ACTIVE?'<span class="pill">Playing</span>':btn('ui:use','Use this Deck',{id:d.id,cls:'sm pri'}))+'</div>';
  h+='<div class="chips">'+chip('Cards in Deck',total(d))+chip('Different cards',d.cards.length)+'</div>';
  if(m.length)h+='<div class="msg">Not in your Library, so skipped when the Deck loads: '+esc(m.slice(0,5).map(function(c){return c.name}).join(', '))+(m.length>5?' and '+(m.length-5)+' more':'')+'. Import the .ddc file that has them.</div>';
  var q=pick.toLowerCase(),have=Object.create(null),seen=Object.create(null),rows='',shown=0;
  d.cards.forEach(function(c){have[c.name.toLowerCase()]=c.count});
  m.forEach(function(c){rows+=dkRow(null,c.name,c.count)});
  LIB.deck.forEach(function(c){var k=c.name.toLowerCase(),n=have[k]||0;
    if(seen[k]||(q&&k.indexOf(q)<0)||(onlyIn&&!n))return;seen[k]=1;
    if(shown++<ROWS)rows+=dkRow(c.img,c.name,n)});
  h+=sec('Cards','<input type="text" id="pick" placeholder="Search your Library" aria-label="Search your Library" value="'+esc(pick)+'" style="width:100%">'+
    '<label class="switch" style="margin-top:6px"><input type="checkbox" data-a="ui:onlyIn"'+(onlyIn?' checked':'')+'> Only cards in this Deck</label>'+
    (LIB.deck.length?'':'<div class="empty">Your Library has no cards. Import a .ddc file in the Library tab.</div>')+rows+more(shown-ROWS));
  return h+det('dk-text','Deck list text',
    '<p class="dim">One card per line, like <b>4x Card Name</b>. Copy it to share this Deck, or paste a list and apply it. Applying replaces the cards in this Deck.</p>'+
    '<textarea id="dk-text" rows="8" spellcheck="false" aria-label="Deck list">'+esc(DT===null?deckText(d):DT)+'</textarea>'+
    '<div class="btns" style="margin-top:8px">'+btn('ui:applyDeck','Apply list',{cls:'sm pri'})+btn('ui:copyDeck','Copy list',{cls:'sm'})+'</div>',false);
}
function decksTab(){var d=edit&&deckOf(edit);return noteBox()+(d?editor(d):deckList())}

// Library tab: the cards you can play, filled from .ddc files.
function libList(kind,title,empty){
  var q=libFilter.toLowerCase(),l=LIB[kind],h='',shown=0;
  l.forEach(function(c){if(q&&c.name.toLowerCase().indexOf(q)<0)return;
    if(shown++<ROWS)h+='<div class="card"><img alt="" src="'+c.img+'" width="40"><div class="cb"><span class="nm">'+esc(c.name)+'</span><div class="acts">'+btn('ui:del','Remove',{kind:kind,id:c.id,cls:'sm dng',aria:'Remove '+c.name})+'</div></div></div>'});
  if(!l.length)h='<div class="empty">'+empty+'</div>';
  else if(!shown)h='<p class="dim">No match.</p>';
  else h+=more(shown-ROWS);
  return det('lib-'+kind,title+' ('+l.length+')',h,kind==='deck'||!!q);
}
function libTab(){
  return noteBox()+'<p class="dim" style="margin-top:12px">Your cards stay on this device; the other Player never sees them. Fill the Library by importing .ddc files, or make your own in the Creator tab.</p>'+
    sec('Card files (.ddc)','<div class="btns"><label class="b pri">Import .ddc&hellip;<input type="file" accept=".ddc" multiple class="ddcfile vh" aria-label="Import a .ddc file"></label></div>'+
      '<p class="dim" style="margin-top:8px">Importing adds new cards and updates cards that have the same name. If the file lists copies of cards, you also get a Deck named after the file.</p>'+
      '<div class="row"><input type="text" id="ddc-name" value="'+esc(ddcName)+'" aria-label="Name of the exported file">'+btn('ui:export','Export Library',{from:'lib',cls:'sm'})+'</div>'+expBox('lib'))+
    '<input type="text" id="libfilter" placeholder="Search your cards" aria-label="Search your cards" value="'+esc(libFilter)+'" style="width:100%">'+
    libList('deck','Cards','No cards yet. Import a .ddc file above.')+
    libList('tokens','Tokens','No tokens yet. Right-click the board, TCG Tabletop, Add Token.')+
    libList('customs','Custom Cards','No custom cards yet. Right-click the board, TCG Tabletop, Add Custom Card.');
}

// Creator tab: author a card file (kept on this device until you export it or add it to the Library).
function crSection(kind,title,hint,def){
  var q=libFilter.toLowerCase(),l=DRAFT[kind],h='<p class="dim">'+hint+'</p>',shown=0;
  h+='<div class="btns" style="margin-top:8px"><label class="b sm">Choose images&hellip;<input type="file" accept="image/*" multiple data-kind="'+kind+'" class="file vh" aria-label="Choose images for '+esc(title)+'"></label></div>';
  h+='<div class="row"><input type="text" id="url-'+kind+'" placeholder="Image URL (needs CORS)" aria-label="Image URL for '+esc(title)+'"><button class="b sm" data-a="ui:addUrl" data-kind="'+kind+'">Add</button></div>';
  h+='<div class="row"><input type="text" id="txt-'+kind+'" placeholder="Or type a name for a text card" aria-label="Text card name for '+esc(title)+'"><button class="b sm" data-a="ui:addText" data-kind="'+kind+'">Create</button></div>';
  if(!l.length)h+='<div class="empty">No cards yet.</div>';
  l.forEach(function(c){if(q&&c.name.toLowerCase().indexOf(q)<0)return;
    if(shown++<ROWS)h+='<div class="card"><img alt="" src="'+c.img+'" width="40"><div class="cb"><input type="text" class="cname" data-kind="'+kind+'" data-id="'+c.id+'" value="'+esc(c.name)+'" aria-label="Card name" style="width:100%"><div class="acts">'+
      (kind==='deck'?'<span class="dim">Starter copies</span>'+stepper('ui:dec','ui:inc','<input type="number" min="0" max="99" value="'+c.count+'" data-kind="'+kind+'" data-id="'+c.id+'" class="cnt" aria-label="Starter copies of '+esc(c.name)+'">',{dec:{kind:kind,id:c.id,cls:'sm',aria:'Fewer copies of '+c.name},inc:{kind:kind,id:c.id,cls:'sm',aria:'More copies of '+c.name}}):'')+
      btn('ui:cdel','Remove',{kind:kind,id:c.id,cls:'sm dng',aria:'Remove '+c.name})+'</div></div></div>'});
  return det('cr-'+kind,title+' ('+l.length+')',h+more(shown-ROWS),def);
}
function crTab(){
  var n=0;KINDS.forEach(function(k){n+=DRAFT[k].length});
  return noteBox()+'<p class="dim" style="margin-top:12px">Make your own cards. Add them to your Library, or export a .ddc file to share.</p>'+
    sec('Your card file','<input type="text" id="dr-name" value="'+esc(dname)+'" placeholder="Name, e.g. My Starter Set" aria-label="Name of your card file" style="width:100%">'+
      '<div class="btns" style="margin-top:8px">'+btn('ui:draftUse','Add to my Library',{cls:'pri',dis:!n})+btn('ui:export','Export .ddc',{from:'draft',dis:!n})+'</div>'+
      '<p class="dim" style="margin-top:8px">'+n+' cards. Give a card Starter copies above 0 to include a ready-made Deck named after the file.</p>'+expBox('draft')+
      (n?'<div style="margin-top:8px">'+sure('draft','Clear all','ui:draftClear')+'</div>':''))+
    (n>ROWS?'<input type="text" id="crfilter" placeholder="Search your cards" aria-label="Search your cards" value="'+esc(libFilter)+'" style="width:100%">':'')+
    crSection('deck','Cards','Cards for Decks. Add images, or paste a URL, or type a name.',true)+
    crSection('tokens','Tokens','Counters and summoned creatures. Players add them from the board menu.',false)+
    crSection('customs','Custom Cards','Life cards and other custom pieces.',false);
}

function render(){
  var ae=document.activeElement,id=ae&&ae.id,ss=null;try{ss=ae.selectionStart}catch(x){}
  ['table','decks','lib','create'].forEach(function(k){var e=document.getElementById('t-'+k);e.className='b'+(tab===k?' on':'');e.setAttribute('aria-selected',tab===k)});
  document.getElementById('app').innerHTML=tab==='table'?tableTab():tab==='decks'?decksTab():tab==='lib'?libTab():crTab();
  // The page is redrawn on every board change: keep the caret where the Player was typing.
  if(id){var el=document.getElementById(id);if(el){el.focus();if(ss!=null)try{el.setSelectionRange(ss,ss)}catch(x){}}}
}

// src/panel.test.ts runs the block between the gz markers
// gz:begin
var MAXTXT=80000000; // memory guard only; the driver enforces MAX_TEXT from ddc.ts
function gz(text){return typeof CompressionStream==='undefined'?Promise.resolve(new Blob([text])):
  new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob()}
async function readDdc(f){
  var h=new Uint8Array(await f.slice(0,2).arrayBuffer());
  if(h[0]!==0x1f||h[1]!==0x8b)return f.text();
  if(typeof DecompressionStream==='undefined')throw new Error('this browser cannot open compressed files');
  var rd=f.stream().pipeThrough(new DecompressionStream('gzip')).getReader(),dec=new TextDecoder(),out='';
  for(;;){var x=await rd.read();if(x.done)return out+dec.decode();
    out+=dec.decode(x.value,{stream:true});
    if(out.length>MAXTXT){rd.cancel();throw new Error('file is too large')}}
}
// gz:end
function sz(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
// ponytail: each change posts the whole list of that kind, images included; send only the changed card if a big Library or draft feels slow.
function save(kind){api.postMessage({t:'lib',kind:kind,list:LIB[kind]})}
function saveDraft(kind){api.postMessage({t:'draft',kind:kind,list:DRAFT[kind]})}
function saveDecks(){api.postMessage({t:'decks',list:DECKS,active:ACTIVE})}
function dfind(kind,id){return DRAFT[kind].filter(function(c){return c.id===id})[0]}
function setCount(kind,id,n){var c=dfind(kind,id);if(c){c.count=Math.max(0,Math.min(99,n));saveDraft(kind)}return c}
// Set the copies of a card in the Deck being edited: 0 takes it out. The caller redraws.
function setQty(name,n){var d=deckOf(edit);if(!d)return;var k=name.toLowerCase(),e=null;
  d.cards.forEach(function(c){if(c.name.toLowerCase()===k)e=c});n=Math.max(0,Math.min(99,n));
  if(e){if(n)e.count=n;else d.cards.splice(d.cards.indexOf(e),1)}else if(n)d.cards.push({name:name,count:n});
  DT=null;saveDecks()}
function qty(name){var d=deckOf(edit),k=name.toLowerCase(),n=0;if(d)d.cards.forEach(function(c){if(c.name.toLowerCase()===k)n=c.count});return n}
function copyText(t){var ta=document.createElement('textarea'),ok=false;ta.value=t;ta.style.cssText='position:fixed;left:-9999px';
  document.body.appendChild(ta);ta.select();try{ok=document.execCommand('copy')}catch(x){}ta.remove();return ok}
// Cards are 388x528 WebP at quality 0.85 (same as fitCard in util.ts). A browser that cannot encode WebP returns PNG, so fall back to JPEG.
function cardUrl(c){var u=c.toDataURL('image/webp',0.85);return u.indexOf('data:image/webp')===0?u:c.toDataURL('image/jpeg',0.85)}
function toCard(img){var c=document.createElement('canvas');c.width=388;c.height=528;var g=c.getContext('2d');
  var r=Math.max(388/img.width,528/img.height),w=img.width*r,h=img.height*r;g.drawImage(img,(388-w)/2,(528-h)/2,w,h);return cardUrl(c)}
function textCard(name){var c=document.createElement('canvas');c.width=388;c.height=528;var g=c.getContext('2d');g.scale(388/252,528/352);
  g.fillStyle='#2a3340';g.fillRect(0,0,252,352);g.strokeStyle='#9bd400';g.lineWidth=8;g.strokeRect(8,8,236,336);
  g.fillStyle='#fff';g.textAlign='center';g.font='bold 34px sans-serif';
  var words=name.split(' '),lines=[],cur='';words.forEach(function(w){var t=cur?cur+' '+w:w;if(g.measureText(t).width>200&&cur){lines.push(cur);cur=w}else cur=t});lines.push(cur);
  lines.slice(0,6).forEach(function(l,i){g.fillText(l,126,176-(lines.length-1)*20+i*42)});return cardUrl(c)}
function addCard(kind,name,img){DRAFT[kind].push({id:uid(),name:name,count:kind==='deck'?0:1,img:img});saveDraft(kind);render()}
function addFromSrc(kind,name,src){var im=new Image();im.crossOrigin='anonymous';
  im.onload=function(){try{addCard(kind,name,toCard(im))}catch(e){note='Could not read that image: '+e;render()}};
  im.onerror=function(){note='Could not load '+name;render()};im.src=src}

document.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]');if(!b)return;var a=b.dataset.a;
  if(a==='ui:tab'){tab=b.dataset.v;note='';ASK='';libFilter='';DT=null;render();return}
  if(a==='ui:nv'){NV=Math.max(0,NV+parseInt(b.dataset.d,10));render();return}
  if(a==='ui:search'){searching=true;filter='';api.postMessage({t:'act',a:'searchOpen'});render();return}
  if(a==='ui:closeSearch'){searching=false;api.postMessage({t:'act',a:'shuffle'});render();return}
  if(a==='ui:export'){var from=b.dataset.from;api.postMessage({t:'ddcExport',from:from,name:from==='draft'?dname:ddcName});return}
  if(a==='ui:copyDdc'){note=copyText(exp.text)?'Copied. Paste it into a text file named '+exp.file+'.':'Could not copy here. Right-click the link and save it instead.';render();return}
  if(a==='ui:ask'){ASK=b.dataset.k;render();return}
  // Decks
  if(a==='ui:newDeck'){var nd={id:uid(),name:NN.trim()||'Deck '+(DECKS.length+1),cards:[]};DECKS.push(nd);if(!ACTIVE)ACTIVE=nd.id;saveDecks();
    if(NT.trim())api.postMessage({t:'deckText',id:nd.id,text:NT});edit=nd.id;DT=null;pick='';onlyIn=false;NN='';NT='';render();return}
  if(a==='ui:edit'){edit=b.dataset.id;DT=null;pick='';onlyIn=false;ASK='';render();return}
  if(a==='ui:back'){edit='';ASK='';note='';render();return}
  if(a==='ui:use'){ACTIVE=b.dataset.id;saveDecks();render();return}
  if(a==='ui:delDeck'){var gone=b.dataset.id;DECKS=DECKS.filter(function(x){return x.id!==gone});if(ACTIVE===gone)ACTIVE=DECKS.length?DECKS[0].id:'';
    if(edit===gone)edit='';ASK='';saveDecks();render();return}
  if(a==='ui:dk'){setQty(b.dataset.n,qty(b.dataset.n)+parseInt(b.dataset.d,10));render();return}
  if(a==='ui:onlyIn'){onlyIn=b.checked;render();return}
  if(a==='ui:applyDeck'){var at=document.getElementById('dk-text');api.postMessage({t:'deckText',id:edit,text:at?at.value:''});DT=null;return}
  if(a==='ui:copyDeck'){var ct=document.getElementById('dk-text');note=ct&&copyText(ct.value)?'Copied the Deck list.':'Could not copy here. Select the text and copy it.';render();return}
  // Creator
  if(a==='ui:draftUse'){api.postMessage({t:'draftUse',name:dname});return}
  if(a==='ui:draftClear'){KINDS.forEach(function(k){DRAFT[k]=[];saveDraft(k)});ASK='';render();return}
  var kind=b.dataset.kind;
  if(a==='ui:dec'||a==='ui:inc'){var cur=dfind(kind,b.dataset.id);if(cur){setCount(kind,cur.id,cur.count+(a==='ui:inc'?1:-1));render()}return}
  if(a==='ui:cdel'){DRAFT[kind]=DRAFT[kind].filter(function(c){return c.id!==b.dataset.id});saveDraft(kind);render();return}
  // Library: cards only leave it here; they arrive through .ddc files
  if(a==='ui:del'){LIB[kind]=LIB[kind].filter(function(c){return c.id!==b.dataset.id});save(kind);render();return}
  if(a==='ui:addUrl'){var u=document.getElementById('url-'+kind).value.trim();if(u)addFromSrc(kind,u.split('/').pop().split('?')[0]||'Card',u);return}
  if(a==='ui:addText'){var t=document.getElementById('txt-'+kind).value.trim();if(t)addCard(kind,t,textCard(t));return}
  var o={t:'act',a:a,n:NV};for(var k in b.dataset)o[k]=b.dataset[k];
  if(a==='toggleShown')o.on=b.checked;
  api.postMessage(o);
});
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.id==='n')NV=Math.max(0,parseInt(t.value,10)||0);
  if(t.id==='ddc-name')ddcName=t.value;
  if(t.id==='dr-name')dname=t.value;
  if(t.id==='nd-name')NN=t.value;
  if(t.id==='nd-text')NT=t.value;
  if(t.id==='dk-text')DT=t.value;
  if(t.id==='filter'){filter=t.value;render()}
  if(t.id==='pick'){pick=t.value;render()}
  if(t.id==='libfilter'||t.id==='crfilter'){libFilter=t.value;render()}
});
document.addEventListener('keydown',function(e){
  var t=e.target;
  if(e.key==='Enter'&&t.id&&/^(url|txt|ddc|nd)-/.test(t.id)&&t.nextElementSibling)t.nextElementSibling.click();
});
// A closed section stays closed across redraws.
document.addEventListener('toggle',function(e){var d=e.target;if(d.dataset&&d.dataset.k)OPEN[d.dataset.k]=d.open},true);
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.classList.contains('mv')){var to=t.value;t.value='';if(to)api.postMessage({t:'act',a:'move',n:NV,from:t.dataset.from,iid:t.dataset.iid,to:to})}
  // These edits skip the redraw: it would replace the button the Player is about to click.
  if(t.classList.contains('cnt')){var cc=setCount(t.dataset.kind,t.dataset.id,parseInt(t.value,10)||0);if(cc)t.value=cc.count}
  if(t.classList.contains('cname')){var nc=dfind(t.dataset.kind,t.dataset.id),nn=t.value.trim();if(nc&&nn){nc.name=nn;saveDraft(t.dataset.kind)}else if(nc)t.value=nc.name}
  if(t.classList.contains('dkc')){setQty(t.dataset.n,parseInt(t.value,10)||0);t.value=qty(t.dataset.n)}
  if(t.id==='dk-name'){var dd=deckOf(edit);if(dd){dd.name=t.value.trim()||dd.name;t.value=dd.name;saveDecks()}}
  if(t.id==='dr-name')api.postMessage({t:'draftName',name:t.value});
  if(t.classList.contains('dsel')){ACTIVE=t.value;saveDecks();render()}
  if(t.classList.contains('file')){var kind=t.dataset.kind;Array.prototype.forEach.call(t.files,function(f){
    var r=new FileReader();r.onload=function(){addFromSrc(kind,f.name.replace(/\\.[^.]+$/,''),r.result)};r.readAsDataURL(f)});t.value=''}
  if(t.classList.contains('ddcfile')){Array.prototype.forEach.call(t.files,function(f){
    note='Importing '+f.name+'...';
    readDdc(f).then(function(text){api.postMessage({t:'ddcImport',file:f.name,text:text})})
      .catch(function(x){note='Could not read '+f.name+' ('+(x&&x.message||x)+')';render()})});t.value='';render()}
});
api.onMessage(function(m){
  if(m.t==='theme')document.getElementById('tk').textContent=':root{'+m.css+'}';
  else if(m.t==='lib'){LIB=m.lib;render()}
  else if(m.t==='decks'){DECKS=m.list;ACTIVE=m.active;DT=null;if(!deckOf(edit))edit='';if(tab==='table'||tab==='decks')render()}
  else if(m.t==='draft'){DRAFT=m.draft;dname=m.name;if(tab==='create')render()}
  else if(m.t==='state'){
    // An identical state would only replace the buttons under the pointer and swallow a click.
    var j=JSON.stringify(m);if(j===lastS)return;lastS=j;S=m;if(tab==='table')render()}
  else if(m.t==='note'){note=m.text;if(tab!=='table')render()}
  else if(m.t==='ddcFile'){
    gz(m.text).then(function(b){
      if(exp)URL.revokeObjectURL(exp.url);
      exp={from:m.from,file:m.file,text:m.text,cards:m.cards,size:sz(b.size),url:URL.createObjectURL(b)};
      if(tab!=='table')render();
      var a=document.createElement('a');a.href=exp.url;a.download=exp.file;document.body.appendChild(a);a.click();a.remove()})
    .catch(function(x){note='Could not build '+m.file+' ('+(x&&x.message||x)+')';render()})}
});
api.postMessage({t:'ready'});
render();
</script></body></html>`;
