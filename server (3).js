const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
const TK = 'e2f53dda494e678ff457eb1393db96ef';
const TT = 'ATTAd2a25dbb3e6819d9f5324c3148b34d7420e00fd7130f090a2ba4352e6a61b25cC0D860B9';
const TL = '69c85f3caa9dd56262717998';
let html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');

html=html.replace(/(<div id="pw-modal"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="pw-modal" style="[^"]*"/,'id="pw-modal"');
html=html.replace(/(<div id="ed-toolbar"[^>]*?)display:\s*flex/g,'$1display:none');
html=html.replace(/id="ed-toolbar" style="[^"]*"/,'id="ed-toolbar"');
html=html.replace(/<button[^>]*id="edit-trigger"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*id="debug-trigger"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*onclick="openPwModal\(\)"[^>]*>.*?<\/button>/g,'');
html=html.replace(/<button[^>]*onclick="openDebugWithPw\(\)"[^>]*>.*?<\/button>/g,'');
html=html.replace(/html,body\{[^}]*overflow-x:\s*hidden[^}]*\}/g,'body{overflow-x:hidden;}');
html=html.replace(/html\{[^}]*overflow-x:\s*hidden[^}]*\}/g,'');
html=html.replace(/touch-action:\s*pan-x pan-y;?/g,'');
html=html.replace(/-ms-touch-action:\s*pan-x pan-y;?/g,'');
html=html.replace(/placeholder="https:\/\/yourcompany\.com"/g,'placeholder="Dropbox, Google Drive, or any file link"');
html=html.replace('class="ef-label">Website <span style="color:rgba(232,223,200,0.25);font-size:12px;">(optional)</span></label>','class="ef-label">Project Documents Link</label>');

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
          set(85,'Uploading Attachments');
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

// Parse multipart/form-data — returns {fields, files:[{name,filename,contentType,data}]}
function parseMultipart(buf, boundary) {
  const fields = {}, files = [];
  const bnd = Buffer.from('--' + boundary);
  const crlf = Buffer.from('\r\n');
  let pos = 0;
  while (pos < buf.length) {
    const bStart = buf.indexOf(bnd, pos);
    if (bStart === -1) break;
    pos = bStart + bnd.length;
    if (buf[pos] === 45 && buf[pos+1] === 45) break; // --boundary--
    if (buf[pos] === 13) pos += 2; // skip CRLF
    // parse headers
    let hdrEnd = buf.indexOf(Buffer.from('\r\n\r\n'), pos);
    if (hdrEnd === -1) break;
    const hdrStr = buf.slice(pos, hdrEnd).toString();
    pos = hdrEnd + 4;
    // find end of this part
    const nextBnd = buf.indexOf(Buffer.from('\r\n--' + boundary), pos);
    const partEnd = nextBnd === -1 ? buf.length : nextBnd;
    const partData = buf.slice(pos, partEnd);
    pos = partEnd + 2;
    // extract field name and filename
    const nameMatch = hdrStr.match(/name="([^"]+)"/);
    const fileMatch = hdrStr.match(/filename="([^"]+)"/);
    const ctMatch = hdrStr.match(/Content-Type:\s*([^\r\n]+)/i);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    if (fileMatch && fileMatch[1]) {
      files.push({name: fieldName, filename: fileMatch[1], contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream', data: partData});
    } else {
      fields[fieldName] = partData.toString().trim();
    }
  }
  return {fields, files};
}

// Upload attachment buffer to Trello card
function uploadAttachment(cardId, filename, contentType, fileData) {
  return new Promise(r => {
    const boundary = '----TrelloBoundary' + Date.now();
    const CRLF = '\r\n';
    const header = Buffer.from(
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="file"; filename="' + filename + '"' + CRLF +
      'Content-Type: ' + contentType + CRLF + CRLF
    );
    const footer = Buffer.from(CRLF + '--' + boundary + '--' + CRLF);
    const body = Buffer.concat([header, fileData, footer]);
    const opts = {
      hostname: 'api.trello.com',
      path: '/1/cards/' + cardId + '/attachments?key=' + TK + '&token=' + TT,
      method: 'POST',
      headers: {'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length}
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try{r({ok: res.statusCode===200, status: res.statusCode, body: JSON.parse(d)});}catch(e){r({ok:false,err:d});} });
    });
    req.on('error', e => r({ok:false,err:e.message}));
    req.write(body);
    req.end();
  });
}

// Create Trello card
function createCard(name, desc) {
  return new Promise(r => {
    const p = new URLSearchParams({name, desc, idList:TL, key:TK, token:TT});
    const opts = {hostname:'api.trello.com', path:'/1/cards?'+p.toString(), method:'POST', headers:{'Content-Type':'application/json'}};
    const req = https.request(opts, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{r({success:res.statusCode===200,body:JSON.parse(d)});}catch(e){r({success:false,error:d});}});
    });
    req.on('error', e=>r({success:false,error:e.message}));
    req.end();
  });
}

http.createServer(async (req, res) => {
  if (req.method==='OPTIONS'){res.writeHead(200,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
  if (req.method==='POST' && req.url==='/api/submit') {
    // Read full body as buffer
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    const ct = req.headers['content-type'] || '';
    let fields = {}, files = [];
    if (ct.includes('multipart/form-data')) {
      const bndMatch = ct.match(/boundary=([^;\s]+)/);
      if (bndMatch) ({ fields, files } = parseMultipart(buf, bndMatch[1]));
    } else if (ct.includes('application/json')) {
      try { fields = JSON.parse(buf.toString()); } catch(e){}
    }
    // Build card
    const proj = fields.project || '';
    const cardName = (proj ? '['+proj+'] ' : '') + ((fields.projType||'')+'|'+(fields.name||'')+(fields.company?'-'+fields.company:'')+'|Due:'+(fields.dueDate||''));
    const fileNames = files.filter(f=>f.filename).map(f=>f.filename).join(', ') || '—';
    const desc = [
      '**Project:** '+(fields.project||'—'),
      '**Est. Type:** '+(fields.estType||'—'),
      '**Contact:** '+(fields.name||'—'),
      '**Company:** '+(fields.company||'—'),
      '**Phone:** '+(fields.phone||'—'),
      '**Email:** '+(fields.email||'—'),
      '**Due Date:** '+(fields.dueDate||'—'),
      '**Client Company:** '+(fields.clientCompany||'—'),
      '**Client Contact:** '+(fields.clientContact||'—'),
      '**Docs Link:** '+(fields.website||'—'),
      '**Attachments:** '+fileNames,
      '**Notes:** '+(fields.notes||'—')
    ].join('\n');
    const cardResult = await createCard(cardName, desc);
    // Upload any file attachments to the card
    if (cardResult.success && cardResult.body && cardResult.body.id && files.length > 0) {
      for (const f of files) {
        if (f.filename && f.data && f.data.length > 0) {
          await uploadAttachment(cardResult.body.id, f.filename, f.contentType, f.data);
        }
      }
    }
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
    res.end(JSON.stringify({success: cardResult.success, cardId: cardResult.body && cardResult.body.id}));
    return;
  }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end(html);
}).listen(PORT, '0.0.0.0', () => console.log('24seventeen running on port ' + PORT));
