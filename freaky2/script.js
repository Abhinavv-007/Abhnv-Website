const videoElement = document.getElementsByClassName('input_video')[0];
const eyesGif = document.getElementById('eyesGif');
const tongueGif = document.getElementById('tongueGif');
const instructionText = document.getElementById('instruction');

// Tuning Thresholds for GESTURES
const EYE_CLOSED_THRESHOLD = 0.015;
const TONGUE_THRESHOLD = 0.045; // Trying a value between 0.03 (FP) and 0.06 (FN)
// Removed MOUTH_OPEN_CONTEXT as it might block detection if tongue occludes lips

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
        // Calculate mouth openness first
        const upperLipBot = landmarks[13];
        const lowerLipTop = landmarks[14];
        const mouthDist = Math.abs(upperLipBot.y - lowerLipTop.y) / faceHeight;

        // 16 is inner lip, 14 is lower lip top.
        const lipDiff = (landmarks[16].y - landmarks[14].y) / faceHeight;

        // Dynamic Threshold:
        // If mouth is wide open, we need MORE sensitivity (lower threshold) because 
        // the lip landmarks stretch apart and might hide the inner lip relative drop.
        let dynamicThreshold = 0.05; // Base threshold (strict for neutral)

        if (mouthDist > 0.08) {
            dynamicThreshold = 0.025; // Wide open -> very sensitive
        } else if (mouthDist > 0.03) {
            dynamicThreshold = 0.035; // Slightly open -> sensitive
        }

        const isTongueOutRaw = lipDiff > dynamicThreshold;

        // User requested to "start tongue out when I open my mouth twice as of right now"
        // This likely means enforcing a minimum mouth openness.
        // We gate the tongue detection with a stricter mouthDist check.
        // Previously we had no gate. Now we require ~0.05 opening.
        const isTongueOut = isTongueOutRaw && (mouthDist > 0.05);

        // console.log(`LipDiff: ${lipDiff.toFixed(4)}, Mouth: ${mouthDist.toFixed(4)}, Thresh: ${dynamicThreshold}`);

        // console.log(`LipDiff: ${lipDiff.toFixed(4)}`);

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
