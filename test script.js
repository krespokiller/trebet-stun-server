const nodeStun = require('node-stun');
const dgram = require('dgram');
const Message = require('node-stun/lib/message');
const crypto = require('crypto'); // Agregar esta importación

async function testStun() {
    const STUN_SERVER = '127.0.0.1';
    const STUN_PORT = 19302;

    try {
        console.log('Iniciando prueba de servidor STUN...');
        console.log(`Conectando a: ${STUN_SERVER}:${STUN_PORT}`);

        // Crear cliente con configuración simple
        const client = nodeStun.createClient({
            server: STUN_SERVER,
            port: STUN_PORT,
            timeout: 1000,
            debugLevel: 'ALL'
        });

        // Usar promesa para manejar el resultado
        const result = await new Promise((resolve) => {
            let responsesReceived = 0;
            let mappedAddress = null;

            // Manejar mensajes STUN
            client._soc0 = dgram.createSocket('udp4');
            client._soc0.on('message', (msg, rinfo) => {
                console.log(`Recibida respuesta de ${rinfo.address}:${rinfo.port}`);
                try {
                    const response = new Message();
                    response.deserialize(msg);
                    
                    if (response.getType() === 'bres') {
                        mappedAddress = response.getAttribute('mappedAddr');
                        responsesReceived++;
                        
                        if (responsesReceived >= 1) {
                            resolve({
                                success: true,
                                address: mappedAddress?.addr,
                                port: mappedAddress?.port
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error procesando respuesta:', e);
                }
            });

            // Enviar solicitud STUN
            client._soc0.bind(0, '0.0.0.0', () => {
                const request = new Message();
                request.init();
                request.setType('breq');
                
                // Generar ID de transacción válido usando MD5
                const seed = process.pid.toString(16) +
                    Math.round(Math.random() * 0x100000000).toString(16) +
                    Date.now().toString(16);
                const md5 = crypto.createHash('md5');
                md5.update(seed);
                request.setTransactionId(md5.digest());
                
                const packet = request.serialize();
                client._soc0.send(packet, 0, packet.length, STUN_PORT, STUN_SERVER);
            });

            // Timeout después de 5 segundos
            setTimeout(() => {
                resolve({ success: false, error: 'Timeout' });
            }, 5000);
        });

        // Mostrar resultados
        console.log('\n=== Resultado de la prueba ===');
        if (result.success) {
            console.log('Estado: Éxito');
            console.log('IP Mapeada:', result.address);
            console.log('Puerto Mapeado:', result.port);
        } else {
            console.log('Estado: Error');
            console.log('Razón:', result.error);
        }

        // Cerrar socket
        if (client._soc0) {
            client._soc0.close();
        }

    } catch(e) {
        console.error('Error en la prueba:', e);
    }
}

testStun();