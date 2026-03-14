import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

let manejador = async (m, { conn, responder }) => {
  try {
    await responder('🔄 Procesando respaldo... Por favor, espera.');
    const patronesExcluidos = [
      "node_modules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      *', {
      cwd: directorioRaiz,
      ignore: patronesExcluidos,
      dot: true
    });
    await archivo.finalize();
  } catch (e) {
    responder("/**",
      "session/**",
      "package-lock.json",
      "yarn.lock",
      ".npm/**",
      ".cache/**",
      ".config/**",
      "respaldo_bot_*.zip"
    ];
    const directorioRaiz = process.cwd();
    const nombreZip = `respaldo_bot_${Date.now()}.zip`;
    const rutaZip = path.join(directorioRaiz, nombreZip);
    const salida = fs.createWriteStream(rutaZip);
    const archivo = archiver('zip', { zlib: { nivel: 9 } });

    salida.on('close', async () => {
      await conn.enviarMensaje(
        m.chat,
        {
          documento: { url: rutaZip },
          tipoMime: 'application/zip',
          nombreArchivo: nombreZip
        },
        { citado: m }
      );
      await fs.remove(rutaZip);
    });

    archivo.on('advertencia', () => {});
    archivo.on('error', (err) => {
      throw err;
    });

    archivo.pipe(salida);
    archivo.glob('**/*', {
      cwd: directorioRaiz,
      ignore: patronesExcluidos,
      dot: true
    });
    await archivo.finalize();
  } catch (e) {
    responder("Error al crear el respaldo: " + e.message);
  }
};

manejador.command = ['respaldo'];
manejador.owner = false;
manejador.help = ['respaldo'];
manejador.tags = ['propietario'];

export default manejador;