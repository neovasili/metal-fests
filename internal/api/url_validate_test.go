package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/neovasili/metal-fests/internal/model"
)

func TestHandleValidateURL_BadRequest(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/validate-url", nil)
	w := httptest.NewRecorder()
	handleValidateURL(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestHandleValidateURL_InvalidJSON(t *testing.T) {
	body := bytes.NewBufferString("not-json")
	req := httptest.NewRequest("POST", "/api/validate-url", body)
	w := httptest.NewRecorder()
	handleValidateURL(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestHandleValidateURL_EmptyURL(t *testing.T) {
	reqBody, _ := json.Marshal(model.ValidateURLRequest{URL: ""})
	req := httptest.NewRequest("POST", "/api/validate-url", bytes.NewReader(reqBody))
	w := httptest.NewRecorder()
	handleValidateURL(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

// Note: A full integration test for a valid URL would require network access and is best done as an integration test.
