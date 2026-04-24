const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const gallery = document.getElementById("gallery");
const toolbar = document.getElementById("toolbar");
const toggleAllBtn = document.getElementById("toggle-all");
const selectionCount = document.getElementById("selection-count");
const editPhotosBtn = document.getElementById("edit-photos");
const processing = document.getElementById("processing");
const processingSummary = document.getElementById("processing-summary");

const photos = [];

function handleFiles(files) {
  const imageFiles = Array.from(files).filter((f) =>
    f.type.startsWith("image/")
  );
  if (imageFiles.length === 0) return;

  dropzone.classList.add("hidden");
  toolbar.classList.remove("hidden");

  for (const file of imageFiles) {
    const url = URL.createObjectURL(file);
    const photo = { file, url, selected: true };
    photos.push(photo);

    const item = document.createElement("div");
    item.className = "gallery-item selected";
    item.dataset.index = photos.length - 1;

    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;

    const check = document.createElement("div");
    check.className = "gallery-check";
    check.textContent = "✓";

    item.appendChild(img);
    item.appendChild(check);
    item.addEventListener("click", () => togglePhoto(item));
    gallery.appendChild(item);
  }

  updateToolbar();
}

function togglePhoto(item) {
  const index = parseInt(item.dataset.index);
  photos[index].selected = !photos[index].selected;
  item.classList.toggle("selected");
  updateToolbar();
}

function updateToolbar() {
  const selectedCount = photos.filter((p) => p.selected).length;
  const total = photos.length;
  const allSelected = selectedCount === total;

  toggleAllBtn.textContent = allSelected ? "Deselect all" : "Select all";
  selectionCount.textContent = `${selectedCount} of ${total} selected`;
  editPhotosBtn.disabled = selectedCount === 0;
}

toggleAllBtn.addEventListener("click", () => {
  const allSelected = photos.every((p) => p.selected);
  const newState = !allSelected;

  photos.forEach((p) => (p.selected = newState));
  gallery.querySelectorAll(".gallery-item").forEach((item) => {
    item.classList.toggle("selected", newState);
  });

  updateToolbar();
});

editPhotosBtn.addEventListener("click", () => {
  const selected = photos.filter((p) => p.selected);
  if (selected.length === 0) return;

  toolbar.classList.add("hidden");
  gallery.classList.add("hidden");
  processing.classList.remove("hidden");
  processingSummary.textContent = `${selected.length} of ${photos.length} photos selected`;
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
});
