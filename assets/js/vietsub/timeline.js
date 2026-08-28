/**
 * Elyriax Video & Vietsub Studio - Pro Timeline & Scrubber System
 * Quản lý Thước đo thời gian, Waveform âm thanh, Playhead Scrubber và Subtitle Chips Track
 */

const VietsubTimeline = (function () {
  let container = null;
  let rulerEl = null;
  let tracksScrollEl = null;
  let playheadEl = null;
  let playheadTimePill = null;
  let subTrackContent = null;
  let waveformCanvas = null;
  let videoEl = null;

  // Cấu hình Timeline
  let duration = 0; // tổng giây
  let currentTime = 0;
  let pxPerSecond = 50; // tỉ lệ zoom (50px = 1s)
  let isScrubbing = false;

  // Callbacks
  let onSeek = null;
  let onSelectSegment = null;
  let onUpdateSegmentTiming = null;

  // Cache segments
  let segments = [];
  let activeSegmentId = null;

  /**
   * Khởi tạo Timeline
   */
  function init(options = {}) {
    container = document.getElementById('timeline-container');
    rulerEl = document.getElementById('timeline-ruler');
    tracksScrollEl = document.getElementById('tracks-scroll-area');
    playheadEl = document.getElementById('timeline-playhead');
    playheadTimePill = document.getElementById('playhead-time-pill');
    subTrackContent = document.getElementById('sub-track-content');
    waveformCanvas = document.getElementById('waveform-canvas');
    videoEl = document.getElementById('main-video');

    onSeek = options.onSeek || null;
    onSelectSegment = options.onSelectSegment || null;
    onUpdateSegmentTiming = options.onUpdateSegmentTiming || null;

    if (!container || !rulerEl || !tracksScrollEl) return;

    setupScrubberInteractions();
    setupZoomControls();
  }

  /**
   * Thiết lập tương tác kéo tua (Scrubber)
   */
  function setupScrubberInteractions() {
    // Click hoặc kéo trên Ruler & Tracks
    const handleScrubStart = (e) => {
      // Nếu bấm vào trim handle của segment thì để trim xử lý
      if (e.target.classList.contains('chip-trim-handle')) return;

      isScrubbing = true;
      updateScrubPositionFromEvent(e);

      window.addEventListener('pointermove', handleScrubMove);
      window.addEventListener('pointerup', handleScrubEnd);
    };

    rulerEl.addEventListener('pointerdown', handleScrubStart);
    tracksScrollEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.segment-chip')) return; // segment chip có click handler riêng
      handleScrubStart(e);
    });

    function handleScrubMove(e) {
      if (!isScrubbing) return;
      updateScrubPositionFromEvent(e);
    }

    function handleScrubEnd(e) {
      if (!isScrubbing) return;
      isScrubbing = false;
      window.removeEventListener('pointermove', handleScrubMove);
      window.removeEventListener('pointerup', handleScrubEnd);
    }
  }

  function updateScrubPositionFromEvent(e) {
    if (!tracksScrollEl || duration <= 0) return;
    const rect = tracksScrollEl.getBoundingClientRect();
    const scrollLeft = tracksScrollEl.scrollLeft;
    const clientX = e.clientX;

    const offsetX = clientX - rect.left + scrollLeft;
    const targetSeconds = Math.max(0, Math.min(duration, offsetX / pxPerSecond));

    setTime(targetSeconds);

    if (onSeek) {
      onSeek(targetSeconds);
    }
  }

  /**
   * Thiết lập nút phóng to / thu nhỏ Timeline
   */
  function setupZoomControls() {
    const zoomInBtn = document.getElementById('timeline-zoom-in');
    const zoomOutBtn = document.getElementById('timeline-zoom-out');
    const zoomFitBtn = document.getElementById('timeline-zoom-fit');

    if (zoomInBtn) {
      zoomInBtn.onclick = () => {
        setZoom(pxPerSecond * 1.3);
      };
    }
    if (zoomOutBtn) {
      zoomOutBtn.onclick = () => {
        setZoom(pxPerSecond / 1.3);
      };
    }
    if (zoomFitBtn) {
      zoomFitBtn.onclick = () => {
        fitToWidth();
      };
    }
  }

  function setZoom(newPxPerSecond) {
    pxPerSecond = Math.max(15, Math.min(newPxPerSecond, 300));
    renderRuler();
    renderSegments(segments, activeSegmentId);
    renderWaveform();
    updatePlayheadDOM();
  }

  function fitToWidth() {
    if (!tracksScrollEl || duration <= 0) return;
    const availableW = tracksScrollEl.clientWidth - 40;
    if (availableW > 0) {
      setZoom(availableW / duration);
    }
  }

  /**
   * Định dạng thời gian theo mm:ss.ms
   */
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  }

  /**
   * Cập nhật thời lượng Video và vẽ lại toàn bộ Timeline
   */
  function setDuration(totalSeconds) {
    duration = Math.max(1, totalSeconds || 1);
    renderRuler();
    renderWaveform();
    updatePlayheadDOM();
  }

  /**
   * Cập nhật thời gian hiện tại từ Video Player
   */
  function setTime(currentSeconds) {
    currentTime = Math.max(0, Math.min(duration, currentSeconds));
    updatePlayheadDOM();
    updateActiveSegmentHighlight();
  }

  function updatePlayheadDOM() {
    if (!playheadEl) return;
    const leftPx = currentTime * pxPerSecond;
    playheadEl.style.left = `${leftPx}px`;

    if (playheadTimePill) {
      playheadTimePill.textContent = formatTime(currentTime);
    }
  }

  /**
   * Vẽ Thước đo thời gian (Time Ruler)
   */
  function renderRuler() {
    if (!rulerEl || duration <= 0) return;
    rulerEl.innerHTML = '';

    const totalWidth = duration * pxPerSecond + 150;
    rulerEl.style.width = `${totalWidth}px`;
    if (tracksScrollEl) {
      const trackInner = document.getElementById('tracks-inner');
      if (trackInner) trackInner.style.width = `${totalWidth}px`;
    }

    // Xác định khoảng cách tick dựa trên mức độ zoom
    let stepSec = 1;
    if (pxPerSecond < 25) stepSec = 5;
    else if (pxPerSecond < 40) stepSec = 2;
    else if (pxPerSecond > 120) stepSec = 0.5;

    for (let sec = 0; sec <= duration + 1; sec += stepSec) {
      const tick = document.createElement('div');
      const isMajor = Math.floor(sec) === sec && (sec % (stepSec >= 2 ? stepSec * 2 : 5) === 0 || sec === 0);
      tick.className = `ruler-tick ${isMajor ? 'major' : ''}`;
      tick.style.left = `${sec * pxPerSecond}px`;

      if (isMajor) {
        const label = document.createElement('div');
        label.className = 'ruler-time-label';
        label.textContent = formatTime(sec);
        label.style.left = `${sec * pxPerSecond}px`;
        rulerEl.appendChild(label);
      }

      rulerEl.appendChild(tick);
    }
  }

  /**
   * Vẽ các khối phụ đề (Subtitle Segment Chips)
   */
  function renderSegments(newSegments = [], currentActiveId = null) {
    segments = newSegments || [];
    activeSegmentId = currentActiveId;

    if (!subTrackContent) return;
    subTrackContent.innerHTML = '';

    segments.forEach((seg, idx) => {
      const chip = document.createElement('div');
      const segId = typeof seg.id !== 'undefined' ? seg.id : idx;
      chip.className = `segment-chip ${segId === activeSegmentId ? 'active' : ''}`;
      chip.dataset.id = segId;

      const leftPx = seg.start * pxPerSecond;
      const widthPx = Math.max(16, (seg.end - seg.start) * pxPerSecond);

      chip.style.left = `${leftPx}px`;
      chip.style.width = `${widthPx}px`;

      const displayText = seg.text || seg.source || `Câu #${idx + 1}`;
      chip.title = `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${displayText}`;
      chip.innerHTML = `
        <div class="chip-trim-handle left" data-handle="start"></div>
        <span class="truncate px-1 text-[10.5px]">${displayText}</span>
        <div class="chip-trim-handle right" data-handle="end"></div>
      `;

      // Click để tua đến đầu câu thoại
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip-trim-handle')) return;
        setTime(seg.start);
        if (onSeek) onSeek(seg.start);
        if (onSelectSegment) onSelectSegment(segId);
      });

      // Tương tác kéo co giãn 2 đầu câu thoại (Trim)
      setupChipTrim(chip, seg);

      subTrackContent.appendChild(chip);
    });

    updateActiveSegmentHighlight();
  }

  /**
   * Xử lý kéo co giãn mốc thời gian start / end của Segment Chip
   */
  function setupChipTrim(chip, seg) {
    const leftHandle = chip.querySelector('.chip-trim-handle.left');
    const rightHandle = chip.querySelector('.chip-trim-handle.right');

    const handleTrim = (handleType, startEvent) => {
      startEvent.preventDefault();
      startEvent.stopPropagation();

      const initialX = startEvent.clientX;
      const initialStart = seg.start;
      const initialEnd = seg.end;

      const onPointerMove = (e) => {
        const dx = e.clientX - initialX;
        const deltaSec = dx / pxPerSecond;

        if (handleType === 'start') {
          const newStart = Math.max(0, Math.min(initialEnd - 0.2, initialStart + deltaSec));
          seg.start = Math.round(newStart * 100) / 100;
          chip.style.left = `${seg.start * pxPerSecond}px`;
          chip.style.width = `${(seg.end - seg.start) * pxPerSecond}px`;
        } else {
          const newEnd = Math.max(initialStart + 0.2, Math.min(duration, initialEnd + deltaSec));
          seg.end = Math.round(newEnd * 100) / 100;
          chip.style.width = `${(seg.end - seg.start) * pxPerSecond}px`;
        }

        if (onUpdateSegmentTiming) {
          onUpdateSegmentTiming(seg.id, seg.start, seg.end);
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    leftHandle.addEventListener('pointerdown', (e) => handleTrim('start', e));
    rightHandle.addEventListener('pointerdown', (e) => handleTrim('end', e));
  }

  /**
   * Tự động làm sáng khối thoại tương ứng với vị trí playhead
   */
  function updateActiveSegmentHighlight() {
    if (!subTrackContent) return;
    const chips = subTrackContent.querySelectorAll('.segment-chip');

    let currentFoundId = null;
    segments.forEach(seg => {
      if (currentTime >= seg.start && currentTime <= seg.end) {
        currentFoundId = seg.id;
      }
    });

    chips.forEach(chip => {
      const chipId = Number(chip.dataset.id);
      if (chipId === currentFoundId) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  /**
   * Vẽ Waveform âm thanh mô phỏng / trích xuất
   */
  function renderWaveform(audioBuffer = null) {
    if (!waveformCanvas || duration <= 0) return;
    const ctx = waveformCanvas.getContext('2d');
    const width = duration * pxPerSecond;
    const height = 42;

    waveformCanvas.width = width;
    waveformCanvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Vẽ nền đường phân cách giữa
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Sinh các dải sóng âm (màu xanh Indigo chuyển Emerald)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(0.5, '#6366f1');
    gradient.addColorStop(1, '#10b981');

    ctx.fillStyle = gradient;

    const barWidth = 2.5;
    const gap = 1.5;
    const totalBars = Math.floor(width / (barWidth + gap));

    for (let i = 0; i < totalBars; i++) {
      const x = i * (barWidth + gap);
      const currentSec = x / pxPerSecond;

      // Tính biên độ dựa vào việc đoạn này có thoại hay không
      let isVoiceActive = segments.some(s => currentSec >= s.start && currentSec <= s.end);
      let baseAmp = isVoiceActive ? (0.4 + Math.sin(i * 0.3) * 0.2 + Math.random() * 0.35) : (0.08 + Math.random() * 0.08);

      const barHeight = Math.max(3, baseAmp * (height - 8));
      const y = (height - barHeight) / 2;

      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  return {
    init,
    setDuration,
    setTime,
    setZoom,
    fitToWidth,
    renderRuler,
    renderSegments,
    renderWaveform,
    formatTime
  };
})();

if (typeof window !== 'undefined') {
  window.VietsubTimeline = VietsubTimeline;
}

