import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // Quản lý modal phóng to ảnh

  useEffect(() => {
    fetchAdminFeedbacks();
  }, []);

  const fetchAdminFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/admin/feedbacks');
      setFeedbacks(res.data);
      setError('');
    } catch (err) {
      console.error("Lỗi tải hộp thư góp ý:", err);
      setError('Không thể tải danh sách phản hồi từ máy chủ (Vui lòng kiểm tra Backend FastAPI).');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý xóa phản hồi
  const handleDeleteFeedback = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ý kiến phản hồi này không?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/admin/feedback/${id}`);
      // Lọc bỏ phản hồi vừa xóa khỏi danh sách trên giao diện
      setFeedbacks(prev => prev.filter(fb => fb.id !== id));
    } catch (err) {
      console.error("Lỗi khi xóa phản hồi:", err);
      alert("Không thể xóa lúc này, vui lòng thử lại!");
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-color, #1e293b)', marginBottom: '6px' }}>
            Hộp Thư Góp Ý (Quản lý)
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748b)' }}>
            Theo dõi các ý kiến phản hồi và báo lỗi từ người dùng hệ thống.
          </p>
        </div>
        <button
          onClick={fetchAdminFeedbacks}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--primary-color, #2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Làm mới danh sách
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Đang tải hộp thư...</p>
      ) : feedbacks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed var(--border-color, #e2e8f0)', borderRadius: '12px', background: 'var(--card-bg, #fff)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Chưa có ý kiến phản hồi nào từ người dùng.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar-bg, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Người gửi (Email)</th>
                <th style={{ padding: '12px 16px' }}>Nội dung góp ý</th>
                <th style={{ padding: '12px 16px' }}>Hình ảnh đính kèm</th>
                <th style={{ padding: '12px 16px' }}>Thời gian</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((fb) => (
                <tr key={fb.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{fb.id}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb' }}>{fb.email}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-color)', wordBreak: 'break-word', maxWidth: '250px' }}>{fb.content}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {fb.image_url ? (
                      <img
                        src={`http://127.0.0.1:8000${fb.image_url}`}
                        alt="Feedback attachment"
                        onClick={() => setSelectedImage(`http://127.0.0.1:8000${fb.image_url}`)}
                        style={{
                          width: '55px',
                          height: '55px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          transition: 'transform 0.2s'
                        }}
                        title="Nhấn để xem ảnh lớn"
                      />
                    ) : (
                      <span style={{ color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic', fontSize: '13px' }}>Không có ảnh</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{fb.created_at || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      {fb.status || 'Chờ xử lý'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteFeedback(fb.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'opacity 0.2s'
                      }}
                      title="Xóa phản hồi này"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal phóng to ảnh khi Admin click vào */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            cursor: 'pointer'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Enlarged feedback"
              style={{ width: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain', border: '2px solid white' }}
            />
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                backgroundColor: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}