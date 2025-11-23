import React, { useState, useEffect } from 'react';
import './App.css';
import Upload from './components/Upload';
import CropEditor from './components/CropEditor';

function App() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  const handleImageLoad = (file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setImageUrl(url);
    };
    img.src = url;
  };

  const handleComplete = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImage(null);
    setImageUrl(null);
  };

  // PWA 설치 프롬프트 감지
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 이미 설치되어 있는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="App">
      {!image ? (
        <Upload
          onImageLoad={handleImageLoad}
          showInstallButton={showInstallButton}
          onInstallClick={handleInstallClick}
        />
      ) : (
        <CropEditor image={image} onComplete={handleComplete} />
      )}
    </div>
  );
}

export default App;

