import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
const port = Number(process.env.PORT ?? 3001);
createServer(async (_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("worker online\n");
}).listen(port, "0.0.0.0");
console.log(`Worker health server listening on ${port}`);
