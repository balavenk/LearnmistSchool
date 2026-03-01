import asyncio
import websockets
import sys

async def debug_train(file_id):
    uri = f"ws://localhost:8000/upload/ws/train/{file_id}"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected.")
            while True:
                try:
                    message = await websocket.recv()
                    print(f"Received: {message}")
                    if "Error" in message or "DONE" in message:
                        break
                except websockets.exceptions.ConnectionClosed:
                    print("Connection closed.")
                    break
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    # ID 3 was found in previous debug script Step 1793
    asyncio.run(debug_train(3))
