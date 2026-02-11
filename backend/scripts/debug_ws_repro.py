import asyncio
import websockets
import json
import time

async def test_ws_crash():
    uri = "ws://127.0.0.1:8000/ws/generate-quiz/test_crash_client"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WS")
            
            # Send Generate Request with the crashing topic
            topic = "1.2.4 Double Displacement Reaction"
            req = {
                "action": "generate",
                "params": {
                    "topic": topic,
                    "grade_level": "Grade 10",
                    "difficulty": "Medium",
                    "question_count": 5,
                    "subject_id": 1, 
                    "class_id": 1,
                    "teacher_id": 1
                }
            }
            await websocket.send(json.dumps(req))
            print(f"Sent request for topic: {topic}")
            
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                # print(f"Received: {data}")
                
                if data.get('type') == 'progress':
                    print(f"[PROGRESS] {data.get('status')}")
                    if 'details' in data.get('details', {}):
                         pass # verbose
                elif data.get('type') == 'completed':
                    print(f"[SUCCESS] {data.get('message')}")
                    break
                elif data.get('type') == 'error':
                    print(f"[ERROR] {data.get('message')}")
                    print(f"Details: {data.get('data')}")
                    break
                elif data.get('type') == 'info':
                    print(f"[INFO] {data.get('message')}")

    except websockets.exceptions.ConnectionClosed as e:
        print(f"Connection closed unexpectedly: {e}")
    except Exception as e:
        print(f"Client Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws_crash())
