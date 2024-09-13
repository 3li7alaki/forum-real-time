package responses

import (
	"forum/pkg/consts"
	"forum/pkg/models"
	"strings"
)

type GoogleUserResponse struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
}

func (r *GoogleUserResponse) User() *models.User {
	user, err := models.GetUserByEmail(r.Email)
	if err == nil {
		return user
	}

	// If user not found, create a new user
	user = &models.User{
		Username: strings.Split(r.Email, "@")[0],
		Email:    r.Email,
		Password: r.Sub,
		Type:     consts.USER,
	}

	err = user.Create()
	if err != nil {
		return nil
	}

	return user
}
