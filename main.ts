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
// Send "hello" to server
connection.sendRequest("hello", { processId: process.pid }).then((result) => {
  console.log("node: Server says hello:", result);
});

// Handle "window/showMessage" coming from server
connection.onRequest(
  "window/showMessage",
  async (params: { message: string }) => {
    console.log("node: Message from server:", params.message);
    return { acknowledged: true };
  }
);
