package server

import "C"
import (
	"forum/pkg/models"
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
	Type       string      `json:"type"`
	Content    interface{} `json:"content"`
	UserID     int         `json:"user_id"`
	ReceiverID int         `json:"receiver_id"`
	Time       string      `json:"time"`
}

var Clients = make(map[*websocket.Conn]*Client)
var ClientsMutex = sync.Mutex{}

var Register = make(chan *Client)
var Messages = make(chan Message)
var Typing = make(chan Message)

func HandleSocks(w http.ResponseWriter, r *http.Request) {
	ws, err := Upgrader.Upgrade(w, r, nil)
	if err != nil {
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
		return
	}

	client.UserID = userIDMessage.UserID
	ClientsMutex.Lock()
	Clients[ws] = client
	ClientsMutex.Unlock()

	// Send the users list to the new client
	users, _ := UsersList(client.UserID)

	message := Message{
		Type:    "users",
		Content: users,
	}

	err = ws.WriteJSON(message)
	if err != nil {
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

		if msg.Type == "typing" {
			Typing <- msg
		}
	}
}

func HandleMessages() {
	for {
		msg := <-Messages

		for conn, client := range Clients {
			if client.UserID == msg.ReceiverID {
				err := conn.WriteJSON(msg)
				if err != nil {
					log.Printf("Error writing message: %v", err)
					ClientsMutex.Lock()
					delete(Clients, conn)
					ClientsMutex.Unlock()
				}
			}
		}
	}
}

func HandleRegister() {
	for {
		client := <-Register

		for conn := range Clients {
			if conn != client.Conn {
				// Send new users list
				users, _ := UsersList(client.UserID)

				message := Message{
					Type:    "users",
					Content: users,
				}

				err := conn.WriteJSON(message)

				if err != nil {
					log.Printf("Error writing register message: %v", err)
					ClientsMutex.Lock()
					delete(Clients, conn)
					ClientsMutex.Unlock()
				}
			}
		}
	}
}

func HandleTyping() {
	for {
		msg := <-Typing

		for conn, client := range Clients {
			if client.UserID != msg.UserID {
				message := Message{
					Type:    "typing",
					Content: msg.Content,
					UserID:  msg.UserID,
				}

				err := conn.WriteJSON(message)

				if err != nil {
					log.Printf("Error writing typing message: %v", err)
					ClientsMutex.Lock()
					delete(Clients, conn)
					ClientsMutex.Unlock()
				}
			}
		}
	}
}

func UsersList(id int) ([]*models.User, error) {
	// Get the list of users
	user := &models.User{
		ID: id,
	}

	err := user.Refresh()
	if err != nil {
		return nil, err
	}

	users, err := user.UsersList()
	if err != nil {
		return nil, err
	}

	return users, nil
}
