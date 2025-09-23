import * as cp from "child_process";
import * as rpc from "vscode-jsonrpc/node";
import * as fs from "fs";
import * as stream from "stream";

const cli_args = process.argv.length > 2 ? process.argv.slice(2) : ["golang/goserver"];
// Launch the server process
const server = cp.spawn(cli_args[0], cli_args.slice(1), {
  stdio: ["pipe", "pipe", "inherit"], // stdin, stdout, stderr
});
let server_stdout: NodeJS.ReadableStream = server.stdout;
let server_stdin: NodeJS.WritableStream = server.stdin;

if (process.env.DEBUG) {
  const logStream = fs.createWriteStream("debug.log");
  const createLoggingTee = (prefix: string) => {
    const tee = new stream.PassThrough();
    tee.on('data', chunk => {
      // HACK: The JSON-RPC messages can be concatenated in a single chunk.
      // This regex inserts a newline before "Content-Length:" if it's preceded by a "}".
      const text = chunk.toString().replace(/(})(Content-Length:)/g, '$1\n$2');
      text.split(/\r?\n/).forEach((line, lineIndex, arr) => {
        if (lineIndex === arr.length - 1 && line === '') return;
        logStream.write(`${prefix}${line}\n`);
      });
    });
    return tee;
  };

  server_stdout = server_stdout.pipe(createLoggingTee('< '));

  const stdinTee = createLoggingTee('');
  stdinTee.pipe(server_stdin);
  server_stdin = stdinTee;
}

// Setup JSON-RPC connection over stdio
const connection = rpc.createMessageConnection(
  new rpc.StreamMessageReader(server_stdout),
  new rpc.StreamMessageWriter(server_stdin)
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
  connection.sendRequest("server/bidi-hello").then(async (result) => {
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
