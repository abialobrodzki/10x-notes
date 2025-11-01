import { http, HttpResponse } from "msw";

// Mock data for a successful OpenRouter API response
const mockOpenRouterSuccessResponse = {
  id: "gen-mock-id",
  model: "mistralai/mistral-7b-instruct:free",
  choices: [
    {
      message: {
        role: "assistant",
        content: JSON.stringify({
          summary_text: "This is a mock AI-generated summary.",
          suggested_tag: "mock-tag-1",
          goal_status: "in_progress",
        }),
      },
      finish_reason: "stop",
    },
  ],
};

export const handlers = [
  // Intercept POST requests to the OpenRouter API
  http.post("https://openrouter.ai/api/v1/chat/completions", () => {
    // Respond with a mocked successful response
    return HttpResponse.json(mockOpenRouterSuccessResponse, { status: 200 });
  }),
];
