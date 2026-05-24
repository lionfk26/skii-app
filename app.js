const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const statusBox = document.getElementById("status");
const issuesList = document.getElementById("issues");

const startBtn = document.getElementById("startBtn");
const scanBtn = document.getElementById("scanBtn");

let stream;

startBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      }
    });

    video.srcObject = stream;

    await video.play();

    statusBox.textContent = "Camera started.";
  } catch (err) {
    console.error(err);
    statusBox.textContent = "Could not access camera.";
  }
});

scanBtn.addEventListener("click", async () => {
  if (!stream) {
    statusBox.textContent = "Start the camera first.";
    return;
  }

  statusBox.textContent = "Scanning keyboard...";
  issuesList.innerHTML = "";

  const tempCanvas = document.createElement("canvas");
  const ctx = tempCanvas.getContext("2d");

  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);

  const imageDataUrl = tempCanvas.toDataURL("image/png");

  const result = await Tesseract.recognize(
    imageDataUrl,
    "eng",
    {
      logger: m => {
        if (m.status) {
          statusBox.textContent = m.status;
        }
      }
    }
  );

  const words = result.data.words || [];

  overlay.width = tempCanvas.width;
  overlay.height = tempCanvas.height;

  const overlayCtx = overlay.getContext("2d");
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  let foundIssues = 0;

  for (const word of words) {
    const text = (word.text || "").trim();

    if (!text || text.length > 2) continue;

    const { x0, y0, x1, y1 } = word.bbox;

    const width = x1 - x0;
    const height = y1 - y0;

    // Crop each key area
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = width;
    cropCanvas.height = height;

    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(
      tempCanvas,
      x0, y0, width, height,
      0, 0, width, height
    );

    // Rotate 180Â°
    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = width;
    rotatedCanvas.height = height;

    const rctx = rotatedCanvas.getContext("2d");

    rctx.translate(width / 2, height / 2);
    rctx.rotate(Math.PI);
    rctx.drawImage(cropCanvas, -width / 2, -height / 2);

    const normalResult = await Tesseract.recognize(
      cropCanvas.toDataURL(),
      "eng"
    );

    const rotatedResult = await Tesseract.recognize(
      rotatedCanvas.toDataURL(),
      "eng"
    );

    const normalConfidence = normalResult.data.confidence || 0;
    const rotatedConfidence = rotatedResult.data.confidence || 0;

    // If OCR reads rotated version more confidently,
    // the key is probably upside-down.
    if (rotatedConfidence > normalConfidence + 10) {
      foundIssues++;

      overlayCtx.strokeStyle = "red";
      overlayCtx.lineWidth = 4;
      overlayCtx.strokeRect(x0, y0, width, height);

      const item = document.createElement("li");
      item.className = "issue";
      item.textContent =
        `Possible backwards key: "${text}" at (${x0}, ${y0})`;

      issuesList.appendChild(item);
    }
  }

  if (foundIssues === 0) {
    const item = document.createElement("li");
    item.className = "ok";
    item.textContent = "No backwards keys detected.";

    issuesList.appendChild(item);
  }

  statusBox.textContent = "Scan complete.";
});
