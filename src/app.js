import Alpine from "alpinejs";
import { zipSync } from "fflate";
import { heicTo } from "heic-to";
import { processPhoto } from "./process.js";

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

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

let toastId = 0;

Alpine.data("toasts", () => ({
  items: [],

  show(message, duration = 3000) {
    const id = ++toastId;
    const toast = { id, message, visible: true };
    this.items.push(toast);
    setTimeout(() => {
      toast.visible = false;
      setTimeout(() => {
        this.items = this.items.filter((t) => t.id !== id);
      }, 200);
    }, duration);
  },
}));

function showToast(message) {
  const el = document.getElementById("toasts");
  if (el?._x_dataStack?.[0]) {
    el._x_dataStack[0].show(message);
  }
}

Alpine.data("app", () => ({
  photos: [],
  results: [],
  view: "upload",
  dragging: false,
  processedCount: 0,

  get selectedCount() {
    return this.photos.filter((p) => p.selected).length;
  },

  get allSelected() {
    return this.photos.length > 0 && this.selectedCount === this.photos.length;
  },

  get anyLoading() {
    return this.photos.some((p) => p.loading);
  },

  async handleFiles(files) {
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

    const heicCount = imageFiles.filter(isHeic).length;
    if (heicCount > 0) {
      showToast(
        `Converting ${heicCount} HEIC file${heicCount > 1 ? "s" : ""}...`,
      );
    }

    this.view = "gallery";

    for (const rawFile of imageFiles) {
      if (isHeic(rawFile)) {
        const photo = { file: null, url: null, selected: true, loading: true };
        this.photos.push(photo);
        const index = this.photos.length - 1;

        convertHeic(rawFile).then((file) => {
          this.photos[index].file = file;
          this.photos[index].url = URL.createObjectURL(file);
          this.photos[index].loading = false;
        });
      } else {
        const url = URL.createObjectURL(rawFile);
        this.photos.push({
          file: rawFile,
          url,
          selected: true,
          loading: false,
        });
      }
    }
  },

  reset() {
    for (const p of this.photos) {
      if (p.url) URL.revokeObjectURL(p.url);
    }
    for (const r of this.results) {
      if (r.url) URL.revokeObjectURL(r.url);
    }
    this.photos = [];
    this.results = [];
    this.processedCount = 0;
    this.view = "upload";
  },

  togglePhoto(index) {
    this.photos[index].selected = !this.photos[index].selected;
  },

  toggleAll() {
    const newState = !this.allSelected;
    for (const p of this.photos) {
      p.selected = newState;
    }
  },

  async editPhotos() {
    if (this.selectedCount === 0) return;
    this.view = "processing";
    this.processedCount = 0;
    this.results = [];

    const start = performance.now();
    const selected = this.photos.filter((p) => p.selected);

    for (const photo of selected) {
      if (this.view !== "processing") break;
      const blob = await processPhoto(photo.url);
      if (this.view !== "processing") break;

      const url = URL.createObjectURL(blob);
      const name = photo.file.name.replace(/\.[^.]+$/, "_digicam.jpg");
      this.results.push({ blob, url, name });
      this.processedCount++;
    }

    // Minimum 3s total so processing feels intentional
    const elapsed = performance.now() - start;
    const remaining = 3000 - elapsed;
    if (remaining > 0 && this.view === "processing") {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    if (this.view === "processing") {
      this.view = "results";
      showToast(`${this.results.length} photos ready to download`);
    }
  },

  cancelProcessing() {
    for (const r of this.results) {
      if (r.url) URL.revokeObjectURL(r.url);
    }
    this.results = [];
    this.processedCount = 0;
    this.view = "gallery";
    showToast("Processing cancelled");
  },

  downloadOne(index) {
    const result = this.results[index];
    triggerDownload(result.url, result.name);
    showToast(`Downloaded ${result.name}`);
  },

  async downloadAll() {
    const files = {};
    for (const result of this.results) {
      const buf = await result.blob.arrayBuffer();
      files[result.name] = [new Uint8Array(buf), { level: 0 }];
    }
    const zipped = zipSync(files);
    const blob = new Blob([zipped], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    const zipName = `dillys-digicam-${ts}.zip`;
    triggerDownload(url, zipName);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${zipName}`);
  },

  onDrop(e) {
    this.dragging = false;
    this.handleFiles(e.dataTransfer.files);
  },

  onFileInput(e) {
    this.handleFiles(e.target.files);
  },
}));

Alpine.start();
