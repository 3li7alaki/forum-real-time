package requests

import "net/http"

func MessagesRequest(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rules := Rules{
			"limit":   {"required", "integer", "min:1"},
			"user_id": {"required", "integer", "exists:users,id"},
		}
		if err := rules.Validate(r); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		next.ServeHTTP(w, r)
	}
}
