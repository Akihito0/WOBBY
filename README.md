<div align="center">
  <img src="src/assets/loader.gif" width="100%" alt="Top Header GIF">
</div>

<img src="src/assets/wbby.png" width="100%" alt="Wobby Header">

## About Wobby
**Wobby** is a mobile-based fitness ecosystem designed to solve two of the biggest problems in home-based exercise: high injury risk and low user retention. Most fitness apps act as passive video libraries, but Wobby acts as your digital personal trainer.

**How it works:**
*   **Real-time Posture Analysis:** Wobby uses your device's camera to analyze your form while exercising, providing immediate corrective feedback.
*   **Personalized Workout Generation:** Based on your goals and fitness level, the app generates tailor-made routines to keep you engaged and progressing.
*   **Interactive Rep Counting:** The app automatically tracks your completed repetitions, so you can focus entirely on your form.
*   **Progress Tracking:** Visualized charts and history logs keep you informed on your consistency and improvements over time.

---

## Features
*   🤸 **AI-Powered Form Correction:** Prevents injuries by identifying and correcting bad posture in real-time.
*   🥊 **Versus Matchmaking:** Compete head-to-head with friends or other users in real-time fitness challenges to push your limits.
*   🎯 **Adaptive Fitness Plans:** Routines that adjust dynamically based on your ongoing performance and feedback.
*   🏆 **Gamified Milestones:** Earn badges and rewards to maintain high retention and stay motivated.
*   📊 **Comprehensive Analytics:** Track workouts, calories burned, and overall strength progression via an intuitive dashboard.
*   🔒 **Secure & Real-time Data Sync:** All your fitness data is safely stored and synchronized instantly across your devices.

---

## Tech Stack
| Layer | Technology | Purpose |
| :---: | :---: | :---: |
| **Runtime** | React Native | Cross-platform mobile framework for iOS and Android |
| **Tooling** | Expo | Development environment and build tools |
| **Language** | TypeScript / Python | Type-safe JS for UI; Python for AI models and backend logic |
| **AI & Computer Vision** | MediaPipe & TensorFlow | Real-time pose estimation, body tracking, and form correction |
| **Real-time Comm.** | WebRTC | Peer-to-peer video and data streaming for Versus Matchmaking |
| **Backend** | Supabase | Real-time database, authentication, and API |
| **Networking** | Ngrok | Secure network tunneling to expose the local Python server to the mobile app |
| **State Management** | React Context | Global state for user authentication and token management |

---

## Getting Started and Installation

Follow these steps to get a local copy of both the mobile app and the Python AI server up and running.

### 1. Clone the repository
```bash
git clone https://github.com/Akihito0/WOBBY.git
cd WOBBY
```

### 2. Setup the Python AI Server
Navigate to the server directory and start the Python script:
```bash
cd server
python server.py
```
*(Ensure you have the necessary Python packages installed globally or in your virtual environment, as this project does not use a `requirements.txt`).*

### 3. Expose the Server using Ngrok
Because the mobile app (running on a phone) needs to communicate with the Python AI server running on your computer, you must expose the local server using ngrok.

In a new terminal window, run ngrok on port `8765` (the port used by `server.py`):
```bash
ngrok http 8765
```
*Ngrok will output a Forwarding URL (e.g., `https://<random-id>.ngrok-free.app`). Copy this URL.*

### 4. Setup Mobile App Environment Variables
Navigate back to the root directory (or mobile app directory) and create a `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_API_URL=https://<random-id>.ngrok-free.app # Paste your ngrok forwarding URL here
EXPO_PUBLIC_MAPBOX_KEY=your-mapbox-api-key             # Add your Mapbox API key for location features
```

### 5. Install Mobile Dependencies & Run
Make sure you have Node.js installed, then run:
```bash
npm install
```

**Run the Application:**
For local network development (phone and computer on the same Wi-Fi):
```bash
npx expo start
```

**Running the App with Expo Tunneling:**
If your phone is on a different network or you are having IP address issues, you can tunnel the Expo development connection:
```bash
npx expo start --tunnel
```
*Note: If prompted, press `y` to install the `@expo/ngrok` package. This creates a secure tunnel allowing you to scan the QR code and connect via the Expo Go app anywhere.*

---

## Meet the Team

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Akihito0">
        <img src="https://github.com/Akihito0.png" width="100" height="100" alt="Akihito0" style="border-radius: 50%; object-fit: cover; background-color: white; padding: 5px;" />
        <br />
        <b>@Akihito0</b>
      </a>
      <br />
      Project Manager &<br>Full Stack Developer
    </td>
    <td align="center">
      <a href="https://github.com/Klipshin">
        <img src="https://github.com/Klipshin.png" width="100" height="100" alt="Klipshin" style="border-radius: 50%; object-fit: cover; background-color: white; padding: 5px;" />
        <br />
        <b>@Klipshin</b>
      </a>
      <br />
      Full Stack Developer
    </td>
    <td align="center">
      <a href="https://github.com/aptrai">
        <img src="https://github.com/aptrai.png" width="100" height="100" alt="aptrai" style="border-radius: 50%; object-fit: cover; background-color: white; padding: 5px;" />
        <br />
        <b>@aptrai</b>
      </a>
      <br />
      Full Stack Developer
    </td>
    <td align="center">
      <a href="https://github.com/clark2405">
        <img src="https://github.com/clark2405.png" width="100" height="100" alt="clark2405" style="border-radius: 50%; object-fit: cover; background-color: white; padding: 5px;" />
        <br />
        <b>@clark2405</b>
      </a>
      <br />
      Full Stack Developer
    </td>
    <td align="center">
      <a href="https://github.com/Twitzie">
        <img src="https://github.com/Twitzie.png" width="100" height="100" alt="Twitzie" style="border-radius: 50%; object-fit: cover; background-color: white; padding: 5px;" />
        <br />
        <b>@Twitzie</b>
      </a>
      <br />
      UI/UX Designer &<br>Full Stack Developer
    </td>
  </tr>
</table>

<div align="center">
  <img src="src/assets/loadLB.gif" width="100%" alt="Bottom Footer GIF">
</div>
