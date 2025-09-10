# Cross-language Bi-directional JSON-RPC over Stdio

This project demonstrates a bi-directional JSON-RPC connection over standard I/O between a TypeScript client and a Go server. It uses a variant of the JSON-RPC protocol as implemented in the `vscode-jsonrpc` library.

In this context, the "server" is the Go command-line application that is launched as a child process. The "client" is the TypeScript application that launches the server.

## Protocol

The `vscode-jsonrpc` library implements the transport layer for the [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/), which is used extensively in editors like VS Code. This is a variant of JSON-RPC 2.0 where each JSON message is preceded by a header.

The header and payload are separated by `\r\n`.

```
Content-Length: <number>\r\n
\r\n
<json-payload>
```

### Example Wire Traffic

Here is an example of the communication between the TypeScript client and the Go server when the client calls the `server/bidi-hello` method.

1.  **Client -> Server**: Request to `server/bidi-hello`

    ```
    Content-Length: 68\r\n
    \r\n
    {"jsonrpc":"2.0","id":1,"method":"server/bidi-hello","params":null}
    ```

2.  **Server -> Client**: The server receives the request and in turn requests the client's version via `client/version`.

    ```
    Content-Length: 66\r\n
    \r\n
    {"jsonrpc":"2.0","id":1,"method":"client/version","params":null}
    ```

3.  **Client -> Server**: The client responds with its version.

    ```
    Content-Length: 39\r\n
    \r\n
    {"jsonrpc":"2.0","id":1,"result":"0.0.1"}
    ```

4.  **Server -> Client**: The server receives the client version and responds to the original `server/bidi-hello` request.

    ```
    Content-Length: 72\r\n
    \r\n
    {"jsonrpc":"2.0","id":1,"result":"hello from go, client/version: 0.0.1"}
    ```
