package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/neovasili/metal-fests/internal/data"
	"github.com/neovasili/metal-fests/internal/model"
)

func TestHandleUpdateFestival_BadRequest(t *testing.T) {
	req := httptest.NewRequest("PUT", "/api/festivals/", nil)
	w := httptest.NewRecorder()
	handleUpdateFestival(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestHandleUpdateFestival_InvalidJSON(t *testing.T) {
	body := bytes.NewBufferString("not-json")
	req := httptest.NewRequest("PUT", "/api/festivals/testkey", body)
	w := httptest.NewRecorder()
	handleUpdateFestival(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestHandleUpdateFestival_Success(t *testing.T) {
	// Set up a test database
	tempFile := "test_db_festivals_success.json"
	testData := `{"bands":[],"festivals":[{"key":"testkey","name":"Old Festival","dates":{"start":"","end":""},"location":"","coordinates":{"lat":0,"lng":0},"poster":"","website":"","bands":[],"ticketPrice":0}]}`
	if err := os.WriteFile(tempFile, []byte(testData), 0600); err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}

	oldPath := data.SetDBFilePathForTesting(tempFile)
	defer func() {
		data.SetDBFilePathForTesting(oldPath)
		_ = os.Remove(tempFile)
	}()

	festival := model.Festival{Key: "testkey", Name: "Test Festival"}
	reqData, _ := json.Marshal(festival)
	req := httptest.NewRequest("PUT", "/api/festivals/testkey", bytes.NewReader(reqData))
	w := httptest.NewRecorder()
	handleUpdateFestival(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	respBody, _ := io.ReadAll(resp.Body)
	if !bytes.Contains(respBody, []byte("Festival updated")) {
		t.Errorf("expected response to contain 'Festival updated', got %s", string(respBody))
	}
}
