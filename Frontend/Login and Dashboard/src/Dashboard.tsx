import flameLogo from 'figma:asset/3344e03614b21096291d073a6ee63d1e56914473.png';
import { useState } from 'react';

interface DashboardProps {
  userName: string;
}

export default function Dashboard({ userName }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'enlistment' | 'registration'>('dashboard');

  // Generate PLM email from username
  const generatePLMEmail = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 0) return 'student2023@plm.edu.ph';

    const surname = names[names.length - 1].toLowerCase();
    const firstAndMiddleNames = names.slice(0, -1);
    const initials = firstAndMiddleNames.map(name => name.charAt(0).toLowerCase()).join('');

    return `${initials}${surname}2023@plm.edu.ph`;
  };

  // Generate random student number
  const generateStudentNumber = (): string => {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `2023-${randomDigits}`;
  };

  // Generate random status (Regular or Irregular)
  const generateStudentStatus = (): 'Regular' | 'Irregular' => {
    return Math.random() > 0.4 ? 'Regular' : 'Irregular';
  };

  // Generate believable GWA based on status
  const generateGWA = (status: 'Regular' | 'Irregular'): string => {
    let gwa: number;
    if (status === 'Regular') {
      // Regular students: 1.00 - 2.50 (better grades)
      gwa = 1.0 + Math.random() * 1.5;
    } else {
      // Irregular students: 2.50 - 3.50 (lower grades)
      gwa = 2.5 + Math.random() * 1.0;
    }
    return gwa.toFixed(2);
  };

  const plmEmail = generatePLMEmail(userName);
  const studentNumber = generateStudentNumber();
  const studentStatus = generateStudentStatus();
  const overallGWA = generateGWA(studentStatus);

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
          background-color: #f5f5f5;
        }

        .dashboard-container {
          min-height: 100vh;
          width: 100%;
        }

        .header {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo {
          width: 3.5rem;
          height: 3.5rem;
        }

        .university-name {
          display: flex;
          flex-direction: column;
        }

        .university-name-main {
          color: #1f2937;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.2;
        }

        .university-name-sub {
          color: #6b7280;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.2;
        }

        .nav-menu {
          display: flex;
          gap: 2.5rem;
          align-items: center;
        }

        .nav-link {
          color: #6b7280;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: #4f46e5;
        }

        .nav-link.active {
          color: #4f46e5;
        }

        .main-content {
          padding: 3rem;
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          max-width: 1440px;
          margin: 0 auto;
        }

        .section {
          display: flex;
          flex-direction: column;
        }

        .section-title {
          color: #4f46e5;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 3px solid #4f46e5;
          width: fit-content;
        }

        .card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-top: 1rem;
        }

        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 2rem;
          position: relative;
        }

        .info-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          row-gap: 1.5rem;
        }

        .info-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .info-label {
          color: #9ca3af;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .info-value {
          color: #6b7280;
          font-size: 14px;
          font-weight: 600;
        }

        .info-value.name {
          color: #6b7280;
          font-size: 15px;
          font-weight: 700;
        }

        .info-value.program-title {
          color: #6b7280;
          font-size: 14px;
          font-weight: 700;
        }

        .info-group.full-width {
          grid-column: 1 / -1;
        }

        .info-row-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          grid-column: 1 / -1;
        }

        .info-row-2 {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1.25rem;
          grid-column: 1 / -1;
        }

        .enrollment-highlight {
          color: #4f46e5;
          font-weight: 700;
        }

        .student-photo {
          width: 160px;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          background-color: #e5e7eb;
          align-self: start;
        }

        .student-photo-placeholder {
          width: 160px;
          height: 200px;
          border-radius: 8px;
          background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
          align-self: start;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .student-photo-placeholder::before {
          content: '';
          position: absolute;
          width: 60px;
          height: 60px;
          background-color: #6b7280;
          border-radius: 50%;
          top: 45px;
          z-index: 1;
        }

        .student-photo-placeholder::after {
          content: '';
          position: absolute;
          width: 120px;
          height: 120px;
          background-color: #6b7280;
          border-radius: 50%;
          top: 110px;
        }

        /* Graduation cap */
        .graduation-cap {
          position: absolute;
          top: 25px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2;
        }

        .cap-top {
          width: 80px;
          height: 4px;
          background-color: #374151;
          border-radius: 1px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .cap-base {
          width: 50px;
          height: 12px;
          background-color: #374151;
          border-radius: 2px;
          margin: 0 auto;
          margin-top: -1px;
        }

        .cap-tassel {
          width: 2px;
          height: 20px;
          background-color: #fbbf24;
          position: absolute;
          right: 5px;
          top: 0;
        }

        .cap-tassel::after {
          content: '';
          width: 6px;
          height: 6px;
          background-color: #fbbf24;
          border-radius: 50%;
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
        }

        .progress-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .progress-percentage {
          color: #4f46e5;
          font-size: 64px;
          font-weight: 700;
          line-height: 1;
        }

        .progress-description {
          color: #6b7280;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.4;
        }

        .progress-stats {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-value {
          color: #1f2937;
          font-size: 28px;
          font-weight: 700;
        }

        .stat-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 500;
        }
      `}} />

      <div className="dashboard-container">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <img src={flameLogo} alt="PLM Logo" className="logo" />
            <div className="university-name">
              <div className="university-name-main">Pamantasan ng Lungsod ng Maynila</div>
              <div className="university-name-sub">University of the City of Manila</div>
            </div>
          </div>
          <nav className="nav-menu">
            <a href="#" className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</a>
            <a href="#" className={`nav-link ${activeTab === 'enlistment' ? 'active' : ''}`} onClick={() => setActiveTab('enlistment')}>Subject Enlistment</a>
            <a href="#" className={`nav-link ${activeTab === 'registration' ? 'active' : ''}`} onClick={() => setActiveTab('registration')}>Registration Form</a>
          </nav>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {/* Student Information Section */}
          <div className="section">
            <h2 className="section-title">Student Information</h2>
            <div className="card">
              <div className="student-info-grid">
                <div className="info-content">
                  <div className="info-group">
                    <div className="info-value name">{userName}</div>
                    <div className="info-label">Student Name</div>
                  </div>

                  <div className="info-group">
                    <div className="info-value program-title">BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY</div>
                    <div className="info-label">Program</div>
                  </div>

                  <div className="info-group">
                    <div className="info-value">COLLEGE OF INFORMATION SYSTEMS AND TECHNOLOGY MANAGEMENT</div>
                    <div className="info-label">Program</div>
                  </div>

                  <div className="info-row-3">
                    <div className="info-group">
                      <div className="info-value">{studentNumber}</div>
                      <div className="info-label">Student Number</div>
                    </div>
                    <div className="info-group">
                      <div className="info-value">{plmEmail}</div>
                      <div className="info-label">PLM Email</div>
                    </div>
                  </div>

                  <div className="info-row-3">
                    <div className="info-group">
                      <div className="info-value">{studentStatus}</div>
                      <div className="info-label">Status</div>
                    </div>
                    <div className="info-group">
                      <div className="info-value">Third Year</div>
                      <div className="info-label">Year Level</div>
                    </div>
                    <div className="info-group">
                      <div className="info-value">First Semester</div>
                      <div className="info-label">Semester</div>
                    </div>
                  </div>

                  <div className="info-row-2">
                    <div className="info-group">
                      <div className="info-value">BSIT 3-1</div>
                      <div className="info-label">Section</div>
                    </div>

                    <div className="info-group">
                      <div className="info-value"><span className="enrollment-highlight">ENROLLED</span> for School Year 2025-2026 First Semester</div>
                      <div className="info-label">Enrollment Status</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="student-photo-placeholder">
                    <div className="graduation-cap">
                      <div className="cap-top"></div>
                      <div className="cap-base"></div>
                      <div className="cap-tassel"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Student Progress Section */}
          <div className="section">
            <h2 className="section-title">Overall Student Progress</h2>
            <div className="card progress-card">
              <div>
                <div className="progress-percentage">60%</div>
                <p className="progress-description">
                  You've completed 60% of your classes' overall assigned curriculum.
                </p>
              </div>

              <div className="progress-stats">
                <div className="stat-item">
                  <div className="stat-value">{overallGWA}</div>
                  <div className="stat-label">Overall GWA</div>
                </div>

                <div className="stat-item">
                  <div className="stat-value">117</div>
                  <div className="stat-label">Actual Total Units Earned</div>
                </div>

                <div className="stat-item">
                  <div className="stat-value">111</div>
                  <div className="stat-label">Academic Units</div>
                </div>

                <div className="stat-item">
                  <div className="stat-value">6</div>
                  <div className="stat-label">Non-Academic Units</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}