package models

import (
	"errors"
	"time"
)

type Message struct {
	ID         int       `json:"id"`
	Content    string    `json:"content"`
	Time       time.Time `json:"time"`
	SenderID   int       `json:"sender_id"`
	ReceiverID int       `json:"receiver_id"`

	Sender   *User `json:"sender"`
	Receiver *User `json:"receiver"`
}

func (m *Message) CreateTable() error {
	_, err := DB.Exec(`CREATE TABLE IF NOT EXISTS messages (
			id                 	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			content           	VARCHAR NOT NULL,
			time                DATETIME DEFAULT CURRENT_TIMESTAMP,
			sender_id           INTEGER NOT NULL,
			receiver_id         INTEGER NOT NULL,
			FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
	)`)
	return err
}

func (m *Message) Index() ([]Model, error) {
	rows, err := DB.Query(`SELECT * FROM messages`)
	if err != nil {
		return nil, err
	}

	var messages []Model

	for rows.Next() {
		message := &Message{}
		err = rows.Scan(&message.ID, &message.Content, &message.Time, &message.SenderID, &message.ReceiverID)
		if err != nil {
			return nil, err
		}

		err = message.GetRelations()
		if err != nil {
			return nil, err
		}

		messages = append(messages, message)
	}

	return messages, nil
}

func (m *Message) Create() error {
	if m.Exists() {
		return errors.New("message already exists")
	}

	result, err := DB.Exec(`INSERT INTO messages (content, sender_id, receiver_id) VALUES (?, ?, ?)`, m.Content, m.SenderID, m.ReceiverID)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	m.ID = int(id)
	return nil
}

func (m *Message) Update() error {
	if !m.Exists() {
		return errors.New("message does not exist")
	}

	_, err := DB.Exec(`UPDATE messages SET content = ?, sender_id = ?, receiver_id = ? WHERE id = ?`, m.Content, m.SenderID, m.ReceiverID, m.ID)
	return err
}

func (m *Message) Delete() error {
	if !m.Exists() {
		return errors.New("message does not exist")
	}

	_, err := DB.Exec(`PRAGMA foreign_keys = ON; DELETE FROM messages WHERE id = ?`, m.ID)
	return err
}

func (m *Message) Refresh() error {
	err := DB.QueryRow(`SELECT * FROM messages WHERE id = ?`, m.ID).Scan(&m.ID, &m.Content, &m.Time, &m.SenderID, &m.ReceiverID)
	if err != nil {
		return errors.New("message does not exist")
	}
	return nil
}

func (m *Message) Exists() bool {
	return m.ID != 0
}

func (m *Message) GetRelations() error {
	sender := &User{ID: m.SenderID}
	err := sender.Refresh()
	if err != nil {
		return err
	}
	sender.HideDetails()
	m.Sender = sender

	receiver := &User{ID: m.ReceiverID}
	err = receiver.Refresh()
	if err != nil {
		return err
	}
	receiver.HideDetails()
	m.Receiver = receiver

	return nil
}
