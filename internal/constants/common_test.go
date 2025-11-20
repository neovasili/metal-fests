package constants

import (
	"testing"
	"time"
)

func TestConstantsValues(t *testing.T) {
	if PORT != 8000 {
		t.Errorf("expected PORT 8000, got %d", PORT)
	}
	if DBFile != "db.json" {
		t.Errorf("expected DBFile 'db.json', got %s", DBFile)
	}
	if ReadTimeout != 10*time.Second {
		t.Errorf("expected ReadTimeout 10s, got %v", ReadTimeout)
	}
	if WriteTimeout != 10*time.Second {
		t.Errorf("expected WriteTimeout 10s, got %v", WriteTimeout)
	}
	if IdleTimeout != 60*time.Second {
		t.Errorf("expected IdleTimeout 60s, got %v", IdleTimeout)
	}
	if MaxHeaderBytes != 1<<20 {
		t.Errorf("expected MaxHeaderBytes 1<<20, got %d", MaxHeaderBytes)
	}
}
