const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start-btn');
const startOverlay = document.getElementById('start-overlay');
const spamContainer = document.getElementById('spam-container');
const audio = document.getElementById('charlie-audio');
audio.volume = 1.0;

let timerStarted = null;
let playing = false;
let spamInterval = null; // To control the infinite spam

const LOWER_BOUND = 0.35;
const UPPER_BOUND = 0.65;
const TIMER_DURATION = 500; // 0.5 seconds

// Smoothing variables
const HISTORY_SIZE = 5;
const ratioHistory = [];

const spamImages = [
    'assets/spam/image-1.jpg',
    'assets/spam/image-2.png',
    'assets/spam/image-3.jpg',
    'assets/spam/image-4.png'
];

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Draw mesh (optional, but good for feedback)
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,
                { color: '#C0C0C070', lineWidth: 1 });

            // Indices
            const LEFT_EYE_TOP = 159;
            const LEFT_EYE_BOTTOM = 145;
            const LEFT_IRIS = 468;

            const RIGHT_EYE_TOP = 386;
            const RIGHT_EYE_BOTTOM = 374;
            const RIGHT_IRIS = 473;

            const lIris = landmarks[LEFT_IRIS];
            const lTop = landmarks[LEFT_EYE_TOP];
            const lBottom = landmarks[LEFT_EYE_BOTTOM];

            const rIris = landmarks[RIGHT_IRIS];
            const rTop = landmarks[RIGHT_EYE_TOP];
            const rBottom = landmarks[RIGHT_EYE_BOTTOM];

            // Ratio calculation
            // Python: (l_iris.y - left[1].y) / (left[0].y - left[1].y)
            // left[1] is Top (159), left[0] is Bottom (145)
            const lRatioRaw = (lIris.y - lTop.y) / (lBottom.y - lTop.y);
            const rRatioRaw = (rIris.y - rTop.y) / (rBottom.y - rTop.y);

            // SMOOTHING LOGIC
            const avgRaw = (lRatioRaw + rRatioRaw) / 2;
            ratioHistory.push(avgRaw);
            if (ratioHistory.length > HISTORY_SIZE) {
                ratioHistory.shift();
            }
            const smoothedRatio = ratioHistory.reduce((a, b) => a + b, 0) / ratioHistory.length;

            // Visualization
            const drawPoint = (pt, color) => {
                const x = pt.x * canvasElement.width;
                const y = pt.y * canvasElement.height;
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
                canvasCtx.fillStyle = color;
                canvasCtx.fill();
            };

            // Strict Focus / Not Staring at Screen Logic
            // Center is roughly 0.5. 
            // Looking Down > 0.65
            // Looking Up < 0.35
            const LOWER_BOUND = 0.35;
            const UPPER_BOUND = 0.65;
            const TIMER_DURATION = 500; // 0.5 seconds for faster testing

            // Debug Text & HUD
            const debugDiv = document.getElementById('debug-info');
            const statusLabel = document.getElementById('system-status');

            // Format debug info
            debugDiv.innerText = `>> TELEMETRY\n   L: ${smoothedRatio.toFixed(3)}\n   R: ${smoothedRatio.toFixed(3)}\n   ZONE: [${LOWER_BOUND}-${UPPER_BOUND}]`;

            // Draw points for verification
            drawPoint(lTop, 'cyan');
            drawPoint(lBottom, 'cyan');
            drawPoint(lIris, 'red');
            drawPoint(rTop, 'yellow');
            drawPoint(rBottom, 'yellow');
            drawPoint(rIris, 'red');

            const current = Date.now();

            // Check if OUTSIDE safe range (Not Staring at Screen)
            const isLookingAway = (smoothedRatio < LOWER_BOUND || smoothedRatio > UPPER_BOUND);

            if (isLookingAway) {
                statusLabel.innerText = "DISTRACTION DETECTED";
                statusLabel.style.color = "var(--primary)";
                statusLabel.classList.remove('blink');

                // Add urgent text to console
                debugDiv.innerText += "\n>> ALERT: FOCUS LOST";

                if (timerStarted === null) {
                    timerStarted = current;
                }

                if ((current - timerStarted) >= TIMER_DURATION) {
                    if (!playing) {
                        triggerSpam();
                    }
                }
            } else {
                statusLabel.innerText = "MONITORING ACTIVE";
                statusLabel.style.color = "var(--secondary)";
                statusLabel.classList.add('blink');

                debugDiv.innerText += "\n>> SYSTEM OPTIMAL";

                timerStarted = null;
                if (playing) {
                    stopSpam();
                }
            }
        }
    }
    canvasCtx.restore();
}

function triggerSpam() {
    playing = true;
    audio.play().catch(e => console.error("Audio play failed:", e));

    // Start indefinite spawning
    if (!spamInterval) {
        spamInterval = setInterval(() => {
            const randomSrc = spamImages[Math.floor(Math.random() * spamImages.length)];
            spawnImage(randomSrc);
        }, 100); // New image every 100ms
    }
}

function stopSpam() {
    playing = false;
    audio.pause();
    audio.currentTime = 0;

    // Stop spawning
    if (spamInterval) {
        clearInterval(spamInterval);
        spamInterval = null;
    }
    spamContainer.innerHTML = '';
}

function spawnImage(src) {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'spam-image';

    // Random position
    const x = Math.random() * (window.innerWidth - 200); // minus width roughly
    const y = Math.random() * (window.innerHeight - 200);

    img.style.left = `${x}px`;
    img.style.top = `${y}px`;

    spamContainer.appendChild(img);
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

// Camera Setup
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

// Start Button Logic
startBtn.addEventListener('click', () => {
    startOverlay.style.display = 'none';
    audio.play().then(() => {
        audio.pause(); // Initialize audio context
        audio.currentTime = 0;
    });
    camera.start();
});

// Resize canvas
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
