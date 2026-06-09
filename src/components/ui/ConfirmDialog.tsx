import * as React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  destructive?: boolean;
  /** When set, the confirm button stays disabled until the operator types a reason. */
  reasonLabel?: string;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}

/**
 * Confirmation dialog for destructive or consequential actions. Optionally
 * requires a typed reason (used for rejections, suspensions, bans).
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  reasonLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const reasonRequired = Boolean(reasonLabel);
  const canConfirm = !reasonRequired || reason.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} description={description}>
      {reasonLabel && (
        <div className="mb-5">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted">{reasonLabel}</label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Add a short reason…"
            autoFocus
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="border border-line" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'accent' : 'solid'}
          className={destructive ? 'bg-red-600 text-white hover:bg-red-600/90' : ''}
          disabled={!canConfirm}
          onClick={() => onConfirm(reasonRequired ? reason.trim() : undefined)}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
