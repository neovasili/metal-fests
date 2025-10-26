package model

type Festival struct {
	Key         string      `json:"key"`
	Name        string      `json:"name"`
	Dates       Dates       `json:"dates"`
	Location    string      `json:"location"`
	Coordinates Coordinates `json:"coordinates"`
	Poster      string      `json:"poster"`
	Website     string      `json:"website"`
	Bands       []string    `json:"bands"`
	TicketPrice float64     `json:"ticketPrice"`
}

type Dates struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type Coordinates struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}
