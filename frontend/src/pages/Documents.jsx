import { useEffect, useState } from "react";
import { uploadFile, getFiles, deleteFile, rebuildAI } from "../services/api";

function Documents() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("job");
  const [isUploading, setIsUploading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admins = ["dangngochongyen40@gmail.com", "thunguyen465933@gmail.com"];
  const isAdmin = admins.includes(user?.email);

  const loadFiles = async () => {
    try {
      const res = await getFiles();
      const data = res?.data;
      // Hỗ trợ cả định dạng cũ lẫn định dạng mới có phân loại category
      const rawList = Array.isArray(data?.pdf_files) ? data.pdf_files : [];
      const formattedList = rawList.map(item => 
        typeof item === "string" ? { filename: item, category: "general" } : item
      );
      setFiles(formattedList);
    } catch (err) {
      console.error("Không thể tải danh sách file", err);
      setFiles([]);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleSave = async () => {
    if (!selectedFile) {
      alert("Vui lòng chọn file tài liệu cần tải lên!");
      return;
    }

    try {
      setIsUploading(true); 
      await uploadFile(selectedFile, selectedCategory);
      await rebuildAI();

      alert("Tài liệu đã được lưu và cập nhật vào hệ thống AI!");
      setSelectedFile(null);
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert("Lỗi xử lý tài liệu!");
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (filename) => {
    if (!window.confirm(`Chắc chắn xóa file "${filename}" chứ?`)) return;

    try {
      await deleteFile(filename);
      await rebuildAI(); 
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại rồi!");
    }
  };

  // Hàm dịch tên category sang tiếng Việt cho dễ nhìn
  const getCategoryLabel = (cat) => {
    switch (cat) {
      case "job": return "📁 Việc làm (Job)";
      case "skill": return "📁 Kỹ năng (Skill)";
      case "student_profiles": return "📁 Hồ sơ SV (Student Profiles)";
      default: return "📁 Khác";
    }
  };

  const getCategoryBadgeColor = (cat) => {
    switch (cat) {
      case "job": return { bg: "#e3f2fd", color: "#1565c0" };
      case "skill": return { bg: "#e8f5e9", color: "#2e7d32" };
      case "student_profiles": return { bg: "#fff3e0", color: "#ef6c00" };
      default: return { bg: "#f1f1f1", color: "#666" };
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div className="card">
        <h2>Quản lý Tri thức & Tài liệu AI</h2>

        {isAdmin && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "20px",
              background: "var(--serenity-soft, #f8f9fa)",
              padding: "18px",
              borderRadius: "12px",
              border: "1px solid var(--border-color, #eee)"
            }}
          >
            <label style={{ fontWeight: "600" }}>Thêm tài liệu mới cho AI học:</label>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Chọn phân mục tri thức:</span>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
              >
                <option value="job">📁 Việc làm / Thông tin tuyển dụng (Job)</option>
                <option value="skill">📁 Kỹ năng chuyên môn / Rubric (Skill)</option>
                <option value="student_profiles">📁 Mẫu hồ sơ / Định hướng sinh viên (Student Profiles)</option>
              </select>
            </div>

            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              style={{ padding: "5px" }}
              accept=".pdf"
            />

            <button
              className="btn"
              onClick={handleSave}
              disabled={isUploading}
              style={{ width: "fit-content", padding: "8px 16px" }}
            >
              {isUploading ? "⏳ Đang phân tích và nạp vào AI..." : "💾 Lưu & Cập nhật AI"}
            </button>
            
            {isUploading && (
              <small style={{ color: "#666", fontStyle: "italic" }}>
                Hệ thống đang trích xuất văn bản, tạo embedding và lưu vào ChromaDB...
              </small>
            )}
          </div>
        )}

        <hr style={{ border: "1px solid #eee", margin: "20px 0" }} />

        <h3>Danh sách tài liệu hiện có trong hệ thống:</h3>

        <ul style={{ padding: 0, listStyle: "none", marginTop: "10px" }}>
          {files.length > 0 ? (
            files.map((f, index) => {
              const badgeStyle = getCategoryBadgeColor(f.category);
              return (
                <li
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderBottom: "1px solid #eee",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ wordBreak: "break-word", fontWeight: "500" }}>📄 {f.filename}</span>
                    <span 
                      style={{ 
                        fontSize: "12px", 
                        padding: "3px 8px", 
                        borderRadius: "20px", 
                        backgroundColor: badgeStyle.bg, 
                        color: badgeStyle.color,
                        fontWeight: "600"
                      }}
                    >
                      {getCategoryLabel(f.category)}
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      className="btn"
                      style={{
                        background: "#ff6b6b",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => remove(f.filename)}
                    >
                      Xóa
                    </button>
                  )}
                </li>
              );
            })
          ) : (
            <p style={{ color: "#999" }}>Chưa có tài liệu nào trong kho.</p>
          )}
        </ul>
      </div>
    </div>
  );
}

export default Documents;