document.addEventListener("DOMContentLoaded", () => {
  const noteForm = document.getElementById("note-form");
  const noteTextarea = document.getElementById("note-content"); // Keep this for initial focus

  // Focus the textarea automatically when the modal opens
  noteTextarea.focus();

  // Function to handle form submission
  function handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission

    // Use FormData to easily get all form values
    const formData = new FormData(noteForm);
    // Get the value by the 'name' attribute of the textarea
    const note = formData.get("note-content").trim();

    // Send the note content back to the background script
    chrome.runtime.sendMessage(
      {
        type: "sendWebhookWithNote",
        note: note,
      },
      () => {
        // Close the modal window after the message has been sent
        window.close();
      },
    );
  }

  // Handle form submission
  noteForm.addEventListener("submit", handleFormSubmit);

  // Handle Cancel button click
  const cancelButton = document.getElementById("cancel-btn");
  cancelButton.addEventListener("click", () => {
    // Let the background script know the action was canceled
    chrome.runtime.sendMessage({ type: "modalCanceled" }, () => {
      window.close();
    });
  });
});
