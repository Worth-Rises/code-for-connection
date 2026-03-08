import { useRef, useCallback, useEffect } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

/**
 * Processes a camera MediaStream to blur the background while keeping the
 * person (head + body) sharp. Returns a new MediaStream from a canvas.
 *
 * Usage:
 *   const { processedStream, start, stop } = useBlurBackground();
 *   // call start(cameraStream) to begin processing
 *   // use processedStream as the video source / WebRTC track
 *   // call stop() on cleanup
 */
export function useBlurBackground() {
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const animFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);

  // Lazy-init the segmenter
  async function getSegmenter(): Promise<ImageSegmenter> {
    if (segmenterRef.current) return segmenterRef.current;

    const resolver = await FilesetResolver.forVisionTasks(WASM_CDN);
    const segmenter = await ImageSegmenter.createFromOptions(resolver, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    segmenterRef.current = segmenter;
    return segmenter;
  }

  const renderLoop = useCallback(() => {
    if (!runningRef.current) return;

    const video = videoElRef.current;
    const canvas = canvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    const segmenter = segmenterRef.current;

    if (!video || !canvas || !tempCanvas || !segmenter || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      tempCanvas.width = w;
      tempCanvas.height = h;
    }

    const ctx = canvas.getContext('2d')!;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Run segmentation
    const result = segmenter.segmentForVideo(video, performance.now());
    const masks = result?.confidenceMasks;
    if (!masks || masks.length === 0) {
      // No mask — just draw the raw frame
      ctx.drawImage(video, 0, 0, w, h);
      animFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const maskData = masks[0].getAsFloat32Array();

    // Step 1: Draw blurred background to main canvas
    ctx.save();
    ctx.filter = 'blur(12px)';
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Step 2: Create person mask on temp canvas
    const maskImageData = tempCtx.createImageData(w, h);
    for (let i = 0; i < maskData.length; i++) {
      const alpha = Math.round(maskData[i] * 255);
      const o = i * 4;
      maskImageData.data[o] = 255;
      maskImageData.data[o + 1] = 255;
      maskImageData.data[o + 2] = 255;
      maskImageData.data[o + 3] = alpha;
    }
    tempCtx.putImageData(maskImageData, 0, 0);

    // Step 3: Draw sharp video masked by person silhouette
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(video, 0, 0, w, h);
    tempCtx.globalCompositeOperation = 'source-over';

    // Step 4: Composite sharp person onto blurred background
    ctx.drawImage(tempCanvas, 0, 0);

    // Close mask resources
    masks[0].close();

    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, []);

  /**
   * Start processing: feed in the raw camera stream,
   * returns a processed MediaStream with blurred background.
   */
  const start = useCallback(async (cameraStream: MediaStream): Promise<MediaStream> => {
    // Create hidden video element to read camera frames
    const video = document.createElement('video');
    video.srcObject = cameraStream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    videoElRef.current = video;

    // Create canvases
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvasRef.current = canvas;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvasRef.current = tempCanvas;

    // Init segmenter
    await getSegmenter();

    // Capture stream from canvas
    const processed = canvas.captureStream(30);
    // Carry over audio tracks from original stream
    for (const track of cameraStream.getAudioTracks()) {
      processed.addTrack(track);
    }
    processedStreamRef.current = processed;

    runningRef.current = true;
    animFrameRef.current = requestAnimationFrame(renderLoop);

    return processed;
  }, [renderLoop]);

  /** Stop processing and clean up. */
  const stop = useCallback(() => {
    runningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (videoElRef.current) {
      videoElRef.current.pause();
      videoElRef.current.srcObject = null;
      videoElRef.current = null;
    }
    canvasRef.current = null;
    tempCanvasRef.current = null;
    processedStreamRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      segmenterRef.current?.close();
      segmenterRef.current = null;
    };
  }, [stop]);

  return { start, stop, processedStreamRef };
}
