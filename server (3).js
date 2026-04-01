const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Fix 1: Remove display:flex from pw-modal inline style (committed while open)
html = html.replace(/(<div id="pw-modal"[^>]*?)display:\s*flex/g, '$1display:none');
html = html.replace(/id="pw-modal" style="[^"]*"/, 'id="pw-modal"');

// Fix 2: Remove display:flex from ed-toolbar (edit mode committed as open)
html = html.replace(/(<div id="ed-toolbar"[^>]*?)display:\s*flex/g, '$1display:none');
html = html.replace(/id="ed-toolbar" style="[^"]*"/, 'id="ed-toolbar"');

// Fix 3: Add pw-modal and debug-trigger if missing
if (!html.includes('id="pw-modal"')) {
  const pwModal = '<div id="pw-modal"><div id="pw-box"><h3>ENTER PASSWORD</h3><input id="pw-inp" type="password" placeholder="password" onkeydown="if(event.keyCode===13)checkPw()"><div id="pw-err"></div><div class="pw-btns"><button class="pw-btn cancel" onclick="closePwModal()">Cancel</button><button class="pw-btn ok" onclick="checkPw()">Unlock</button></div></div></div>';
  const debugBtn = '<button id="debug-trigger" onclick="exportDebug()">Debug</button>';
  html = html.replace('onclick="openPwModal()"> Edit</button>', 'onclick="openPwModal()"> Edit</button>' + debugBtn + pwModal);
}
if (!html.includes('id="debug-trigger"')) {
  html = html.replace('onclick="openPwModal()"> Edit</button>', 'onclick="openPwModal()"> Edit</button><button id="debug-trigger" onclick="exportDebug()">Debug</button>');
}

// Fix 4: Ensure Edit and Debug buttons are position:fixed at bottom-right
// Inject CSS to force correct button positioning and reset any bad inline styles
html = html.replace('</head>', '<style>#edit-trigger{position:fixed!important;bottom:16px!important;right:90px!important;left:auto!important;transform:none!important;z-index:9000!important;}#debug-trigger{position:fixed!important;bottom:16px!important;right:16px!important;left:auto!important;transform:none!important;z-index:9000!important;background:rgba(8,6,2,0.85);border:1px solid rgba(201,168,76,0.3);color:rgba(201,168,76,0.5);font-family:Cinzel,serif;font-size:11px;letter-spacing:1px;padding:4px 8px;cursor:pointer;text-transform:uppercase;}</style></head>');

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
}).listen(PORT, '0.0.0.0', () => console.log('24seventeen running on port ' + PORT));
