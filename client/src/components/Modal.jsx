import { FiX } from 'react-icons/fi';

export default function Modal({ open, title, onClose, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} mt-12 animate-[fadeIn_.15s_ease]`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-ink">{title}</h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
