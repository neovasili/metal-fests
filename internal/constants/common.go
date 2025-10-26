package constants

import "time"

const (
	PORT           = 8000
	DBFile         = "db.json"
	ReadTimeout    = 10 * time.Second
	WriteTimeout   = 10 * time.Second
	IdleTimeout    = 60 * time.Second
	MaxHeaderBytes = 1 << 20 // 1 MB
)
