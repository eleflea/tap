import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import OpenAI from "openai";

const modelName = process.env.MODEL_NAME || "deepseek-v3";

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: process.env.BASE_URL,
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const messages = body.messages;
    const max_tokens = body.max_tokens ?? 4096;
    const temperature = body.temperature ?? 0.7;
    const stream = body.stream ?? false;

    if (!messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Messages is required" }),
      };
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages,
      max_tokens,
      temperature,
      stop: null,
      stream,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error: ${(error as Error).message}` }),
    };
  }
};
