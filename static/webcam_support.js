let currentMode = "image";
let webcamStream = null;
let webcamInterval = null;
let frameCount = 0;
let isProcessingFrame = false;
const FRAME_SKIP = 3;
const MIN_FRAME_INTERVAL_MS = 250;
let lastWebcamSent = 0;
let lastVideoSent = 0;

document.addEventListener("DOMContentLoaded", () => {
  setupModeTabs();

  try {
    const preferred = localStorage.getItem("preferredMode");
    if (preferred) {
      const tab = document.querySelector(`.mode-tab[data-mode="${preferred}"]`);
      if (tab) tab.click();
    }
  } catch (e) {
    console.error("LocalStorage not available", e);
  }
});

function setupModeTabs() {
  const modeTabs = document.querySelectorAll(".mode-tab");
  const uploadZone = document.getElementById("uploadZone");
  const webcamContainer = document.getElementById("webcamContainer");
  const uploadTitle = document.getElementById("uploadTitle");
  const uploadFormats = document.getElementById("uploadFormats");
  const fileInput = document.getElementById("fileInput");
  const videoInput = document.getElementById("videoInput");


  if (uploadZone) {
    uploadZone.onclick = () => fileInput.click();
  }

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      modeTabs.forEach((t) => {
        t.style.background = "transparent";
        t.style.color = "var(--text-secondary)";
        t.style.border = "1px solid var(--border-color)";
      });

      tab.style.background = "var(--primary)";
      tab.style.color = "white";
      tab.style.border = "none";

      currentMode = tab.dataset.mode;
      try {
        localStorage.setItem("preferredMode", currentMode);
      } catch (e) { }

      if (currentMode !== "webcam" && webcamStream) {
        stopWebcam();
      }

      if (currentMode === "image") {
        uploadZone.style.display = "flex";
        webcamContainer.style.display = "none";
        uploadTitle.textContent = "Drop your image here";
        uploadFormats.innerHTML =
          "<span>JPG</span><span>PNG</span><span>WEBP</span>";
        uploadZone.onclick = () => fileInput.click();
      } else if (currentMode === "video") {
        uploadZone.style.display = "flex";
        webcamContainer.style.display = "none";
        uploadTitle.textContent = "Drop your video here";
        uploadFormats.innerHTML =
          "<span>MP4</span><span>AVI</span><span>MOV</span>";
        uploadZone.onclick = () => videoInput.click();
      } else if (currentMode === "webcam") {
        uploadZone.style.display = "none";
        webcamContainer.style.display = "block";
        startWebcam();
      }
    });
  });

  document.getElementById("stopWebcamBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    stopWebcam();
    modeTabs[0].click();
  });

  videoInput.addEventListener("change", handleVideoSelect);
}

async function getCameraPermissionStatus() {
  if (!navigator.permissions || !navigator.permissions.query) return "prompt";
  try {
    const status = await navigator.permissions.query({ name: "camera" });
    return status.state;
  } catch (e) {

    return "prompt";
  }
}

async function startWebcam() {
  const video = document.getElementById("webcamVideo");
  const canvas = document.getElementById("webcamCanvas");


  const permState = await getCameraPermissionStatus();
  if (permState === "denied") {
    alert(
      "Camera access is blocked. Please enable camera permission for this site in your browser settings."
    );
    return;
  }

  try {

    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });


    try {
      localStorage.setItem("webcamAllowed", "true");
    } catch (e) { }

    video.srcObject = webcamStream;

    video.onloadedmetadata = () => {
      video.play();

      function processLoop() {
        if (!webcamStream) return;
        processWebcamFrame(video, canvas);
        requestAnimationFrame(processLoop);
      }

      processLoop();
    };


    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "camera" })
        .then((status) => {
          status.onchange = () => {
            if (status.state === "denied") {

              stopWebcam();
              try {
                localStorage.setItem("webcamAllowed", "false");
              } catch (e) { }
              alert(
                "Camera permission was revoked. Please re-enable it in your browser settings."
              );
            }
          };
        })
        .catch(() => { });
    }
  } catch (error) {

    try {
      localStorage.setItem("webcamAllowed", "false");
    } catch (e) { }
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      alert(
        "Camera permission denied. Please allow camera access to use webcam detection."
      );
    } else {
      alert("Could not access webcam: " + error.message);
    }
    console.error("Webcam error:", error);
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
    webcamStream = null;
  }
  if (webcamInterval) {
    clearInterval(webcamInterval);
    webcamInterval = null;
  }
  const video = document.getElementById("webcamVideo");
  if (video) {
    video.srcObject = null;
  }
  isProcessingFrame = false;
}

/**
 * Draw detections onto the provided canvas context.
 * Expects detections with fields: {label, confidence, bbox: [x1,y1,x2,y2], class_id}
 */
function drawDetections(ctx, detections) {
  if (!ctx || !detections) return;

  detections.forEach((d) => {
    const [x1, y1, x2, y2] = d.bbox;
    const cls = d.class_id || 0;
    const label = d.label || "obj";
    const conf = d.confidence || 0;


    const color = cls === 1 ? "rgba(220,20,60,1)" : "rgba(0,200,0,1)";
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();

    const text = `${label} ${(conf * 100).toFixed(0)}%`;
    ctx.font = "16px Arial";
    const textWidth = ctx.measureText(text).width;
    const textHeight = 18;


    ctx.fillStyle = color;
    ctx.fillRect(
      x1,
      Math.max(y1 - textHeight - 6, 0),
      textWidth + 8,
      textHeight + 6
    );


    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x1 + 4, Math.max(y1 - 6, textHeight));


    ctx.fillStyle = "#000";
  });
}

async function processWebcamFrame(video, canvas) {
  if (!video.videoWidth || !video.videoHeight) return;
  if (isProcessingFrame) return;

  frameCount++;
  if (frameCount % FRAME_SKIP !== 0) return;


  const now = Date.now();
  if (now - lastWebcamSent < MIN_FRAME_INTERVAL_MS) return;

  isProcessingFrame = true;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  canvas.toBlob(
    async (blob) => {

      if (!webcamStream || !blob) {
        isProcessingFrame = false;
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, "webcam.jpg");
      formData.append("mode", "webcam");

      try {

        const annotatedCheckbox = document.getElementById("annotatedCheckbox");
        const wantAnnotated = annotatedCheckbox && annotatedCheckbox.checked;
        if (wantAnnotated) formData.append("annotated", "true");
        else formData.append("annotated", "false");

        const response = await fetch("/detect", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success && webcamStream) {

          if (data.image) {
            const processedImg = "data:image/jpeg;base64," + data.image;
            video.style.display = "none";
            canvas.style.display = "block";
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = processedImg;
          } else if (data.detections) {

            video.style.display = "none";
            canvas.style.display = "block";
            drawDetections(ctx, data.detections);
          }
        }
      } catch (error) {
        console.error("Detection error:", error);
      } finally {
        isProcessingFrame = false;
      }
    },
    "image/jpeg",
    0.4
  );
}

let videoProcessingInterval = null;
let isProcessingVideo = false;
let videoAnimationFrameId = null;

function handleVideoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("video/")) {
    alert("Please select a video file");
    return;
  }


  stopVideoProcessing();
  startVideoProcessing(file);
}

function startVideoProcessing(file) {
  const videoContainer = document.getElementById("videoPlayerContainer");
  const video = document.getElementById("videoPlayer");
  const canvas = document.getElementById("videoCanvas");
  const uploadZone = document.getElementById("uploadZone");
  const previewContainer = document.getElementById("previewContainer");

  uploadZone.style.display = "none";
  previewContainer.style.display = "none";
  videoContainer.style.display = "block";

  const url = URL.createObjectURL(file);
  video.src = url;
  video.playbackRate = 0.5;
  video.load();

  isProcessingVideo = false;
}

function toggleVideoProcessing() {
  const video = document.getElementById("videoPlayer");
  const toggleBtn = document.getElementById("toggleVideoBtn");

  if (!isProcessingVideo) {
    isProcessingVideo = true;
    toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px;">
                <rect x="6" y="6" width="4" height="12"></rect>
                <rect x="14" y="6" width="4" height="12"></rect>
            </svg>
            Pause Detection
        `;
    toggleBtn.style.background = "var(--accent-secondary)";

    video.playbackRate = 0.5;
    video.play();

    function videoProcessLoop() {
      if (!isProcessingVideo) return;
      processVideoFrame(video, document.getElementById("videoCanvas"));
      videoAnimationFrameId = requestAnimationFrame(videoProcessLoop);
    }

    videoProcessLoop();
  } else {
    stopVideoProcessing();
  }
}

function stopVideoProcessing() {
  const toggleBtn = document.getElementById("toggleVideoBtn");
  const video = document.getElementById("videoPlayer");

  isProcessingVideo = false;
  if (videoProcessingInterval) {
    clearInterval(videoProcessingInterval);
    videoProcessingInterval = null;
  }
  if (videoAnimationFrameId) {
    cancelAnimationFrame(videoAnimationFrameId);
    videoAnimationFrameId = null;
  }

  toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px;">
            <polygon points="5,3 19,12 5,21"></polygon>
        </svg>
        Start Detection
    `;
  toggleBtn.style.background = "var(--accent-primary)";

  video.pause();
}

function closeVideoPlayer() {
  const videoContainer = document.getElementById("videoPlayerContainer");
  const video = document.getElementById("videoPlayer");
  const uploadZone = document.getElementById("uploadZone");

  stopVideoProcessing();
  video.src = "";
  videoContainer.style.display = "none";
  uploadZone.style.display = "flex";

  const videoInput = document.getElementById("videoInput");
  videoInput.value = "";
}

let videoFrameCount = 0;

async function processVideoFrame(video, canvas) {
  if (!video.videoWidth || !video.videoHeight || video.paused) return;

  videoFrameCount++;
  if (videoFrameCount % FRAME_SKIP !== 0) return;


  const now = Date.now();
  if (now - lastVideoSent < MIN_FRAME_INTERVAL_MS) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(
    async (blob) => {

      if (!blob || !isProcessingVideo || video.paused) return;

      const formData = new FormData();
      formData.append("image", blob, "video_frame.jpg");
      formData.append("mode", "video");

      try {

        lastVideoSent = Date.now();


        const annotatedCheckbox = document.getElementById("annotatedCheckbox");
        const wantAnnotated = annotatedCheckbox && annotatedCheckbox.checked;
        if (wantAnnotated) formData.append("annotated", "true");
        else formData.append("annotated", "false");

        const response = await fetch("/detect", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success && isProcessingVideo && !video.paused) {
          if (data.image) {
            const processedImg = "data:image/jpeg;base64," + data.image;
            video.style.display = "none";
            canvas.style.display = "block";
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = processedImg;
          } else if (data.detections) {
            video.style.display = "none";
            canvas.style.display = "block";
            drawDetections(ctx, data.detections);
          }
        }
      } catch (error) {
        console.error("Detection error:", error);
      }
    },
    "image/jpeg",
    0.5
  );
}
