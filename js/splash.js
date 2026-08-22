const Splash = {
  minDuration: 900,
  maxTimeout: 5000,

  hide() {
    const splash = document.getElementById('splash-screen');
    if (!splash || splash.classList.contains('hide')) return;
    
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 300);
  },

  async wait(tasks = []) {
    const minTimer = new Promise(res => setTimeout(res, this.minDuration));

    const domReady = new Promise(res => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        res();
      } else {
        document.addEventListener('DOMContentLoaded', res, { once: true });
      }
    });

    const safetyTimer = setTimeout(() => this.hide(), this.maxTimeout);

    try {
      await Promise.allSettled([minTimer, domReady, ...tasks]);
    } finally {
      clearTimeout(safetyTimer);
      this.hide();
    }
  }
};ẻ
