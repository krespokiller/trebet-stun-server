const dgram = require('dgram');
const Message = require('./node_modules/node-stun/lib/message');
const crypto = require('crypto');

function testStun() {
    const socket = dgram.createSocket('udp4');
    const message = new Message();
    
    // Generar ID de transacción válido (16 bytes)
    const transactionId = crypto.randomBytes(16);
    
    message.init();
    message.setType('breq');
    message._tid = transactionId; // Establecer ID de transacción
    const packet = message.serialize();

    socket.on('message', (msg, rinfo) => {
        const response = new Message();
        try {
            response.deserialize(msg);
            console.log(response);
            // Verificar ID de transacción
            if (Buffer.compare(response._tid, transactionId) === 0) {
                console.log('Respuesta STUN válida recibida');
                console.log('Dirección mapeada:', response.getAttribute('mappedAddr'));
            } else {
                console.log('ID de transacción no coincide');
            }
        } catch(e) {
            console.error('Error:', e);
        }
        socket.close();
    });

    socket.send(packet, 0, packet.length, 19302, '172.25.0.1', (err) => {
        if (err) console.error('Error:', err);
        console.log('Petición STUN enviada');
    });
}

global.testStun = testStun;