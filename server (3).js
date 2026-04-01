const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Fix 1: Remove any inline display:flex on pw-modal (committed while open)
html = html.replace(/id="pw-modal"([^>]*?)display:\s*flex/g, 'id="pw-modal"$1display:none');
html = html.replace(/id="pw-modal" style="[^"]*"/g, 'id="pw-modal"');

// Fix 2: Add pw-modal and debug-trigger if missing
if (!html.includes('id="pw-modal"')) {
  const pwModal = '<div id="pw-modal"><div id="pw-box"><h3>ENTER PASSWORD</h3><input id="pw-inp" type="password" placeholder="password" onkeydown="if(event.keyCode===13)checkPw()"><div id="pw-err"></div><div class="pw-btns"><button class="pw-btn cancel" onclick="closePwModal()">Cancel</button><button class="pw-btn ok" onclick="checkPw()">Unlock</button></div></div></div>';
  const debugBtn = '<button id="debug-trigger" onclick="exportDebug()">Debug</button>';
  html = html.replace('onclick="openPwModal()"> Edit</button>', 'onclick="openPwModal()"> Edit</button>' + debugBtn + pwModal);
}
if (!html.includes('id="debug-trigger"')) {
  const debugBtn = '<button id="debug-trigger" onclick="exportDebug()">Debug</button>';
  html = html.replace('onclick="openPwModal()"> Edit</button>', 'onclick="openPwModal()"> Edit</button>' + debugBtn);
}

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
}).listen(PORT, '0.0.0.0', () => console.log('24seventeen running on port ' + PORT));
