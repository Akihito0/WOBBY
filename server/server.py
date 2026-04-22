import asyncio
import websockets
import json
import cv2
import mediapipe as mp
import numpy as np
import time
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaRelay

mp_pose = mp.solutions.pose
# Changed model_complexity to 0 for much faster processing, 
# and min_tracking_confidence to 0.5 to reduce jitter and excessive re-detection.
pose = mp_pose.Pose(
    model_complexity=0, 
    smooth_landmarks=True,
    min_detection_confidence=0.5, 
    min_tracking_confidence=0.5
)

relay = MediaRelay()

class PoseVideoTrack(VideoStreamTrack):
    """
    A video track that receives frames from the phone, processes them with MediaPipe,
    and we could theoretically send video back. For now we just process.
    """
    def __init__(self, track, websocket):
        super().__init__()
        self.track = track
        self.websocket = websocket
        self.processing = False      # NEW: Flag to skip frames
        self.last_landmarks = []     # NEW: Cache for repeating landmarks

    async def recv(self):
        # 1. Grab raw video frame from network
        frame = await self.track.recv()
        
        # SKIP if still processing previous frame
        if self.processing:
            # Send cached landmarks to keep UI responsive
            if self.last_landmarks and getattr(self.websocket, "open", True):
                try:
                    await self.websocket.send(json.dumps({
                        "type": "pose",
                        "landmarks": self.last_landmarks,
                        "timestamp": time.time()
                    }))
                except:
                    pass
            return frame
        
        self.processing = True
        try:
            # 2. Convert directly to RGB (Skips OpenCV CPU color conversion!)
            img_rgb = frame.to_ndarray(format="rgb24")
            
            # 3. Offload MediaPipe processing to a background thread so the core Python async event loop 
            #    doesn't "choke" on math calculations and let incoming UDP video frames pile up in a delayed queue!
            results = await asyncio.to_thread(pose.process, img_rgb)

            landmarks_data = []
            if results.pose_landmarks:
                for lm in results.pose_landmarks.landmark:
                    # 4. Round values to 3 decimals to drastically shrink the JSON payload and speed up Wi-Fi transfer
                    landmarks_data.append({
                        "x": round(lm.x, 3),
                        "y": round(lm.y, 3),
                        "visibility": round(lm.visibility, 2)
                    })

            # Cache for frame drops
            self.last_landmarks = landmarks_data

            # Send landmarks directly back via the WebSocket signaling channel instantly
            if getattr(self.websocket, "open", True):
                try:
                    response = {
                        "type": "pose",
                        "landmarks": landmarks_data, # Send empty arrays too so phone doesn't freeze
                        "timestamp": time.time()
                    }
                    await self.websocket.send(json.dumps(response))
                except Exception as e:
                    print("Error sending landmarks", e)
                
            return frame
        finally:
            self.processing = False

async def handler(websocket):
    print("New WebRTC Signaling Client Connected")
    pc = RTCPeerConnection()
    
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"WebRTC Connection State changed to: {pc.connectionState}")
        
    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            print("Video track received from phone!")
            local_video = PoseVideoTrack(relay.subscribe(track), websocket)
            pc.addTrack(local_video)

    try:
        async for message in websocket:
            data = json.loads(message)
            
            if data["type"] == "offer":
                offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                await pc.setRemoteDescription(offer)
                
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                
                await websocket.send(json.dumps({
                    "type": "answer",
                    "sdp": pc.localDescription.sdp
                }))
                
            elif data["type"] == "ice-candidate":
                # Add ICE candidates if needed by your network
                pass
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        await pc.close()

async def main():
    print("Starting WebRTC Signaling Server on ws://0.0.0.0:8765")
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())