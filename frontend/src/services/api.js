import axios from "axios";

// 1. Cấu hình BASE_URL
const BASE_URL = "http://localhost:8000";
const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================= 2. API CHAT & HISTORY =================
export const askQuestion = (question, sessionId = null, file = null) => {
  const formData = new FormData();
  formData.append("message", question);
  if (sessionId) {
    formData.append("session_id", sessionId);
  }
  if (file) {
    formData.append("file", file);
  }
  return API.post("/chat", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Cập nhật để nhận email và lọc đúng lịch sử theo tài khoản
export const getHistory = (email = "", keyword = "") => {
  return API.get("/history", {
    params: { email, keyword }
  });
};

export const getSessionDetails = (sessionId) => {
  return API.get(`/history/${sessionId}`);
};

export const deleteSessionChat = (sessionId) => {
  return API.delete(`/history/session/${sessionId}`);
};

export const deleteHistoryChat = (id) => {
  return API.delete(`/history/${id}`);
};

// ================= 3. QUẢN LÝ TÀI LIỆU (PDF) =================
export const getFiles = () => {
  return API.get("/pdfs");
};

export const uploadFile = (file, category = "job") => {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  return API.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteFile = (name) => {
  return API.delete(`/file/${encodeURIComponent(name)}`);
};

export const rebuildAI = () => {
  return API.post("/rebuild");
};

// ================= 4. QUẢN LÝ NGƯỜI DÙNG & PROFILE =================
export const updateProfile = (data) => {
  return API.post("/user/update_profile", data);
};

export const getProfile = (email) => {
  return API.get("/user/profile", { params: { email } });
};

export const getAllUsers = () => {
  return API.get("/admin/users");
};

export const deleteUser = (email) => {
  return API.delete(`/admin/user/${encodeURIComponent(email)}`);
};

// ================= 5. PHÂN TÍCH CV & OCR ẢNH =================
export const matchCV = (file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/match-cv", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const chatWithImage = (file, prompt = "Hãy phân tích yêu cầu tuyển dụng từ hình ảnh này:") => {
  const form = new FormData();
  form.append("file", file);
  form.append("prompt", prompt);
  return API.post("/chat-with-image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default API;