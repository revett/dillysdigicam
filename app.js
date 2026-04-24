const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const gallery = document.getElementById("gallery");

function handleFiles(files) {
  const imageFiles = Array.from(files).filter((f) =>
    f.type.startsWith("image/")
  );
  if (imageFiles.length === 0) return;

  dropzone.classList.add("hidden");

  for (const file of imageFiles) {
    const url = URL.createObjectURL(file);
    const item = document.createElement("div");
    item.className = "gallery-item";

    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;

    item.appendChild(img);
    gallery.appendChild(item);
  }
}

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
