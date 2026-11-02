import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";
import History from "./pages/History";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import Profile from './pages/Profile';
import AdminFeedbacks from './pages/AdminFeedbacks';
import { updateProfile } from "./services/api";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") || "light";
    document.body.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    if (user && user.email) {
      const profileData = {
        email: user.email,
        fullname: user.displayName || user.fullname || "Sinh viên VLU",
        major: "Information Technology",
        university: "Van Lang University"
      };
      
      updateProfile(profileData)
        .then(() => console.log("Đã cập nhật profile!"))
        .catch((err) => console.error("Lỗi cập nhật profile:", err));
    }
  }, [userString]);

  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .app-wrapper { display: flex; min-height: 100vh; }
        .app-content {
          flex: 1;
          background: var(--bg-gradient);
          color: var(--text-dark);
          min-height: 100vh;
          width: 100%;
          transition: background 0.3s, color 0.3s;
        }
        @media (min-width: 769px) {
          .app-content { margin-left: 230px; width: calc(100% - 230px); }
        }
        @media (max-width: 768px) {
          .app-content { margin-left: 0; width: 100%; }
        }
      `}</style>
      
      <div className="app-wrapper">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/admin-feedbacks" element={<AdminFeedbacks />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;