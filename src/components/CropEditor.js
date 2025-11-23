import React, { useRef, useEffect, useState, useCallback } from 'react';
import './CropEditor.css';

const CROP_RATIO = 21 / 9;

function CropEditor({ image, onComplete }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState(null);
  const [lastPinchDistance, setLastPinchDistance] = useState(null);

  const [cropArea, setCropArea] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // 크롭 영역 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 컨테이너에 맞는 최대 크롭 영역 계산
    let cropWidth = containerWidth * 0.9;
    let cropHeight = cropWidth / CROP_RATIO;

    if (cropHeight > containerHeight * 0.8) {
      cropHeight = containerHeight * 0.8;
      cropWidth = cropHeight * CROP_RATIO;
    }

    setCropArea({ width: cropWidth, height: cropHeight });
  }, []);

  // 이미지가 크롭 영역을 완전히 덮도록 초기 변환 계산 (최초 로딩 시에만)
  useEffect(() => {
    if (!image || cropArea.width === 0 || isInitialized) return;

    const imgWidth = image.width;
    const imgHeight = image.height;

    // 크롭 영역을 완전히 덮는 최소 스케일 계산
    const scaleX = cropArea.width / imgWidth;
    const scaleY = cropArea.height / imgHeight;
    const minScale = Math.max(scaleX, scaleY);

    setTransform({
      x: 0,
      y: 0,
      scale: minScale,
      rotation: 0
    });
    setIsInitialized(true);
  }, [image, cropArea, isInitialized]);

  // 변환 제약 적용
  const constrainTransform = useCallback((newTransform) => {
    if (!image || cropArea.width === 0) return newTransform;

    const rotation = newTransform.rotation % 360;
    const isRotated = rotation === 90 || rotation === 270;

    const imgWidth = isRotated ? image.height : image.width;
    const imgHeight = isRotated ? image.width : image.height;

    // 최소 스케일 (크롭 영역을 완전히 덮도록)
    const scaleX = cropArea.width / imgWidth;
    const scaleY = cropArea.height / imgHeight;
    const minScale = Math.max(scaleX, scaleY);

    const constrainedScale = Math.max(newTransform.scale, minScale);

    // 스케일된 이미지 크기
    const scaledWidth = imgWidth * constrainedScale;
    const scaledHeight = imgHeight * constrainedScale;

    // 이동 제약 (크롭 영역에 공백이 생기지 않도록)
    const maxX = (scaledWidth - cropArea.width) / 2;
    const maxY = (scaledHeight - cropArea.height) / 2;

    const constrainedX = Math.max(-maxX, Math.min(maxX, newTransform.x));
    const constrainedY = Math.max(-maxY, Math.min(maxY, newTransform.y));

    return {
      ...newTransform,
      scale: constrainedScale,
      x: constrainedX,
      y: constrainedY
    };
  }, [image, cropArea]);

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !image || cropArea.width === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 캔버스를 컨테이너 크기에 맞게 설정 (화면에 꽉 차게)
    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.scale(dpr, dpr);

    // 배경을 어둡게
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 이미지 그리기
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.translate(transform.x, transform.y);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);

    ctx.drawImage(
      image,
      -image.width / 2,
      -image.height / 2,
      image.width,
      image.height
    );

    ctx.restore();

  }, [image, transform, cropArea]);

  // 마우스/터치 드래그
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);

    if (e.touches && e.touches.length === 1) {
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (!e.touches) {
      setLastTouch({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !lastTouch) return;

    // 핀치 줌 처리
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastPinchDistance) {
        const delta = distance - lastPinchDistance;
        const scaleDelta = delta * 0.01;

        setTransform(prev => constrainTransform({
          ...prev,
          scale: prev.scale + scaleDelta
        }));
      }

      setLastPinchDistance(distance);
      return;
    }

    // 드래그 처리
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = currentX - lastTouch.x;
    const deltaY = currentY - lastTouch.y;

    setTransform(prev => constrainTransform({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastTouch({ x: currentX, y: currentY });
  }, [isDragging, lastTouch, lastPinchDistance, constrainTransform]);

  const handlePointerUp = () => {
    setIsDragging(false);
    setLastTouch(null);
    setLastPinchDistance(null);
  };

  // 마우스 휠 줌
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;

    setTransform(prev => constrainTransform({
      ...prev,
      scale: prev.scale + delta
    }));
  }, [constrainTransform]);

  // 이벤트 리스너 등록
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('touchend', handlePointerUp);
    };
  }, [handleWheel, handlePointerMove]);

  // 회전
  const handleRotate = () => {
    setTransform(prev => {
      const newRotation = (prev.rotation + 90) % 360;
      const isRotated = newRotation === 90 || newRotation === 270;

      const imgWidth = isRotated ? image.height : image.width;
      const imgHeight = isRotated ? image.width : image.height;

      // 크롭 영역을 완전히 덮는 최소 스케일 계산
      const scaleX = cropArea.width / imgWidth;
      const scaleY = cropArea.height / imgHeight;
      const minScale = Math.max(scaleX, scaleY);

      return {
        x: 0,
        y: 0,
        scale: minScale,
        rotation: newRotation
      };
    });
  };

  // 다운로드
  const handleDownload = () => {
    const outputCanvas = document.createElement('canvas');
    // 고정 해상도: 1920 x 720
    outputCanvas.width = 1920;
    outputCanvas.height = 720;
    const ctx = outputCanvas.getContext('2d');

    // 크롭 영역의 비율로 스케일 계산
    const scaleX = 1920 / cropArea.width;
    const scaleY = 720 / cropArea.height;

    ctx.save();
    ctx.translate(960, 360); // 1920/2, 720/2
    ctx.translate(transform.x * scaleX, transform.y * scaleY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale * scaleX, transform.scale * scaleY);

    ctx.drawImage(
      image,
      -image.width / 2,
      -image.height / 2,
      image.width,
      image.height
    );

    ctx.restore();

    outputCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cropped_21-9_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onComplete();
    });
  };

  return (
    <div className="crop-editor" ref={containerRef}>
      <div className="crop-canvas-container">
        <canvas
          ref={canvasRef}
          className="crop-canvas"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        />
        <div className="crop-frame" style={{
          width: `${cropArea.width}px`,
          height: `${cropArea.height}px`
        }}>
          <div className="crop-corner crop-corner-tl"></div>
          <div className="crop-corner crop-corner-tr"></div>
          <div className="crop-corner crop-corner-bl"></div>
          <div className="crop-corner crop-corner-br"></div>
        </div>
      </div>

      <div className="crop-controls">
        <button className="control-button cancel-button" onClick={onComplete} title="취소">
          ✕
        </button>
        <button className="control-button rotate-button" onClick={handleRotate} title="회전">
          🔄
        </button>
        <button className="control-button download-button" onClick={handleDownload} title="다운로드">
          💾
        </button>
      </div>
    </div>
  );
}

export default CropEditor;

