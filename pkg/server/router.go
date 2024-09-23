package server

import (
	"net/http"
)

var (
	Router *http.ServeMux
)

func StartRouter() {
	Router = http.NewServeMux()

	RegisterAPIs()

	// API subrouter
	Router.Handle("/api/", http.StripPrefix("/api", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		Router.ServeHTTP(w, r)
	})))

	// Web fileserver
	Router.Handle("/web/", http.StripPrefix("/web", http.FileServer(http.Dir("./web"))))

	// Websocket
	Router.HandleFunc("/ws", HandleSocks)

	go HandleRegister()
	go HandleMessages()
	go HandleTyping()
	go HandleDisconnect()
}
