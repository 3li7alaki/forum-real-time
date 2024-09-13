package database

import (
	"forum/pkg/env"
	"forum/pkg/models"
	"log"
	"os"
)

func Init() {
	err := Connect()
	if err != nil {
		log.Fatal(err)
	}

	path := env.Get("DB_PATH")
	_, err = os.Stat(path)

	err = CreateTables()
	if err != nil {
		log.Fatal(err)
	}

	admin := &models.User{
		Username: "admin",
		Password: "admin",
		Email:    "admin@formhub.com",
		Type:     "admin",
	}

	admin.Create()
}
