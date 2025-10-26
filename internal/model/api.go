package model

type ValidateURLRequest struct {
	URL string `json:"url"`
}

type ValidateURLResponse struct {
	Valid  bool   `json:"valid"`
	Status int    `json:"status,omitempty"`
	Error  string `json:"error,omitempty"`
	URL    string `json:"url"`
}

type UpdateBandResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
