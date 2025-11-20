package data

import (
	"testing"
)

func TestSetDBFilePathForTesting(t *testing.T) {
	old := SetDBFilePathForTesting("newpath.json")
	if old == "" {
		t.Error("expected old path to be non-empty")
	}
}
