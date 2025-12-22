from waitress import serve
from app import app
import socket

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == "__main__":
    ip_address = get_ip()
    import os
    port = int(os.environ.get("PORT", 8080))
    
    print("="*50)
    print(f" PRODUCTION SERVER STARTED")
    print(f" • Local access:     http://localhost:{port}")
    print(f" • Network access:   http://{ip_address}:{port}")
    print("="*50)
    print("Press Ctrl+C to stop the server")
    
    serve(app, host='0.0.0.0', port=port)
