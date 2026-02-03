
import asyncio
import websockets
import sys

async def test_ws(uri, desc):
    print(f"--- Testing {desc} ---")
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}!")
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"Received: {msg}")
            except asyncio.TimeoutError:
                print("Timeout waiting for message (This implies Accepted)")
            except Exception as e:
                print(f"Receive error: {e}")
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"Connection failed to {uri} with status: {e.status_code}")
    except Exception as e:
        print(f"Connection error to {uri}: {e}")
    print("\n")

async def main():
    print("TESTING GENERATE QUIZ (Expected: Success)")
    await test_ws("ws://localhost:8000/ws/generate-quiz/test-client", "Quiz Gen")

    print("TESTING TRAINING (Expected: Success)")
    await test_ws("ws://localhost:8000/ws/training/1", "Training 1")
    
    # Invalid ID
    # await test_ws("ws://localhost:8000/ws/training/abc", "Invalid ID (abc)")

if __name__ == "__main__":
    asyncio.run(main())
