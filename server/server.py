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
        
        # Initialize an ISOLATED MediaPipe Pose instance for this specific video track
        self.pose = mp_pose.Pose(
            model_complexity=0, 
            smooth_landmarks=True,
            min_detection_confidence=0.5, 
            min_tracking_confidence=0.5,
            static_image_mode=False
        )

    async def recv(self):
        # 1. Grab raw video frame from network
        frame = await self.track.recv()
        
        # SKIP if still processing previous frame
        # This is CRITICAL for hotspots to prevent "queue backup" (latency buildup)
        if self.processing:
            return frame
        
        self.processing = True
        try:
            # Drop frames if we are behind to ensure "real-time" feel
            # This is a simple frame-skipping logic for high-latency environments
            img_rgb = frame.to_ndarray(format="rgb24")
            
            # 3. Offload MediaPipe processing to a background thread so the core Python async event loop 
            #    doesn't "choke" on math calculations and let incoming UDP video frames pile up in a delayed queue!
            results = await asyncio.to_thread(self.pose.process, img_rgb)

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
    from aiortc import RTCConfiguration, RTCIceServer
    config = RTCConfiguration(iceServers=[RTCIceServer(urls=["stun:stun.l.google.com:19302"])])
    pc = RTCPeerConnection(configuration=config)
    
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"WebRTC Connection State changed to: {pc.connectionState}")
        if pc.connectionState in ["failed", "closed"]:
            await pc.close()
        
    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            print(f"Video track received from phone: {track.id}")
            local_video = PoseVideoTrack(relay.subscribe(track), websocket)
            pc.addTrack(local_video)

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data["type"] == "offer":
                    # Debug: Print offer details
                    print(f"Received offer, state is: {pc.signalingState}")
                    offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                    await pc.setRemoteDescription(offer)
                    
                    answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    
                    await websocket.send(json.dumps({
                        "type": "answer",
                        "sdp": pc.localDescription.sdp
                    }))
                    print("Sent answer to client")
                    
                elif data["type"] == "ice-candidate":
                    # Fixed: Properly handle ICE candidates
                    candidate_data = data.get("candidate")
                    if candidate_data and pc.remoteDescription is not None:
                        try:
                            from aiortc import RTCIceCandidate
                            
                            # Handle both object and flattened formats
                            if isinstance(candidate_data, dict):
                                cand = candidate_data.get("candidate")
                                sdpMid = candidate_data.get("sdpMid")
                                sdpMLineIndex = candidate_data.get("sdpMLineIndex")
                            else:
                                # Fallback if candidate is passed differently
                                cand = candidate_data
                                sdpMid = data.get("sdpMid")
                                sdpMLineIndex = data.get("sdpMLineIndex")

                            if cand:
                                ice_candidate = RTCIceCandidate(
                                    candidate=cand,
                                    sdpMid=sdpMid,
                                    sdpMLineIndex=sdpMLineIndex
                                )
                                await pc.addIceCandidate(ice_candidate)
                                print("Added ICE candidate")
                        except Exception as e:
                            print(f"Error adding ICE candidate: {e}")
                    else:
                        # If remote description isn't set yet, we should ideally queue these,
                        # but often skipping them initially is okay if enough follow.
                        pass
            except Exception as e:
                import traceback
                print(f"Error processing message: {e}")
                traceback.print_exc()
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    except Exception as e:
        print(f"Unexpected handler error: {e}")
    finally:
        await pc.close()

async def main():
    print("Starting WebRTC Signaling Server on ws://0.0.0.0:8765")
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())