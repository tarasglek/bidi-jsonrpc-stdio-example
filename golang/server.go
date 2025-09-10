package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/sourcegraph/jsonrpc2"
)

func rpc(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	switch req.Method {
	case "hello":
		var version string
		if err := conn.Call(ctx, "server/version", nil, &version); err != nil {
			log.Printf("golang: failed to call client for version: %v", err)
			return nil, err
		}

		message := fmt.Sprintf("hello from go, server/version: %s", version)
		return message, nil
	case "bye":
		return "good bye", nil
	default:
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeMethodNotFound, Message: fmt.Sprintf("method not supported: %s", req.Method)}
	}
}


func main() {
	stdio := struct {
		io.Reader
		io.Writer
		io.Closer
	}{
		os.Stdin,
		os.Stdout,
		io.NopCloser(os.Stdin),
	}
	stream := jsonrpc2.NewBufferedStream(stdio, jsonrpc2.VSCodeObjectCodec{})
	conn := jsonrpc2.NewConn(context.Background(), stream, jsonrpc2.AsyncHandler(jsonrpc2.HandlerWithError(rpc)))
	<-conn.DisconnectNotify()
}
