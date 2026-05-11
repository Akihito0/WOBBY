/**
 * WebRTC Manager — Global Singleton
 * 
 * Manages the WebSocket + RTCPeerConnection lifecycle outside of React component state.
 * The connection persists across screen navigations within the Workout stack.
 * ActiveWorkoutScreen registers/unregisters a pose callback when it mounts/unmounts.
 */
import { mediaDevices, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Point = { x: number; y: number; conf: number };
export type Pose = {
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftWrist: Point;
  rightWrist: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  leftAnkle: Point;
  rightAnkle: Point;
};

type PoseCallback = (pose: Pose) => void;
type StatusCallback = (status: { isConnected: boolean; isServerReady: boolean }) => void;

class WebRTCManager {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private stream: any = null;
  private _isConnected = false;
  private _isServerReady = false;
  private _cameraFacing: 'front' | 'back' = 'front';

  // Callback registries — screens register/unregister
  private poseCallback: PoseCallback | null = null;
  private statusCallback: StatusCallback | null = null;
  private streamCallback: ((stream: any) => void) | null = null;

  // Smoothing state
  private lastPose: Pose | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  get isServerReady(): boolean {
    return this._isServerReady;
  }

  get localStream(): any {
    return this.stream;
  }

  get cameraFacing(): 'front' | 'back' {
    return this._cameraFacing;
  }

  // Register callbacks from ActiveWorkoutScreen
  registerPoseCallback(cb: PoseCallback) {
    this.poseCallback = cb;
  }

  unregisterPoseCallback() {
    this.poseCallback = null;
  }

  registerStatusCallback(cb: StatusCallback) {
    this.statusCallback = cb;
  }

  unregisterStatusCallback() {
    this.statusCallback = null;
  }

  registerStreamCallback(cb: (stream: any) => void) {
    this.streamCallback = cb;
    // If stream already exists, notify immediately
    if (this.stream) {
      cb(this.stream);
    }
  }

  unregisterStreamCallback() {
    this.streamCallback = null;
  }

  private notifyStatus() {
    this.statusCallback?.({
      isConnected: this._isConnected,
      isServerReady: this._isServerReady,
    });
  }

  /**
   * Connect to the WebRTC signaling server.
   * If already connected, this is a no-op (unless camera facing changed).
   */
  async connect(facing: 'front' | 'back' = 'front') {
    // If already connected with same facing, skip
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this._cameraFacing === facing) {
      console.log('[WebRTCManager] Already connected, skipping.');
      this.notifyStatus();
      if (this.stream) {
        this.streamCallback?.(this.stream);
      }
      return;
    }

    // If camera facing changed, tear down and reconnect
    if (this._cameraFacing !== facing && this.ws) {
      console.log('[WebRTCManager] Camera facing changed, reconnecting...');
      this.disconnect();
    }

    this._cameraFacing = facing;

    try {
      const isFront = facing === 'front';
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: isFront ? 'user' : 'environment',
          frameRate: 20,
          width: 480,
          height: 360,
        },
      });
      this.stream = stream;
      this.streamCallback?.(stream);

      const serverUrl = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://192.168.1.40:8765';
      console.log(`[WebRTCManager] Connecting to: ${serverUrl}`);

      // Adding headers to bypass ngrok free tier interstitial
      const socket = new (WebSocket as any)(serverUrl, null, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'WobbyApp/1.0',
        },
      });
      this.ws = socket;

      socket.onopen = async () => {
        this._isConnected = true;
        this.notifyStatus();
        console.log('[WebRTCManager] WebSocket Connected!');

        this.pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        }) as any;

        if (!this.pc) return;

        (this.pc as any).onicecandidate = (event: any) => {
          if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate,
              })
            );
          }
        };

        stream.getTracks().forEach((track: any) => this.pc?.addTrack(track, stream));

        const offer = await this.pc.createOffer({});
        await this.pc.setLocalDescription(offer);

        // 🚀 TRICKLE ICE: Send offer IMMEDIATELY, don't wait for ICE gathering.
        // ICE candidates will be sent separately via onicecandidate handler above.
        // This eliminates the 30-60s delay caused by waiting for STUN resolution.
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('[WebRTCManager] Sending SDP offer immediately (trickle ICE)');
          this.ws.send(
            JSON.stringify({ type: 'offer', sdp: this.pc?.localDescription?.sdp })
          );
        }
      };

      socket.onerror = (e: any) => {
        console.log('[WebRTCManager] WebSocket Error:', e);
      };

      socket.onclose = () => {
        this._isConnected = false;
        this.notifyStatus();
        console.log('[WebRTCManager] WebSocket Closed');
      };

      socket.onmessage = async (e: any) => {
        const data = JSON.parse(e.data);
        if (data.type === 'answer') {
          await this.pc?.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === 'pose') {
          if (!data.landmarks || data.landmarks.length < 33) return;

          if (!this._isServerReady) {
            this._isServerReady = true;
            this.notifyStatus();
          }

          const lm = data.landmarks;
          const parsePoint = (i: number): Point => {
            let x = isFront ? 1 - lm[i].x : lm[i].x;
            return {
              x: x * SCREEN_WIDTH,
              y: lm[i].y * SCREEN_HEIGHT,
              conf: lm[i].visibility,
            };
          };

          const parsedPose: Pose = {
            leftShoulder: parsePoint(11),
            rightShoulder: parsePoint(12),
            leftElbow: parsePoint(13),
            rightElbow: parsePoint(14),
            leftWrist: parsePoint(15),
            rightWrist: parsePoint(16),
            leftHip: parsePoint(23),
            rightHip: parsePoint(24),
            leftKnee: parsePoint(25),
            rightKnee: parsePoint(26),
            leftAnkle: parsePoint(27),
            rightAnkle: parsePoint(28),
          };

          // Exponential moving average for smoothness
          const ALPHA = 0.5;
          const smooth = (curr: Point, prev: Point): Point => {
            if (curr.conf < 0.15) return { ...prev, conf: prev.conf * 0.85 };
            return {
              x: prev.x + ALPHA * (curr.x - prev.x),
              y: prev.y + ALPHA * (curr.y - prev.y),
              conf: curr.conf,
            };
          };

          let smoothedPose: Pose;
          if (this.lastPose) {
            smoothedPose = {
              leftShoulder: smooth(parsedPose.leftShoulder, this.lastPose.leftShoulder),
              rightShoulder: smooth(parsedPose.rightShoulder, this.lastPose.rightShoulder),
              leftElbow: smooth(parsedPose.leftElbow, this.lastPose.leftElbow),
              rightElbow: smooth(parsedPose.rightElbow, this.lastPose.rightElbow),
              leftWrist: smooth(parsedPose.leftWrist, this.lastPose.leftWrist),
              rightWrist: smooth(parsedPose.rightWrist, this.lastPose.rightWrist),
              leftHip: smooth(parsedPose.leftHip, this.lastPose.leftHip),
              rightHip: smooth(parsedPose.rightHip, this.lastPose.rightHip),
              leftKnee: smooth(parsedPose.leftKnee, this.lastPose.leftKnee),
              rightKnee: smooth(parsedPose.rightKnee, this.lastPose.rightKnee),
              leftAnkle: smooth(parsedPose.leftAnkle, this.lastPose.leftAnkle),
              rightAnkle: smooth(parsedPose.rightAnkle, this.lastPose.rightAnkle),
            };
          } else {
            smoothedPose = parsedPose;
          }
          this.lastPose = smoothedPose;

          // Only forward to the registered callback (ActiveWorkoutScreen)
          this.poseCallback?.(smoothedPose);
        }
      };
    } catch (err) {
      console.log('[WebRTCManager] Error:', err);
    }
  }

  /**
   * Fully disconnect and clean up all resources.
   * Call this when the workout session is completely over.
   */
  disconnect() {
    console.log('[WebRTCManager] Disconnecting...');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t: any) => t.stop());
      this.stream = null;
    }
    this._isConnected = false;
    this._isServerReady = false;
    this.lastPose = null;
    this.notifyStatus();
  }
}

// Export a singleton instance
export const webrtcManager = new WebRTCManager();
