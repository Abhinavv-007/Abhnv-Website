const videoElement = document.getElementsByClassName('input_video')[0];
const rewardVideo = document.getElementById('rewardVideo');
const instructionText = document.getElementById('instruction');

const MOUTH_OPEN_THRESHOLD = 0.05;

let isMouthOpen = false;

function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const faceTop = landmarks[10];
        const faceBot = landmarks[152];
        const faceHeight = Math.abs(faceTop.y - faceBot.y);

        const upperLipBot = landmarks[13];
        const lowerLipTop = landmarks[14];
        const mouthDist = Math.abs(upperLipBot.y - lowerLipTop.y) / faceHeight;

        const isOpen = mouthDist > MOUTH_OPEN_THRESHOLD;

        if (isOpen !== isMouthOpen) {
            isMouthOpen = isOpen;
            updateUI(isMouthOpen);
        }
    }
}

function updateUI(open) {
    if (open) {
        rewardVideo.classList.add('active');
        rewardVideo.play();
        instructionText.classList.add('hidden');
    } else {
        rewardVideo.classList.remove('active');
        rewardVideo.pause();
        instructionText.classList.remove('hidden');
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
