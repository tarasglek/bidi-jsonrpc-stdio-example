package main



import (

    "context"

    "log"

    "os"



    "golang.org/x/tools/internal/jsonrpc2"

)



type Server struct{}



func (s *Server) Handle(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) {

    switch req.Method {

    case "initialize":

        // Respond to client

        conn.Reply(ctx, req.ID, map[string]interface{}{

            "capabilities": map[string]interface{}{},

        })



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

    }

}



func main() {

    stream := jsonrpc2.NewHeaderStream(os.Stdin, os.Stdout)

    conn := jsonrpc2.NewConn(context.Background(), stream, &Server{})

    <-conn.DisconnectNotify()

}

