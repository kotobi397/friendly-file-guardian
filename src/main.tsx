import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyDeviceClass } from './utils/deviceCapabilities'

// كشف الأجهزة الضعيفة فورًا قبل أي رندر — يطبق فئة low-end-device على <html>
// لتعطيل المؤثرات الثقيلة (animations / backdrop-filter / will-change) عبر CSS
applyDeviceClass();

// Defer non-critical initialization
requestIdleCallback(() => {
  import('./utils/security').then(m => m.SecurityUtils.cleanupLocalStorage());
  import('./utils/privacy').then(m => m.PrivacyUtils.initializePrivacyProtection());
}, { timeout: 5000 });

// إجبار المتصفح/كلاودفلير على تحميل أحدث نسخة عند تغيّر رقم البناء
declare const __BUILD_ID__: string;
try {
  const KEY = 'kotobi_build_id';
  const current = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';
  const previous = localStorage.getItem(KEY);
  if (current && previous !== current) {
    localStorage.setItem(KEY, current);
    if (previous && 'caches' in window) {
      caches.keys().then((keys) => Promise.allSettled(keys.map((k) => caches.delete(k)))).catch(() => {});
    }
    if (previous && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.allSettled(regs.map((r) => r.unregister())))
        .catch(() => {});
    }
  }
} catch {}

const container = document.getElementById("root")!;
createRoot(container).render(<App />);
