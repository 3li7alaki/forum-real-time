package controllers

import "forum/pkg/models"

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
