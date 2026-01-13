const videoElement = document.getElementsByClassName('input_video')[0];
const rewardVideo = document.getElementById('rewardVideo');
const instructionText = document.getElementById('instruction');

// Constants for mouth detection
// Upper lip bottom: 13
// Lower lip top: 14
// We can also use face height to normalize.
const MOUNT_OPEN_THRESHOLD = 0.05; // Adjust based on testing
let isMouthOpen = false;

function onResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    
    // Keypoints
    const upperLipBot = landmarks[13];
    const lowerLipTop = landmarks[14];
    
    // Calculate distance
    const distance = Math.abs(upperLipBot.y - lowerLipTop.y);
    
    // Check if mouth is open
    // Ideally we normalize this by face height (e.g., forehead to chin) to handle distance from camera
    // But for a simple "freak detector" close-up, raw Y diff might suffice or a simple normalization.
    // Let's normalize by face height just to be safe.
    const faceTop = landmarks[10];
    const faceBot = landmarks[152];
    const faceHeight = Math.abs(faceTop.y - faceBot.y);
    
    const normalizedOpen = distance / faceHeight;

    if (normalizedOpen > MOUNT_OPEN_THRESHOLD) {
        if (!isMouthOpen) {
            isMouthOpen = true;
            handleMouthStateChange(true);
        }
    } else {
        if (isMouthOpen) {
            isMouthOpen = false;
            handleMouthStateChange(false);
        }
    }
  }
}

function handleMouthStateChange(isOpen) {
    if (isOpen) {
        // Mouth opened
        instructionText.classList.add('hidden');
        rewardVideo.classList.add('active');
        rewardVideo.play();
    } else {
        // Mouth closed
        instructionText.classList.remove('hidden');
        rewardVideo.classList.remove('active');
        rewardVideo.pause();
    }
}

const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 1280,
  height: 720
});

camera.start();
