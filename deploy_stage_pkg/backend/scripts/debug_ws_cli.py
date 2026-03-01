import asyncio
import websockets
import json
import time

async def test_ws():
    uri = "ws://127.0.0.1:8000/ws/generate-quiz/test_client_1"
    async with websockets.connect(uri) as websocket:
        print("Connected to WS")
        
        # Send Generate Request
        req = {
            "action": "generate",
            "params": {
                "topic": "The French Revolution",
                "grade_level": "Grade 10",
                "difficulty": "Medium",
                "question_count": 3,
                "subject_id": 1, 
                "class_id": 1,
                "teacher_id": 1
            }
        }
        await websocket.send(json.dumps(req))
        print(f"Sent request: {req}")
        
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                print(f"\nReceived [{data.get('type')}]:")
                
                if data.get('type') == 'progress':
                    print(f"Status: {data.get('status')}")
                    if 'details' in data:
                        details = data['details']
                        if 'prompt_preview' in details:
                            print(f"-- PROMPT PREVIEW --\n{details['prompt_preview'][:100]}...\n--------------------")
                        if 'raw_content_preview' in details:
                            print(f"-- RESPONSE PREVIEW --\n{details['raw_content_preview'][:100]}...\n----------------------")
                elif data.get('type') == 'info':
                    print(f"Message: {data.get('message')}")
                elif data.get('type') == 'completed':
                    print(f"SUCCESS: {data.get('message')}")
                    print(f"Assignment ID: {data.get('assignment_id')}")
                    break
                elif data.get('type') == 'error':
                    print(f"ERROR: {data.get('message')}")
                    break
                    
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")
                break

if __name__ == "__main__":
    asyncio.run(test_ws())
