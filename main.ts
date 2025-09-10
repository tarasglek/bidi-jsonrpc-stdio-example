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



// Example: "initialize" request (client → server)

interface InitializeParams {

  processId: number;

}



interface InitializeResult {

  capabilities: Record<string, unknown>;

}



const InitializeRequest = new rpc.RequestType<InitializeParams, InitializeResult, void>(

  "initialize"

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



// Send "initialize" to server

connection

  .sendRequest(InitializeRequest, { processId: process.pid })

  .then((result) => {

    console.log("Server initialized:", result);

  });



// Handle "window/showMessage" coming from server

connection.onRequest(ShowMessageRequest, async (params) => {

  console.log("Message from server:", params.message);

  return { acknowledged: true };

});

