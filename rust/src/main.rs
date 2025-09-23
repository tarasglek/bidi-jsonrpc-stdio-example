use tower_lsp::jsonrpc::{self, Result};
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

impl Backend {
    async fn bidi_hello(&self) -> Result<String> {
        let version = match self.client.send_request::<ClientVersion>(()).await {
            Ok(version) => version,
            Err(err) => {
                self.client
                    .log_message(
                        MessageType::ERROR,
                        format!("rust: failed to call client for version: {}", err),
                    )
                    .await;
                return Err(jsonrpc::Error::internal_error());
            }
        };
        Ok(format!("hello from rust, client/version: {}", version))
    }

    async fn bye(&self) -> Result<String> {
        Ok("good bye".to_string())
    }
}

macro_rules! lsp_request {
    ($name:ident, $method:literal) => {
        enum $name {}
        impl Request for $name {
            type Params = ();
            type Result = String;
            const METHOD: &'static str = $method;
        }
    };
}

lsp_request!(ClientVersion, "client/version");
lsp_request!(ServerBidiHello, "server/bidi-hello");
lsp_request!(ServerBye, "server/bye");

#[tokio::main]
async fn main() {
    let stdin = tokio::io::stdin();
    let stdout = tokio::io::stdout();

    let (service, socket) = LspService::build(|client| Backend { client })
        .custom_method(ServerBidiHello::METHOD, Backend::bidi_hello)
        .custom_method(ServerBye::METHOD, Backend::bye)
        .finish();

    Server::new(stdin, stdout, socket).serve(service).await;
}
