package model

import (
	"github.com/openai/openai-go/v3/shared"
)

type AskOpenAIResponse struct {
	OutputText      string
	TotalUsedTokens int
	EstimatedCost   float64
	UsedModel       shared.ResponsesModel
}
