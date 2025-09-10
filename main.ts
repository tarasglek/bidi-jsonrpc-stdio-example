import * as cp from "child_process";
import * as rpc from "vscode-jsonrpc/node";
// Launch the Go server process
const server = cp.spawn("./golang/goserver", [], {
  stdio: ["pipe", "pipe", "inherit"], // stdin, stdout, stderr
});
// Setup JSON-RPC connection over stdio
const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(server.stdout),
  new rpc.StreamMessageWriter(server.stdin)
);
connection.listen();
// ---- Client-side logic ----
// Send "bidi-hello" to server
connection.sendRequest("bidi-hello", { processId: process.pid }).then(async (result) => {
  console.log("node: Server says:", result);
  const byeResult = await connection.sendRequest("bye");
  console.log("node: Server says:", byeResult);
  process.exit(0);
});

// Handle "server/version" request from server
connection.onRequest("server/version", () => {
  return "1.0";
});
