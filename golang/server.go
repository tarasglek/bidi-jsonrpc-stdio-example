package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/sourcegraph/jsonrpc2"
)

type Server struct{}

func (s *Server) hello(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	switch req.Method {
	case "hello":
		var version string
		if err := conn.Call(ctx, "server/version", nil, &version); err != nil {
			log.Printf("golang: failed to call client for version: %v", err)
			return nil, err
		}

		message := fmt.Sprintf("hello from go, server/version: %s", version)
		return message, nil
	default:
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeMethodNotFound, Message: fmt.Sprintf("method not supported: %s", req.Method)}
	}
}

// handler is a jsonrpc2.Handler that handles requests in a separate goroutine.
type handler struct {
	s *Server
}

// Handle processes a single JSON-RPC request. It is essential to run the logic
// in a separate goroutine to prevent deadlocks. This is because a request
// handler might need to send a request back to the client and wait for its
// response. If the handler blocks the main message-reading loop, the server
// would be unable to process the client's response, leading to a deadlock.
// By using a goroutine, the main loop remains free to process incoming
// messages, including responses to requests initiated by the server.
func (h *handler) Handle(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) {
	go func() {
		result, err := h.s.hello(ctx, conn, req)
		if req.Notif {
			if err != nil {
				log.Printf("golang: notification handler for %q returned error: %v", req.Method, err)
			}
			return
		}

		if err != nil {
			respErr := &jsonrpc2.Error{Code: jsonrpc2.CodeInternalError, Message: err.Error()}
			if e, ok := err.(*jsonrpc2.Error); ok {
				respErr = e
			}
			if replyErr := conn.ReplyWithError(ctx, req.ID, respErr); replyErr != nil {
				log.Printf("golang: failed to send error reply for request %s: %v", req.ID, replyErr)
			}
			return
		}

		if replyErr := conn.Reply(ctx, req.ID, result); replyErr != nil {
			log.Printf("golang: failed to send reply for request %s: %v", req.ID, replyErr)
		}
	}()
}

type stdrwc struct{}

func (stdrwc) Read(p []byte) (int, error) {
	return os.Stdin.Read(p)
}

func (stdrwc) Write(p []byte) (int, error) {
	return os.Stdout.Write(p)
}

func (stdrwc) Close() error {
	if err := os.Stdin.Close(); err != nil {
		return err
	}
	return os.Stdout.Close()
}

func main() {
	server := &Server{}
	stream := jsonrpc2.NewBufferedStream(new(stdrwc), jsonrpc2.VSCodeObjectCodec{})
	conn := jsonrpc2.NewConn(context.Background(), stream, &handler{s: server})
	<-conn.DisconnectNotify()
}
