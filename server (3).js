const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
const TK = 'e2f53dda494e678ff457eb1393db96ef';
const TT = 'ATTAd2a25dbb3e6819d9f5324c3148b34d7420e00fd7130f090a2ba4352e6a61b25cC0D860B9';
const TL = '69c85f3caa9dd56262717998';
let html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');

// Remove any open state artifacts committed into the HTML
html=html.replace(/(<div id="pw-modal"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="pw-modal" style="[^"]*"/,'id="pw-modal"');
html=html.replace(/(<div id="ed-toolbar"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="ed-toolbar" style="[^"]*"/,'id="ed-toolbar"');

// Remove edit and debug buttons entirely
html=html.replace(/<button[^>]*id="edit-trigger"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*id="debug-trigger"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*onclick="openPwModal\(\)"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*onclick="openDebugWithPw\(\)"[^>]*>.*?<\/button>/g,'');

function pb(req){return new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{r(JSON.parse(b));}catch(e){r({});}});});}
function tc(n,d){return new Promise(r=>{const p=new URLSearchParams({name:n,desc:d,idList:TL,key:TK,token:TT});const o={hostname:'api.trello.com',path:'/1/cards?'+p.toString(),method:'POST',headers:{'Content-Type':'application/json'}};const req=https.request(o,res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{try{r({success:res.statusCode===200,body:JSON.parse(data)});}catch(e){r({success:false,error:data});}});});req.on('error',e=>r({success:false,error:e.message}));req.end();});}

http.createServer(async(req,res)=>{
if(req.method==='OPTIONS'){res.writeHead(200,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
if(req.method==='POST'&&req.url==='/api/submit'){
const d=await pb(req);
const name=(d.projType||'')+'|'+(d.name||'')+'-'+(d.company||'')+'|Due:'+(d.dueDate||'');
const desc=['**Project:** '+(d.project||''),'**Type:** '+(d.estType||''),'**Contact:** '+(d.name||''),'**Company:** '+(d.company||''),'**Phone:** '+(d.phone||''),'**Email:** '+(d.email||''),'**Due:** '+(d.dueDate||''),'**Notes:** '+(d.notes||'')].join('\n');
const result=await tc(name,desc);
res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
res.end(JSON.stringify({success:result.success,cardId:result.body&&result.body.id}));
return;}
res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
}).listen(PORT,'0.0.0.0',()=>console.log('24seventeen running on port '+PORT));
