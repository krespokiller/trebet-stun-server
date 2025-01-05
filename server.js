const dgram = require('dgram');
const os = require('os');
const Message = require('node-stun/lib/message');

// Obtener la primera dirección IPv4 no interna
function getLocalIPv4() {
    const interfaces = os.networkInterfaces();
    for (const ifname of Object.keys(interfaces)) {
        for (const iface of interfaces[ifname]) {
            // Saltamos las direcciones internas y no IPv4
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

const localIP = getLocalIPv4();
const PORT = process.env.PORT || 19302;
const ALT_PORT = process.env.ALT_PORT || 19303;

console.log('IP local detectada:', localIP);
console.log(`Servidor STUN corriendo en puertos ${PORT} y ${ALT_PORT}`);
console.log('Nota: STUN requiere IP pública directa, tunnelmole no es recomendado');

let isServerRunning = false;

function startServer() {
    try {
        const primarySocket = dgram.createSocket('udp4');
        const secondarySocket = dgram.createSocket('udp4');

        const handleStunMessage = (socket, msg, rinfo) => {
            try {
                const request = new Message();
                request.deserialize(msg);
                
                const response = new Message();
                response.init();
                response.setType('bres'); // Binding Response
                response.setTransactionId(request.getTransactionId());
                
                // Solo usar los atributos soportados por la librería
                response.addAttribute('mappedAddr', {
                    family: 'ipv4',
                    port: rinfo.port,
                    addr: rinfo.address
                });

                response.addAttribute('changedAddr', {
                    family: 'ipv4',
                    port: socket.address().port === PORT ? ALT_PORT : PORT,
                    addr: localIP
                });

                const responsePacket = response.serialize();
                socket.send(responsePacket, 0, responsePacket.length, rinfo.port, rinfo.address, (err) => {
                    if (err) {
                        console.error('Error enviando respuesta:', err);
                    } else {
                        console.log(`Respuesta STUN enviada a ${rinfo.address}:${rinfo.port}`);
                    }
                });
            } catch (error) {
                console.error('Error procesando mensaje STUN:', error);
            }
        };

        primarySocket.on('message', (msg, rinfo) => handleStunMessage(primarySocket, msg, rinfo));
        primarySocket.on('listening', () => {
            console.log(`Servidor STUN principal escuchando en puerto ${PORT}`);
        });

        secondarySocket.on('message', (msg, rinfo) => handleStunMessage(secondarySocket, msg, rinfo));
        secondarySocket.on('listening', () => {
            console.log(`Servidor STUN secundario escuchando en puerto ${ALT_PORT}`);
        });

        primarySocket.bind(PORT);
        secondarySocket.bind(ALT_PORT);

        return { primarySocket, secondarySocket };
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        console.log('Reintentando en 3 segundos...');
        setTimeout(startServer, 3000);
        return null;
    }
}

startServer();

// Manejo de señales de terminación
process.on('SIGINT', () => {
    console.log('Señal SIGINT recibida. Manteniendo servidor activo.');
});

process.on('SIGTERM', () => {
    console.log('Señal SIGTERM recibida. Manteniendo servidor activo.');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
    process.exit(1);
});