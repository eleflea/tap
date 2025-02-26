import { useState } from "react";
import "../../styles/home.css";

const Home = () => {

  const [chats, setChats] = useState<{ sender: string; text: string }[]>(
    []
  );

  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setChats([...chats, userMessage]);
    setInput("");

    setTimeout(() => {
      const botMessage = {
        sender: "bot",
        text: `You said: "${input}"`,
      };
      setChats((prev) => [...prev, botMessage]);
    }, 500);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl p-4 flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chats.map((chat, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg max-w-xs ${
              chat.sender === "user"
                ? "bg-blue-500 text-white self-end"
                : "bg-gray-200 text-gray-800 self-start"
            }`}
          >
            {chat.text}
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
          {/* <Send size={20} /> */}
        </button>
      </div>
    </div>
  );
};

export default Home;