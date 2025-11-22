package openai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/responses"

	"github.com/neovasili/metal-fests/internal/model"
)

var modelPricing = map[string]struct {
	InputPerMillion  float64
	OutputPerMillion float64
}{
	openai.ChatModelGPT4_1: {InputPerMillion: 3.0, OutputPerMillion: 6.0}, // $3 input / $6 output
	openai.ChatModelGPT4o:  {InputPerMillion: 2.5, OutputPerMillion: 5.0}, // $2.5 input / $5 output
}

type OpenAIClient struct {
	client        openai.Client
	responsesBase responses.ResponseNewParams
}

func NewOpenAIClient(apiKey string) *OpenAIClient {
	client := openai.NewClient(
		option.WithAPIKey(apiKey),
	)
	return &OpenAIClient{
		client: client,
		responsesBase: responses.ResponseNewParams{
			Model:       openai.ChatModelGPT4o,
			Input:       responses.ResponseNewParamsInputUnion{},
			Temperature: openai.Float(0.0),
			Tools: []responses.ToolUnionParam{
				{
					OfWebSearch: &responses.WebSearchToolParam{
						Type: responses.WebSearchToolTypeWebSearch,
					},
				},
			},
		},
	}
}

// Estimate the cost of a request based on model and token usage
func estimateCost(model string, inTokens, outTokens int) float64 {
	pr, ok := modelPricing[model]
	if !ok {
		return 0
	}

	inputCost := (float64(inTokens) / 1_000_000.0) * pr.InputPerMillion
	outputCost := (float64(outTokens) / 1_000_000.0) * pr.OutputPerMillion
	return inputCost + outputCost
}

// Detect whether an error is a rate limit error
func isRateLimitError(err error) bool {
	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		// HTTP-level rate limit
		if apiErr.StatusCode == http.StatusTooManyRequests {
			return true
		}

		// OpenAI-specific rate limit codes
		if apiErr.Code == "rate_limit_exceeded" ||
			apiErr.Code == "insufficient_quota" ||
			apiErr.Code == "requests_limit_exceeded" {
			return true
		}
	}
	return false
}

func (c *OpenAIClient) AskOpenAI(userPrompt string, jsonSchema map[string]any, useMiniModel bool, dryRun bool) (*model.AskOpenAIResponse, error) {
	ctx := context.Background()
	request := c.responsesBase
	inputText := userPrompt
	request.Text = responses.ResponseTextConfigParam{
		Format: responses.ResponseFormatTextConfigUnionParam{
			OfJSONSchema: &responses.ResponseFormatTextJSONSchemaConfigParam{
				Name:   "output_schema",
				Schema: jsonSchema,
			},
		},
	}
	request.Input = responses.ResponseNewParamsInputUnion{
		OfString: openai.String(inputText),
	}

	if useMiniModel {
		request.Model = openai.ChatModelGPT4oMini
	}

	if dryRun {
		// Print the request as JSON to stdout
		jsonBytes, err := json.MarshalIndent(request, "", "  ")
		if err != nil {
			return nil, err
		}
		fmt.Println(string(jsonBytes))
		return nil, nil
	}
	fmt.Println(inputText)

	usedModel := request.Model
	response, err := c.client.Responses.New(ctx, request)
	if err != nil {
		if isRateLimitError(err) {
			usedModel = openai.ChatModelGPT4_1 // Fallback to GPT-4.1
			request.Model = usedModel
			response, err = c.client.Responses.New(ctx, request)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	fmt.Printf("%+v\n\n", response.OutputText())

	return &model.AskOpenAIResponse{
		OutputText:      response.OutputText(),
		TotalUsedTokens: int(response.Usage.TotalTokens),
		EstimatedCost:   estimateCost(request.Model, int(response.Usage.InputTokens), int(response.Usage.OutputTokens)),
		UsedModel:       usedModel,
	}, nil
}

func LoadPromptFile(filename string) (string, error) {
	// #nosec G304 - filename comes from validated command-line arguments
	data, err := os.ReadFile(filename)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
