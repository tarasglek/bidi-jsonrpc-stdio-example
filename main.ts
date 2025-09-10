import { spawn } from "child_process";

import {

  createMessageConnection,

  StreamMessageReader,

  StreamMessageWriter,

  RequestType,

} from "vscode-jsonrpc";



// Launch the Go server process

const server = spawn("./golang/goserver", [], {

  stdio: ["pipe", "pipe", "inherit"], // stdin, stdout, stderr

});



// Setup JSON-RPC connection over stdio

const connection = createMessageConnection(

  new StreamMessageReader(server.stdout),

  new StreamMessageWriter(server.stdin)

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



const InitializeRequest = new RequestType<InitializeParams, InitializeResult, void>(

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



const ShowMessageRequest = new RequestType<

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

