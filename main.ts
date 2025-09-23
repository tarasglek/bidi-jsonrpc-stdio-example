import * as cp from "child_process";
import * as rpc from "vscode-jsonrpc/node";

const cli_args = process.argv.length > 2 ? process.argv.slice(2) : ["golang/goserver"];
// Launch the server process
const server = cp.spawn(cli_args[0], cli_args.slice(1), {
  stdio: ["pipe", "pipe", "inherit"], // stdin, stdout, stderr
});
// Setup JSON-RPC connection over stdio
const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(server.stdout),
  new rpc.StreamMessageWriter(server.stdin)
);
connection.listen();
// ---- Client-side logic ----
// Send "initialize" request to server
connection.sendRequest("initialize", {
  processId: process.pid,
  rootUri: null,
  capabilities: {},
}).then(() => {
  connection.sendNotification("initialized", {});

  // Send "bidi-hello" to server
  connection.sendRequest("server/bidi-hello", null).then(async (result) => {
    console.log("node: Server says:", result);
    const byeResult = await connection.sendRequest("server/bye");
    console.log("node: Server says:", byeResult);
    process.exit(0);
  });
});

// Handle "server/version" request from server
connection.onRequest("client/version", () => {
  return "1.0";
});
