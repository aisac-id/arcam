// MediaPipe FaceMesh wrapper — fully local WASM, throttled async pump.

export class FaceTracker {
  constructor(onStatus) {
    this.landmarks = null;
    this.lastSeen = 0;
    this.busy = false;
    this.ready = false;
    this.enabled = true;
    this.onStatus = onStatus;
    this.mesh = null;
  }

  async init() {
    try {
      if (typeof FaceMesh === "undefined") throw new Error("FaceMesh script missing");
      this.mesh = new FaceMesh({
        locateFile: (f) => `vendor/face_mesh/${f}`,
      });
      this.mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.mesh.onResults((res) => {
        if (res.multiFaceLandmarks && res.multiFaceLandmarks.length) {
          this.landmarks = res.multiFaceLandmarks[0];
          this.lastSeen = performance.now();
        }
      });
      if (this.mesh.initialize) await this.mesh.initialize();
      this.ready = true;
      this.onStatus("searching");
    } catch (e) {
      console.warn("Face tracking unavailable:", e);
      this.ready = false;
      this.onStatus("off");
    }
  }

  // Call from the render loop; internally throttled & non-blocking.
  pump(source) {
    if (!this.ready || !this.enabled || this.busy || !source) return;
    this.busy = true;
    this.mesh.send({ image: source })
      .catch(() => {})
      .finally(() => { this.busy = false; });
  }

  // Landmarks fresh within 600ms count as a live face.
  fresh() {
    return this.enabled && this.landmarks && performance.now() - this.lastSeen < 600;
  }
}