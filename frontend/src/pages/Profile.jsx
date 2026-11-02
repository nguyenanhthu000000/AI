import React, { useState, useEffect } from 'react';

export default function Profile() {
    // 1. Lấy thông tin user từ localStorage (lưu lúc đăng nhập)
    const userString = localStorage.getItem("user");
    const loggedInUser = userString ? JSON.parse(userString) : null;
    const defaultEmail = loggedInUser?.email || '';
    
    // Lấy tên mặc định từ displayName hoặc cắt phần trước chữ @ của email
    const getInitialName = () => {
        if (loggedInUser?.displayName) return loggedInUser.displayName;
        if (loggedInUser?.fullname) return loggedInUser.fullname;
        if (defaultEmail) {
            const namePart = defaultEmail.split('@')[0];
            return namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }
        return '';
    };

    const getInitialAvatar = () => {
        return 'https://cdn-icons-png.flaticon.com/512/616/616408.png'; // Mặc định con mèo dễ thương
    };

    const [email, setEmail] = useState(defaultEmail);
    const [fullname, setFullname] = useState(getInitialName());
    const [birthday, setBirthday] = useState('');
    const [major, setMajor] = useState('Information Technology');
    const [university, setUniversity] = useState('Van Lang University');
    
    const [avatarUrl, setAvatarUrl] = useState(getInitialAvatar());
    const [selectedFile, setSelectedFile] = useState(null);

    const presetAvatars = [
        'https://cdn-icons-png.flaticon.com/512/616/616408.png', // Mèo
        'https://cdn-icons-png.flaticon.com/512/616/616430.png', // Thỏ
        'https://cdn-icons-png.flaticon.com/512/616/616412.png', // Gấu
        'https://cdn-icons-png.flaticon.com/512/616/616438.png'  // Cáo
    ];

    // Hàm lấy dữ liệu profile từ server
    const fetchProfile = async (userEmail) => {
        if (!userEmail) return;
        try {
            const res = await fetch(`http://127.0.0.1:8000/user/profile?email=${encodeURIComponent(userEmail)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.fullname) setFullname(data.fullname);
                if (data.birthday) setBirthday(data.birthday);
                if (data.major) setMajor(data.major);
                if (data.university) setUniversity(data.university);
                if (data.avatar_url) setAvatarUrl(data.avatar_url);
            } else {
                // Nếu chưa có profile trong DB, dùng mặc định theo email đăng nhập
                setFullname(getInitialName());
            }
        } catch (e) {
            console.log("Chưa có profile trên server, dùng thông tin mặc định từ tài khoản.");
        }
    };

    // Gọi fetch ngay khi load trang với email đăng nhập sẵn
    useEffect(() => {
        if (defaultEmail) {
            fetchProfile(defaultEmail);
        }
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!email) {
            alert("Vui lòng nhập Email định danh!");
            return;
        }

        let finalAvatarUrl = avatarUrl;
        if (selectedFile) {
            const formData = new FormData();
            formData.append("file", selectedFile);
            try {
                const uploadRes = await fetch("http://127.0.0.1:8000/upload-image", {
                    method: "POST",
                    body: formData
                });
                const uploadData = await uploadRes.json();
                finalAvatarUrl = uploadData.url;
            } catch (err) {
                alert("Lỗi khi tải ảnh lên!");
                return;
            }
        }

        const payload = {
            email,
            fullname: fullname || (email ? email.split('@')[0] : 'Sinh viên'),
            birthday: birthday || null,
            major,
            university,
            avatar_url: finalAvatarUrl
        };

        try {
            const res = await fetch("http://127.0.0.1:8000/user/update_profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Cập nhật hồ sơ thành công!");
            } else {
                alert("Có lỗi xảy ra khi lưu hồ sơ.");
            }
        } catch (err) {
            alert("Không thể kết nối tới máy chủ!");
        }
    };

    return (
        <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 20px' }}>
            <div style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                color: 'var(--text-color, #1e293b)'
            }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ⚙️ Thiết lập Hồ sơ Cá nhân & Avatar
                </h2>

                {/* Avatar Preview */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img 
                        src={avatarUrl} 
                        alt="Avatar" 
                        style={{
                            width: '90px',
                            height: '90px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid var(--primary-color, #0d6efd)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }} 
                    />
                </div>

                {/* Preset Avatars */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '10px', opacity: 0.8 }}>
                        Chọn nhanh ảnh đại diện con vật dễ thương:
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        {presetAvatars.map((url, index) => (
                            <img
                                key={index}
                                src={url}
                                alt="Preset"
                                onClick={() => {
                                    setAvatarUrl(url);
                                    setSelectedFile(null);
                                }}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    border: avatarUrl === url ? '3px solid #0d6efd' : '2px solid #ccc',
                                    transform: avatarUrl === url ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                            Hoặc tải lên ảnh cá nhân từ thiết bị:
                        </label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files[0]) {
                                    setSelectedFile(e.target.files[0]);
                                    setAvatarUrl(URL.createObjectURL(e.target.files[0]));
                                }
                            }} 
                            style={{
                                width: '100%', padding: '8px', fontSize: '13px',
                                background: 'var(--bg-gradient, #f8f9fa)',
                                border: '1px solid var(--border-color, #ccc)',
                                borderRadius: '8px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                            Email định danh (Bắt buộc để lưu): <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input 
                            type="email" 
                            placeholder="nhap_email_cua_ban@gmail.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={(e) => fetchProfile(e.target.value)}
                            required 
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color, #ccc)',
                                background: 'transparent', color: 'inherit', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Họ và tên:</label>
                        <input 
                            type="text" 
                            placeholder="Nhập họ và tên của bạn" 
                            value={fullname}
                            onChange={(e) => setFullname(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color, #ccc)',
                                background: 'transparent', color: 'inherit', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Ngày sinh:</label>
                        <input 
                            type="date" 
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color, #ccc)',
                                background: 'transparent', color: 'inherit', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Ngành học:</label>
                        <input 
                            type="text" 
                            placeholder="Ví dụ: Information Technology" 
                            value={major}
                            onChange={(e) => setMajor(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color, #ccc)',
                                background: 'transparent', color: 'inherit', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Trường đại học:</label>
                        <input 
                            type="text" 
                            placeholder="Ví dụ: Van Lang University" 
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color, #ccc)',
                                background: 'transparent', color: 'inherit', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>

                    <button 
                        type="submit" 
                        style={{
                            marginTop: '10px', width: '100%', padding: '12px',
                            background: '#0d6efd', color: 'white', border: 'none',
                            borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer'
                        }}
                    >
                        Lưu thay đổi hồ sơ
                    </button>
                </form>
            </div>
        </div>
    );
}