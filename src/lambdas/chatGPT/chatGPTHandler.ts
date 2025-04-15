import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

const DEFAULT_SYSTEM_PROMPT = `
You are a highly knowledgeable and experienced cybersecurity expert. Your goal is to provide precise, practical, and current insights tailored to user queries.

Your expertise spans:
- Threat intelligence, malware analysis, and incident response
- Network security, cryptography, and penetration testing
- Cyber risk assessment, compliance (GDPR, NIST, ISO 27001), and governance

Instructions:
- Use clear, concise language; avoid jargon unless technical depth is requested
- Incorporate recent cybersecurity events, breaches, CVEs, or research papers when relevant
- Offer best practices, mitigation strategies, and actionable advice
- If real-time data is needed, suggest reputable sources (e.g., CISA, MITRE, NVD)

Always prioritize clarity, relevance, and value.
`;

const modelName = process.env.MODEL_NAME || "deepseek-v3";

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: process.env.BASE_URL,
  defaultHeaders: { Authorization: `Bearer ${process.env.API_KEY}` },
});

const dynamoDB = new DynamoDB.DocumentClient();
const TABLE_NAME = "CyberThreatData";

const keywordList = [
  "phishing", "malware", "ransomware", "denial-of-service", "dos",
  "supply chain", "zero-day", "sql injection", "tactics", "techniques",
  "procedures", "mitre", "spear phishing", "credential dumping", "ioc",
  "indicators", "ip address", "domain", "file hash", "md5", "sha-256",
  "registry", "reconnaissance", "initial compromise", "lateral movement",
  "data exfiltration", "persistence", "incident report", "case study",
  "breach", "forensic", "analysis", "threat intelligence", "feed",
  "alienvault", "recorded future", "threat feed",
];

const extractKeywords = (message: string): string[] => {
  const keywordSet = new Set<string>();
  const lowerMsg = message.toLowerCase();

  keywordList.forEach((kw) => {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lowerMsg)) {
      keywordSet.add(kw);
    }
  });

  return Array.from(keywordSet);
};

const fetchCyberSecurityContent = async (keywords: string[]) => {
  if (keywords.length === 0) return [];

  const data = await dynamoDB.scan({ TableName: TABLE_NAME }).promise();
  const matchedContent = [];

  for (const item of data.Items || []) {
    const rawContent = item.RawContent?.S;
    const categories = item.ThreatCategories?.M;

    if (!rawContent || !categories) continue;

    const allValues = Object.values(categories)
      .flatMap((entry: any) => entry.L.map((val: any) => val.S.toLowerCase()));

    const matched = keywords.some((k) => allValues.includes(k.toLowerCase()));
    if (matched) matchedContent.push(rawContent);
  }

  return matchedContent;
};

const injectDynamicContext = (
  basePrompt: string,
  extraContent: string[]
): string => {
  if (extraContent.length === 0) return basePrompt;

  const formatted = extraContent
    .map((item, i) => `${i + 1}. ${item}`)
    .join("\n");

  return `${basePrompt}\n\nConsider the following threat intelligence insights:\n${formatted}`;
};

const streamToClient = async (
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  stream: AsyncIterable<any>
) => {
  for await (const chunk of stream) {
    try {
      await client.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(chunk)),
        })
      );
    } catch (err) {
      console.error("Error sending chunk to client:", err);
    }
  }
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { routeKey, connectionId } = event.requestContext;

    if (routeKey === "$connect") return { statusCode: 200, body: "Connected" };
    if (routeKey === "$disconnect") return { statusCode: 200, body: "Disconnected" };

    const body = JSON.parse(event.body ?? "");
    const messages = body.messages as ChatCompletionMessageParam[];
    const max_tokens = body.max_tokens ?? 4096;
    const temperature = body.temperature ?? 0.7;

    if (!messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Messages are required" }),
      };
    }

    const userMessageObj = messages.find((msg) => msg.role === "user");

    let userMessage = "";
    if (typeof userMessageObj?.content === "string") {
      userMessage = userMessageObj.content;
    } else if (Array.isArray(userMessageObj?.content)) {
      userMessage = userMessageObj.content.map((part) => part.toString()).join(" ");
    }

    const keywords = extractKeywords(userMessage);
    const cyberSecurityData = await fetchCyberSecurityContent(keywords);
    const finalPrompt = injectDynamicContext(DEFAULT_SYSTEM_PROMPT, cyberSecurityData);

    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: finalPrompt,
    };

    const existingSystemMessageIndex = messages.findIndex(
      (msg) => msg.role === "system"
    );
    if (existingSystemMessageIndex !== -1) {
      messages[existingSystemMessageIndex] = systemMessage;
    } else {
      messages.unshift(systemMessage);
    }

    const responseStream = await openai.chat.completions.create({
      model: modelName,
      messages,
      max_tokens,
      temperature,
      stop: null,
      stream: true,
    });

    const client = new ApiGatewayManagementApiClient({
      endpoint: process.env.WEBSOCKET_API_ENDPOINT?.replace("wss://", "https://"),
    });

    await streamToClient(client, connectionId ?? "", responseStream);

    try {
      await client.send(
        new DeleteConnectionCommand({
          ConnectionId: connectionId ?? "",
        })
      );
    } catch (error) {
      console.error("Error closing WebSocket connection", error);
    }

    return { statusCode: 200, body: "Message processed" };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error: ${(error as Error).message}` }),
    };
  }
};
