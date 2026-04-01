const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
const TK = '1f368e86e9c315bcab3e11ea70f91321';
const TT = 'ATTA1d71884b279a44e8e671137eafb642fb3147d099b4c56a0f9da8f7e06fb82b1a30CB7DD8';
const TL = '69c85c9230751dcd96acbaa9';
let html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
html=html.replace(/(<div id="pw-modal"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="pw-modal" style="[^"]*"/,'id="pw-modal"');
html=html.replace(/(<div id="ed-toolbar"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="ed-toolbar" style="[^"]*"/,'id="ed-toolbar"');
if(!html.includes('id="pw-modal"')){const p='<div id="pw-modal"><div id="pw-box"><h3>ENTER PASSWORD</h3><input id="pw-inp" type="password" placeholder="password" onkeydown="if(event.keyCode===13)checkPw()"><div id="pw-err"></div><div class="pw-btns"><button class="pw-btn cancel" onclick="closePwModal()">Cancel</button><button class="pw-btn ok" onclick="checkPw()">Unlock</button></div></div></div>';const d='<button id="debug-trigger" onclick="openDebugWithPw()">Debug</button>';html=html.replace('onclick="openPwModal()"> Edit</button>','onclick="openPwModal()"> Edit</button>'+d+p);}
html=html.replace(/onclick="exportDebug()"/g,'onclick="openDebugWithPw()"');
html=html.replace('</head>','<style>#edit-trigger{position:fixed!important;bottom:16px!important;right:90px!important;left:auto!important;transform:none!important;z-index:9000!important;}#debug-trigger{position:fixed!important;bottom:16px!important;right:16px!important;left:auto!important;transform:none!important;z-index:9000!important;background:rgba(8,6,2,0.85);border:1px solid rgba(201,168,76,0.3);color:rgba(201,168,76,0.5);font-family:Cinzel,serif;font-size:11px;letter-spacing:1px;padding:4px 8px;cursor:pointer;text-transform:uppercase;}</style></head>');
function pb(req){return new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{r(JSON.parse(b));}catch(e){r({});}});});}
function tc(n,d){return new Promise(r=>{const p=new URLSearchParams({name:n,desc:d,idList:TL,key:TK,token:TT});const o={hostname:'api.trello.com',path:'/1/cards?'+p.toString(),method:'POST',headers:{'Content-Type':'application/json'}};const req=https.request(o,res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{try{r({success:res.statusCode===200,body:JSON.parse(data)});}catch(e){r({success:false,error:data});}});});req.on('error',e=>r({success:false,error:e.message}));req.end();});}
http.createServer(async(req,res)=>{
if(req.method==='OPTIONS'){res.writeHead(200,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
if(req.method==='POST'&&req.url==='/api/submit'){
const d=await pb(req);
const name=(d.projType||'')+'|'+(d.name||'')+'-'+(d.company||'')+'|Due:'+(d.dueDate||'');
const desc=['**Project:** '+(d.project||''),,'**Type:** '+(d.estType||''),'**Contact:** '+(d.name||''),'**Company:** '+(d.company||''),'**Phone:** '+(d.phone||''),'**Email:** '+(d.email||''),'**Due:** '+(d.dueDate||''),'**Notes:** '+(d.notes||'')].join('\n');
const result=await tc(name,desc);
res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
res.end(JSON.stringify({success:result.success,cardId:result.body&&result.body.id}));
return;}
res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
}).listen(PORT,'0.0.0.0',()=>console.log('24seventeen running on port '+PORT));
