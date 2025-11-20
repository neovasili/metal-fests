package data

// SetDBFilePathForTesting allows tests to override the database file path
// This should only be used in tests
func SetDBFilePathForTesting(path string) string {
	oldPath := dbFilePath
	dbFilePath = path
	return oldPath
}
