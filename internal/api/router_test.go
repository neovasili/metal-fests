package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRouter_NotFound(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/unknown", nil)
	w := httptest.NewRecorder()
	Router(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", resp.StatusCode)
	}
}

// More router tests can be added for each route if needed.
