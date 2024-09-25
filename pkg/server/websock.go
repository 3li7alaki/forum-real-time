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
	SenderID   int         `json:"sender_id"`
	ReceiverID int         `json:"receiver_id"`
	Time       string      `json:"time"`
}

var Clients = make(map[int]*Client)
var ClientsMutex = sync.Mutex{}

var Register = make(chan *Client)
var Messages = make(chan Message)
var Typing = make(chan Message)
var Disconnect = make(chan *Client)

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

	client.UserID = userIDMessage.SenderID
	ClientsMutex.Lock()
	Clients[client.UserID] = client
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

	// Send the new user to all other clients
	for id, c := range Clients {
		if c.Conn != client.Conn {
			// Send new users list
			users, _ := UsersList(c.UserID)

			message := Message{
				Type:    "users",
				Content: users,
			}

			err := c.Conn.WriteJSON(message)

			if err != nil {
				log.Printf("Error writing register message: %v", err)
				Disconnect <- c
				ClientsMutex.Lock()
				delete(Clients, id)
				ClientsMutex.Unlock()
			}
		}
	}

	// Listen for messages from this client
	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			Disconnect <- client
			ClientsMutex.Lock()
			delete(Clients, client.UserID)
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

		client, ok := Clients[msg.ReceiverID]
		if ok {
			err := client.Conn.WriteJSON(msg)
			if err != nil {
				log.Printf("Error writing message: %v", err)
				Disconnect <- client
				ClientsMutex.Lock()
				delete(Clients, client.UserID)
				ClientsMutex.Unlock()
			}
		}
	}
}

func HandleRegister() {
	for {
		client := <-Register

		for id, c := range Clients {
			if c.Conn != client.Conn {
				// Send new users list
				users, _ := UsersList(client.UserID)

				message := Message{
					Type:    "users",
					Content: users,
				}

				err := c.Conn.WriteJSON(message)

				if err != nil {
					log.Printf("Error writing register message: %v", err)
					Disconnect <- c
					ClientsMutex.Lock()
					delete(Clients, id)
					ClientsMutex.Unlock()
				}
			}
		}
	}
}

func HandleTyping() {
	for {
		msg := <-Typing

		for id, client := range Clients {
			if client.UserID != msg.SenderID && msg.ReceiverID == client.UserID {
				message := Message{
					Type:     "typing",
					Content:  msg.Content,
					SenderID: msg.SenderID,
				}

				err := client.Conn.WriteJSON(message)

				if err != nil {
					log.Printf("Error writing typing message: %v", err)
					Disconnect <- client
					ClientsMutex.Lock()
					delete(Clients, id)
					ClientsMutex.Unlock()
				}
			}
		}
	}
}

func HandleDisconnect() {
	for {
		client := <-Disconnect

		for id, c := range Clients {
			if c.Conn != client.Conn {
				// Send new users list
				users, _ := UsersList(c.UserID)

				message := Message{
					Type:    "users",
					Content: users,
				}

				err := c.Conn.WriteJSON(message)

				if err != nil {
					log.Printf("Error writing disconnect message: %v", err)
					Disconnect <- c
					ClientsMutex.Lock()
					delete(Clients, id)
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

	for _, u := range users {
		if _, ok := Clients[u.ID]; ok {
			u.Online = true
		} else {
			u.Online = false
		}
	}

	return users, nil
}
