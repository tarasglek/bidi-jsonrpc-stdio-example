use serde::{Deserialize, Serialize};
use tower_lsp::jsonrpc::{self, Result};
use tower_lsp::lsp_types::notification::Notification;
use tower_lsp::lsp_types::request::Request;
use tower_lsp::lsp_types::*;
use tower_lsp::{Client, LanguageServer, LspService, Server};

#[derive(Debug)]
struct Backend {
    client: Client,
}

#[tower_lsp::async_trait]
impl LanguageServer for Backend {
    async fn initialize(&self, _: InitializeParams) -> Result<InitializeResult> {
        Ok(InitializeResult::default())
    }

    async fn initialized(&self, _: InitializedParams) {
        self.client
            .log_message(MessageType::INFO, "rust server initialized!")
            .await;
    }

    async fn shutdown(&self) -> Result<()> {
        Ok(())
    }
}

enum ClientVersion {}

impl Request for ClientVersion {
    type Params = ();
    type Result = String;
    const METHOD: &'static str = "client/version";
}

enum ServerBidiHello {}

impl Request for ServerBidiHello {
    type Params = ();
    type Result = String;
    const METHOD: &'static str = "server/bidi-hello";
}

enum ServerBye {}

impl Request for ServerBye {
    type Params = ();
    type Result = String;
    const METHOD: &'static str = "server/bye";
}

#[tokio::main]
async fn main() {
    let stdin = tokio::io::stdin();
    let stdout = tokio::io::stdout();

    let (service, socket) = LspService::build(|client| {
        let backend = Backend { client };
        let mut service = LspService::new(|client| backend);
        service = service.custom_method(ServerBidiHello::METHOD, |backend: &Backend, _: ()| async move {
            let version = match backend.client.send_request::<ClientVersion>(()).await {
                Ok(version) => version,
                Err(err) => {
                    backend
                        .client
                        .log_message(MessageType::ERROR, format!("rust: failed to call client for version: {}", err))
                        .await;
                    return Err(jsonrpc::Error::internal_error());
                }
            };
            Ok(format!("hello from rust, client/version: {}", version))
        });
        service = service.custom_method(ServerBye::METHOD, |_backend: &Backend, _: ()| async move {
            Ok("good bye".to_string())
        });
        service
    })
    .finish();

    Server::new(stdin, stdout, socket).serve(service).await;
}
