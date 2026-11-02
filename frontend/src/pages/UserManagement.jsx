import { useState, useEffect } from "react";
import { getAllUsers, deleteUser } from "../services/api";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (email) => {
    if (window.confirm(`Xóa tài khoản ${email}?`)) {
      await deleteUser(email);
      fetchUsers(); // Tải lại danh sách
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Quản lý người dùng</h2>
      <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
        {loading ? <p>Đang tải...</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                <th style={{ padding: "12px" }}>Họ tên</th>
                <th style={{ padding: "12px" }}>Email</th>
                <th style={{ padding: "12px" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>{u.fullname}</td>
                  <td style={{ padding: "12px" }}>{u.email}</td>
                  <td style={{ padding: "12px" }}>
                    <button onClick={() => handleDelete(u.email)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
export default UserManagement;