import http from "node:http";

const host = "127.0.0.1";
const port = 5199;
let responses = "[]";

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url !== "/responses") {
    res.writeHead(404);
    res.end();
    return;
  }

  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(responses);
    return;
  }

  if (req.method === "DELETE") {
    responses = "[]";
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      responses = body || "[]";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
    });
    return;
  }

  res.writeHead(405);
  res.end();
});

server.listen(port, host, () => {
  console.log(`ExpertEye360 E2E storage listening on http://${host}:${port}`);
});
