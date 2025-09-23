TODO:
* switch to tower-lsp-server (maintained fork)
* try using async stdio from wasm using standard rust
* switch away from tokio cos it doesn't support async stdio in wasm
* make async adapter from tower from it per example in https://github.com/silvanshade/tower-lsp-web-demo/