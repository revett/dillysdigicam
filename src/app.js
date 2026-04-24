import Alpine from "alpinejs";
import { heicTo } from "heic-to";

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

Alpine.data("app", () => ({
  photos: [],
  view: "upload",
  dragging: false,

  get selectedCount() {
    return this.photos.filter((p) => p.selected).length;
  },

  get allSelected() {
    return this.photos.length > 0 && this.selectedCount === this.photos.length;
  },

  async handleFiles(files) {
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

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
    this.photos = [];
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

  editPhotos() {
    if (this.selectedCount === 0) return;
    this.view = "processing";
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
