/**
 * Elyriax Video & Vietsub Studio - Main Application Controller
 * Quản lý Trạng thái tập trung (Centralized Store), Tự động lưu bản nháp,
 * Workflow 3 bước AI, Inspector Dock và Polling Engine Render Video
 */

const VietsubApp = (function () {
  const STORAGE_KEY_DRAFT = 'elyriax_vietsub_draft';

  // Centralized State Store
  const State = {
    videoFile: null,
    videoUrl: null,
    videoMeta: {
      duration: 0,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16'
    },
    logoFile: null,
    logoUrl: null,
    segments: [],
    activeSegmentId: null,
    currentTime: 0,
    isPlaying: false,
    config: {
      subtitle: {
        font: "Inter",
        fontSize: 16,
        position: { x: 50, y: 88 },
        outline: 1.5,
        shadow: 1.0,
        weight: 700,
        color: "#ffffff",
        fadeInOut: true,
        maxCharsPerLine: 28,
        maxLines: 2,
        autoSplitLong: true
      },
      blur: {
        enabled: true,
        x: 15,
        y: 83,
        width: 70,
        height: 11,
        strength: 3.5,
        borderRadius: 18,
        liquidGlass: true,
        lightDiffusion: 0.03
      },
      logo: {
        enabled: false,
        position: "top-right",
        size: 8,
        opacity: 100,
        margin: 20
      }
    },
    renderJob: null,
    pollingIntervalId: null,
    isProcessingAI: false
  };

  let isInitialized = false;

  /**
   * Khởi tạo toàn bộ ứng dụng Studio
   */
  function init() {
    videoEl = document.getElementById('main-video');
    if (!videoEl) return;

    if (!isInitialized) {
      isInitialized = true;

      // 1. Khởi tạo Canvas Overlay & Timeline
      CanvasOverlay.init({
        onBlurChange: handleBlurConfigChange,
        onSubPositionChange: handleSubPositionChange
      });

      VietsubTimeline.init({
        onSeek: handleTimelineSeek,
        onSelectSegment: handleSelectSegment,
        onUpdateSegmentTiming: handleUpdateSegmentTiming
      });

      // 2. Thiết lập Event Listeners cho Video Element
      setupVideoEventListeners();

      // 3. Khôi phục cấu hình từ Draft hoặc mặc định
      restoreDraft();

      // 4. Thiết lập UI Inspector & Action Bar
      setupActionButtons();
      setupInspectorInputs();
      setupDropzones();
      setupKeyboardShortcuts();
      setupSettingsModal();
    }

    // 5. Cập nhật giao diện
    syncAllUI();
  }

  /* ========================================================================
     DRAFT PERSISTENCE (LocalStorage)
     ======================================================================== */

  function saveDraft() {
    try {
      const draftData = {
        config: State.config,
        segments: State.segments,
        videoMeta: State.videoMeta,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draftData));
    } catch (e) {}
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.config) {
          State.config = { ...State.config, ...parsed.config };
        }
        if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
          State.segments = parsed.segments;
        }
      }
    } catch (e) {}
  }

  /* ========================================================================
     VIDEO & MEDIA HANDLING
     ======================================================================== */

  function setupVideoEventListeners() {
    if (!videoEl) return;

    videoEl.addEventListener('loadedmetadata', () => {
      State.videoMeta.duration = videoEl.duration || 0;
      State.videoMeta.width = videoEl.videoWidth || 1080;
      State.videoMeta.height = videoEl.videoHeight || 1920;

      // Tự động căn chỉnh và fill khớp hoàn toàn tỉ lệ video tự nhiên (không còn viền đen thừa)
      setAspectRatio('auto');

      VietsubTimeline.setDuration(State.videoMeta.duration);
      VietsubTimeline.renderWaveform();
      updatePlayerTimecodeDisplay();
      showToast('info', `Đã tải video (${Math.round(State.videoMeta.duration)}s, ${State.videoMeta.width}x${State.videoMeta.height})`);
      saveDraft();
    });

    videoEl.addEventListener('timeupdate', () => {
      State.currentTime = videoEl.currentTime;
      VietsubTimeline.setTime(State.currentTime);
      updatePlayerTimecodeDisplay();
      updateLiveSubtitleDisplay();
    });

    videoEl.addEventListener('play', () => {
      State.isPlaying = true;
      updatePlayButtonUI();
    });

    videoEl.addEventListener('pause', () => {
      State.isPlaying = false;
      updatePlayButtonUI();
    });

    videoEl.addEventListener('ended', () => {
      State.isPlaying = false;
      updatePlayButtonUI();
    });
  }

  function loadVideoFile(file) {
    try {
      VietsubAPI.validateVideoFile(file);
    } catch (err) {
      showToast('error', err.message);
      return;
    }

    State.videoFile = file;
    if (State.videoUrl) URL.revokeObjectURL(State.videoUrl);
    State.videoUrl = URL.createObjectURL(file);

    if (videoEl) {
      videoEl.src = State.videoUrl;
      videoEl.load();
    }

    const placeholder = document.getElementById('stage-upload-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    const stageWrapper = document.getElementById('video-wrapper');
    if (stageWrapper) stageWrapper.style.display = 'block';

    const fileNameEl = document.getElementById('project-filename-display');
    if (fileNameEl) fileNameEl.textContent = file.name;

    showToast('success', `Đã chọn tệp: ${file.name}`);
  }

  function loadLogoFile(file) {
    try {
      VietsubAPI.validateLogoFile(file);
    } catch (err) {
      showToast('error', err.message);
      return;
    }

    State.logoFile = file;
    if (State.logoUrl) URL.revokeObjectURL(State.logoUrl);
    State.logoUrl = URL.createObjectURL(file);
    State.config.logo.enabled = true;

    // Cập nhật UI logo preview
    const logoPreview = document.getElementById('logo-preview-img');
    const logoWrap = document.getElementById('logo-preview-wrap');
    if (logoPreview && logoWrap) {
      logoPreview.src = State.logoUrl;
      logoWrap.style.display = 'block';
    }

    const logoSwitch = document.getElementById('logo-enable-switch');
    if (logoSwitch) logoSwitch.checked = true;

    CanvasOverlay.renderWatermark(State.config.logo, State.logoUrl);
    showToast('success', 'Đã nạp ảnh Logo / Watermark.');
    saveDraft();
  }

  function setAspectRatio(ratio) {
    State.videoMeta.aspectRatio = ratio;
    const stageWrapper = document.getElementById('video-wrapper');
    if (!stageWrapper) return;

    if (ratio === 'auto') {
      if (videoEl && videoEl.videoWidth && videoEl.videoHeight) {
        stageWrapper.style.aspectRatio = `${videoEl.videoWidth} / ${videoEl.videoHeight}`;
      } else {
        stageWrapper.style.aspectRatio = 'auto';
      }
    } else if (ratio === '9:16') {
      stageWrapper.style.aspectRatio = '9/16';
    } else if (ratio === '16:9') {
      stageWrapper.style.aspectRatio = '16/9';
    } else if (ratio === '1:1') {
      stageWrapper.style.aspectRatio = '1/1';
    }
    
    // Cập nhật active button
    document.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratio === ratio);
    });

    CanvasOverlay.renderBlur(State.config.blur);
    updateLiveSubtitleDisplay();
  }

  function togglePlay() {
    if (!videoEl || !videoEl.src) return;
    if (videoEl.paused) {
      videoEl.play();
    } else {
      videoEl.pause();
    }
  }

  function seekRelative(seconds) {
    if (!videoEl) return;
    const target = Math.max(0, Math.min(videoEl.duration || 0, videoEl.currentTime + seconds));
    videoEl.currentTime = target;
  }

  function updatePlayButtonUI() {
    const playBtn = document.getElementById('player-play-btn');
    if (playBtn) {
      playBtn.innerHTML = State.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }
  }

  function updatePlayerTimecodeDisplay() {
    const timeDisplay = document.getElementById('player-timecode');
    if (timeDisplay) {
      const cur = VietsubTimeline.formatTime(State.currentTime);
      const dur = VietsubTimeline.formatTime(State.videoMeta.duration);
      timeDisplay.textContent = `${cur} / ${dur}`;
    }
  }

  function updateLiveSubtitleDisplay() {
    // Tìm segment đang khớp thời gian hiện tại
    const activeSeg = State.segments.find(s => State.currentTime >= s.start && State.currentTime <= s.end);
    const subText = activeSeg ? (activeSeg.text || activeSeg.source || '') : '';
    CanvasOverlay.renderSubtitle(State.config.subtitle, subText);
  }

  /* ========================================================================
     WORKFLOW 3 BƯỚC AI (Transcribe -> Translate -> Render)
     ======================================================================== */

  /**
   * Bước 1: Trích xuất Voice tiếng Trung qua Groq Whisper
   */
  async function handleTranscribeAction() {
    if (!State.videoFile) {
      const fileInput = document.getElementById('video-file-input');
      if (fileInput) {
        fileInput.click();
        showToast('info', 'Vui lòng chọn tệp video từ thiết bị của bạn để bắt đầu.');
      } else {
        showToast('error', 'Vui lòng tải lên tệp video trước khi trích xuất giọng nói.');
      }
      return;
    }
    if (State.isProcessingAI) return;

    setAIProcessingState('transcribe', true);
    showToast('info', 'Đang gửi video sang AI Groq Whisper để trích xuất giọng nói...');

    try {
      const result = await VietsubAPI.transcribe(State.videoFile);
      if (Array.isArray(result.segments) && result.segments.length > 0) {
        State.segments = result.segments;
        if (result.duration > 0 && (!State.videoMeta.duration || State.videoMeta.duration === 0)) {
          State.videoMeta.duration = result.duration;
          VietsubTimeline.setDuration(result.duration);
        }
        
        VietsubTimeline.renderSegments(State.segments);
        VietsubTimeline.renderWaveform();
        renderScriptEditorList();
        saveDraft();

        showToast('success', `Trích xuất hoàn tất! Tìm thấy ${result.segments.length} câu thoại.`);
      } else {
        showToast('info', 'Không nhận diện được câu thoại nào trong video.');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setAIProcessingState('transcribe', false);
    }
  }

  /**
   * Bước 2: Dịch phụ đề sang Tiếng Việt qua Gemini AI
   */
  async function handleTranslateAction() {
    if (!Array.isArray(State.segments) || State.segments.length === 0) {
      showToast('error', 'Chưa có câu thoại nào. Hãy bấm "Trích xuất Voice" trước hoặc tạo câu thoại.');
      return;
    }
    if (State.isProcessingAI) return;

    setAIProcessingState('translate', true);
    showToast('info', 'Đang gửi sang Gemini AI để dịch ngữ cảnh Douyin sang Tiếng Việt...');

    try {
      const result = await VietsubAPI.translate(State.segments);
      if (Array.isArray(result.segments) && result.segments.length > 0) {
        State.segments = result.segments;
        VietsubTimeline.renderSegments(State.segments);
        renderScriptEditorList();
        saveDraft();

        showToast('success', `Đã dịch hoàn tất ${result.segments.length} câu phụ đề Tiếng Việt.`);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setAIProcessingState('translate', false);
    }
  }

  /**
   * Bước 3: Xuất Video và Kích hoạt Polling Engine
   */
  async function handleExportAction() {
    if (!State.videoFile) {
      showToast('error', 'Vui lòng tải lên tệp video trước khi xuất.');
      return;
    }
    if (!Array.isArray(State.segments) || State.segments.length === 0) {
      showToast('error', 'Danh sách phụ đề đang trống. Hãy trích xuất hoặc dịch phụ đề trước.');
      return;
    }

    openExportModal();
    updateExportProgress(5, 'Đang gửi tệp video và cấu hình lên máy chủ render...', 'processing', 1);

    try {
      const jobRes = await VietsubAPI.createRenderJob(
        State.videoFile,
        State.logoFile,
        State.segments,
        State.config
      );

      State.renderJob = {
        job_id: jobRes.job_id,
        status: jobRes.status
      };

      updateExportProgress(15, `Đã khởi tạo Job (${jobRes.job_id.substring(0, 8)}...). Đang xếp hàng xử lý...`, 'processing', 2);
      startRenderPolling(jobRes.job_id);

    } catch (err) {
      updateExportProgress(0, err.message, 'failed');
      showToast('error', err.message);
    }
  }

  /**
   * Engine Polling tiến độ render mỗi 1.5 giây
   */
  function startRenderPolling(jobId) {
    if (State.pollingIntervalId) clearInterval(State.pollingIntervalId);

    State.pollingIntervalId = setInterval(async () => {
      try {
        const job = await VietsubAPI.checkRenderStatus(jobId);
        State.renderJob = job;

        if (job.status === 'processing') {
          const p = Math.max(20, Math.min(95, job.progress || 20));
          const stepIndex = p < 40 ? 3 : (p < 75 ? 4 : 5);
          updateExportProgress(p, job.message || `Đang render FFmpeg (${p}%)...`, 'processing', stepIndex);
        } else if (job.status === 'completed') {
          clearInterval(State.pollingIntervalId);
          State.pollingIntervalId = null;

          const downloadLink = `${VietsubAPI.getBaseUrl()}${job.download_url || `/render/${jobId}/download`}`;
          updateExportProgress(100, 'Render video thành công!', 'completed', 6, downloadLink);
          showToast('success', 'Video Vietsub đã sẵn sàng để tải về!');
        } else if (job.status === 'failed') {
          clearInterval(State.pollingIntervalId);
          State.pollingIntervalId = null;

          updateExportProgress(0, job.error || 'Quá trình render thất bại.', 'failed');
          showToast('error', `Lỗi Render: ${job.error || 'Không xác định'}`);
        }
      } catch (e) {
        // Tạm thời bỏ qua lỗi gián đoạn mạng và tiếp tục poll
        console.warn('Polling hiccup:', e);
      }
    }, 1500);
  }

  function setAIProcessingState(action, isProcessing) {
    State.isProcessingAI = isProcessing;
    const btnTranscribe = document.getElementById('btn-action-transcribe');
    const btnTranslate = document.getElementById('btn-action-translate');
    const btnExport = document.getElementById('btn-action-export');

    if (action === 'transcribe' && btnTranscribe) {
      btnTranscribe.disabled = isProcessing;
      btnTranscribe.innerHTML = isProcessing
        ? '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang trích xuất...</span>'
        : '<i class="fa-solid fa-microphone-lines"></i> <span>1. Trích xuất Voice</span>';
    } else if (action === 'translate' && btnTranslate) {
      btnTranslate.disabled = isProcessing;
      btnTranslate.innerHTML = isProcessing
        ? '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang dịch...</span>'
        : '<i class="fa-solid fa-language"></i> <span>2. Dịch phụ đề</span>';
    }

    if (btnExport) {
      btnExport.disabled = isProcessing;
    }
  }

  /* ========================================================================
     INSPECTOR & CONTROLS BINDING
     ======================================================================== */

  function setupActionButtons() {
    const btnTranscribe = document.getElementById('btn-action-transcribe');
    if (btnTranscribe) btnTranscribe.onclick = handleTranscribeAction;

    const btnTranslate = document.getElementById('btn-action-translate');
    if (btnTranslate) btnTranslate.onclick = handleTranslateAction;

    const btnExport = document.getElementById('btn-action-export');
    if (btnExport) btnExport.onclick = handleExportAction;

    // Player bar buttons
    const playBtn = document.getElementById('player-play-btn');
    if (playBtn) playBtn.onclick = togglePlay;

    const backwardBtn = document.getElementById('player-back-5s');
    if (backwardBtn) backwardBtn.onclick = () => seekRelative(-5);

    const forwardBtn = document.getElementById('player-forward-5s');
    if (forwardBtn) forwardBtn.onclick = () => seekRelative(5);

    // Aspect buttons
    document.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.onclick = () => setAspectRatio(btn.dataset.ratio);
    });

    // Inspector tab switching
    document.querySelectorAll('.inspector-tab-btn').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.inspector-tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.inspector-tab-content').forEach(c => c.style.display = 'none');
        tab.classList.add('active');
        const target = document.getElementById(`tab-content-${tab.dataset.tab}`);
        if (target) target.style.display = 'block';
      };
    });
  }

  function setupInspectorInputs() {
    // --- TAB 1: KIỂU CHỮ ---
    const fontSelect = document.getElementById('sub-font-select');
    if (fontSelect) {
      fontSelect.onchange = (e) => {
        State.config.subtitle.font = e.target.value;
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    }

    const fontSizeSlider = document.getElementById('sub-font-size-slider');
    const fontSizeNum = document.getElementById('sub-font-size-val');
    if (fontSizeSlider && fontSizeNum) {
      fontSizeSlider.oninput = (e) => {
        State.config.subtitle.fontSize = Number(e.target.value);
        fontSizeNum.textContent = `${e.target.value}px`;
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    }

    const fontWeightSelect = document.getElementById('sub-font-weight-select');
    if (fontWeightSelect) {
      fontWeightSelect.onchange = (e) => {
        State.config.subtitle.weight = Number(e.target.value);
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    }

    const colorPicker = document.getElementById('sub-color-picker');
    if (colorPicker) {
      colorPicker.oninput = (e) => {
        State.config.subtitle.color = e.target.value;
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    }

    // Color Swatches
    document.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.color;
        State.config.subtitle.color = color;
        if (colorPicker) colorPicker.value = color;
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    });

    const outlineSlider = document.getElementById('sub-outline-slider');
    const outlineNum = document.getElementById('sub-outline-val');
    if (outlineSlider && outlineNum) {
      outlineSlider.oninput = (e) => {
        State.config.subtitle.outline = Number(e.target.value);
        outlineNum.textContent = `${e.target.value}px`;
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    }

    const shadowSlider = document.getElementById('sub-shadow-slider');
    const shadowNum = document.getElementById('sub-shadow-val');
    if (shadowSlider && shadowNum) {
      shadowSlider.oninput = (e) => {
        State.config.subtitle.shadow = Number(e.target.value);
        shadowNum.textContent = `${e.target.value}px`;
        updateLiveSubtitleDisplay();
        saveDraft();
      };
    }

    const autoSplitSwitch = document.getElementById('sub-auto-split-switch');
    if (autoSplitSwitch) {
      autoSplitSwitch.onchange = (e) => {
        State.config.subtitle.autoSplitLong = e.target.checked;
        saveDraft();
      };
    }

    const maxCharsSlider = document.getElementById('sub-max-chars-slider');
    const maxCharsVal = document.getElementById('sub-max-chars-val');
    if (maxCharsSlider && maxCharsVal) {
      maxCharsSlider.oninput = (e) => {
        State.config.subtitle.maxCharsPerLine = Number(e.target.value);
        maxCharsVal.textContent = e.target.value;
        saveDraft();
      };
    }

    // --- TAB 2: CHE SUB GỐC ---
    const blurEnableSwitch = document.getElementById('blur-enable-switch');
    if (blurEnableSwitch) {
      blurEnableSwitch.onchange = (e) => {
        State.config.blur.enabled = e.target.checked;
        CanvasOverlay.renderBlur(State.config.blur);
        saveDraft();
      };
    }

    const blurStrengthSlider = document.getElementById('blur-strength-slider');
    const blurStrengthVal = document.getElementById('blur-strength-val');
    if (blurStrengthSlider && blurStrengthVal) {
      blurStrengthSlider.oninput = (e) => {
        State.config.blur.strength = Number(e.target.value);
        blurStrengthVal.textContent = e.target.value;
        CanvasOverlay.renderBlur(State.config.blur);
        saveDraft();
      };
    }

    const blurRadiusSlider = document.getElementById('blur-radius-slider');
    const blurRadiusVal = document.getElementById('blur-radius-val');
    if (blurRadiusSlider && blurRadiusVal) {
      blurRadiusSlider.oninput = (e) => {
        State.config.blur.borderRadius = Number(e.target.value);
        blurRadiusVal.textContent = `${e.target.value}px`;
        CanvasOverlay.renderBlur(State.config.blur);
        saveDraft();
      };
    }

    const liquidGlassSwitch = document.getElementById('blur-liquid-glass-switch');
    if (liquidGlassSwitch) {
      liquidGlassSwitch.onchange = (e) => {
        State.config.blur.liquidGlass = e.target.checked;
        CanvasOverlay.renderBlur(State.config.blur);
        saveDraft();
      };
    }

    const lightDiffusionSlider = document.getElementById('blur-diffusion-slider');
    const lightDiffusionVal = document.getElementById('blur-diffusion-val');
    if (lightDiffusionSlider && lightDiffusionVal) {
      lightDiffusionSlider.oninput = (e) => {
        State.config.blur.lightDiffusion = Number(e.target.value);
        lightDiffusionVal.textContent = e.target.value;
        CanvasOverlay.renderBlur(State.config.blur);
        saveDraft();
      };
    }

    // --- TAB 3: WATERMARK & LOGO ---
    const logoEnableSwitch = document.getElementById('logo-enable-switch');
    if (logoEnableSwitch) {
      logoEnableSwitch.onchange = (e) => {
        State.config.logo.enabled = e.target.checked;
        CanvasOverlay.renderWatermark(State.config.logo, State.logoUrl);
        saveDraft();
      };
    }

    // Corner Matrix
    document.querySelectorAll('.corner-matrix-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.corner-matrix-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.config.logo.position = btn.dataset.pos;
        CanvasOverlay.renderWatermark(State.config.logo, State.logoUrl);
        saveDraft();
      };
    });

    const logoSizeSlider = document.getElementById('logo-size-slider');
    const logoSizeVal = document.getElementById('logo-size-val');
    if (logoSizeSlider && logoSizeVal) {
      logoSizeSlider.oninput = (e) => {
        State.config.logo.size = Number(e.target.value);
        logoSizeVal.textContent = `${e.target.value}%`;
        CanvasOverlay.renderWatermark(State.config.logo, State.logoUrl);
        saveDraft();
      };
    }

    const logoOpacitySlider = document.getElementById('logo-opacity-slider');
    const logoOpacityVal = document.getElementById('logo-opacity-val');
    if (logoOpacitySlider && logoOpacityVal) {
      logoOpacitySlider.oninput = (e) => {
        State.config.logo.opacity = Number(e.target.value);
        logoOpacityVal.textContent = `${e.target.value}%`;
        CanvasOverlay.renderWatermark(State.config.logo, State.logoUrl);
        saveDraft();
      };
    }

    const logoMarginSlider = document.getElementById('logo-margin-slider');
    const logoMarginVal = document.getElementById('logo-margin-val');
    if (logoMarginSlider && logoMarginVal) {
      logoMarginSlider.oninput = (e) => {
        State.config.logo.margin = Number(e.target.value);
        logoMarginVal.textContent = `${e.target.value}px`;
        CanvasOverlay.renderWatermark(State.config.logo, State.logoUrl);
        saveDraft();
      };
    }

    // Remove logo btn
    const removeLogoBtn = document.getElementById('btn-remove-logo');
    if (removeLogoBtn) {
      removeLogoBtn.onclick = () => {
        State.logoFile = null;
        State.logoUrl = null;
        State.config.logo.enabled = false;
        const logoWrap = document.getElementById('logo-preview-wrap');
        if (logoWrap) logoWrap.style.display = 'none';
        if (logoEnableSwitch) logoEnableSwitch.checked = false;
        CanvasOverlay.renderWatermark(State.config.logo, null);
        saveDraft();
        showToast('info', 'Đã xóa logo.');
      };
    }

    // --- TAB 4: SCRIPT EDITOR ACTIONS ---
    const addSegmentBtn = document.getElementById('btn-add-segment');
    if (addSegmentBtn) {
      addSegmentBtn.onclick = () => {
        const newStart = Math.round(State.currentTime * 100) / 100;
        const newEnd = Math.round((newStart + 2.0) * 100) / 100;
        const newId = State.segments.length > 0 ? Math.max(...State.segments.map(s => s.id)) + 1 : 0;
        
        State.segments.push({
          id: newId,
          start: newStart,
          end: newEnd,
          source: '新添加文本',
          text: 'Câu thoại phụ đề mới'
        });

        // Sắp xếp lại theo thời gian
        State.segments.sort((a, b) => a.start - b.start);
        VietsubTimeline.renderSegments(State.segments, newId);
        renderScriptEditorList();
        saveDraft();
        showToast('success', 'Đã thêm một câu thoại mới.');
      };
    }

    const clearAllSegmentsBtn = document.getElementById('btn-clear-segments');
    if (clearAllSegmentsBtn) {
      clearAllSegmentsBtn.onclick = () => {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách phụ đề không?')) {
          State.segments = [];
          VietsubTimeline.renderSegments([]);
          renderScriptEditorList();
          saveDraft();
          showToast('info', 'Đã xóa sạch danh sách phụ đề.');
        }
      };
    }

    const exportSrtBtn = document.getElementById('btn-export-srt');
    if (exportSrtBtn) {
      exportSrtBtn.onclick = exportSRTFile;
    }
  }

  function setupDropzones() {
    // Dropzone Video Stage
    const stageContainer = document.getElementById('video-stage-container');
    const videoInput = document.getElementById('video-file-input');

    if (stageContainer) {
      stageContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        stageContainer.classList.add('dragover');
      });
      stageContainer.addEventListener('dragleave', () => {
        stageContainer.classList.remove('dragover');
      });
      stageContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        stageContainer.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadVideoFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (videoInput) {
      videoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          loadVideoFile(e.target.files[0]);
        }
      });
    }

    // Dropzone Logo
    const logoDropzone = document.getElementById('logo-dropzone');
    const logoInput = document.getElementById('logo-file-input');

    if (logoDropzone) {
      logoDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        logoDropzone.classList.add('dragover');
      });
      logoDropzone.addEventListener('dragleave', () => {
        logoDropzone.classList.remove('dragover');
      });
      logoDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        logoDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadLogoFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          loadLogoFile(e.target.files[0]);
        }
      });
    }
  }

  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Bỏ qua phím tắt nếu đang gõ trong input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(e.shiftKey ? -5 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(e.shiftKey ? 5 : 1);
      } else if (e.code === 'KeyE' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleExportAction();
      } else if (e.code === 'Escape') {
        closeAllModals();
      }
    });
  }

  /* ========================================================================
     SCRIPT EDITOR CARD LIST
     ======================================================================== */

  function renderScriptEditorList() {
    const listEl = document.getElementById('script-segments-list');
    const countBadge = document.getElementById('script-segments-count');
    if (!listEl) return;

    if (countBadge) {
      countBadge.textContent = `${State.segments.length} câu`;
    }

    if (State.segments.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-10 text-[var(--text-muted)] text-[12px]">
          <i class="fa-solid fa-closed-captioning text-3xl mb-2.5 opacity-40"></i>
          <div>Chưa có câu thoại nào.</div>
          <div class="mt-1 text-[11px]">Bấm "Trích xuất Voice" hoặc "Thêm câu mới" để bắt đầu.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    State.segments.forEach((seg, idx) => {
      const card = document.createElement('div');
      card.className = `script-item-card mb-3 ${seg.id === State.activeSegmentId ? 'active' : ''}`;
      card.id = `script-card-${seg.id}`;

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="mono text-[11px] font-bold px-1.5 py-0.5 rounded" style="background:rgba(124,111,240,0.15); color:var(--accent)">#${idx + 1}</span>
          <div class="flex items-center gap-1.5">
            <input type="number" step="0.1" class="mono text-[11px] rounded px-1.5 py-0.5 w-16 text-center border font-semibold" style="background:var(--surface); border-color:var(--line); color:var(--text)" value="${seg.start}" data-field="start" title="Bắt đầu (s)" />
            <span class="text-[10px]" style="color:var(--text-faint)">➔</span>
            <input type="number" step="0.1" class="mono text-[11px] rounded px-1.5 py-0.5 w-16 text-center border font-semibold" style="background:var(--surface); border-color:var(--line); color:var(--text)" value="${seg.end}" data-field="end" title="Kết thúc (s)" />
          </div>
          <div class="flex items-center gap-1 ml-auto">
            <button class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-xs" style="color:var(--teal)" title="Tua đến câu này" data-action="seek">
              <i class="fa-solid fa-play"></i>
            </button>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-xs" style="color:var(--rose)" title="Xóa câu này" data-action="delete">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
        ${seg.source ? `<div class="text-[11.5px] mb-1.5 px-1 font-medium italic" style="color:var(--text-dim)">${seg.source}</div>` : ''}
        <textarea class="w-full text-[12.5px] font-medium rounded-lg p-2.5 outline-none border focus:border-[var(--accent)] transition-colors custom-scrollbar" style="background:var(--surface); border-color:var(--line); color:var(--text)" rows="2" placeholder="Nhập phụ đề tiếng Việt...">${seg.text || ''}</textarea>
      `;

      // Event listeners cho card
      const startInput = card.querySelector('input[data-field="start"]');
      const endInput = card.querySelector('input[data-field="end"]');
      const textarea = card.querySelector('textarea');
      const seekBtn = card.querySelector('button[data-action="seek"]');
      const deleteBtn = card.querySelector('button[data-action="delete"]');

      startInput.onchange = (e) => {
        seg.start = Math.max(0, Number(e.target.value));
        VietsubTimeline.renderSegments(State.segments, State.activeSegmentId);
        saveDraft();
      };

      endInput.onchange = (e) => {
        seg.end = Math.max(seg.start + 0.1, Number(e.target.value));
        VietsubTimeline.renderSegments(State.segments, State.activeSegmentId);
        saveDraft();
      };

      textarea.oninput = (e) => {
        seg.text = e.target.value;
        VietsubTimeline.renderSegments(State.segments, State.activeSegmentId);
        updateLiveSubtitleDisplay();
        saveDraft();
      };

      seekBtn.onclick = () => {
        handleTimelineSeek(seg.start);
        handleSelectSegment(seg.id);
      };

      deleteBtn.onclick = () => {
        State.segments = State.segments.filter(s => s.id !== seg.id);
        VietsubTimeline.renderSegments(State.segments);
        renderScriptEditorList();
        saveDraft();
        showToast('info', 'Đã xóa câu thoại.');
      };

      listEl.appendChild(card);
    });
  }

  function exportSRTFile() {
    if (State.segments.length === 0) {
      showToast('error', 'Không có phụ đề để xuất SRT.');
      return;
    }

    function toSrtTime(sec) {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = Math.floor(sec % 60);
      const millis = Math.floor((sec % 1) * 1000);
      return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')},${String(millis).padStart(3,'0')}`;
    }

    let srtContent = '';
    State.segments.forEach((seg, idx) => {
      srtContent += `${idx + 1}\n`;
      srtContent += `${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n`;
      srtContent += `${seg.text || seg.source || ''}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietsub_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Đã tải tệp phụ đề .SRT về máy.');
  }

  /* ========================================================================
     MODALS & EXPORT DIALOG
     ======================================================================== */

  function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.add('open');
  }

  function closeAllModals() {
    document.querySelectorAll('.studio-modal-backdrop').forEach(m => m.classList.remove('open'));
  }

  function updateExportProgress(percent, message, status = 'processing', activeStep = 1, downloadUrl = null) {
    const barFill = document.getElementById('export-progress-fill');
    const percentLabel = document.getElementById('export-percent-label');
    const msgEl = document.getElementById('export-status-message');
    const resultWrap = document.getElementById('export-result-wrap');
    const downloadBtn = document.getElementById('export-download-btn');
    const previewPlayer = document.getElementById('export-preview-video');

    if (barFill) barFill.style.width = `${percent}%`;
    if (percentLabel) percentLabel.textContent = `${percent}%`;
    if (msgEl) msgEl.textContent = message;

    // Cập nhật các bước trong danh sách
    document.querySelectorAll('.export-step-item').forEach((stepItem, idx) => {
      const stepNum = idx + 1;
      stepItem.classList.remove('active', 'done');
      if (stepNum < activeStep) {
        stepItem.classList.add('done');
      } else if (stepNum === activeStep && status !== 'failed') {
        stepItem.classList.add('active');
      }
    });

    if (status === 'completed' && downloadUrl) {
      if (resultWrap) resultWrap.style.display = 'block';
      if (downloadBtn) {
        downloadBtn.href = downloadUrl;
        downloadBtn.onclick = null;
      }
      if (previewPlayer) {
        previewPlayer.src = downloadUrl;
      }
    } else {
      if (resultWrap) resultWrap.style.display = 'none';
    }
  }

  function setupSettingsModal() {
    const settingsBtn = document.getElementById('btn-open-settings');
    const settingsModal = document.getElementById('settings-modal');
    const apiInput = document.getElementById('settings-api-base-input');
    const saveBtn = document.getElementById('btn-save-settings');
    const resetBtn = document.getElementById('btn-reset-settings');
    const testPingBtn = document.getElementById('btn-test-ping');
    const pingStatus = document.getElementById('ping-status-display');

    if (settingsBtn && settingsModal) {
      settingsBtn.onclick = () => {
        if (apiInput) apiInput.value = VietsubAPI.getBaseUrl();
        if (pingStatus) pingStatus.textContent = '';
        settingsModal.classList.add('open');
      };
    }

    if (saveBtn && apiInput) {
      saveBtn.onclick = () => {
        const val = apiInput.value.trim();
        if (val) {
          VietsubAPI.setBaseUrl(val);
          showToast('success', `Đã lưu API Base URL: ${val}`);
          settingsModal.classList.remove('open');
        }
      };
    }

    if (resetBtn && apiInput) {
      resetBtn.onclick = () => {
        const def = VietsubAPI.resetBaseUrl();
        apiInput.value = def;
        showToast('info', 'Đã đặt lại API Base URL mặc định.');
      };
    }

    if (testPingBtn && apiInput && pingStatus) {
      testPingBtn.onclick = async () => {
        pingStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang kiểm tra kết nối...';
        pingStatus.className = 'text-[11px] text-amber-400 mt-1';
        const res = await VietsubAPI.pingServer(apiInput.value);
        if (res.online) {
          pingStatus.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> Máy chủ phản hồi tốt (Online)';
          pingStatus.className = 'text-[11px] text-emerald-400 mt-1';
        } else {
          pingStatus.innerHTML = `<i class="fa-solid fa-circle-xmark mr-1"></i> Không thể kết nối: ${res.error}`;
          pingStatus.className = 'text-[11px] text-rose-400 mt-1';
        }
      };
    }
  }

  /* ========================================================================
     SYNC UI & CALLBACKS
     ======================================================================== */

  function handleTimelineSeek(seconds) {
    if (videoEl) {
      videoEl.currentTime = seconds;
    }
    State.currentTime = seconds;
    updatePlayerTimecodeDisplay();
    updateLiveSubtitleDisplay();
  }

  function handleSelectSegment(segId) {
    State.activeSegmentId = segId;
    // Cuộn tới card trong script editor
    const card = document.getElementById(`script-card-${segId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.querySelectorAll('.script-item-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    }
  }

  function handleUpdateSegmentTiming(segId, newStart, newEnd) {
    const seg = State.segments.find(s => s.id === segId);
    if (seg) {
      seg.start = newStart;
      seg.end = newEnd;
      renderScriptEditorList();
      saveDraft();
    }
  }

  function handleBlurConfigChange(newCoords) {
    State.config.blur = { ...State.config.blur, ...newCoords };
    // Cập nhật giá trị hiển thị trên inspector nếu cần
    saveDraft();
  }

  function handleSubPositionChange(newPos) {
    State.config.subtitle.position = newPos;
    saveDraft();
  }

  function syncAllUI() {
    CanvasOverlay.renderBlur(State.config.blur);
    CanvasOverlay.renderSubtitle(State.config.subtitle, '');
    VietsubTimeline.renderSegments(State.segments);
    renderScriptEditorList();

    // Đồng bộ giá trị input tab Kiểu chữ
    const sub = State.config.subtitle;
    if (sub) {
      const fontSelect = document.getElementById('sub-font-select');
      if (fontSelect) fontSelect.value = sub.font || 'Inter';

      const fontSizeSlider = document.getElementById('sub-font-size-slider');
      const fontSizeNum = document.getElementById('sub-font-size-val');
      if (fontSizeSlider && fontSizeNum) {
        fontSizeSlider.value = sub.fontSize || 16;
        fontSizeNum.textContent = `${sub.fontSize || 16}px`;
      }

      const colorPicker = document.getElementById('sub-color-picker');
      if (colorPicker) colorPicker.value = sub.color || '#ffffff';

      const outlineSlider = document.getElementById('sub-outline-slider');
      const outlineNum = document.getElementById('sub-outline-val');
      if (outlineSlider && outlineNum) {
        outlineSlider.value = sub.outline || 1.5;
        outlineNum.textContent = `${sub.outline || 1.5}px`;
      }
    }

    // Đồng bộ giá trị input tab Blur
    const blur = State.config.blur;
    if (blur) {
      const blurSwitch = document.getElementById('blur-enable-switch');
      if (blurSwitch) blurSwitch.checked = Boolean(blur.enabled);

      const blurStrength = document.getElementById('blur-strength-slider');
      const blurStrengthVal = document.getElementById('blur-strength-val');
      if (blurStrength && blurStrengthVal) {
        blurStrength.value = blur.strength || 3.5;
        blurStrengthVal.textContent = blur.strength || 3.5;
      }

      const blurRadius = document.getElementById('blur-radius-slider');
      const blurRadiusVal = document.getElementById('blur-radius-val');
      if (blurRadius && blurRadiusVal) {
        blurRadius.value = blur.borderRadius || 18;
        blurRadiusVal.textContent = `${blur.borderRadius || 18}px`;
      }

      const liquidSwitch = document.getElementById('blur-liquid-glass-switch');
      if (liquidSwitch) liquidSwitch.checked = Boolean(blur.liquidGlass);
    }
  }

  return {
    init,
    loadVideoFile,
    loadLogoFile,
    handleTranscribeAction,
    handleTranslateAction,
    handleExportAction,
    closeAllModals,
    saveDraft
  };
})();

// Đảm bảo showToast luôn tương thích với Theme của Elyriax
if (typeof window.showToast !== 'function') {
  window.showToast = function (type, msg) {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      document.body.appendChild(wrap);
    }

    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const colors = { success: 'var(--teal, #34d6b4)', error: 'var(--rose, #f4586b)', info: 'var(--accent, #7c6ff0)' };
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}"></i><span>${msg}</span>`;
    wrap.appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity .3s ease, transform .3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 300);
    }, 2600);
  };
}

// Khởi chạy khi tài liệu đã sẵn sàng
window.addEventListener('DOMContentLoaded', VietsubApp.init);

