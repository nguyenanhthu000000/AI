import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { matchCV, chatWithImage, getSessionDetails } from "../services/api";

function Chat() {
  const userLocal = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = userLocal?.email || "thunguyen465933@gmail.com";

  // Tự động dọn sạch session/message cũ nếu phát hiện đổi tài khoản
  const lastSavedEmail = localStorage.getItem("last_active_email");
  if (lastSavedEmail !== userEmail) {
    localStorage.removeItem("current_session_id");
    localStorage.removeItem("current_chat_messages");
    localStorage.setItem("last_active_email", userEmail);
  }

  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("current_session_id") || null;
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("current_chat_messages");
    return saved ? JSON.parse(saved) : [];
  });
 
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const activeSessionFromHistory = localStorage.getItem("active_session_id");
    if (activeSessionFromHistory) {
      loadSessionHistory(activeSessionFromHistory);
      localStorage.removeItem("active_session_id");
    }
  }, []);

  const loadSessionHistory = async (targetSessionId) => {
    setLoading(true);
    try {
      const res = await getSessionDetails(targetSessionId);
      if (res && res.data && Array.isArray(res.data)) {
        const formattedMessages = [];
        res.data.forEach(item => {
          if (item.question) formattedMessages.push({ role: "user", text: item.question });
          if (item.answer) formattedMessages.push({ role: "ai", text: item.answer });
        });
        setMessages(formattedMessages);
        setSessionId(targetSessionId);
        localStorage.setItem("current_session_id", targetSessionId);
        localStorage.setItem("current_chat_messages", JSON.stringify(formattedMessages));
      }
    } catch (err) {
      console.error("Lỗi tải chi tiết phiên chat:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("current_chat_messages", JSON.stringify(messages));
    if (sessionId) {
      localStorage.setItem("current_session_id", sessionId);
    }
  }, [messages, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const textToSend = question.trim();
    const attachedFile = fileInputRef.current?.files[0];
    if (!textToSend && !attachedFile) return;

    let displayMsg = textToSend;
    if (attachedFile) {
      displayMsg = textToSend ? `${textToSend} \n📁 [Đính kèm: ${attachedFile.name}]` : `📁 [Đã tải lên tài liệu: ${attachedFile.name}]`;
    }
    
    setMessages((prev) => [...prev, { role: "user", text: displayMsg }]);
    setQuestion("");
    setLoading(true);

    try {
      // Gửi kèm email lên backend để tách bạch dữ liệu từng tài khoản
      const formData = new FormData();
      formData.append("message", textToSend || "Phân tích tài liệu này giúp tôi");
      if (sessionId) formData.append("session_id", sessionId);
      formData.append("email", userEmail);
      if (attachedFile) formData.append("file", attachedFile);

      const res = await axios.post("http://127.0.0.1:8000/chat", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const responseData = res?.data || res;
      const answer = responseData?.answer || responseData?.detail || "AI chưa tìm thấy thông tin này.";
      const newSessionId = responseData?.session_id;

      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
      }
      setMessages((prev) => [...prev, { role: "ai", text: answer }]);
    } catch (error) {
      console.error("Lỗi chat:", error);
      const errorMsg = error.response?.data?.detail || "Lỗi kết nối server!";
      setMessages((prev) => [...prev, { role: "ai", text: `⚠️ ${errorMsg}` }]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.name.toLowerCase().endswith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      alert("Chỉ hỗ trợ file CV dạng PDF hoặc hình ảnh tuyển dụng!");
      return;
    }
    setMessages((prev) => [...prev, { role: "user", text: `📁 [Đã tải lên tài liệu: ${file.name}]` }]);
    setLoading(true);
    try {
      let res;
      if (isPdf) {
        res = await matchCV(file);
      } else {
        res = await chatWithImage(file);
      }
      const responseData = res?.data || res;
      const answer = responseData?.answer || responseData?.detail || "AI đã phân tích xong tài liệu.";
      setMessages((prev) => [...prev, { role: "ai", text: answer }]);
    } catch (error) {
      console.error("Lỗi xử lý file:", error);
      const errorMsg = error.response?.data?.detail || "Lỗi khi phân tích file trên server!";
      setMessages((prev) => [...prev, { role: "ai", text: `⚠️ ${errorMsg}` }]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNewChat = () => {
    if (window.confirm("Bạn có muốn bắt đầu cuộc trò chuyện mới không?")) {
      setMessages([]);
      setSessionId(null);
      localStorage.removeItem("current_chat_messages");
      localStorage.removeItem("current_session_id");
    }
  };

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 40px)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <style>{`
        .chat-main-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--card-bg);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          height: 100%;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .chat-scroll-area {
          flex: 1;
          overflow-y: auto !important;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--chat-box-bg);
          border-radius: 10px;
          border: 1px solid var(--border-color);
        }
        .msg-user {
          align-self: flex-end;
          background: var(--primary-color);
          color: white;
          padding: 12px 16px;
          border-radius: 16px 16px 4px 16px;
          max-width: 75%;
          word-break: break-word;
          font-size: 14px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        .msg-ai {
          align-self: flex-start;
          background: var(--card-bg);
          color: var(--text-color);
          padding: 12px 16px;
          border-radius: 16px 16px 16px 4px;
          max-width: 75%;
          word-break: break-word;
          font-size: 14px;
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .typing-dots {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 8px 12px;
        }
        .dot {
          width: 7px;
          height: 7px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        .input-container {
          display: flex;
          align-items: center;
          margin-top: 15px;
          gap: 10px;
          flex-shrink: 0;
          background: var(--card-bg);
          padding: 8px 14px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }
        .chat-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: var(--text-color);
          padding: 6px;
        }
        .attach-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .attach-btn:hover {
          background: var(--border-color);
          color: var(--primary-color);
        }
        .send-btn {
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        .send-btn:hover {
          opacity: 0.9;
        }
      `}</style>
      
      <div className="chat-main-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ color: "var(--text-color)", fontSize: "20px", margin: 0 }}>
            Hệ thống Gợi ý Việc làm & Tư vấn Lộ trình AI
          </h2>
          <button
            onClick={handleNewChat}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              transition: "0.2s"
            }}
          >
            + Cuộc trò chuyện mới
          </button>
        </div>
        
        {/* Khung chat cuộn */}
        <div className="chat-scroll-area">
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "40px", fontSize: "14px" }}>
              👋 Chào bạn! Hãy gửi câu hỏi hoặc đính kèm CV (PDF) / Ảnh tuyển dụng để hệ thống hỗ trợ phân tích nhé.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "msg-user" : "msg-ai"} style={{ whiteSpace: "pre-line" }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="msg-ai typing-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        {/* Khung nhập tin nhắn */}
        <div className="input-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,image/*"
            style={{ display: "none" }}
          />
         
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current.click()}
            title="Đính kèm CV (PDF) hoặc Ảnh tuyển dụng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <input
            className="chat-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Nhập câu hỏi hoặc yêu cầu tư vấn nghề nghiệp..."
          />
          <button className="send-btn" onClick={send}>
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;