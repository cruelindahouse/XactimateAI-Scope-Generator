
import { ExtractedData } from '../types';

/**
 * Orchestrates the extraction of frames and audio from a video file.
 */
export const extractMediaFromVideo = async (
  videoFile: File, 
  onProgress: (stage: string, percent: number) => void
): Promise<ExtractedData> => {
  
  onProgress('Initializing', 5);

  const videoUrl = URL.createObjectURL(videoFile);
  const video = (window as any).document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(null);
  });

  const duration = video.duration;
  
  // 1. Extract Frames (Visual Layer)
  onProgress('Scanning Visuals', 10);
  const frames = await extractFrames(video, duration, (p) => onProgress('Scanning Visuals', 10 + (p * 0.6))); // 10-70%

  // 2. Extract Audio (Audio Layer)
  onProgress('Extracting Audio', 75);
  const audio = await extractAudio(videoFile);
  onProgress('Finalizing', 95);

  URL.revokeObjectURL(videoUrl);

  return {
    frames,
    audio,
    duration
  };
};

/**
 * Extracts JPEGs every 2 seconds.
 */
const extractFrames = async (
  video: HTMLVideoElement, 
  duration: number, 
  onProgress: (percent: number) => void
): Promise<string[]> => {
  const canvas = (window as any).document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const frames: string[] = [];
  const INTERVAL = 2.0; // Seconds between frames
  
  // Target resolution: 480p (good enough for AI)
  const TARGET_HEIGHT = 480;
  const scale = TARGET_HEIGHT / (video as any).videoHeight;
  canvas.width = (video as any).videoWidth * scale;
  canvas.height = TARGET_HEIGHT;

  const totalFrames = Math.floor(duration / INTERVAL);
  let processed = 0;

  for (let time = 0; time < duration; time += INTERVAL) {
    (video as any).currentTime = time;
    await new Promise(r => {
      (video as any).onseeked = r; 
      // Safety timeout in case seek hangs
      setTimeout(r, 500); 
    });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Low quality JPEG is fine for AI analysis
      const base64 = canvas.toDataURL('image/jpeg', 0.6);
      // Strip header for cleaner array
      frames.push(base64.split(',')[1]);
    }

    processed++;
    onProgress(Math.min(1, processed / totalFrames));
  }

  return frames;
};

/**
 * Extracts Audio, downsamples to 16kHz Mono (Speech Optimized), returns WAV Base64.
 */
const extractAudio = async (file: File): Promise<string | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Resample to 16kHz (Sufficient for speech, saves 60%+ size)
    const TARGET_SAMPLE_RATE = 16000;
    const offlineCtx = new (window as any).OfflineAudioContext(1, audioBuffer.duration * TARGET_SAMPLE_RATE, TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    const resampledBuffer = await offlineCtx.startRendering();
    const wavBlob = bufferToWav(resampledBuffer);
    
    return await blobToBase64(wavBlob);
  } catch (e) {
    console.warn("Audio extraction failed (video might be silent):", e);
    return null;
  }
};

// WAV Encoding Helper (RIFF Header)
const bufferToWav = (abuffer: any) => {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // Write WAV Header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this encoder)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write Interleaved Data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // clamp
      sample = Math.max(-1, Math.min(1, channels[i][offset])); 
      // scale to 16-bit signed int
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
      view.setInt16(pos, sample, true); 
      pos += 2;
    }
    offset++; 
  }

  return new Blob([buffer], { type: 'audio/wav' });

  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Return raw base64 without prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
