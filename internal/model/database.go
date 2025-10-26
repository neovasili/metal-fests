package model

type Database struct {
	Festivals []Festival `json:"festivals"`
	Bands     []Band     `json:"bands"`
}
