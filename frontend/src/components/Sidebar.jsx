import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

function Sidebar({ isOpen, onClose, onToggle }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user?.email?.toLowerCase().trim();
  const admins = ["dangngochongyen40@gmail.com", "thunguyen465933@gmail.com"];
  const isAdmin = admins.includes(userEmail);
 
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
 
  const fileInputRef = useRef(null);

  const handleSelectTheme = (mode) => {
    localStorage.setItem("app_theme", mode);
    document.body.setAttribute("data-theme", mode);
    setShowThemeModal(false);
  };

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const linkStyle = {
    color: "var(--sidebar-text)",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background 0.2s"
  };

  useEffect(() => {
    if (window.innerWidth <= 768) {
      onClose();
    }
  }, [location]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Vui lòng chỉ chọn file hình ảnh!");
        return;
      }
      setFeedbackImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setFeedbackImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() && !feedbackImage) {
      alert("Vui lòng nhập nội dung hoặc chọn hình ảnh phản hồi!");
      return;
    }
    try {
      let uploadedImageUrl = "";
      
      // 1. Tiến hành upload hình ảnh lên server trước nếu người dùng có chọn ảnh
      if (feedbackImage) {
        const formData = new FormData();
        formData.append("file", feedbackImage);
        const uploadRes = await axios.post("http://127.0.0.1:8000/upload-image", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadedImageUrl = uploadRes.data?.url || "";
      }

      // 2. Gửi phản hồi kèm theo đường dẫn ảnh về backend
      await axios.post("http://127.0.0.1:8000/feedback", {
        email: user?.email || "anonymous@gmail.com",
        content: feedbackText,
        image_url: uploadedImageUrl
      });

      alert("Cảm ơn ý kiến phản hồi của bạn! Hệ thống đã ghi nhận.");
      setFeedbackText("");
      handleRemoveImage();
      setShowFeedbackModal(false);
    } catch (err) {
      console.error("Lỗi gửi phản hồi:", err);
      alert("Có lỗi xảy ra khi gửi phản hồi, vui lòng thử lại sau.");
    }
  };

  return (
    <>
      <style>{`
        .menu-btn {
          position: fixed;
          top: 15px; left: 15px;
          background: var(--primary-color); border: none; color: white;
          font-size: 22px; cursor: pointer; padding: 8px 12px;
          border-radius: 8px; z-index: 1000;
        }
        .sidebar-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); z-index: 1001;
        }
        .sidebar-drawer {
          position: fixed; top: 0; left: -300px; width: 240px; height: 100vh;
          background: var(--sidebar-bg);
          color: var(--sidebar-text);
          padding: 20px; z-index: 1002; display: flex; flex-direction: column;
          border-right: 1px solid var(--border-color);
          transition: left 0.3s ease;
        }
        .sidebar-drawer.open { left: 0; }
        .close-btn {
          position: absolute; top: 15px; right: 15px; background: none; border: none;
          color: var(--sidebar-text); font-size: 24px; cursor: pointer;
        }
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .modal-content {
          background-color: var(--card-bg); padding: 20px; border-radius: 12px;
          width: 420px; max-width: 90%; color: var(--text-color); box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 1px solid var(--border-color);
        }
        @media (min-width: 769px) {
          .menu-btn { display: none !important; }
          .sidebar-overlay { display: none !important; }
          .sidebar-drawer { left: 0 !important; position: fixed; }
          .close-btn { display: none !important; }
        }
        @media (max-width: 768px) {
          .menu-btn { display: block !important; }
          .sidebar-drawer { left: -300px !important; }
          .sidebar-drawer.open { left: 0 !important; }
        }
      `}</style>
      
      <button className="menu-btn" onClick={onToggle}>☰</button>
      {isOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={onClose}></div>
      )}
      
      <div className={`sidebar-drawer ${isOpen ? "open" : ""}`}>
        <button className="close-btn" onClick={onClose}>×</button>
       
        <h2 style={{ marginBottom: "20px", marginTop: "10px", fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>
          Job & AI Hub
        </h2>
       
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary-color)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "20px", marginBottom: "8px"
          }}>
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "T"}
          </div>
          <span style={{ fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>
            {user?.displayName || user?.fullname || "Thu Nguyen Anh"}
          </span>
          <Link style={{ ...linkStyle, fontSize: "12px", opacity: 0.8, padding: "0" }} to="/profile" onClick={onClose}>
              Chỉnh sửa hồ sơ
          </Link>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          <Link
            style={{
              ...linkStyle,
              backgroundColor: location.pathname === "/" ? "var(--active-tab-bg)" : "transparent",
              color: location.pathname === "/" ? "var(--active-tab-text)" : "var(--sidebar-text)"
            }}
            to="/"
            onClick={onClose}
          >
            Tab mới
          </Link>
         
          <Link
            style={{
              ...linkStyle,
              backgroundColor: location.pathname === "/history" ? "var(--active-tab-bg)" : "transparent",
              color: location.pathname === "/history" ? "var(--active-tab-text)" : "var(--sidebar-text)"
            }}
            to="/history"
            onClick={onClose}
          >
            Lịch sử
          </Link>
         
          <div>
            <div
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{ ...linkStyle, cursor: "pointer", justifyContent: "space-between" }}
            >
              <span>Cài đặt</span>
              <span>{settingsOpen ? "▲" : "▼"}</span>
            </div>
            {settingsOpen && (
              <div style={{ paddingLeft: "15px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", borderLeft: "2px solid var(--border-color)" }}>
                <span
                  style={{ ...linkStyle, fontSize: "13px", padding: "6px 10px", cursor: "pointer" }}
                  onClick={() => { setShowThemeModal(true); setSettingsOpen(false); if(window.innerWidth <= 768) onClose(); }}
                >
                  Giao diện
                </span>
               
                {!isAdmin && (
                  <span
                    style={{ ...linkStyle, fontSize: "13px", padding: "6px 10px", cursor: "pointer" }}
                    onClick={() => { setShowFeedbackModal(true); setSettingsOpen(false); if(window.innerWidth <= 768) onClose(); }}
                  >
                    Ý kiến phản hồi
                  </span>
                )}
              </div>
            )}
          </div>

          {isAdmin && (
            <>
              <Link style={linkStyle} to="/users" onClick={onClose}>Quản lý người dùng</Link>
              <Link style={linkStyle} to="/documents" onClick={onClose}>Quản lý tài liệu</Link>
              <Link style={linkStyle} to="/admin-feedbacks" onClick={onClose}>Hộp thư phản hồi</Link>
            </>
          )}
        </div>

        <button onClick={logout} style={{
            marginTop: "auto", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px",
            background: "var(--card-bg)", color: "var(--text-color)", fontWeight: "600", cursor: "pointer", width: "100%"
        }}>
          Đăng xuất
        </button>
      </div>

      {/* Modal Chọn Giao Diện */}
      {showThemeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Chọn phong cách giao diện</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
              <button
                onClick={() => handleSelectTheme("pastel")}
                style={{ padding: "12px", borderRadius: "8px", border: "2px solid #F7CAC9", background: "linear-gradient(135deg, #fde6e5, #dfe6f5)", color: "#333", cursor: "pointer", fontWeight: "bold" }}
              >
                🌸 Pastel Rose (Bản cũ)
              </button>
              <button
                onClick={() => handleSelectTheme("dark")}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #1e293b", background: "#0b0f19", color: "#f8fafc", cursor: "pointer", fontWeight: "bold" }}
              >
                🌙 Midnight Dark
              </button>
              <button
                onClick={() => handleSelectTheme("light")}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f0f4f9", color: "#1e293b", cursor: "pointer", fontWeight: "bold" }}
              >
                ☀️ Serenity Light
              </button>
              <button
                onClick={() => handleSelectTheme("emerald")}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #d1e7dd", background: "#e6f4f1", color: "#0f5132", cursor: "pointer", fontWeight: "bold" }}
              >
                🌿 Emerald Mint
              </button>
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setShowThemeModal(false)}
                style={{ padding: "8px 16px", background: "var(--border-color)", color: "var(--text-color)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phản Hồi Kèm Ảnh */}
      {showFeedbackModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: "15px", marginTop: 0 }}>Gửi ý kiến phản hồi</h3>
            <textarea
              rows="4"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Nhập góp ý hoặc báo lỗi..."
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", outline: "none", marginBottom: "12px", boxSizing: "border-box", background: "var(--card-bg)", color: "var(--text-color)" }}
            />
            <div style={{ marginBottom: "15px" }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                style={{ display: "none" }}
              />
              {!imagePreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  style={{ width: "100%", padding: "8px", background: "transparent", border: "1px dashed var(--border-color)", borderRadius: "6px", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px" }}
                >
                  📷 Thêm hình ảnh minh họa lỗi
                </button>
              ) : (
                <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                  <img src={imagePreview} alt="Preview" style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-color)" }} />
                  <button
                    onClick={handleRemoveImage}
                    style={{ position: "absolute", top: "5px", right: "5px", background: "#e74c3c", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => { setShowFeedbackModal(false); handleRemoveImage(); }}
                style={{ padding: "8px 14px", background: "var(--border-color)", color: "var(--text-color)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                Hủy
              </button>
              <button
                onClick={handleSendFeedback}
                style={{ padding: "8px 14px", background: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;