import * as cp from "child_process";
import * as rpc from "vscode-jsonrpc/node";
import * as fs from "fs";
import * as stream from "stream";

const cli_args = process.argv.length > 2 ? process.argv.slice(2) : ["golang/goserver"];
// Launch the server process
const server = cp.spawn(cli_args[0], cli_args.slice(1), {
  stdio: ["pipe", "pipe", "inherit"], // stdin, stdout, stderr
});
let stdout: NodeJS.ReadableStream = server.stdout;
let stdin: NodeJS.WritableStream = server.stdin;

if (process.env.DEBUG) {
  const logStream = fs.createWriteStream("debug.log");
  const createLoggingTee = (prefix: string) => {
    const tee = new stream.PassThrough();
    tee.on('data', chunk => {
      chunk.toString().split(/\r?\n/).forEach((line, i, arr) => {
        if (i === arr.length - 1 && line === '') return;
        logStream.write(`${prefix}${line}\n`);
      });
    });
    return tee;
  };

  stdout = stdout.pipe(createLoggingTee('< '));

  const stdinTee = createLoggingTee('');
  stdinTee.pipe(stdin);
  stdin = stdinTee;
}

// Setup JSON-RPC connection over stdio
const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(stdout),
  new rpc.StreamMessageWriter(stdin)
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
