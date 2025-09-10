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
// ---- Define request types ----
// Example: "hello" request (client → server)
interface HelloParams {
  processId: number;
}
interface HelloResult {
  capabilities: Record<string, unknown>;
}
const HelloRequest = new rpc.RequestType<HelloParams, HelloResult, void>(
  "hello"
);
// Example: "window/showMessage" request (server → client)
interface ShowMessageParams {
  type: number;
  message: string;
}
interface ShowMessageResult {
  acknowledged: boolean;
}
const ShowMessageRequest = new rpc.RequestType<
  ShowMessageParams,
  ShowMessageResult,
  void
>("window/showMessage");
// ---- Client-side logic ----
// Send "hello" to server
connection
  .sendRequest(HelloRequest, { processId: process.pid })
  .then((result) => {
    console.log("Server says hello:", result);
  });
// Handle "window/showMessage" coming from server
connection.onRequest(ShowMessageRequest, async (params) => {
  console.log("Message from server:", params.message);
  return { acknowledged: true };
});
