package controllers

import (
	"net/http"
	"strconv"
	"strings"
)

func ProfileController(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		ShowProfile(w, r)
	case "PUT":
		UpdateProfile(w, r)
	}
}

func ShowProfile(w http.ResponseWriter, r *http.Request) {
	user, err := AuthUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	user.HideDetails()

	RespondWithJSON(w, http.StatusOK, user)
}

func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user, err := AuthUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if r.FormValue("password") != r.FormValue("confirm_password") {
		http.Error(w, "Passwords do not match", http.StatusBadRequest)
		return
	}

	age, _ := strconv.Atoi(r.FormValue("age"))

	user.Nickname = strings.ToLower(r.FormValue("nickname"))
	user.Age = age
	user.Gender = r.FormValue("gender")
	user.FirstName = r.FormValue("first_name")
	user.LastName = r.FormValue("last_name")
	user.Email = r.FormValue("email")

	if r.FormValue("password") != "" {
		user.Password = r.FormValue("password")
	}

	err = user.Update()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	user.HideDetails()

	RespondWithJSON(w, http.StatusOK, user)
}
