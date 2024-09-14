package server

import "C"
import (
	"forum/pkg/controllers"
	"log"
	"net/http"
	"sync"
)
import "github.com/gorilla/websocket"

var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	Conn   *websocket.Conn
	UserID int
}

type Message struct {
	Type    string      `json:"type"`
	Content interface{} `json:"content"`
	UserID  int         `json:"user_id"`
}

var Clients = make(map[*websocket.Conn]*Client)
var ClientsMutex = sync.Mutex{}

var Register = make(chan *Client)
var Messages = make(chan Message)

func HandleSocks(w http.ResponseWriter, r *http.Request) {
	ws, err := Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}
	defer ws.Close()

	// Register the new client
	client := &Client{
		Conn: ws,
	}

	// Listen for user ID on initial connection
	var userIDMessage Message
	err = ws.ReadJSON(&userIDMessage)
	if err != nil {
		log.Printf("Error receiving user ID: %v", err)
		return
	}

	client.UserID = userIDMessage.UserID
	ClientsMutex.Lock()
	Clients[ws] = client
	ClientsMutex.Unlock()

	// Send the users list to the new client
	users, _ := controllers.UsersList(client.UserID)

	message := Message{
		Type:    "users",
		Content: users,
	}

	log.Printf("Sending users list: %v", message)

	err = ws.WriteJSON(message)
	if err != nil {
		log.Printf("Error sending users list: %v", err)
		return
	}

	// Listen for messages from this client
	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			ClientsMutex.Lock()
			delete(Clients, ws)
			ClientsMutex.Unlock()
			break
		}

		if msg.Type == "register" {
			Register <- client
		}

		if msg.Type == "message" {
			Messages <- msg
		}
	}
}
