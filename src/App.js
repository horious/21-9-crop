import React, { useState } from 'react';
import './App.css';
import Upload from './components/Upload';
import CropEditor from './components/CropEditor';

function App() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

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

  return (
    <div className="App">
      {!image ? (
        <Upload onImageLoad={handleImageLoad} />
      ) : (
        <CropEditor image={image} onComplete={handleComplete} />
      )}
    </div>
  );
}

export default App;

