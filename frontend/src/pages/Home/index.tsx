import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const chatApi =
  process.env.REACT_APP_API_URL ??
  "wss://ncf8cwcpz5.execute-api.ap-southeast-2.amazonaws.com/prod";

const getResponse = async (
  messages: Message[],
  appendResponse: (delta: string) => void
) => {
  const socket = new WebSocket(chatApi);

  socket.onopen = () => {
    console.log("WebSocket connection established.");
    socket.send(
      JSON.stringify({
        action: "sendMessage",
        messages,
      })
    );
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    appendResponse(data.choices[0].delta.content);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed.");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
};

const Home = () => {
  const [chats, setChats] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const appendResponse = (delta: string) => {
    setChats((prev) => {
      if (prev.at(-1)?.role === "user") {
        return [...prev, { role: "assistant", content: delta }];
      }
      return [
        ...prev.slice(0, -1),
        { role: "assistant", content: prev.at(-1)?.content + delta },
      ];
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input } as Message;
    const nextChats = [...chats, userMessage];
    setChats(nextChats);
    setInput("");

    getResponse(nextChats, appendResponse);
  };
  

  return (
    <div className="w-full h-screen max-h-screen flex flex-col justify-center items-center bg-gray-100 gap-6">
      <h1 className="text-2xl font-bold text-gray-800">Your Hacker Friend</h1>
      <div className="bg-white shadow-lg rounded-xl p-4 flex flex-col w-4/5 h-4/5">
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {chats.map((chat, index) => (
            <div
              key={index}
              className={`flex ${
                chat.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-2 rounded-lg max-w-xs ${
                  chat.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <ReactMarkdown>{chat.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center p-2 border-t">
          <input
            type="text"
            className="flex-1 p-2 border rounded-lg outline-none"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            className="ml-2 p-2 bg-blue-500 text-white rounded-lg"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
