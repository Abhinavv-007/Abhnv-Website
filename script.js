const videoElement = document.getElementsByClassName('input_video')[0];
const rewardVideo = document.getElementById('rewardVideo');
const eyesGif = document.getElementById('eyesGif');
const tongueGif = document.getElementById('tongueGif');
const instructionText = document.getElementById('instruction');

// Thresholds
const MOUTH_OPEN_THRESHOLD = 0.05;
const EYE_CLOSED_THRESHOLD = 0.015; // Slightly increased for better sensitivity
const TONGUE_THRESHOLD = 0.04; // Lowered from 0.08, but higher than 0.02

// State
let currentState = 'NEUTRAL'; // NEUTRAL, MOUTH_OPEN, EYES_CLOSED, TONGUE_OUT

function onResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // 1. Eye Closure Detection
    const faceTop = landmarks[10];
    const faceBot = landmarks[152];
    const faceHeight = Math.abs(faceTop.y - faceBot.y);

    const leftEyeH = Math.abs(landmarks[159].y - landmarks[145].y) / faceHeight;
    const rightEyeH = Math.abs(landmarks[386].y - landmarks[374].y) / faceHeight;
    const avgEyeOpen = (leftEyeH + rightEyeH) / 2;
    // Eyes are closed if open distance is very small
    const areEyesClosed = avgEyeOpen < EYE_CLOSED_THRESHOLD;

    // 2. Tongue Detection
    // Python script used landmark 16 - landmark 14 > 0.01
    // We normalize by faceHeight.
    // If tongue is always triggering, maybe 16 is naturally lower than 14?
    // Let's print debug values.
    const lipDiff = (landmarks[16].y - landmarks[14].y) / faceHeight;
    const isTongueOut = lipDiff > TONGUE_THRESHOLD;

    // Debugging current values
    console.log(`LipDiff: ${lipDiff.toFixed(4)} (Thresh: ${TONGUE_THRESHOLD}), EyeOpen: ${avgEyeOpen.toFixed(4)}`);

    // 3. Mouth Open Detection
    const upperLipBot = landmarks[13];
    const lowerLipTop = landmarks[14];
    const mouthDist = Math.abs(upperLipBot.y - lowerLipTop.y) / faceHeight;
    const isMouthOpen = mouthDist > MOUTH_OPEN_THRESHOLD;

    // Priority Logic: Tongue > Eyes > Mouth > Neutral
    let newState = 'NEUTRAL';

    if (isTongueOut) {
      newState = 'TONGUE_OUT';
    } else if (areEyesClosed) {
      newState = 'EYES_CLOSED';
    } else if (isMouthOpen) {
      newState = 'MOUTH_OPEN';
    }

    if (newState !== currentState) {
      currentState = newState;
      updateUI(currentState);
    }
  }
}

function updateUI(state) {
  // Reset all
  rewardVideo.classList.remove('active');
  eyesGif.classList.remove('active');
  tongueGif.classList.remove('active');
  rewardVideo.pause();
  instructionText.classList.remove('hidden');

  // Activate specific
  if (state === 'MOUTH_OPEN') {
    rewardVideo.classList.add('active');
    rewardVideo.play();
    instructionText.classList.add('hidden');
  } else if (state === 'EYES_CLOSED') {
    eyesGif.classList.add('active');
    instructionText.classList.add('hidden');
  } else if (state === 'TONGUE_OUT') {
    tongueGif.classList.add('active');
    instructionText.classList.add('hidden');
  }
}

const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera.start();
