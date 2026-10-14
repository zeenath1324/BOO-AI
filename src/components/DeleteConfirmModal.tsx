import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  chatTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  chatTitle,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xl transition-all">
        <button
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rounded-lg p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Delete Conversation
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-5 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-neutral-900 dark:text-white">&ldquo;{chatTitle}&rdquo;</span>? All messages will be permanently removed.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
