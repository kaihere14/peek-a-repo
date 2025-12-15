const input = document.getElementById("token");
const saveBtn = document.getElementById("save");

chrome.storage.sync.get("githubToken", ({ githubToken }) => {
  if (githubToken) input.value = githubToken;
});

saveBtn.addEventListener("click", () => {
  chrome.storage.sync.set({ githubToken: input.value }, () => {
    saveBtn.textContent = "Saved ✔";
    setTimeout(() => (saveBtn.textContent = "Save"), 1500);
  });
});
