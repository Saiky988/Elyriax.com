/**
 * Elyriax Video & Vietsub Studio - Canvas & Interactive Overlay Engine
 * Hỗ trợ chuẩn xác Touch/Pointer Events trên iOS Safari và Android
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

  let activePointerId = null;
  let startPointer = { x: 0, y: 0 };
  let startBlurRect = { x: 0, y: 0, width: 0, height: 0 };
  let startSubPos = { x: 0, y: 0 };

  // Callbacks
  let onBlurConfigChange = null;
  let onSubPositionChange = null;

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

  function getClientPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  /**
   * Tương tác Kéo thả & Co giãn Blur Box
   */
  function setupBlurInteractions() {
    // 1. Kéo di chuyển Blur Box
    blurBox.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.resize-handle')) return;
      e.preventDefault();
      e.stopPropagation();

      activePointerId = e.pointerId;
      try {
        blurBox.setPointerCapture(e.pointerId);
      } catch (err) {}

      isDraggingBlur = true;
      blurBox.classList.add('active');

      const pos = getClientPos(e);
      startPointer = { x: pos.x, y: pos.y };

      const wrapperRect = videoWrapper.getBoundingClientRect();
      const boxRect = blurBox.getBoundingClientRect();

      startBlurRect = {
        x: boxRect.left - wrapperRect.left,
        y: boxRect.top - wrapperRect.top,
        width: boxRect.width,
        height: boxRect.height
      };

      window.addEventListener('pointermove', onBlurPointerMove, { passive: false });
      window.addEventListener('pointerup', onBlurPointerUp);
      window.addEventListener('pointercancel', onBlurPointerUp);
    });

    // 2. Co giãn từ 8 điểm neo
    const handles = blurBox.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        activePointerId = e.pointerId;
        try {
          handle.setPointerCapture(e.pointerId);
        } catch (err) {}

        isResizingBlur = true;
        activeResizeHandle = handle.dataset.handle;
        blurBox.classList.add('active');

        const pos = getClientPos(e);
        startPointer = { x: pos.x, y: pos.y };

        const wrapperRect = videoWrapper.getBoundingClientRect();
        const boxRect = blurBox.getBoundingClientRect();

        startBlurRect = {
          x: boxRect.left - wrapperRect.left,
          y: boxRect.top - wrapperRect.top,
          width: boxRect.width,
          height: boxRect.height
        };

        window.addEventListener('pointermove', onBlurPointerMove, { passive: false });
        window.addEventListener('pointerup', onBlurPointerUp);
        window.addEventListener('pointercancel', onBlurPointerUp);
      });
    });
  }

  function onBlurPointerMove(e) {
    if (!isDraggingBlur && !isResizingBlur) return;
    if (!videoWrapper) return;

    if (e.cancelable) e.preventDefault();

    const wrapperRect = videoWrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return;

    const pos = getClientPos(e);
    const dx = pos.x - startPointer.x;
    const dy = pos.y - startPointer.y;

    if (isDraggingBlur) {
      let newX = startBlurRect.x + dx;
      let newY = startBlurRect.y + dy;

      newX = Math.max(0, Math.min(newX, wrapperRect.width - startBlurRect.width));
      newY = Math.max(0, Math.min(newY, wrapperRect.height - startBlurRect.height));

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
      const minW = 24;
      const minH = 16;

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
        case 'nw': {
          const proposedX = Math.max(0, Math.min(startBlurRect.x + dx, startBlurRect.x + startBlurRect.width - minW));
          const proposedY = Math.max(0, Math.min(startBlurRect.y + dy, startBlurRect.y + startBlurRect.height - minH));
          width = startBlurRect.width + (startBlurRect.x - proposedX);
          height = startBlurRect.height + (startBlurRect.y - proposedY);
          x = proposedX;
          y = proposedY;
          break;
        }
        case 'n': {
          const pY = Math.max(0, Math.min(startBlurRect.y + dy, startBlurRect.y + startBlurRect.height - minH));
          height = startBlurRect.height + (startBlurRect.y - pY);
          y = pY;
          break;
        }
        case 'w': {
          const pX = Math.max(0, Math.min(startBlurRect.x + dx, startBlurRect.x + startBlurRect.width - minW));
          width = startBlurRect.width + (startBlurRect.x - pX);
          x = pX;
          break;
        }
        case 'ne': {
          const pY = Math.max(0, Math.min(startBlurRect.y + dy, startBlurRect.y + startBlurRect.height - minH));
          height = startBlurRect.height + (startBlurRect.y - pY);
          y = pY;
          width = Math.max(minW, Math.min(startBlurRect.width + dx, wrapperRect.width - x));
          break;
        }
        case 'sw': {
          const pX = Math.max(0, Math.min(startBlurRect.x + dx, startBlurRect.x + startBlurRect.width - minW));
          width = startBlurRect.width + (startBlurRect.x - pX);
          x = pX;
          height = Math.max(minH, Math.min(startBlurRect.height + dy, wrapperRect.height - y));
          break;
        }
      }

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

  function onBlurPointerUp(e) {
    isDraggingBlur = false;
    isResizingBlur = false;
    activeResizeHandle = null;

    if (blurBox) blurBox.classList.remove('active');

    if (activePointerId !== null && e && e.target) {
      try {
        e.target.releasePointerCapture(activePointerId);
      } catch (err) {}
      activePointerId = null;
    }

    window.removeEventListener('pointermove', onBlurPointerMove);
    window.removeEventListener('pointerup', onBlurPointerUp);
    window.removeEventListener('pointercancel', onBlurPointerUp);
  }

  /**
   * Tương tác Kéo thả Live Subtitle
   */
  function setupSubtitleInteractions() {
    if (!subOverlay) return;

    subOverlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        subOverlay.setPointerCapture(e.pointerId);
      } catch (err) {}

      isDraggingSub = true;
      subOverlay.classList.add('dragging');

      const pos = getClientPos(e);
      startPointer = { x: pos.x, y: pos.y };

      const wrapperRect = videoWrapper.getBoundingClientRect();
      const subRect = subOverlay.getBoundingClientRect();

      const subCenterX = subRect.left + subRect.width / 2 - wrapperRect.left;
      const subCenterY = subRect.top + subRect.height / 2 - wrapperRect.top;

      startSubPos = { x: subCenterX, y: subCenterY };

      window.addEventListener('pointermove', onSubPointerMove, { passive: false });
      window.addEventListener('pointerup', onSubPointerUp);
      window.addEventListener('pointercancel', onSubPointerUp);
    });
  }

  function onSubPointerMove(e) {
    if (!isDraggingSub || !videoWrapper || !subOverlay) return;
    if (e.cancelable) e.preventDefault();

    const wrapperRect = videoWrapper.getBoundingClientRect();
    if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return;

    const pos = getClientPos(e);
    const dx = pos.x - startPointer.x;
    const dy = pos.y - startPointer.y;

    let newCenterX = startSubPos.x + dx;
    let newCenterY = startSubPos.y + dy;

    newCenterX = Math.max(10, Math.min(newCenterX, wrapperRect.width - 10));
    newCenterY = Math.max(10, Math.min(newCenterY, wrapperRect.height - 10));

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

  function onSubPointerUp(e) {
    isDraggingSub = false;
    if (subOverlay) {
      subOverlay.classList.remove('dragging');
      try {
        if (e && e.pointerId) subOverlay.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    window.removeEventListener('pointermove', onSubPointerMove);
    window.removeEventListener('pointerup', onSubPointerUp);
    window.removeEventListener('pointercancel', onSubPointerUp);
  }

  function setupResizeObserver() {
    if (!videoWrapper || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {});
    ro.observe(videoWrapper);
  }

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

  function renderBlur(config) {
    if (!blurBox || !config) return;
    const { enabled, x, y, width, height, strength, borderRadius, liquidGlass, lightDiffusion } = config;

    if (!enabled) {
      blurBox.classList.add('disabled');
      return;
    }

    blurBox.classList.remove('disabled');
    updateBlurBoxDOM(x, y, width, height);

    blurBox.style.borderRadius = `${borderRadius || 0}px`;
    const blurPx = Math.max(2, (strength || 3.5) * 3.2);
    blurBox.style.backdropFilter = `blur(${blurPx}px)`;
    blurBox.style.webkitBackdropFilter = `blur(${blurPx}px)`;

    if (liquidGlass) {
      blurBox.classList.add('liquid-glass-fx');
    } else {
      blurBox.classList.remove('liquid-glass-fx');
    }

    const diffAlpha = Math.min(0.25, (lightDiffusion || 0.03) * 3);
    blurBox.style.backgroundColor = `rgba(255, 255, 255, ${diffAlpha})`;
  }

  function updateSubPositionDOM(x, y) {
    if (!subOverlay) return;
    subOverlay.style.left = `${x}%`;
    subOverlay.style.top = `${y}%`;
  }

  function renderSubtitle(subConfig, activeSegmentText) {
    if (!subOverlay) return;
    
    // Sửa lỗi nuốt cảm ứng: Khi không có chữ, tắt pointer-events
    if (!activeSegmentText || activeSegmentText.trim() === '') {
      subOverlay.style.opacity = '0';
      subOverlay.style.pointerEvents = 'none';
      return;
    }

    subOverlay.style.opacity = '1';
    subOverlay.style.pointerEvents = 'auto';

    const textEl = subOverlay.querySelector('.sub-text');
    if (textEl) {
      textEl.textContent = activeSegmentText;
    }

    if (!subConfig) return;
    const { font, fontSize, position, outline, shadow, weight, color, fadeInOut } = subConfig;

    if (position) {
      updateSubPositionDOM(position.x, position.y);
    }

    const scaleFactor = videoWrapper ? (videoWrapper.clientHeight / 640) : 1;
    const computedFontSize = Math.max(12, Math.round((fontSize || 16) * scaleFactor));

    subOverlay.style.fontFamily = font || 'Inter, sans-serif';
    subOverlay.style.fontSize = `${computedFontSize}px`;
    subOverlay.style.fontWeight = weight || 700;
    subOverlay.style.color = color || '#ffffff';

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

    if (fadeInOut) {
      subOverlay.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out';
    } else {
      subOverlay.style.transition = 'none';
    }
  }

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
