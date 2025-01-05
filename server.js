const stun = require('node-stun');
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
console.log('IP local detectada:', localIP);

let isServerRunning = false;

function startServer() {
    try {
        // Crear servidor UDP directamente para más control
        const primarySocket = dgram.createSocket('udp4');
        const secondarySocket = dgram.createSocket('udp4');

        primarySocket.on('message', (msg, rinfo) => {
            try {
                const request = new Message();
                request.deserialize(msg);
                
                // Crear respuesta STUN
                const response = new Message();
                response.init();
                response._type = 0x0101;  // Binding Response (257 en decimal)
                response._tid = request._tid;
                
                // Simplificar a solo mappedAddr con el formato correcto
                response.addAttribute('mappedAddr', {
                    family: 'ipv4',
                    port: rinfo.port,
                    addr: rinfo.address
                });

                // Enviar respuesta
                const responsePacket = response.serialize();
                primarySocket.send(responsePacket, 0, responsePacket.length, rinfo.port, rinfo.address, (err) => {
                    if (err) {
                        console.error('Error al enviar respuesta:', err);
                    } else {
                        console.log(`Respuesta STUN enviada a ${rinfo.address}:${rinfo.port}`);
                    }
                });
            } catch (error) {
                console.error('Error procesando mensaje STUN:', error);
            }
        });

        primarySocket.on('listening', () => {
            const address = primarySocket.address();
            console.log(`Servidor STUN escuchando en ${address.address}:${address.port}`);
        });

        primarySocket.on('error', (error) => {
            console.error('Error en socket primario:', error);
        });

        // Vincular sockets a puertos específicos
        primarySocket.bind(19302, localIP);
        secondarySocket.bind(19303, localIP);

        return { primarySocket, secondarySocket };
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        console.log('Reintentando en 3 segundos...');
        setTimeout(startServer, 3000);
        return null;
    }
}

const sockets = startServer();

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