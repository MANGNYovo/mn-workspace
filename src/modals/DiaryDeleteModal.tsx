type Props = {
  onClose: () => void
  onConfirm: () => void
}

export function DiaryDeleteModal({ onClose, onConfirm }: Props) {
  return (
    <div className="modal-overlay">
      <div className="diary-delete-confirm-modal">
        <h2>Delete Diary?</h2>
        <p>This diary will be permanently deleted.</p>
        <div className="diary-delete-confirm-actions">
          <button className="diary-delete-cancel-button" onClick={onClose}>Cancel</button>
          <button className="diary-delete-button" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
