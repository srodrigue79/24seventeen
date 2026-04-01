const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 10000;
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
http.createServer((req, res) => {
  const cors = {'Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'};
  if (req.url === '/raw') {
    res.writeHead(200, Object.assign({'Content-Type':'text/html; charset=utf-8'}, cors));
    res.end(html);
  } else {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    res.end(html);
  }
}).listen(PORT, '0.0.0.0', () => console.log('running on port ' + PORT));
