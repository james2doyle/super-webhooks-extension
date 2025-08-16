document.addEventListener("DOMContentLoaded", () => {
	const noteTextarea = document.getElementById("note-content");
	const sendButton = document.getElementById("send-btn");
	const cancelButton = document.getElementById("cancel-btn");

	// Focus the textarea automatically when the modal opens
	noteTextarea.focus();

	// Function to simulate Send button click
	function sendNote() {
		const note = noteTextarea.value.trim();
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

	// Handle Send button click
	sendButton.addEventListener("click", sendNote);

	// Handle Cancel button click
	cancelButton.addEventListener("click", () => {
		// Let the background script know the action was canceled
		chrome.runtime.sendMessage({ type: "modalCanceled" }, () => {
			window.close();
		});
	});

	// Handle Enter key press in the textarea
	noteTextarea.addEventListener("keydown", (event) => {
		// Check if the Enter key was pressed (key code 13)
		// and if the textarea content, after trimming whitespace, is empty.
		if (event.key === "Enter" && noteTextarea.value.trim() === "") {
			// Prevent the default Enter key behavior (new line)
			event.preventDefault();
			// Simulate a click on the Send button
			sendButton.click();
		}
	});
});
