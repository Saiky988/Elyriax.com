/**
 * Elyriax Video & Vietsub Studio - API Client Module
 * Tương thích chuẩn 5 API Endpoints theo docs.txt:
 * 1. POST /api/v1/transcribe
 * 2. POST /api/v1/translate
 * 3. POST /api/v1/render
 * 4. GET  /api/v1/render/{job_id}
 * 5. GET  /api/v1/render/{job_id}/download
 */

const VietsubAPI = (function () {
  const STORAGE_KEY_API_BASE = 'elyriax_vietsub_api_base';
  const DEFAULT_API_BASE = 'https://vietsub.elyriax.com/api/v1';

  /**
   * Lấy URL Base hiện tại từ localStorage hoặc mặc định
   */
  function getBaseUrl() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_API_BASE);
      if (stored && stored.trim() !== '') {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch (e) {}
    return DEFAULT_API_BASE;
  }

  /**
   * Lưu URL Base mới vào localStorage
   */
  function setBaseUrl(url) {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.trim().replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY_API_BASE, cleanUrl);
    return cleanUrl;
  }

  /**
   * Khôi phục về Base URL mặc định
   */
  function resetBaseUrl() {
    localStorage.removeItem(STORAGE_KEY_API_BASE);
    return DEFAULT_API_BASE;
  }

  /**
   * Bắt và phân loại lỗi HTTP theo chuẩn docs.txt
   */
  async function handleHttpError(response, customContext = '') {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.error || errorJson.message || JSON.stringify(errorJson);
    } catch (e) {
      try {
        errorDetail = await response.text();
      } catch (err) {}
    }

    const status = response.status;
    let message = '';

    switch (status) {
      case 400:
        message = `[400 Bad Request] Yêu cầu không hợp lệ. Vui lòng kiểm tra định dạng tệp hoặc cú pháp cấu hình. ${errorDetail ? `(${errorDetail})` : ''}`;
        break;
      case 404:
        message = `[404 Not Found] Tác vụ (Job ID) không tồn tại hoặc đã bị máy chủ xóa sau thời gian lưu trữ.`;
        break;
      case 409:
        message = `[409 Conflict] Video đang trong quá trình render hoặc chưa hoàn thành. Vui lòng chờ hoàn tất trước khi tải về.`;
        break;
      case 413:
        message = `[413 Payload Too Large] Dung lượng tệp quá lớn! Tối đa 100MB cho video và 10MB cho ảnh logo.`;
        break;
      case 422:
        message = `[422 Unprocessable Entity] Dữ liệu gửi lên không đúng định dạng schema yêu cầu. ${errorDetail ? `Chi tiết: ${errorDetail}` : ''}`;
        break;
      case 500:
        message = `[500 Internal Server Error] Máy chủ gặp sự cố trong tiến trình FFmpeg. Vui lòng thử lại.`;
        break;
      case 502:
        message = `[502 Bad Gateway] Lỗi kết nối dịch vụ AI (Groq Whisper / Gemini). Hãy kiểm tra API Key hoặc hạn mức quota của backend.`;
        break;
      default:
        message = `[${status} Error] ${customContext || 'Đã xảy ra lỗi khi gọi API'}: ${errorDetail || response.statusText}`;
    }

    const err = new Error(message);
    err.status = status;
    err.detail = errorDetail;
    return err;
  }

  /**
   * Kiểm tra dung lượng và định dạng video trước khi upload
   */
  function validateVideoFile(file) {
    if (!file) throw new Error('Vui lòng chọn một tệp video.');
    const maxSizeBytes = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSizeBytes) {
      throw new Error(`Video vượt quá giới hạn 100MB (Kích thước hiện tại: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    }
    const validExtensions = ['.mp4', '.mov', '.mkv', '.webm'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext)) || file.type.startsWith('video/');
    if (!isValid) {
      throw new Error('Định dạng video không được hỗ trợ. Vui lòng sử dụng .mp4, .mov, .mkv hoặc .webm.');
    }
    return true;
  }

  /**
   * Kiểm tra dung lượng và định dạng logo
   */
  function validateLogoFile(file) {
    if (!file) return true;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      throw new Error(`Logo vượt quá giới hạn 10MB (Kích thước hiện tại: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    }
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext)) || file.type.startsWith('image/');
    if (!isValid) {
      throw new Error('Định dạng logo không được hỗ trợ. Vui lòng sử dụng .png, .jpg, .jpeg hoặc .webp.');
    }
    return true;
  }

  /**
   * Endpoint 1: Nhận dạng giọng nói (Transcribe)
   * POST /api/v1/transcribe
   * Form-Data: file (video/audio binary)
   */
  async function transcribe(videoFile) {
    validateVideoFile(videoFile);
    const baseUrl = getBaseUrl();
    const formData = new FormData();
    formData.append('file', videoFile);

    try {
      const response = await fetch(`${baseUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw await handleHttpError(response, 'Trích xuất Voice thất bại');
      }

      const data = await response.json();
      return {
        language: data.language || 'chinese',
        duration: data.duration || 0,
        text: data.text || '',
        segments: Array.isArray(data.segments) ? data.segments.map((seg, idx) => ({
          id: typeof seg.id === 'number' ? seg.id : idx,
          start: Number(seg.start) || 0,
          end: Number(seg.end) || 0,
          text: seg.text || ''
        })) : []
      };
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        throw new Error(`Không thể kết nối đến máy chủ AI (${baseUrl}). Vui lòng kiểm tra địa chỉ API Base trong cài đặt hoặc kết nối mạng.`);
      }
      throw err;
    }
  }

  /**
   * Endpoint 2: Dịch phụ đề sang Tiếng Việt (Translate)
   * POST /api/v1/translate
   * Body: { segments: [{ id, start, end, text }] }
   */
  async function translate(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error('Danh sách segments trống. Hãy trích xuất Voice hoặc tạo câu thoại trước khi dịch.');
    }

    const baseUrl = getBaseUrl();
    const payload = {
      segments: segments.map(seg => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.source || seg.text || ''
      }))
    };

    try {
      const response = await fetch(`${baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw await handleHttpError(response, 'Dịch phụ đề thất bại');
      }

      const data = await response.json();
      return {
        segments: Array.isArray(data.segments) ? data.segments.map((seg, idx) => ({
          id: typeof seg.id === 'number' ? seg.id : idx,
          start: Number(seg.start) || 0,
          end: Number(seg.end) || 0,
          source: seg.source || segments[idx]?.source || segments[idx]?.text || '',
          text: seg.text || ''
        })) : []
      };
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        throw new Error(`Không thể kết nối đến máy chủ Dịch thuật (${baseUrl}). Vui lòng kiểm tra API Base URL.`);
      }
      throw err;
    }
  }

  /**
   * Endpoint 3: Tạo Render Job (Bất đồng bộ)
   * POST /api/v1/render
   * Form-Data: video, logo (optional), segments (JSON string), config (JSON string)
   */
  async function createRenderJob(videoFile, logoFile, segments, config) {
    validateVideoFile(videoFile);
    if (logoFile) validateLogoFile(logoFile);

    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error('Danh sách phụ đề đang trống. Vui lòng thêm câu thoại trước khi render.');
    }

    const baseUrl = getBaseUrl();
    const formData = new FormData();
    formData.append('video', videoFile);
    if (logoFile && config.logo?.enabled) {
      formData.append('logo', logoFile);
    }

    // Chuẩn hoá segments gửi lên backend
    const renderSegments = segments.map(seg => ({
      id: seg.id,
      start: Number(seg.start) || 0,
      end: Number(seg.end) || 0,
      source: seg.source || '',
      text: seg.text || ''
    }));

    formData.append('segments', JSON.stringify(renderSegments));
    formData.append('config', JSON.stringify(config));

    try {
      const response = await fetch(`${baseUrl}/render`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok && response.status !== 202) {
        throw await handleHttpError(response, 'Khởi tạo Render Job thất bại');
      }

      const data = await response.json();
      if (!data.job_id) {
        throw new Error('Máy chủ không trả về Job ID.');
      }

      return {
        job_id: data.job_id,
        status: data.status || 'queued'
      };
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        throw new Error(`Không thể gửi yêu cầu Render tới máy chủ (${baseUrl}).`);
      }
      throw err;
    }
  }

  /**
   * Endpoint 4: Kiểm tra tiến độ Render (Polling)
   * GET /api/v1/render/{job_id}
   */
  async function checkRenderStatus(jobId) {
    if (!jobId) throw new Error('Job ID không hợp lệ.');
    const baseUrl = getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/render/${jobId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw await handleHttpError(response, 'Kiểm tra trạng thái render thất bại');
      }

      const data = await response.json();
      return {
        job_id: data.job_id,
        status: data.status, // "queued" | "processing" | "completed" | "failed"
        progress: typeof data.progress === 'number' ? data.progress : 0,
        message: data.message || '',
        download_url: data.download_url || null,
        error: data.error || null
      };
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        throw new Error(`Mất kết nối tới máy chủ khi polling tiến trình.`);
      }
      throw err;
    }
  }

  /**
   * Endpoint 5: Lấy URL Tải Video Vietsub
   * GET /api/v1/render/{job_id}/download
   */
  function getDownloadUrl(jobId) {
    if (!jobId) return '';
    const baseUrl = getBaseUrl();
    return `${baseUrl}/render/${jobId}/download`;
  }

  /**
   * Kiểm tra kết nối nhanh tới API Base URL
   */
  async function pingServer(testUrl = null) {
    const url = testUrl ? testUrl.trim().replace(/\/+$/, '') : getBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(`${url}/render/test_ping_health_check_999`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      // Nếu trả về 404 hoặc bất kỳ mã phản hồi nào từ server nghĩa là server đang online
      return { online: true, status: res.status, url };
    } catch (e) {
      return { online: false, error: e.message, url };
    }
  }

  return {
    getBaseUrl,
    setBaseUrl,
    resetBaseUrl,
    pingServer,
    validateVideoFile,
    validateLogoFile,
    transcribe,
    translate,
    createRenderJob,
    checkRenderStatus,
    getDownloadUrl,
    DEFAULT_API_BASE
  };
})();

// Xuất ra global window để sử dụng trên toàn hệ thống
if (typeof window !== 'undefined') {
  window.VietsubAPI = VietsubAPI;
}

