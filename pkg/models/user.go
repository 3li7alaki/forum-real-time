package models

import (
	"database/sql"
	"errors"
	"fmt"
	"forum/pkg/consts"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID        int    `json:"id"`
	Nickname  string `json:"nickname"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Type      string `json:"type"`
	Requested bool   `json:"requested"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	SessionUUID    string     `json:"session_uuid"`
	LastMessagedAt *time.Time `json:"last_messaged_at"`
}

func (u *User) CreateTable() error {
	_, err := DB.Exec(`CREATE TABLE IF NOT EXISTS users (
			id                 	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			nickname           	VARCHAR(50) NOT NULL,
			age                	INTEGER,
			gender             	VARCHAR(20),
			first_name         	VARCHAR(50),
			last_name          	VARCHAR(50),
			email           	VARCHAR(50) NOT NULL,
			password            VARCHAR NOT NULL,
			type           		VARCHAR NOT NULL,
    		requested           BOOLEAN DEFAULT FALSE,
    		created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    		updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_email UNIQUE (email),
			CONSTRAINT unique_nickname UNIQUE (nickname)
	)`)
	return err
}

func (u *User) Index() ([]Model, error) {
	rows, err := DB.Query(`SELECT * FROM users WHERE type != ?`, consts.ADMIN)
	if err != nil {
		return nil, err
	}

	var users []Model

	for rows.Next() {
		user := &User{}
		err = rows.Scan(&user.ID, &user.Nickname, &user.Age, &user.Gender, &user.FirstName, &user.LastName, &user.Email, &user.Password, &user.Type, &user.Requested, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, err
		}
		user.HideDetails()
		users = append(users, user)
	}

	return users, nil
}

func (u *User) Create() error {
	if u.Exists() {
		return errors.New("user already exists")
	}

	if !u.ValidType() {
		return errors.New("invalid user type")
	}

	err := u.HashPassword()
	if err != nil {
		return err
	}

	u.Email = strings.ToLower(u.Email)

	result, err := DB.Exec(`INSERT INTO users (nickname, age, gender, first_name, last_name, email, password, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		u.Nickname, u.Age, u.Gender, u.FirstName, u.LastName, u.Email, u.Password, u.Type)
	if err != nil {
		return err
	}

	lastID, err := result.LastInsertId()
	if err != nil {
		return err
	}

	u.ID = int(lastID)
	return nil
}

func (u *User) Update() error {
	if !u.Exists() {
		return errors.New("user does not exist")
	}

	if !u.ValidType() {
		return errors.New("invalid user type")
	}

	err := u.HashPassword()
	if err != nil {
		return err
	}

	u.Email = strings.ToLower(u.Email)

	// Check if nickname and email are taken by another user
	var id int
	err = DB.QueryRow(`SELECT id FROM users WHERE (nickname = ? OR email = ?) AND id != ?`, u.Nickname, u.Email, u.ID).Scan(&id)
	if err == nil {
		return errors.New("nickname or email is already taken")
	}

	_, err = DB.Exec(`UPDATE users SET nickname = ?, age = ?, gender = ?, first_name = ?, last_name = ?, email = ?, password = ?, type = ?, requested = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		u.Nickname, u.Age, u.Gender, u.FirstName, u.LastName, u.Email, u.Password, u.Type, u.Requested, u.ID)
	if err != nil {
		return err
	}

	return err
}

func (u *User) Delete() error {
	if !u.Exists() {
		return errors.New("user does not exist")
	}

	_, err := DB.Exec(`PRAGMA foreign_keys = ON; DELETE FROM users WHERE id = ?`, u.ID)
	return err
}

func (u *User) Refresh() error {
	if !u.Exists() {
		return errors.New("user does not exist")
	}

	err := DB.QueryRow(`SELECT * FROM users WHERE id = ?`, u.ID).Scan(&u.ID, &u.Nickname, &u.Age, &u.Gender, &u.FirstName, &u.LastName, &u.Email, &u.Password, &u.Type, &u.Requested, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return errors.New("user does not exist")
	}

	return nil
}

func (u *User) Exists() bool {
	return u.ID != 0
}

func (u *User) HashPassword() error {
	cost, err := bcrypt.Cost([]byte(u.Password))
	if err != nil && !errors.Is(err, bcrypt.ErrHashTooShort) {
		return err
	}

	if cost != bcrypt.DefaultCost {
		password, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.Password = string(password)
	}

	return nil
}

func (u *User) ComparePassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

func (u *User) ValidType() bool {
	return u.Type == consts.ADMIN || u.Type == consts.MODERATOR || u.Type == consts.USER
}

func GetUserByEmail(email string) (*User, error) {
	user := &User{}
	email = strings.TrimSpace(strings.ToLower(email))
	err := DB.QueryRow(`SELECT * FROM users WHERE email LIKE ?`, email).Scan(&user.ID, &user.Nickname, &user.Age, &user.Gender, &user.FirstName, &user.LastName, &user.Email, &user.Password, &user.Type, &user.Requested, &user.CreatedAt, &user.UpdatedAt)
	return user, err
}

func GetUserByNickname(nickname string) (*User, error) {
	user := &User{}
	nickname = strings.TrimSpace(nickname)
	err := DB.QueryRow(`SELECT * FROM users WHERE nickname LIKE ?`, nickname).Scan(&user.ID, &user.Nickname, &user.Age, &user.Gender, &user.FirstName, &user.LastName, &user.Email, &user.Password, &user.Type, &user.Requested, &user.CreatedAt, &user.UpdatedAt)
	return user, err
}

func GetUserByUsername(username string) (*User, error) {
	user := &User{}
	username = strings.TrimSpace(username)
	err := DB.QueryRow(`SELECT * FROM users WHERE email LIKE ? OR nickname LIKE ?`, username, username).Scan(&user.ID, &user.Nickname, &user.Age, &user.Gender, &user.FirstName, &user.LastName, &user.Email, &user.Password, &user.Type, &user.Requested, &user.CreatedAt, &user.UpdatedAt)
	return user, err
}

func (u *User) HideDetails() {
	u.Password = ""
	u.SessionUUID = ""
}

// User Sessions

func (u *User) NewSession(duration time.Duration) (*Session, error) {
	if !u.Exists() {
		return nil, errors.New("user does not exist")
	}

	expiresAt := time.Now().Add(duration)

	if expiresAt.Before(time.Now()) {
		return nil, errors.New("session expires at is in the past")
	}

	session := &Session{
		UserID:    u.ID,
		ExpiresAt: expiresAt,
	}

	err := session.Create()
	return session, err
}

func (u *User) Session() (*Session, error) {
	if !u.Exists() {
		return nil, errors.New("user does not exist")
	}

	return GetSessionByUserID(u.ID)
}

// Default_component

func (u *User) Posts() ([]*Post, error) {
	rows, err := DB.Query(`SELECT * FROM posts WHERE user_id = ? AND post_id IS NULL`, u.ID)
	if err != nil {
		return nil, err
	}

	var posts []*Post

	for rows.Next() {
		post := &Post{}
		err = rows.Scan(&post.ID, &post.Title, &post.Body, &post.Media, &post.Likes, &post.Dislikes, &post.PostID, &post.UserID, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	return posts, nil
}

func (u *User) Comments() ([]*Post, error) {
	rows, err := DB.Query(`SELECT * FROM posts WHERE user_id = ? AND post_id IS NOT NULL`, u.ID)
	if err != nil {
		return nil, err
	}

	var posts []*Post

	for rows.Next() {
		post := &Post{}
		err = rows.Scan(&post.ID, &post.Title, &post.Body, &post.Media, &post.Likes, &post.Dislikes, &post.PostID, &post.UserID, &post.CreatedAt, &post.UpdatedAt)
		if err != nil {
			return nil, err
		}

		err = post.GetOriginalPost()
		if err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	return posts, nil
}

func (u *User) LikedPosts() ([]*Post, error) {
	rows, err := DB.Query(`SELECT * FROM post_interactions WHERE user_id = ? AND type = ?`, u.ID, consts.LIKE)
	if err != nil {
		return nil, err
	}

	var posts []*Post

	for rows.Next() {
		postInteraction := &PostInteraction{}
		err = rows.Scan(&postInteraction.ID, &postInteraction.UserID, &postInteraction.PostID, &postInteraction.Type)
		if err != nil {
			return nil, err
		}

		post := &Post{
			ID: postInteraction.PostID,
		}
		err = post.Refresh()
		if err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	return posts, nil
}

func (u *User) DislikedPosts() ([]*Post, error) {
	rows, err := DB.Query(`SELECT * FROM post_interactions WHERE user_id = ? AND type = ?`, u.ID, consts.DISLIKE)
	if err != nil {
		return nil, err
	}

	var posts []*Post

	for rows.Next() {
		postInteraction := &PostInteraction{}
		err = rows.Scan(&postInteraction.ID, &postInteraction.UserID, &postInteraction.PostID, &postInteraction.Type)
		if err != nil {
			return nil, err
		}

		post := &Post{
			ID: postInteraction.PostID,
		}
		err = post.Refresh()
		if err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	return posts, nil
}

func (u *User) AllowedToDeletePost(post *Post) bool {
	if post.UserID == u.ID || u.Type == consts.ADMIN {
		return true
	}
	_, err := DB.Exec(`SELECT * FROM reports WHERE post_id = ? AND user_id = ? AND approved = 1`, post.ID, u.ID)
	return err == nil
}

// Report

func (u *User) Reports() ([]*Report, error) {
	rows, err := DB.Query(`SELECT * FROM reports WHERE user_id = ?`, u.ID)
	if err != nil {
		return nil, err
	}

	var reports []*Report

	for rows.Next() {
		report := &Report{}
		err = rows.Scan(&report.ID, &report.Content, &report.Type, &report.Approved, &report.PostID, &report.UserID)
		if err != nil {
			return nil, err
		}

		err = report.GetRelations()
		if err != nil {
			return nil, err
		}

		reports = append(reports, report)
	}

	return reports, nil
}

func (u *User) DeleteReports() error {
	_, err := DB.Exec(`PRAGMA foreign_keys = ON; DELETE FROM reports WHERE user_id = ?`, u.ID)
	return err
}

// Moderator Requests

func (u *User) ModeratorRequests() ([]*User, error) {
	rows, err := DB.Query(`SELECT * FROM users WHERE requested = ?`, true)
	if err != nil {
		return nil, err
	}

	var users []*User

	for rows.Next() {
		user := &User{}
		err = rows.Scan(&user.ID, &user.Nickname, &user.Age, &user.Gender, &user.FirstName, &user.LastName, &user.Email, &user.Password, &user.Type, &user.Requested, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, err
		}
		user.HideDetails()
		users = append(users, user)
	}

	return users, nil
}

// Notifications

func (u *User) Notifications() ([]*Notification, error) {
	rows, err := DB.Query(`SELECT * FROM notifications WHERE user_id = ?`, u.ID)
	if err != nil {
		return nil, err
	}

	var notifications []*Notification

	for rows.Next() {
		notification := &Notification{}
		err = rows.Scan(&notification.ID, &notification.UserID, &notification.Text, &notification.Seen, &notification.SenderID, &notification.Type, &notification.LinkID, &notification.Date)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, notification)
	}

	return notifications, nil
}

// UsersList

func (u *User) UsersList() ([]*User, error) {
	query := `
    SELECT 
        u.id, u.nickname, u.age, u.gender, u.first_name, u.last_name, 
        u.email, u.password, u.type, u.requested, u.created_at, u.updated_at, 
        MAX(m.time) as last_messaged_at
    FROM 
        users u
    LEFT JOIN 
        messages m ON (u.id = m.sender_id AND m.receiver_id = ?) 
                   OR (u.id = m.receiver_id AND m.sender_id = ?)
    WHERE 
        u.id != ?
    GROUP BY 
        u.id
    ORDER BY 
        last_messaged_at DESC NULLS LAST, u.nickname
    `

	rows, err := DB.Query(query, u.ID, u.ID, u.ID)
	if err != nil {
		return nil, fmt.Errorf("error querying users: %v", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		var user User
		var lastMessagedAtStr sql.NullString
		err := rows.Scan(
			&user.ID, &user.Nickname, &user.Age, &user.Gender, &user.FirstName,
			&user.LastName, &user.Email, &user.Password, &user.Type, &user.Requested,
			&user.CreatedAt, &user.UpdatedAt, &lastMessagedAtStr,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning user row: %v", err)
		}
		if lastMessagedAtStr.Valid && lastMessagedAtStr.String != "" {
			lastMessagedAt, err := time.Parse("2006-01-02 15:04:05", lastMessagedAtStr.String)
			if err != nil {
				return nil, fmt.Errorf("error parsing last_messaged_at: %v", err)
			}
			user.LastMessagedAt = &lastMessagedAt
		} else {
			user.LastMessagedAt = nil
		}

		user.HideDetails()
		users = append(users, &user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating user rows: %v", err)
	}

	return users, nil
}

func (u *User) MessagesWith(userID int, limit int) ([]*Message, error) {
	rows, err := DB.Query(`SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY id DESC LIMIT ?`, u.ID, userID, userID, u.ID, limit)
	if err != nil {
		return nil, err
	}

	var messages []*Message

	for rows.Next() {
		message := &Message{}
		err = rows.Scan(&message.ID, &message.Content, &message.Time, &message.SenderID, &message.ReceiverID)
		if err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}

	return messages, nil
}
