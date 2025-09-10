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
	case "initialize":
		// Call back into client
		go func() {
			var result map[string]interface{}
			if err := conn.Call(ctx, "window/showMessage", map[string]interface{}{
				"type":    3,
				"message": "Hello from Go!",
			}, &result); err != nil {
				log.Printf("failed to call client: %v", err)
			} else {
				log.Printf("client replied: %+v", result)
			}
		}()

		return map[string]interface{}{
			"capabilities": map[string]interface{}{},
		}, nil
	default:
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeMethodNotFound, Message: fmt.Sprintf("method not supported: %s", req.Method)}
	}
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
	handler := &Server{}
	stream := jsonrpc2.NewBufferedStream(new(stdrwc), jsonrpc2.VSCodeObjectCodec{})
	conn := jsonrpc2.NewConn(context.Background(), stream, jsonrpc2.HandlerWithError(handler.hello))
	<-conn.DisconnectNotify()
}

