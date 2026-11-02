import { useEffect, useState } from "react";
import { getHistory, deleteSessionChat } from "../services/api";
import { useNavigate } from "react-router-dom";

function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const userLocal = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = userLocal?.email || "thunguyen465933@gmail.com";

  const loadSessions = async () => {
    if (!userEmail) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getHistory(userEmail);
      if (res && res.data && Array.isArray(res.data)) {
        setSessions(res.data);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử phiên:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?")) return;
    try {
      const res = await deleteSessionChat(sessionId);
      if (res.status === 200 || res.data?.message === "Session deleted") {
        setSessions(prev => prev.filter(item => item.session_id !== sessionId));
      }
    } catch (err) { 
      console.error("Lỗi khi xóa:", err);
      alert("Không thể xóa lúc này, vui lòng thử lại!"); 
    }
  };

  const openSession = (sessionId) => {
    localStorage.setItem("active_session_id", sessionId);
    navigate("/");
  };

  return (
    <div style={{ 
      padding: "20px",
      width: "100%", 
      boxSizing: "border-box", 
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center"
    }}>
      
      {/* Sử dụng class .card chung từ theme.css để tự động ăn theo theme */}
      <div className="card" style={{ 
        padding: "30px", 
        borderRadius: "15px", 
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        width: "100%",
        maxWidth: "1200px",
        boxSizing: "border-box",
        borderTop: "6px solid var(--primary-color)",
        backgroundColor: "var(--card-bg)",
        color: "var(--text-color)"
      }}>
        
        <h2 style={{ 
          margin: 0, 
          borderBottom: "2px solid var(--border-color)", 
          paddingBottom: "15px",
          color: "var(--primary-color)", 
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: "20px"
        }}>
          <span>Lịch sử các Tab / Cuộc trò chuyện</span>
          <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: "normal" }}>
            {userEmail}
          </span>
        </h2>

        {loading ? (
          <p style={{ textAlign: "center", marginTop: "40px", color: "var(--text-muted)" }}>Đang tải...</p>
        ) : sessions.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "40px", color: "var(--text-muted)" }}>Chưa có cuộc trò chuyện nào được lưu!</p>
        ) : (
          <div className="history-container" style={{ marginTop: "10px" }}>
            {sessions.map((s) => (
              <div 
                key={s.session_id} 
                onClick={() => openSession(s.session_id)}
                style={{ 
                  marginTop: "20px", 
                  position: 'relative',
                  backgroundColor: "var(--chat-box-bg)",
                  padding: "18px 20px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  transition: "0.3s",
                  cursor: "pointer",
                  border: "1px solid var(--border-color)"
                }}
              >
                <button 
                  onClick={(e) => deleteSession(s.session_id, e)} 
                  style={{ 
                    position: 'absolute', 
                    right: "15px", 
                    top: "15px", 
                    color: '#ff7875', 
                    cursor: 'pointer', 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '20px'
                  }}
                  title="Xóa cuộc trò chuyện này"
                >
                  ✖
                </button>
                
                <div style={{ paddingRight: "30px" }}>
                  <div style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-color)" }}>
                    💬 {s.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Nhấn để tiếp tục cuộc trò chuyện trong tab này
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;