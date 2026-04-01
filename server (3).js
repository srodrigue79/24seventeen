const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

if (!html.includes('id="pw-modal"')) {
  const pwModal = "<div id=\"pw-modal\"><div id=\"pw-box\"><h3>ENTER PASSWORD</h3><input id=\"pw-inp\" type=\"password\" placeholder=\"password\" onkeydown=\"if(event.keyCode===13)checkPw()\"><div id=\"pw-err\"></div><div class=\"pw-btns\"><button class=\"pw-btn cancel\" onclick=\"closePwModal()\">Cancel</button><button class=\"pw-btn ok\" onclick=\"checkPw()\">Unlock</button></div></div></div>";
  const debugBtn = "<button id=\"debug-trigger\" onclick=\"exportDebug()\">Debug</button>";
  html = html.replace('onclick="openPwModal()"> Edit</button>', 'onclick="openPwModal()"> Edit</button>' + debugBtn + pwModal);
}

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
}).listen(PORT, '0.0.0.0', () => console.log('24seventeen running on port ' + PORT));
