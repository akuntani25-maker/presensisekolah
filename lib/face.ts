// Pemuat face-api (hanya di browser). Model dimuat sekali dari /models.
let loading: Promise<any> | null = null;

export function loadFaceApi(): Promise<any> {
  if (!loading) {
    loading = (async () => {
      const faceapi: any = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      return faceapi;
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

export async function startCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream?: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export const DETECTOR_OPTS = (faceapi: any) => new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
