import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
// import AWS from "aws-sdk";
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

// const dynamoDB = new AWS.DynamoDB.DocumentClient();
// const TABLE_NAME = process.env.DYNAMO_TABLE_NAME;

// const extractKeywords = (message: string): string[] => {
//   const keywordList = [
//   "cyber threat",
//   "malicious",
//   "threat actor",
//   "cyberattack",
//   "intrusion",
//   "exploitation",
//   "vulnerability",
//   "risk",
//   "threat detection",
//   "phishing",
//   "malware",
//   "ransomware",
//   "denial-of-service (dos)",
//   "distributed denial-of-service (ddos)",
//   "zero-day",
//   "sql injection",
//   "supply chain",
//   "man-in-the-middle (mitm)",
//   "tactics",
//   "techniques",
//   "procedures",
//   "mitre att&ck",
//   "initial access",
//   "credential dumping",
//   "privilege escalation",
//   "lateral movement",
//   "command and control (c2)",
//   "data exfiltration",
//   "ip address",
//   "domain",
//   "file hash (md5, sha-256)",
//   "registry change",
//   "unusual traffic",
//   "malware signature",
//   "common vulnerabilities and exposures (cve)",
//   "exploit kit",
//   "patch",
//   "zero-day vulnerability",
//   "software weakness",
//   "penetration test",
//   "bug bounty",
//   "reconnaissance",
//   "compromise",
//   "persistence",
//   "data breach",
//   "forensic analysis",
//   "incident response",
//   "threat feed",
//   "cyber intelligence",
//   "incident report",
//   "threat hunting",
//   "threat modeling",
//   "fireeye",
//   "crowdstrike",
//   "kaspersky",
//   "advanced persistent threat (apt)"
// ]; // Expand as needed

//   return keywordList.filter((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
// };

// const fetchCyberSecurityContent = async (keywords: string[]) => {
//   if (keywords.length === 0) return [];

//   const filterExpressions = keywords.map((_, index) => `contains(content, :kw${index})`).join(" OR ");
//   const expressionAttributeValues = keywords.reduce((acc, keyword, index) => {
//     acc[`:kw${index}`] = keyword;
//     return acc;
//   }, {} as Record<string, string>);

//   const params = {
//     TableName: TABLE_NAME,
//     FilterExpression: filterExpressions,
//     ExpressionAttributeValues: expressionAttributeValues,
//   };

//   const data = await dynamoDB.scan(params).promise();
//   return data.Items || [];
// };

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const messages = body.messages as ChatCompletionMessageParam[];
    const max_tokens = body.max_tokens ?? 4096;
    const temperature = body.temperature ?? 0.7;
    const stream = body.stream ?? false;

    if (!messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Messages is required" }),
      };
    }

    // // Extract relevant keywords from the user message
    // const keywords = extractKeywords(userMessage);

    // // Fetch only related cybersecurity data
    // const cyberSecurityData = await fetchCyberSecurityContent(keywords);

    // Format the fetched content for the AI model
    // let formattedContent = "";
    // if (cyberSecurityData.length > 0) {
    //   formattedContent = cyberSecurityData.map((item) => `- ${item.title}: ${item.content}`).join("\n");
    // }

    if (!messages.find((message) => message.role === "system")) {
      messages.unshift({
        role: "system",
        content: DEFAULT_SYSTEM_PROMPT,
      });
    }

    // Inject system prompt dynamically with relevant cybersecurity data
    // if (!messages.find((message) => message.role === "system")) {
    //   messages.unshift({
    //     role: "system",
    //     content: DEFAULT_SYSTEM_PROMPT + `Below is the latest relevant cybersecurity information:\n\n${formattedContent}`,
    //   });
    // }


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
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error: ${(error as Error).message}` }),
    };
  }
};
