import { heicTo } from "heic-to";

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

function isHeic(file) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

function isImageFile(file) {
  return file.type.startsWith("image/") || isHeic(file);
}

async function convertHeic(file) {
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  return new File([blob], file.name.replace(/\.heic|\.heif/i, ".jpg"), {
    type: "image/jpeg",
  });
}

async function handleFiles(files) {
  const imageFiles = Array.from(files).filter(isImageFile);
  if (imageFiles.length === 0) return;

  dropzone.classList.add("hidden");
  toolbar.classList.remove("hidden");
  toolbar.classList.add("flex");

  for (const rawFile of imageFiles) {
    const file = isHeic(rawFile) ? await convertHeic(rawFile) : rawFile;
    const url = URL.createObjectURL(file);
    const photo = { file, url, selected: true };
    photos.push(photo);

    const item = document.createElement("div");
    item.className = "relative aspect-square rounded-lg overflow-hidden cursor-pointer group";
    item.dataset.index = photos.length - 1;
    item.dataset.selected = "true";

    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;
    img.className = "w-full h-full object-cover block transition-opacity";

    const check = document.createElement("div");
    check.className =
      "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all bg-white border-white text-neutral-950";
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
  const selected = photos[index].selected;
  item.dataset.selected = selected;

  const img = item.querySelector("img");
  const check = item.querySelector("div");

  img.classList.toggle("opacity-35", !selected);

  if (selected) {
    check.className =
      "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all bg-white border-white text-neutral-950";
  } else {
    check.className =
      "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all bg-black/30 border-white/50 text-transparent";
  }

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
  gallery.querySelectorAll("[data-index]").forEach((item) => {
    item.dataset.selected = newState;
    const img = item.querySelector("img");
    const check = item.querySelector("div");

    img.classList.toggle("opacity-35", !newState);

    if (newState) {
      check.className =
        "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all bg-white border-white text-neutral-950";
    } else {
      check.className =
        "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all bg-black/30 border-white/50 text-transparent";
    }
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
  dropzone.classList.add("border-neutral-500", "bg-neutral-900");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("border-neutral-500", "bg-neutral-900");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("border-neutral-500", "bg-neutral-900");
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
});
