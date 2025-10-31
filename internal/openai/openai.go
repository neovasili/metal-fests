package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/responses"
	"os"
)

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
			Model:       openai.ChatModelGPT4_1Mini,
			Input:       responses.ResponseNewParamsInputUnion{},
			Temperature: openai.Float(0.3),
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

func (c *OpenAIClient) AskOpenAI(systemPrompt, userPrompt string, dryRun bool) (*responses.Response, error) {
	ctx := context.Background()
	request := c.responsesBase
	request.Input = responses.ResponseNewParamsInputUnion{
		OfString: openai.String(fmt.Sprintf("%s,%s", systemPrompt, userPrompt)),
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

	response, err := c.client.Responses.New(ctx, request)
	if err != nil {
		return nil, err
	}

	fmt.Printf("%+v", response.OutputText())

	return response, nil
}

func LoadPromptFile(filename string) (string, error) {
	// #nosec G304 - filename comes from validated command-line arguments
	data, err := os.ReadFile(filename)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
