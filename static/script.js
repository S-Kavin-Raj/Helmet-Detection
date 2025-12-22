const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const previewImage = document.getElementById("previewImage");
const clearBtn = document.getElementById("clearBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultsSection = document.getElementById("resultsSection");
const resultImage = document.getElementById("resultImage");
const totalCount = document.getElementById("totalCount");
const safeCount = document.getElementById("safeCount");
const dangerCount = document.getElementById("dangerCount");
const detectionsItems = document.getElementById("detectionsItems");
const samplesGrid = document.getElementById("samplesGrid");
const downloadBtn = document.getElementById("downloadBtn");

let currentFile = null;
let processedImageData = null;

document.addEventListener("DOMContentLoaded", () => {
  loadSamples();
  setupEventListeners();
});

function setupEventListeners() {
  uploadZone.onclick = () => fileInput.click();

  fileInput.addEventListener("change", handleFileSelect);

  uploadZone.addEventListener("dragover", handleDragOver);
  uploadZone.addEventListener("dragleave", handleDragLeave);
  uploadZone.addEventListener("drop", handleDrop);

  clearBtn.addEventListener("click", clearPreview);

  analyzeBtn.addEventListener("click", analyzeImage);

  downloadBtn.addEventListener("click", downloadResult);
}

function handleDragOver(e) {
  e.preventDefault();
  uploadZone.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  uploadZone.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  currentFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadZone.style.display = "none";
    previewContainer.classList.add("active");
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearPreview() {
  currentFile = null;
  previewImage.src = "";
  previewContainer.classList.remove("active");
  uploadZone.style.display = "flex";
  analyzeBtn.disabled = true;
  fileInput.value = "";
}

async function analyzeImage() {
  if (!currentFile) return;

  analyzeBtn.classList.add("loading");
  analyzeBtn.disabled = true;
  previewContainer.classList.add("scanning");

  const formData = new FormData();
  formData.append("image", currentFile);
  formData.append("mode", "image");

  formData.append("annotated", "true");

  try {
    const response = await fetch("/detect", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      displayResults(data);
    } else {
      alert("Error: " + data.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to analyze image. Please try again.");
  } finally {
    analyzeBtn.classList.remove("loading");
    analyzeBtn.disabled = false;
    previewContainer.classList.remove("scanning");
  }
}

function displayResults(data) {
  document.getElementById("uploadSection").style.display = "none";

  processedImageData = data.image || null;
  if (data.image) {
    resultImage.src = `data:image/jpeg;base64,${data.image}`;
    resultImage.style.display = "block";
  } else {

    resultImage.style.display = "none";
  }

  animateCounter(totalCount, 0, data.stats.total);
  animateCounter(safeCount, 0, data.stats.with_helmet);
  animateCounter(dangerCount, 0, data.stats.without_helmet);

  detectionsItems.innerHTML = "";
  data.detections.forEach((detection, index) => {
    const isSafe = detection.label === "With Helmet";
    const item = document.createElement("div");
    item.className = `detection-item ${isSafe ? "safe" : "danger"}`;
    item.innerHTML = `
            <div class="detection-label">
                <div class="detection-icon">${isSafe ? "✓" : "⚠"}</div>
                <span class="detection-text">${detection.label}</span>
            </div>
            <span class="detection-confidence">${(
        detection.confidence * 100
      ).toFixed(0)}%</span>
        `;
    item.style.animation = `fadeIn 0.3s ease ${index * 0.1}s both`;
    detectionsItems.appendChild(item);
  });

  resultsSection.classList.add("active");

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      resultsSection.classList.remove("active");
      document.getElementById("uploadSection").style.display = "block";
      clearPreview();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }
}

function animateCounter(element, start, end) {
  const duration = 500;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * easeOut);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

async function loadSamples() {
  try {
    const response = await fetch("/samples");
    const data = await response.json();

    samplesGrid.innerHTML = "";


    data.images.forEach((filename) => {
      const card = document.createElement("div");
      card.className = "sample-card glass-card";
      card.innerHTML = `
                <img src="/sample/${filename}" alt="${filename}">
                <div class="sample-overlay">
                    <span>Click to analyze</span>
                </div>
            `;
      card.addEventListener("click", () => loadSampleImage(filename));
      samplesGrid.appendChild(card);
    });


    data.videos.forEach((filename) => {
      const card = document.createElement("div");
      card.className = "sample-card glass-card";
      card.innerHTML = `
                <video src="/sample/${filename}" style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div class="sample-overlay">
                    <svg viewBox="0 0 24 24" fill="white" style="width: 48px; height: 48px; margin-bottom: 8px;">
                        <polygon points="5,3 19,12 5,21"></polygon>
                    </svg>
                    <span>Click to analyze video</span>
                </div>
            `;
      card.addEventListener("click", () => loadSampleVideo(filename));
      samplesGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading samples:", error);
  }
}

async function loadSampleImage(filename) {
  try {
    const response = await fetch(`/sample/${filename}`);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });
    handleFile(file);
    uploadZone.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error("Error loading sample:", error);
  }
}

async function loadSampleVideo(filename) {
  try {

    const videoTab = document.querySelector('.mode-tab[data-mode="video"]');
    if (videoTab) {
      videoTab.click();
    }


    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await fetch(`/sample/${filename}`);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: "video/mp4" });


    const videoInput = document.getElementById("videoInput");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    videoInput.files = dataTransfer.files;


    const event = new Event("change", { bubbles: true });
    videoInput.dispatchEvent(event);

    uploadZone.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error("Error loading sample video:", error);
  }
}

async function downloadResult() {
  if (!processedImageData) return;

  const resultsSection = document.getElementById("resultsSection");
  if (!resultsSection) return;


  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `
        <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;animation:spin 1s linear infinite">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
        </svg>
        Generating PDF...
    `;

  try {

    const canvas = await html2canvas(resultsSection, {
      backgroundColor: "#020617",
      scale: 2,
      logging: false,
      useCORS: true,
    });


    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;


    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`helmet_detection_report_${Date.now()}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Downloading image only.");

    const link = document.createElement("a");
    link.href = `data:image/jpeg;base64,${processedImageData}`;
    link.download = "helmet_detection_result.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {

    downloadBtn.disabled = false;
    downloadBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Report
        `;
  }
}
