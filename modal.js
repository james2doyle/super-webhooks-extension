document.addEventListener('DOMContentLoaded', function() {
  const noteTextarea = document.getElementById('note-content');
  const sendButton = document.getElementById('send-btn');
  const cancelButton = document.getElementById('cancel-btn');

  // Focus the textarea automatically when the modal opens
  noteTextarea.focus();

  // Handle Send button click
  sendButton.addEventListener('click', () => {
    const note = noteTextarea.value.trim();
    // Send the note content back to the background script
    chrome.runtime.sendMessage({
      type: 'sendWebhookWithNote',
      note: note
    }, () => {
      // Close the modal window after the message has been sent
      window.close();
    });
  });

  // Handle Cancel button click
  cancelButton.addEventListener('click', () => {
    // Let the background script know the action was canceled
    chrome.runtime.sendMessage({ type: 'modalCanceled' }, () => {
        window.close();
    });
  });
});
