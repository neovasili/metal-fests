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

func TestHandleUpdateBand_BadRequest(t *testing.T) {
	req := httptest.NewRequest("PUT", "/api/bands/", nil)
	w := httptest.NewRecorder()
	handleUpdateBand(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestHandleUpdateBand_InvalidJSON(t *testing.T) {
	body := bytes.NewBufferString("not-json")
	req := httptest.NewRequest("PUT", "/api/bands/testkey", body)
	w := httptest.NewRecorder()
	handleUpdateBand(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
}

func TestHandleUpdateBand_Success(t *testing.T) {
	// Set up a test database
	tempFile := "test_db_bands_success.json"
	testData := `{"bands":[{"key":"testkey","name":"Old Band","country":"","description":"","logo":"","headlineImage":"","website":"","spotify":"","genres":[],"members":[],"reviewed":false}],"festivals":[]}`
	if err := os.WriteFile(tempFile, []byte(testData), 0600); err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}

	// Import the data package to access SetDBFilePathForTesting
	oldPath := data.SetDBFilePathForTesting(tempFile)
	defer func() {
		data.SetDBFilePathForTesting(oldPath)
		_ = os.Remove(tempFile)
	}()

	band := model.Band{Key: "testkey", Name: "Test Band"}
	reqData, _ := json.Marshal(band)
	req := httptest.NewRequest("PUT", "/api/bands/testkey", bytes.NewReader(reqData))
	w := httptest.NewRecorder()
	handleUpdateBand(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	respBody, _ := io.ReadAll(resp.Body)
	if !bytes.Contains(respBody, []byte("Band updated")) {
		t.Errorf("expected response to contain 'Band updated', got %s", string(respBody))
	}
}
