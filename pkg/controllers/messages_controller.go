package controllers

import (
	"forum/pkg/models"
	"net/http"
	"strconv"
)

func MessagesController(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		IndexMessages(w, r)
	case "POST":
		CreateMessage(w, r)
	}
}

func IndexMessages(w http.ResponseWriter, r *http.Request) {
	user, err := AuthUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	id, err := strconv.Atoi(r.FormValue("user_id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if id == user.ID {
		http.Error(w, "you cannot view your own messages", http.StatusBadRequest)
		return
	}

	limit, err := strconv.Atoi(r.FormValue("limit"))
	if err != nil {
		limit = 10
	}

	messages, err := user.MessagesWith(id, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if messages == nil {
		messages = []*models.Message{}
	}

	RespondWithJSON(w, http.StatusOK, messages)
}

func CreateMessage(w http.ResponseWriter, r *http.Request) {
	user, err := AuthUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	id, err := strconv.Atoi(r.FormValue("receiver_id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if id == user.ID {
		http.Error(w, "you cannot send a message to yourself", http.StatusBadRequest)
		return
	}

	message := &models.Message{
		Content:    r.FormValue("content"),
		SenderID:   user.ID,
		ReceiverID: id,
	}

	err = message.Create()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	message.Refresh()
	message.GetRelations()

	RespondWithJSON(w, http.StatusCreated, message)
}
