/**
 * Hand Gesture Tracking Module using MediaPipe Hands
 * Controls:
 * - Index finger controls pointer
 * - Swipe Left / Swipe Right triggers section navigation
 * - Pinch gesture triggers click on hovered elements
 */

class GestureController {
  constructor(options = {}) {
    this.onSwipeLeft = options.onSwipeLeft || (() => {});
    this.onSwipeRight = options.onSwipeRight || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    
    this.videoElement = document.getElementById("camera");
    this.pointerElement = document.getElementById("pointer");
    this.hudElement = document.getElementById("gesture-hud");
    
    this.stream = null;
    this.cameraInstance = null;
    this.handsInstance = null;
    this.isTracking = false;
    
    this.lastX = null;
    this.lastSwipeTime = 0;
    this.swipeCooldownMs = 850;
    this.swipeThreshold = 0.14; // Horizontal movement threshold
    
    this.targetPointerX = window.innerWidth / 2;
    this.targetPointerY = window.innerHeight / 2;
    this.currentPointerX = this.targetPointerX;
    this.currentPointerY = this.targetPointerY;
    this.isPinching = false;
    
    this.startInterpolationLoop();
  }

  showHud(text) {
    if (!this.hudElement) return;
    this.hudElement.textContent = text;
    this.hudElement.style.display = "block";
    clearTimeout(this.hudTimeout);
    this.hudTimeout = setTimeout(() => {
      this.hudElement.style.display = "none";
    }, 1200);
  }

  startInterpolationLoop() {
    const loop = () => {
      if (this.isTracking && this.pointerElement) {
        // Smooth lerp
        this.currentPointerX += (this.targetPointerX - this.currentPointerX) * 0.35;
        this.currentPointerY += (this.targetPointerY - this.currentPointerY) * 0.35;
        this.pointerElement.style.left = `${this.currentPointerX}px`;
        this.pointerElement.style.top = `${this.currentPointerY}px`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  async toggleTracking() {
    if (this.isTracking) {
      this.stop();
      return false;
    } else {
      return await this.start();
    }
  }

  async start() {
    this.onStatusChange("INITIALIZING", "Requesting webcam access...");
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      
      this.videoElement.srcObject = this.stream;
      this.videoElement.style.display = "block";
      await this.videoElement.play();

      this.onStatusChange("LOADING_MODEL", "Loading MediaPipe AI hand tracking...");
      await this.loadMediaPipe();

      this.isTracking = true;
      this.pointerElement.style.display = "block";
      this.onStatusChange("ACTIVE", "● HAND TRACKING ACTIVE (Swipe/Point/Pinch)");
      this.showHud("👋 GESTURE TRACKING READY");
      return true;
    } catch (err) {
      console.warn("Camera access error:", err);
      this.stop();
      let msg = "Camera unavailable";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Use buttons/keyboard.";
      } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
        msg = "Webcam requires HTTPS or localhost.";
      }
      this.onStatusChange("ERROR", msg);
      this.showHud("⚠️ " + msg);
      return false;
    }
  }

  stop() {
    this.isTracking = false;
    if (this.cameraInstance) {
      try { this.cameraInstance.stop(); } catch (e) {}
      this.cameraInstance = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.style.display = "none";
    }
    if (this.pointerElement) {
      this.pointerElement.style.display = "none";
    }
    this.lastX = null;
    this.onStatusChange("OFF", "● DEMO MODE · Camera Off");
    this.showHud("CAMERA DISABLED");
  }

  async loadMediaPipe() {
    if (window.Hands && window.Camera) {
      this.initHandsModel();
      return;
    }

    const loadScript = (url) => new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
    await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
    this.initHandsModel();
  }

  initHandsModel() {
    this.handsInstance = new Hands({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.handsInstance.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    this.handsInstance.onResults(results => this.handleHandResults(results));

    this.cameraInstance = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.isTracking && this.videoElement.readyState >= 2) {
          await this.handsInstance.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });

    this.cameraInstance.start();
  }

  handleHandResults(results) {
    if (!this.isTracking) return;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.lastX = null;
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    
    // Landmark 8: Index Fingertip
    const indexTip = landmarks[8];
    // Landmark 4: Thumb Tip
    const thumbTip = landmarks[4];
    // Landmark 0: Wrist (Center for swipe)
    const palmBase = landmarks[0];

    // Screen mapped coords (Mirrored horizontal for natural intuitive feel)
    this.targetPointerX = (1 - indexTip.x) * window.innerWidth;
    this.targetPointerY = indexTip.y * window.innerHeight;

    // Pinch detection: Distance between thumb tip and index tip
    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const isNowPinching = pinchDist < 0.06;

    if (isNowPinching && !this.isPinching) {
      this.isPinching = true;
      this.pointerElement.classList.add("pinching");
      this.triggerElementClickAt(this.targetPointerX, this.targetPointerY);
      this.showHud("🤏 PINCH SELECTED");
    } else if (!isNowPinching && this.isPinching) {
      this.isPinching = false;
      this.pointerElement.classList.remove("pinching");
    }

    // Swipe detection using palm base / index tip
    const now = Date.now();
    const currentX = palmBase.x;

    if (this.lastX !== null && (now - this.lastSwipeTime > this.swipeCooldownMs)) {
      const deltaX = currentX - this.lastX;

      // Note: Video is mirrored (scaleX(-1)), so:
      // Moving hand to right in camera view -> deltaX < 0
      // Moving hand to left in camera view -> deltaX > 0
      if (deltaX < -this.swipeThreshold) {
        this.lastSwipeTime = now;
        this.showHud("👉 SWIPE NEXT SECTION");
        this.onSwipeRight();
      } else if (deltaX > this.swipeThreshold) {
        this.lastSwipeTime = now;
        this.showHud("👈 SWIPE PREV SECTION");
        this.onSwipeLeft();
      }
    }

    this.lastX = currentX;
  }

  triggerElementClickAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const clickable = el.closest("button, a, .nav-tile, .card-panel, .tag-badge");
    if (clickable) {
      clickable.click();
    }
  }
}

window.GestureController = GestureController;

