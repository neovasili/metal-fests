package model

type Band struct {
	Key           string   `json:"key"`
	Name          string   `json:"name"`
	Country       string   `json:"country"`
	Description   string   `json:"description"`
	Logo          string   `json:"logo"`
	HeadlineImage string   `json:"headlineImage"`
	Website       string   `json:"website"`
	Spotify       string   `json:"spotify"`
	Genres        []string `json:"genres"`
	Members       []Member `json:"members"`
	Reviewed      bool     `json:"reviewed"`
}

type Member struct {
	Name string `json:"name"`
	Role string `json:"role"`
}
