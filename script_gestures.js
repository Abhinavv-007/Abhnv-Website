const videoElement = document.getElementsByClassName('input_video')[0];
const eyesGif = document.getElementById('eyesGif');
const tongueGif = document.getElementById('tongueGif');
const instructionText = document.getElementById('instruction');

// Tuning Thresholds for GESTURES
const EYE_CLOSED_THRESHOLD = 0.015;
const TONGUE_THRESHOLD = 0.03; // Trying midway between 0.02 (always) and 0.04 (never)

let currentState = 'NEUTRAL';

function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const faceTop = landmarks[10];
        const faceBot = landmarks[152];
        const faceHeight = Math.abs(faceTop.y - faceBot.y);

        // 1. Eye Closure
        const leftEyeH = Math.abs(landmarks[159].y - landmarks[145].y) / faceHeight;
        const rightEyeH = Math.abs(landmarks[386].y - landmarks[374].y) / faceHeight;
        const avgEyeOpen = (leftEyeH + rightEyeH) / 2;
        const areEyesClosed = avgEyeOpen < EYE_CLOSED_THRESHOLD;

        // 2. Tongue Detection
        // 16 is inner lip, 14 is lower lip top.
        const lipDiff = (landmarks[16].y - landmarks[14].y) / faceHeight;
        const isTongueOut = lipDiff > TONGUE_THRESHOLD;

        // console.log(`LipDiff: ${lipDiff.toFixed(4)}, EyeOpen: ${avgEyeOpen.toFixed(4)}`);

        let newState = 'NEUTRAL';
        if (isTongueOut) {
            newState = 'TONGUE_OUT';
        } else if (areEyesClosed) {
            newState = 'EYES_CLOSED';
        }

        if (newState !== currentState) {
            currentState = newState;
            updateUI(currentState);
        }
    }
}

function updateUI(state) {
    eyesGif.classList.remove('active');
    tongueGif.classList.remove('active');
    instructionText.classList.remove('hidden');

    if (state === 'TONGUE_OUT') {
        tongueGif.classList.add('active');
        instructionText.classList.add('hidden');
    } else if (state === 'EYES_CLOSED') {
        eyesGif.classList.add('active');
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
