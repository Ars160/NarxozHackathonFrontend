import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={20} className="shrink-0" />,
  error:   <XCircle    size={20} className="shrink-0" />,
  warning: <AlertTriangle size={20} className="shrink-0" />,
  info:    <Info       size={20} className="shrink-0" />,
};

const STYLES = {
  success: 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-300',
  error:   'bg-[#C8102E]  border-red-700    text-white shadow-red-300',
  warning: 'bg-amber-500  border-amber-600  text-white shadow-amber-300',
  info:    'bg-blue-600   border-blue-700   text-white shadow-blue-300',
};

/**
 * InlineAlert — показывает уведомление фиксированно в правом нижнем углу
 * (как Toastify), поверх любого контента на странице.
 */
export const InlineAlert = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(true);

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    if (duration > 0) {
      const t = setTimeout(close, duration);
      return () => clearTimeout(t);
    }
  }, [message, duration, close]);

  if (!message || !visible) return null;

  const toast = (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-semibold animate-fade-in shadow-xl max-w-sm w-full ${STYLES[type]}`}
      role="alert"
    >
      {ICONS[type]}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={close}
        className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );

  // Рендерим в портал — фиксированно в правом нижнем углу
  return ReactDOM.createPortal(
    <div className="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto">
        {toast}
      </div>
    </div>,
    document.body
  );
};

/**
 * useAlert — хук для управления уведомлениями.
 */
export const useAlert = () => {
  const [alert, setAlert] = useState({ message: '', type: 'info' });

  const showAlert = useCallback((message, type = 'info') => {
    setAlert({ message: '', type });
    setTimeout(() => setAlert({ message, type }), 10);
  }, []);

  const clearAlert = useCallback(() => {
    setAlert({ message: '', type: 'info' });
  }, []);

  return { alert, showAlert, clearAlert };
};
