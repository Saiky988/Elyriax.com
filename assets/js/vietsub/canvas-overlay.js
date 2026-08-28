/**
 * Elyriax Video & Vietsub Studio - Canvas & Interactive Overlay Engine
 * Quản lý Bounding Box kéo thả/co giãn 8 điểm neo che sub gốc và Live Subtitle Overlay
 */

const CanvasOverlay = (function () {
  let videoWrapper = null;
  let videoEl = null;
  let blurBox = null;
  let subOverlay = null;
  let watermarkOverlay = null;

  // Trạng thái tương tác
  let isDraggingBlur = false;
  let isResizingBlur = false;
  let activeResizeHandle = null;
  let isDraggingSub = false;

  let startPointer = { x: 0, y: 0 };
  let startBlurRect = { x: 0, y: 0, width: 0, height: 0 }; // tính bằng pixel
  let startSubPos = { x: 0, y: 0 };

  // Callbacks
  let onBlurConfigChange = null;
  let onSubPositionChange = null;

  /**
   * Khởi tạo các phần tử overlay
   */
  function init(options = {}) {
    videoWrapper = document.getElementById('video-wrapper');
    videoEl = document.getElementById('main-video');
    blurBox = document.getElementById('blur-bounding-box');
    subOverlay = document.getElementById('subtitle-live-overlay');
    watermarkOverlay = document.getElementById('watermark-live-overlay');

    onBlurConfigChange = options.onBlurChange || null;
    onSubPositionChange = options.onSubPositionChange || null;

    if (!videoWrapper || !blurBox) return;

    setupBlurInteractions();
    setupSubtitleInteractions();
    setupResizeObserver();
  }

  /**
   * Thiết lập tương tác kéo thả & co giãn 8 điểm cho Blur Box
   */
  function setupBlurInteractions() {
    // 1. Kéo di chuyển toàn bộ Blur Box
    blurBox.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('resize-handle')) return; // để handle xử lý riêng
      e.preventDefault();
      e.stopPropagation();

      isDraggingBlur = true;
      blurBox.classList.add('active');
      startPointer = { x: e.clientX, y: e.clientY };

      const wrapperRect = videoWrapper.getBoundingClientRect();
      const boxRect = blurBox.getBoundingClientRect();

      startBlurRect = {
        x: boxRect.left - wrapperRect.left,
        y: boxRect.top - wrapperRect.top,
        width: boxRect.width,
        height: boxRect.height
      };

      window.addEventListener('pointermove', onBlurPointerMove);
      window.addEventListener('pointerup', onBlurPointerUp);
    });

    // 2. Co giãn từ 8 điểm neo
    const handles = blurBox.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizingBlur = true;
        activeResizeHandle = handle.dataset.handle;
        blurBox.classList.add('active');
        startPointer = { x: e.clientX, y: e.clientY };

        const wrapperRect = videoWrapper.getBoundingClientRect();
        const boxRect = blurBox.getBoundingClientRect();

        startBlurRect = {
          x: boxRect.left - wrapperRect.left,
          y: boxRect.top - wrapperRect.top,
          width: boxRect.width,
          height: boxRect.height
        };

        window.addEventListener('pointermove', onBlurPointerMove);
        window.addEventListener('pointerup', onBlurPointerUp);
      });
    });
  }

  function onBlurPointerMove(e) {
    if (!videoWrapper) return;
    const wrapperRect = videoWrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return;

    const dx = e.clientX - startPointer.x;
    const dy = e.clientY - startPointer.y;

    if (isDraggingBlur) {
      let newX = startBlurRect.x + dx;
      let newY = startBlurRect.y + dy;

      // Giới hạn trong khung video
      newX = Math.max(0, Math.min(newX, wrapperRect.width - startBlurRect.width));
      newY = Math.max(0, Math.min(newY, wrapperRect.height - startBlurRect.height));

      // Quy đổi sang phần trăm %
      const percentX = (newX / wrapperRect.width) * 100;
      const percentY = (newY / wrapperRect.height) * 100;

      updateBlurPositionDOM(percentX, percentY);

      if (onBlurConfigChange) {
        onBlurConfigChange({
          x: Math.round(percentX * 10) / 10,
          y: Math.round(percentY * 10) / 10
        });
      }
    } else if (isResizingBlur && activeResizeHandle) {
      let { x, y, width, height } = startBlurRect;
      const minW = 20;
      const minH = 15;

      switch (activeResizeHandle) {
        case 'se':
          width = Math.max(minW, Math.min(startBlurRect.width + dx, wrapperRect.width - x));
          height = Math.max(minH, Math.min(startBlurRect.height + dy, wrapperRect.height - y));
          break;
        case 's':
          height = Math.max(minH, Math.min(startBlurRect.height + dy, wrapperRect.height - y));
          break;
        case 'e':
          width = Math.max(minW, Math.min(startBlurRect.width + dx, wrapperRect.width - x));
          break;
        case 'nw':
          const proposedX = Math.max(0, Math.min(startBlurRect.x + dx, startBlurRect.x + startBlurRect.width - minW));
          const proposedY = Math.max(0, Math.min(startBlurRect.y + dy, startBlurRect.y + startBlurRect.height - minH));
          width = startBlurRect.width + (startBlurRect.x - proposedX);
          height = startBlurRect.height + (startBlurRect.y - proposedY);
          x = proposedX;
          y = proposedY;
          break;
        case 'n':
          const pY = Math.max(0, Math.min(startBlurRect.y + dy, startBlurRect.y + startBlurRect.height - minH));
          height = startBlurRect.height + (startBlurRect.y - pY);
          y = pY;
          break;
        case 'w':
          const pX = Math.max(0, Math.min(startBlurRect.x + dx, startBlurRect.x + startBlurRect.width - minW));
          width = startBlurRect.width + (startBlurRect.x - pX);
          x = pX;
          break;
        case 'ne':
          const pY_ne = Math.max(0, Math.min(startBlurRect.y + dy, startBlurRect.y + startBlurRect.height - minH));
          height = startBlurRect.height + (startBlurRect.y - pY_ne);
          y = pY_ne;
          width = Math.max(minW, Math.min(startBlurRect.width + dx, wrapperRect.width - x));
          break;
        case 'sw':
          const pX_sw = Math.max(0, Math.min(startBlurRect.x + dx, startBlurRect.x + startBlurRect.width - minW));
          width = startBlurRect.width + (startBlurRect.x - pX_sw);
          x = pX_sw;
          height = Math.max(minH, Math.min(startBlurRect.height + dy, wrapperRect.height - y));
          break;
      }

      // Đổi sang %
      const percentX = (x / wrapperRect.width) * 100;
      const percentY = (y / wrapperRect.height) * 100;
      const percentW = (width / wrapperRect.width) * 100;
      const percentH = (height / wrapperRect.height) * 100;

      updateBlurBoxDOM(percentX, percentY, percentW, percentH);

      if (onBlurConfigChange) {
        onBlurConfigChange({
          x: Math.round(percentX * 10) / 10,
          y: Math.round(percentY * 10) / 10,
          width: Math.round(percentW * 10) / 10,
          height: Math.round(percentH * 10) / 10
        });
      }
    }
  }

  function onBlurPointerUp() {
    isDraggingBlur = false;
    isResizingBlur = false;
    activeResizeHandle = null;
    if (blurBox) blurBox.classList.remove('active');
    window.removeEventListener('pointermove', onBlurPointerMove);
    window.removeEventListener('pointerup', onBlurPointerUp);
  }

  /**
   * Thiết lập kéo thả Live Subtitle
   */
  function setupSubtitleInteractions() {
    if (!subOverlay) return;

    subOverlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      isDraggingSub = true;
      subOverlay.classList.add('dragging');
      startPointer = { x: e.clientX, y: e.clientY };

      const wrapperRect = videoWrapper.getBoundingClientRect();
      const subRect = subOverlay.getBoundingClientRect();

      // Điểm tâm phụ đề
      const subCenterX = subRect.left + subRect.width / 2 - wrapperRect.left;
      const subCenterY = subRect.top + subRect.height / 2 - wrapperRect.top;

      startSubPos = { x: subCenterX, y: subCenterY };

      window.addEventListener('pointermove', onSubPointerMove);
      window.addEventListener('pointerup', onSubPointerUp);
    });
  }

  function onSubPointerMove(e) {
    if (!isDraggingSub || !videoWrapper || !subOverlay) return;
    const wrapperRect = videoWrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return;

    const dx = e.clientX - startPointer.x;
    const dy = e.clientY - startPointer.y;

    let newCenterX = startSubPos.x + dx;
    let newCenterY = startSubPos.y + dy;

    // Giới hạn trong video
    newCenterX = Math.max(20, Math.min(newCenterX, wrapperRect.width - 20));
    newCenterY = Math.max(20, Math.min(newCenterY, wrapperRect.height - 20));

    const percentX = (newCenterX / wrapperRect.width) * 100;
    const percentY = (newCenterY / wrapperRect.height) * 100;

    updateSubPositionDOM(percentX, percentY);

    if (onSubPositionChange) {
      onSubPositionChange({
        x: Math.round(percentX * 10) / 10,
        y: Math.round(percentY * 10) / 10
      });
    }
  }

  function onSubPointerUp() {
    isDraggingSub = false;
    if (subOverlay) subOverlay.classList.remove('dragging');
    window.removeEventListener('pointermove', onSubPointerMove);
    window.removeEventListener('pointerup', onSubPointerUp);
  }

  function setupResizeObserver() {
    if (!videoWrapper || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      // Khi kích thước player thay đổi, giữ nguyên vị trí %
    });
    ro.observe(videoWrapper);
  }

  /* ========================================================================
     CÁC HÀM ĐỒNG BỘ GIAO DIỆN TỪ STATE CONFIG
     ======================================================================== */

  function updateBlurBoxDOM(x, y, w, h) {
    if (!blurBox) return;
    blurBox.style.left = `${x}%`;
    blurBox.style.top = `${y}%`;
    blurBox.style.width = `${w}%`;
    blurBox.style.height = `${h}%`;
  }

  function updateBlurPositionDOM(x, y) {
    if (!blurBox) return;
    blurBox.style.left = `${x}%`;
    blurBox.style.top = `${y}%`;
  }

  /**
   * Áp dụng toàn bộ blurConfig lên Blur Bounding Box
   */
  function renderBlur(config) {
    if (!blurBox || !config) return;
    const { enabled, x, y, width, height, strength, borderRadius, liquidGlass, lightDiffusion } = config;

    if (!enabled) {
      blurBox.classList.add('disabled');
      return;
    }

    blurBox.classList.remove('disabled');
    updateBlurBoxDOM(x, y, width, height);

    // Bo góc
    blurBox.style.borderRadius = `${borderRadius || 0}px`;

    // Độ mờ kính
    const blurPx = Math.max(2, (strength || 3.5) * 3.2);
    blurBox.style.backdropFilter = `blur(${blurPx}px)`;
    blurBox.style.webkitBackdropFilter = `blur(${blurPx}px)`;

    // Liquid glass effect
    if (liquidGlass) {
      blurBox.classList.add('liquid-glass-fx');
    } else {
      blurBox.classList.remove('liquid-glass-fx');
    }

    // Light diffusion simulation (tăng độ sáng nhẹ)
    const diffAlpha = Math.min(0.25, (lightDiffusion || 0.03) * 3);
    blurBox.style.backgroundColor = `rgba(255, 255, 255, ${diffAlpha})`;
  }

  function updateSubPositionDOM(x, y) {
    if (!subOverlay) return;
    subOverlay.style.left = `${x}%`;
    subOverlay.style.top = `${y}%`;
  }

  /**
   * Áp dụng subConfig và text câu phụ đề hiện tại lên Subtitle Overlay
   */
  function renderSubtitle(subConfig, activeSegmentText) {
    if (!subOverlay) return;
    if (!activeSegmentText || activeSegmentText.trim() === '') {
      subOverlay.style.opacity = '0';
      return;
    }

    subOverlay.style.opacity = '1';
    const textEl = subOverlay.querySelector('.sub-text');
    if (textEl) {
      textEl.textContent = activeSegmentText;
    }

    if (!subConfig) return;
    const { font, fontSize, position, outline, shadow, weight, color, fadeInOut } = subConfig;

    if (position) {
      updateSubPositionDOM(position.x, position.y);
    }

    // Tính kích cỡ font tương đối theo viewport player
    const scaleFactor = videoWrapper ? (videoWrapper.clientHeight / 640) : 1;
    const computedFontSize = Math.max(12, Math.round((fontSize || 16) * scaleFactor));

    subOverlay.style.fontFamily = font || 'Inter, sans-serif';
    subOverlay.style.fontSize = `${computedFontSize}px`;
    subOverlay.style.fontWeight = weight || 700;
    subOverlay.style.color = color || '#ffffff';

    // Outline & Shadow
    const outlinePx = outline || 1.5;
    const shadowPx = shadow || 1.0;
    
    let textShadowStyle = '';
    if (outlinePx > 0) {
      textShadowStyle = `
        -${outlinePx}px -${outlinePx}px 0 #000,
         ${outlinePx}px -${outlinePx}px 0 #000,
        -${outlinePx}px  ${outlinePx}px 0 #000,
         ${outlinePx}px  ${outlinePx}px 0 #000,
         0 0 ${shadowPx * 3}px rgba(0,0,0,0.9)
      `;
    } else {
      textShadowStyle = `0 2px ${shadowPx * 4}px rgba(0,0,0,0.85)`;
    }
    subOverlay.style.textShadow = textShadowStyle;

    // Transition mờ dần
    if (fadeInOut) {
      subOverlay.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out';
    } else {
      subOverlay.style.transition = 'none';
    }
  }

  /**
   * Áp dụng logoConfig & ảnh logo lên Watermark Overlay
   */
  function renderWatermark(logoConfig, logoUrl) {
    if (!watermarkOverlay) return;
    if (!logoConfig?.enabled || !logoUrl) {
      watermarkOverlay.style.display = 'none';
      return;
    }

    watermarkOverlay.style.display = 'block';
    const imgEl = watermarkOverlay.querySelector('img');
    if (imgEl && imgEl.src !== logoUrl) {
      imgEl.src = logoUrl;
    }

    const { position, size, opacity, margin } = logoConfig;
    watermarkOverlay.style.width = `${size || 8}%`;
    watermarkOverlay.style.opacity = (opacity || 100) / 100;

    // Reset vị trí
    watermarkOverlay.style.top = 'auto';
    watermarkOverlay.style.bottom = 'auto';
    watermarkOverlay.style.left = 'auto';
    watermarkOverlay.style.right = 'auto';

    const m = `${margin || 20}px`;
    switch (position) {
      case 'top-left':
        watermarkOverlay.style.top = m;
        watermarkOverlay.style.left = m;
        break;
      case 'top-right':
        watermarkOverlay.style.top = m;
        watermarkOverlay.style.right = m;
        break;
      case 'bottom-left':
        watermarkOverlay.style.bottom = m;
        watermarkOverlay.style.left = m;
        break;
      case 'bottom-right':
      default:
        watermarkOverlay.style.bottom = m;
        watermarkOverlay.style.right = m;
        break;
    }
  }

  return {
    init,
    renderBlur,
    renderSubtitle,
    renderWatermark,
    updateBlurBoxDOM,
    updateSubPositionDOM
  };
})();

if (typeof window !== 'undefined') {
  window.CanvasOverlay = CanvasOverlay;
}

