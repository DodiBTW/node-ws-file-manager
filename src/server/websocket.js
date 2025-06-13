const WebSocket = require('ws');

const clients = new Map();

const wss = new WebSocket.Server({ port: 8081 }, () => {
  console.log('WebSocket server started on ws://localhost:8081');
});

wss.on('connection', ws => {
  let userId = null;

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);

      if (data.__relay && data.userId && data.payload) {
        const baseUserId = data.userId.split('|')[0];
        const userClients = clients.get(baseUserId) || [];
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data.payload));
          }
        });
        return;
      }

      if (data.userId) {
        userId = data.userId.split('|')[0];
        if (!clients.has(userId)) clients.set(userId, []);
        clients.get(userId).push(ws);
        ws.send(JSON.stringify({ message: 'WebSocket lié à ' + userId }));
      }
    } catch {}
  });

  ws.on('close', () => {
    if (userId && clients.has(userId)) {
      const arr = clients.get(userId).filter(client => client !== ws);
      if (arr.length > 0) clients.set(userId, arr);
      else clients.delete(userId);
    }
  });
});