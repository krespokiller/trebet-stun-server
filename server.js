const stun = require('node-stun');
const turn = require('node-turn');

const SERVER_PORT = 3478; // Puerto estándar STUN
const SERVER_HOST = '0.0.0.0';

const stunServer = stun.createServer({
    primary: {
        host: SERVER_HOST,
        port: SERVER_PORT
    },
    secondary: {
        host: SERVER_HOST,
        port: SERVER_PORT + 1
    }
});

// Configurar eventos del servidor STUN
stunServer.on('bindingRequest', (request, rinfo) => {
    console.log(`Solicitud STUN recibida desde ${rinfo.address}:${rinfo.port}`);
});

stunServer.on('error', (err) => {
    console.error('Error en servidor STUN:', err);
});

// Iniciar el servidor STUN
stunServer.listen(SERVER_PORT, SERVER_HOST, () => {
    console.log(`Servidor STUN ejecutándose en ${SERVER_HOST}:${SERVER_PORT}`);
});

// Manejo de señales para cierre limpio
process.on('SIGINT', () => {
    console.log('Cerrando servidor STUN...');
    stunServer.close(() => {
        process.exit(0);
    });
});

const turnServer = new turn({
    // Configuración básica
    authMech: 'long-term',
    credentials: {
        username: "krespoturn",
        password: "krespo123"
    },
    realm: 'turnserver',
    
    // Puertos
    listeningPort: 3478,        // Puerto STUN/TURN
    relayPortRange: {
        min: 49152,             // Puerto mínimo para relay
        max: 65535              // Puerto máximo para relay
    },
    
    // Configuración de logging
    debugLevel: 'INFO',
    
    // Opcional: certificados para TURN sobre TLS
    cert: 'path/to/cert.pem',
    key: 'path/to/key.pem',
});

turnServer.start();

console.log('Servidor STUN/TURN iniciado en puerto 3478');
