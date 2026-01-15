# Charlie-Kirkification Web Port
This is a web-based version of the Charlie Kirkification CV productivity tool.

## How to Run

### Locally
1. You need a local server because of browser security confirmtaions for Webcam and MediaPipe.
2. Run the following command in this directory:
   ```bash
   python3 -m http.server
   ```
3. Open `http://localhost:8000` in your browser.

### Deployment
To use this on your website:
1. Copy all files in this `web` folder to your web server.
2. Ensure the `assets` folder is included.
3. That's it!

## Features
- **Doomscroll Detection**: Uses MediaPipe FaceMesh to detect when you look down.
- **Spam**: Pops up Charlie Kirk images when triggered.
- **Audio**: Plays the Charlie Kirk song.
