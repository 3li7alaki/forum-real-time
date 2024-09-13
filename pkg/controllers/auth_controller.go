package controllers

import (
	"forum/pkg/consts"
	"forum/pkg/models"
	"net/http"
	"time"
)

func AuthController(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/login":
		Login(w, r)
	case "/register":
		Register(w, r)
	case "/logout":
		Logout(w, r)
	case "/check-session":
		CheckSession(w, r)
	case "/login-session":
		LoginSession(w, r)
	}
}

func Login(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	password := r.FormValue("password")

	user, err := models.GetUserByEmail(email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !user.ComparePassword(password) {
		http.Error(w, "Password is incorrect", http.StatusBadRequest)
		return
	}

	login(w, r, user)
}

func Register(w http.ResponseWriter, r *http.Request) {
	user := &models.User{
		Username: r.FormValue("username"),
		Email:    r.FormValue("email"),
		Password: r.FormValue("password"),
		Type:     consts.USER,
	}

	if err := user.Create(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	login(w, r, user)
}

func Logout(w http.ResponseWriter, r *http.Request) {
	user, err := AuthUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	session, err := user.Session()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = session.Delete()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:   "session",
		Value:  "",
		MaxAge: -1,
	})

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Logged out"})
}

func login(w http.ResponseWriter, r *http.Request, user *models.User) {
	session, _ := user.Session() // Get the existing session

	if session.Exists() {
		err := session.Delete()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    "",
			MaxAge:   -1,
			Expires:  time.Now().Add(-time.Hour),
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
	}

	userSession, err := user.NewSession(time.Hour * 10) // Create a new session
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    userSession.UUID,
		Expires:  userSession.ExpiresAt,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	user.Password = "" // Do not return the password
	user.SessionUUID = userSession.UUID

	RespondWithJSON(w, http.StatusOK, user)
}

func loginThirdParty(w http.ResponseWriter, r *http.Request, user *models.User) {
	session, _ := user.Session() // Get the existing session

	if session.Exists() {
		err := session.Delete()
		if err != nil {
			MessageController(w, r, err.Error(), "error")
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    "",
			MaxAge:   -1,
			Expires:  time.Now().Add(-time.Hour),
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})
	}

	userSession, err := user.NewSession(time.Hour * 10) // Create a new session
	if err != nil {
		MessageController(w, r, err.Error(), "error")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    userSession.UUID,
		Expires:  userSession.ExpiresAt,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	user.Password = "" // Do not return the password
	user.SessionUUID = userSession.UUID

	HomeController(w, r)
}

func CheckSession(w http.ResponseWriter, r *http.Request) {
	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Session is valid"})
}

func LoginSession(w http.ResponseWriter, r *http.Request) {
	user, err := AuthUser(r)
	if err != nil {
		MessageController(w, r, err.Error(), "error")
		return
	}

	user.HideDetails()
	RespondWithJSON(w, http.StatusOK, user)
}
