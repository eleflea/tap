import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

const DEFAULT_SYSTEM_PROMPT = `You are an expert in cybersecurity with extensive knowledge and hands-on experience in network security, threat intelligence, cryptography, ethical hacking, and risk management. Your goal is to provide accurate, up-to-date, and actionable insights to users based on your expertise and the latest cybersecurity news, trends, and threat reports.  

You must:  
- Stay current with emerging cybersecurity threats, vulnerabilities, and mitigation strategies.  
- Reference recent security incidents, research papers, and industry reports where applicable.  
- Offer practical advice on security best practices, risk assessment, and defense mechanisms.  
- Maintain clarity and precision, avoiding unnecessary jargon unless the user requests technical depth.  

When answering questions, consider:  
- The latest exploits, malware campaigns, or vulnerabilities (e.g., CVEs).  
- Recent cybersecurity regulations and compliance requirements (e.g., GDPR, NIST, ISO 27001).  
- Notable cybersecurity events, breaches, and their impact on businesses and individuals.  
- Best practices for securing networks, systems, and applications against modern cyber threats.  

Always prioritize accuracy, reliability, and relevance, ensuring your responses are both informative and actionable. If a question requires real-time or highly specific data, you may refer to credible sources or suggest where users can find the most recent information.`;

const modelName = process.env.MODEL_NAME || "deepseek-v3";

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: process.env.BASE_URL,
  defaultHeaders: { Authorization: `Bearer ${process.env.API_KEY}` },
});

const dynamoDB = new DynamoDB.DocumentClient();
const TABLE_NAME = "CyberThreatData";

const extractKeywords = (message: string): string[] => {
  const keywordList = [
    "phishing",
    "malware",
    "ransomware",
    "denial-of-service",
    "dos",
    "supply chain",
    "zero-day",
    "sql injection",
    "tactics",
    "techniques",
    "procedures",
    "mitre",
    "spear phishing",
    "credential dumping",
    "ioc",
    "indicators",
    "ip address",
    "domain",
    "file hash",
    "md5",
    "sha-256",
    "registry",
    "reconnaissance",
    "initial compromise",
    "lateral movement",
    "data exfiltration",
    "persistence",
    "incident report",
    "case study",
    "breach",
    "forensic",
    "analysis",
    "threat intelligence",
    "feed",
    "alienvault",
    "recorded future",
    "threat feed",
  ]; // Expand as needed

  return keywordList.filter((keyword) =>
    message.toLowerCase().includes(keyword.toLowerCase())
  );
};

const fetchCyberSecurityContent = async (keywords: string[]) => {
  if (keywords.length === 0) return [];

  const params = {
    TableName: TABLE_NAME,
  };

  const data = await dynamoDB.scan(params).promise();

  const relevantContent: string[] = [];

  for (const item of data.Items || []) {
    let threatCategories = item.ThreatCategories;
    if (!threatCategories) continue;

    threatCategories = JSON.parse(item.ThreatCategories);

    for (const category in threatCategories) {
      const categoryKeywords: string[] = threatCategories[category].map(
        (keyword: string) => keyword.toLowerCase()
      );

      if (
        keywords.some((keyword: string) =>
          categoryKeywords.includes(keyword.toLowerCase())
        )
      ) {
        relevantContent.push(item.RawContent);
        break; // Avoid duplicates if multiple keywords match
      }
    }
  }

  return relevantContent;
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { routeKey, connectionId } = event.requestContext;

    if (routeKey === "$connect") {
      return { statusCode: 200, body: "Connected" };
    }

    if (routeKey === "$disconnect") {
      return { statusCode: 200, body: "Disconnected" };
    }

    const body = JSON.parse(event.body ?? "");
    const messages = body.messages as ChatCompletionMessageParam[];
    const max_tokens = body.max_tokens ?? 4096;
    const temperature = body.temperature ?? 0.7;

    if (!messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Messages is required" }),
      };
    }

    const userMessageObj = messages.find((msg) => msg.role === "user");

    let userMessage = "";
    if (typeof userMessageObj?.content === "string") {
      userMessage = userMessageObj.content;
    } else if (Array.isArray(userMessageObj?.content)) {
      userMessage = userMessageObj.content
        .map((part) => part.toString())
        .join(" ");
    }

    // Extract relevant keywords from the user message
    const keywords = extractKeywords(userMessage);

    // Fetch only related cybersecurity data
    const cyberSecurityData = await fetchCyberSecurityContent(keywords);

    // Format the fetched content for the AI model
    let formattedContent = "";
    if (cyberSecurityData.length > 0) {
      formattedContent = cyberSecurityData
        .map((item, index) => `${index + 1}: ${item}`)
        .join("\n");
    }

    // Inject system prompt dynamically with relevant cybersecurity data
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: formattedContent
        ? DEFAULT_SYSTEM_PROMPT +
          `\n\nUsing these information in your response:\n\n${formattedContent}`
        : DEFAULT_SYSTEM_PROMPT,
    };

    // Ensure only one system prompt is added
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
      endpoint: process.env.WEBSOCKET_API_ENDPOINT?.replace(
        "wss://",
        "https://"
      ),
    });
    for await (const chunk of responseStream) {
      console.log("connectionId", connectionId);
      console.log(
        "Sending message to client",
        process.env.WEBSOCKET_API_ENDPOINT?.replace("wss://", "https://"),
        JSON.stringify(chunk)
      );

      try {
        await client.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId ?? "",
            Data: Buffer.from(JSON.stringify(chunk)),
          })
        );
      } catch (error) {
        console.error("Error sending message to client", error);
      }
    }

    return { statusCode: 200, body: "Message processed" };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error: ${(error as Error).message}` }),
    };
  }
};
