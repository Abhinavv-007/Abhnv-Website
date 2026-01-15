const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start-btn');
const startOverlay = document.getElementById('start-overlay');
const catImage = document.getElementById('cat-result');
const expressionLabel = document.getElementById('expression-label');

// Thresholds (Ported from Python)
// Note: JS FaceMesh coordinates might scale differently depending on usage, 
// but since we normalized logic in Python (landmark.y differences), it should be similar raw.
// However, Python used normalized coordinates directly, so let's stick to that.
const EYE_OPENING_THRESHOLD = 0.025;
const MOUTH_OPEN_THRESHOLD = 0.05; // Slightly adjusted for JS sensitivity
const SQUINTING_THRESHOLD = 0.018;

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,
                { color: '#C0C0C070', lineWidth: 1 });

            // Logic Port
            const detectedState = detectExpression(landmarks);
            updateUI(detectedState);
        }
    }
    canvasCtx.restore();
}

function detectExpression(landmarks) {
    // Indices (same as Python / MP Standard)
    const LEFT_EYE_TOP = 159;
    const LEFT_EYE_BOTTOM = 145;
    const RIGHT_EYE_TOP = 386;
    const RIGHT_EYE_BOTTOM = 374;

    // Lips
    const TOP_LIP = 13;
    const BOTTOM_LIP = 14;

    const lTop = landmarks[LEFT_EYE_TOP];
    const lBot = landmarks[LEFT_EYE_BOTTOM];
    const rTop = landmarks[RIGHT_EYE_TOP];
    const rBot = landmarks[RIGHT_EYE_BOTTOM];

    const topLip = landmarks[TOP_LIP];
    const botLip = landmarks[BOTTOM_LIP];

    // Calculations (Absolute Y Start - Y End)
    const eyeOpening = (Math.abs(lTop.y - lBot.y) + Math.abs(rTop.y - rBot.y)) / 2.0;
    const mouthOpen = Math.abs(topLip.y - botLip.y);

    if (mouthOpen > MOUTH_OPEN_THRESHOLD) {
        return 'TONGUE';
    } else if (eyeOpening > EYE_OPENING_THRESHOLD) {
        return 'SHOCK';
    } else if (eyeOpening < SQUINTING_THRESHOLD) {
        return 'GLARE';
    } else {
        return 'NEUTRAL';
    }
}

function updateUI(state) {
    let src = 'assets/larry.jpeg';
    let label = 'NEUTRAL';

    switch (state) {
        case 'TONGUE':
            src = 'assets/cat-tongue.jpeg';
            label = 'TONGUE / MEOW';
            break;
        case 'SHOCK':
            src = 'assets/cat-shock.jpeg';
            label = 'SHOCK';
            break;
        case 'GLARE':
            src = 'assets/cat-glare.jpeg';
            label = 'GLARE';
            break;
        default:
            src = 'assets/larry.jpeg';
            label = 'NEUTRAL';
    }

    // Optimization: Only update if source changes to prevent flickering (though browser handles cache)
    if (!catImage.src.includes(src)) {
        catImage.src = src;
        expressionLabel.innerText = label;

        // Trigger animation
        catImage.style.animation = 'none';
        catImage.offsetHeight; /* trigger reflow */
        catImage.style.animation = 'popIn 0.2s ease-out';
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
    width: 640,
    height: 480
});

// Start
startBtn.addEventListener('click', () => {
    startOverlay.style.opacity = '0';
    setTimeout(() => {
        startOverlay.style.display = 'none';
        camera.start();
    }, 500);
});

// Responsive resize
function resizeCanvas() {
    // Canvas sizing handled by CSS mainly, but for drawing:
    canvasElement.width = videoElement.videoWidth || 640;
    canvasElement.height = videoElement.videoHeight || 480;
}
window.addEventListener('resize', resizeCanvas);
videoElement.addEventListener('loadeddata', resizeCanvas);
