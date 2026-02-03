
from main import app
from fastapi.routing import APIRoute, APIWebSocketRoute

if __name__ == "__main__":
    with open("routes.txt", "w") as f:
        f.write("Listing all routes:\n")
        for route in app.routes:
            if isinstance(route, APIWebSocketRoute):
                f.write(f"WEBSOCKET: {route.path}\n")
            elif isinstance(route, APIRoute):
                f.write(f"HTTP: {route.path} [{','.join(route.methods)}]\n")
