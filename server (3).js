const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
const TK = 'e2f53dda494e678ff457eb1393db96ef';
const TT = 'ATTAd2a25dbb3e6819d9f5324c3148b34d7420e00fd7130f090a2ba4352e6a61b25cC0D860B9';
const TL = '69c85f3caa9dd56262717998';
let html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');

// Remove open-state artifacts
html=html.replace(/(<div id="pw-modal"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="pw-modal" style="[^"]*"/,'id="pw-modal"');
html=html.replace(/(<div id="ed-toolbar"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="ed-toolbar" style="[^"]*"/,'id="ed-toolbar"');

// Remove edit/debug buttons
html=html.replace(/<button[^>]*id="edit-trigger"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*id="debug-trigger"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*onclick="openPwModal\(\)"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*onclick="openDebugWithPw\(\)"[^>]*>.*?<\/button>/g,'');

// Fix Android scroll — remove overflow-x:hidden from html element
html=html.replace(/html,body\{[^}]*overflow-x:\s*hidden[^}]*\}/g,'body{overflow-x:hidden;}');
html=html.replace(/html\{[^}]*overflow-x:\s*hidden[^}]*\}/g,'');
html=html.replace(/touch-action:\s*pan-x pan-y;?/g,'');
html=html.replace(/-ms-touch-action:\s*pan-x pan-y;?/g,'');

// LABEL FIX: "Website (optional)" -> "Project Documents Link"
html=html.replace(/Website \(optional\)/g,'Project Documents Link');
html=html.replace(/placeholder="https:\/\/yourcompany\.com"/g,'placeholder="Dropbox, Google Drive, or any file link"');
// EXACT label fix for Website field
html=html.replace('class="ef-label">Website <span style="color:rgba(232,223,200,0.25);font-size:12px;">(optional)</span></label>','class="ef-label">Project Documents Link</label>');


// SPINNER: inject CSS + HTML before </head>
const spinnerCSS = `<style id="sdg-spinner-css">
#sdg-spinner{position:fixed;inset:0;background:rgba(8,8,8,0.92);z-index:99999;display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;}
#sdg-spinner.active{display:flex;}
.sdg-ring{width:72px;height:72px;border:5px solid rgba(201,168,76,0.15);border-top:5px solid #c9a84c;border-radius:50%;animation:sdgspin 0.85s linear infinite;}
@keyframes sdgspin{to{transform:rotate(360deg);}}
#sdg-spin-pct{font-family:'Cinzel',serif;font-size:32px;font-weight:700;color:#c9a84c;letter-spacing:2px;}
#sdg-spin-lbl{font-family:'Cinzel',serif;font-size:11px;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;}
</style>
<div id="sdg-spinner"><div class="sdg-ring"></div><div id="sdg-spin-pct">0%</div><div id="sdg-spin-lbl">Preparing</div></div>`;
html=html.replace('</head>', spinnerCSS + '</head>');

// SPINNER JS: intercept submitEstimate to show progress
const spinnerJS = `<script>
(function(){
  function patch(){
    if(typeof window.submitEstimate!=='function'){setTimeout(patch,150);return;}
    var _orig=window.submitEstimate;
    window.submitEstimate=async function(){
      var sp=document.getElementById('sdg-spinner');
      var pc=document.getElementById('sdg-spin-pct');
      var lb=document.getElementById('sdg-spin-lbl');
      function set(p,l){pc.textContent=p+'%';lb.textContent=l;}
      sp.classList.add('active');
      set(0,'Validating');
      var origFetch=window.fetch;
      var done=false;
      window.fetch=async function(url,opts){
        if(url==='/api/submit'){
          set(25,'Sending Request');
          await new Promise(r=>setTimeout(r,250));
          set(50,'Creating Trello Card');
          var res=await origFetch(url,opts);
          set(85,'Finalizing');
          await new Promise(r=>setTimeout(r,350));
          set(100,'Request Sent!');
          await new Promise(r=>setTimeout(r,900));
          sp.classList.remove('active');
          window.fetch=origFetch;
          done=true;
          return res;
        }
        return origFetch(url,opts);
      };
      try{await _orig.apply(this,arguments);}catch(e){sp.classList.remove('active');window.fetch=origFetch;}
      if(!done){sp.classList.remove('active');window.fetch=origFetch;}
    };
  }
  patch();
})();
<\/script>`;
html=html.replace('</body>', spinnerJS + '</body>');

function pb(req){return new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{r(JSON.parse(b));}catch(e){r({});}});});}
function tc(n,d){return new Promise(r=>{const p=new URLSearchParams({name:n,desc:d,idList:TL,key:TK,token:TT});const o={hostname:'api.trello.com',path:'/1/cards?'+p.toString(),method:'POST',headers:{'Content-Type':'application/json'}};const req=https.request(o,res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{try{r({success:res.statusCode===200,body:JSON.parse(data)});}catch(e){r({success:false,error:data});}});});req.on('error',e=>r({success:false,error:e.message}));req.end();});}

http.createServer(async(req,res)=>{
if(req.method==='OPTIONS'){res.writeHead(200,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
if(req.method==='POST'&&req.url==='/api/submit'){
const d=await pb(req);
const proj=d.project||'';
const cardName=(proj?'['+proj+'] ':'')+((d.projType||'')+'|'+(d.name||'')+(d.company?'-'+d.company:'')+'|Due:'+(d.dueDate||''));
const desc=[
  '**Project:** '+(d.project||'—'),
  '**Est. Type:** '+(d.estType||'—'),
  '**Contact:** '+(d.name||'—'),
  '**Company:** '+(d.company||'—'),
  '**Phone:** '+(d.phone||'—'),
  '**Email:** '+(d.email||'—'),
  '**Due Date:** '+(d.dueDate||'—'),
  '**Client Company:** '+(d.clientCompany||'—'),
  '**Client Contact:** '+(d.clientContact||'—'),
  '**Docs Link:** '+(d.website||'—'),
  '**Notes:** '+(d.notes||'—')
].join('\n');
const result=await tc(cardName,desc);
res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
res.end(JSON.stringify({success:result.success,cardId:result.body&&result.body.id}));
return;}
res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
}).listen(PORT,'0.0.0.0',()=>console.log('24seventeen running on port '+PORT));
