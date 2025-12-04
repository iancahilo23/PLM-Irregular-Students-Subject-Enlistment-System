import backgroundImage from 'figma:asset/821902c32b8e564efa0f24453c46b99ac6c53ab7.png';
import flameLogo from 'figma:asset/33030359ab37069bb527a333b326c627af401eb5.png';
import { useState } from 'react';

interface LoginProps {
  onLogin: (name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    birthdate: ''
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const birthdate = formData.get('birthdate') as string;
    
    // Reset errors
    const newErrors = {
      username: '',
      password: '',
      birthdate: ''
    };

    // Validation: Check if all fields are filled
    let hasError = false;
    
    if (!username || username.trim() === '') {
      newErrors.username = 'Please input username';
      hasError = true;
    }
    
    if (!password || password.trim() === '') {
      newErrors.password = 'Please input password';
      hasError = true;
    }
    
    if (!birthdate) {
      newErrors.birthdate = 'Please input birthdate';
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      return;
    }
    
    console.log('Login attempt:', {
      username: username,
      password: password,
      birthdate: birthdate,
      rememberMe: formData.get('rememberMe')
    });
    
    // Pass the username to parent and navigate to dashboard
    onLogin(username);
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInnerHTML={{__html: `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          overflow: hidden;
        }

        .container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .background-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, #3339a1, #9fb206);
        }

        .background-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.15;
          mix-blend-mode: overlay;
        }

        .top-branding {
          position: absolute;
          top: 2rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          z-index: 10;
        }

        .flame-icon {
          width: 4rem;
          height: 4rem;
          flex-shrink: 0;
        }

        .divider {
          width: 1.5px;
          height: 4rem;
          background-color: rgba(255, 255, 255, 0.8);
        }

        .branding-text {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .branding-text-main {
          color: white;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }

        .branding-text-sub {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.3;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: white;
          border-radius: 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          padding: 2.25rem 2.75rem;
          margin-top: 8rem;
        }

        .login-title {
          text-align: center;
          color: #3E4399;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 1.75rem;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
        }

        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot-password {
          color: #3E4399;
          font-size: 13px;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .forgot-password:hover {
          text-decoration: underline;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: #E8E8E8;
          border-radius: 0.5rem;
          border: none;
          outline: none;
          font-size: 15px;
          font-weight: 400;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s;
        }

        .form-input:focus {
          box-shadow: 0 0 0 2px rgba(62, 67, 153, 0.2);
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-top: 0.25rem;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          border-radius: 0.125rem;
          border: 2px solid #d1d5db;
          cursor: pointer;
          accent-color: #3E4399;
        }

        .checkbox-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
        }

        .login-button {
          width: 100%;
          margin-top: 0.75rem;
          padding: 0.875rem;
          background-color: #3E4399;
          color: white;
          border-radius: 14px;
          border: none;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background-color 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .login-button:hover {
          background-color: rgba(62, 67, 153, 0.9);
        }
      `}} />

      <div className="container">
        {/* Background gradient and image overlay */}
        <div className="background-gradient"></div>
        <div className="background-image" style={{ backgroundImage: `url(${backgroundImage})` }}></div>

        {/* Top Branding */}
        <div className="top-branding">
          <img 
            src={flameLogo} 
            alt="PLM Flame Logo" 
            className="flame-icon"
          />
          <div className="divider"></div>
          <div className="branding-text">
            <div className="branding-text-main">Pamantasan ng Lungsod ng Maynila</div>
            <div className="branding-text-sub">University of the City of Manila</div>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <h1 className="login-title">Main Campus</h1>

          <form className="form" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-input"
              />
              {errors.username && <div style={{ color: 'red', fontSize: '12px' }}>{errors.username}</div>}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="password">Password</label>
                <button type="button" className="forgot-password" onClick={() => alert('Forgot password functionality would be implemented here')}>
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
              />
              {errors.password && <div style={{ color: 'red', fontSize: '12px' }}>{errors.password}</div>}
            </div>

            {/* Birthdate Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="birthdate">Birthdate</label>
              <input
                type="date"
                id="birthdate"
                name="birthdate"
                className="form-input"
              />
              {errors.birthdate && <div style={{ color: 'red', fontSize: '12px' }}>{errors.birthdate}</div>}
            </div>

            {/* Remember Me Checkbox */}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                className="checkbox"
              />
              <label htmlFor="rememberMe" className="checkbox-label">Remember Me</label>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-button">Login</button>
          </form>
        </div>
      </div>
    </>
  );
}