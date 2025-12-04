import { useEffect } from 'react';
import flameLogo from 'figma:asset/33030359ab37069bb527a333b326c627af401eb5.png';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // Show splash screen for 3 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

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
          overflow: hidden;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .splash-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #9fb206 0%, #6b8a3d 25%, #4a6b6f 50%, #3e5a8e 75%, #3339a1 100%);
        }

        .splash-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.1) 100%);
        }

        .flame-logo {
          position: relative;
          z-index: 10;
          width: 200px;
          height: 200px;
          animation: fadeIn 0.8s ease-out, pulse 2s ease-in-out infinite;
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3));
        }
      `}} />

      <div className="splash-container">
        <div className="splash-overlay"></div>
        <img src={flameLogo} alt="PLM Logo" className="flame-logo" />
      </div>
    </>
  );
}
