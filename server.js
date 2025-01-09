const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
    const token = new URLSearchParams(req.url.split('?')[1]).get('token');
    let userName;

    try {
        const decoded = jwt.verify(token, 'your-256-bit-secret'); // Replace with your actual secret key
        userName = decoded.name;
    } catch (err) {
        ws.close();
        return;
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        switch (data.type) {
            case 'join-room':
                ws.roomId = data.roomId;
                ws.userName = userName;
                broadcast(ws.roomId, {
                    type: 'user-joined',
                    userId: ws._socket.remoteAddress,
                    name: ws.userName
                });
                break;
            case 'offer':
            case 'answer':
            case 'ice-candidate':
                broadcast(ws.roomId, data, ws);
                break;
        }
    });

    ws.on('close', () => {
        broadcast(ws.roomId, {
            type: 'user-left',
            userId: ws._socket.remoteAddress
        });
    });
});

function broadcast(roomId, data, excludeWs) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.roomId === roomId && client !== excludeWs) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log('WebSocket server is running on ws://localhost:8080');
