package requests

import "net/http"

func RegisterRequest(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rules := Rules{
			"nickname": {"required", "min:3", "max:20", "unique:users,nickname"},
			"email":    {"required", "email", "unique:users,email"},
			"password": {"required", "min:8", "password"},
		}
		if err := rules.Validate(r); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		next.ServeHTTP(w, r)
	}
}
