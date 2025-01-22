const turn = require('node-turn');
const os = require('os');

// Función para obtener IP privada
function getPrivateIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}

const PRIVATE_IP = getPrivateIP();
const TURN_PORT = 8081;

// Configuración del servidor TURN
const turnServer = new turn({
    // Configuración básica
    authMech: 'long-term',
    credentials: {
        username: "krespoturn",
        password: "krespo123"
    },
    realm: 'turnserver',
    
    // Puertos y IPs
    listeningPort: TURN_PORT,
    listeningIps: [PRIVATE_IP], // Usar IP privada
    relayPortRange: {
        min: 49152,
        max: 65535
    },
    
    // Configuración de logging
    debugLevel: 'ALL', // Aumentar nivel de logging para debug
});

turnServer.start();

console.log(`Servidor TURN ejecutándose en ${PRIVATE_IP}:${TURN_PORT}`);
console.log('IP privada detectada:', PRIVATE_IP);

// Manejo de errores
turnServer.on('error', (err) => {
    console.error('Error en servidor TURN:', err);
});

// Manejo de señales para cierre limpio
process.on('SIGINT', () => {
    console.log('Cerrando servidor TURN...');
    process.exit(0);
});
