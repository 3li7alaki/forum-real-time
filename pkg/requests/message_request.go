package requests

import "net/http"

func MessageRequest(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rules := Rules{
			"content":     {"required", "min:1", "max:50"},
			"receiver_id": {"required", "integer", "exists:users,id"},
		}
		if err := rules.Validate(r); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		next.ServeHTTP(w, r)
	}
}
