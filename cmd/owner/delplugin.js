import fs from 'fs-extra';
import path from 'path';

let manejador = async (m, { q, responder }) => {
  try {
    let rutaCompleta = q.trim();
    if (!rutaCompleta) return responder('Especifique la ruta del archivo que desea eliminar.\nEjemplo: `.delplug owner/test.js`');
    if (!rutaCompleta.endsWith('.js')) rutaCompleta += '.js';
    const directorioRaiz = process.cwd();
    const directorioCmd = path.resolve(directorioRaiz, './cmd');
    const rutaObjetivo = path.resolve(directorioCmd, rutaCompleta);
    const rutaRelativa = path.relative(directorioCmd, rutaObjetivo);
    if (rutaRelativa.startsWith('..') || path.isAbsolute(rutaRelativa)) {
      return responder('Error: Se detectó un recorrido de ruta ilegal.\nSolo puede eliminar archivos dentro de la carpeta `./cmd/`');
    }
    if (await fs.pathExists(rutaObjetivo)) {
      const directorioPadre = path.dirname(rutaObjetivo);
      await fs.remove(rutaObjetivo);
      let mensajeRespuesta = `✅ Plugin eliminado de:\n${rutaObjetivo}`;
      if (directorioPadre !== directorioCmd) {
        const archivosEnDirectorio = await fs.promises.readdir(directorioPadre);
        if (archivosEnDirectorio.length === 0) {
          await fs.remove(directorioPadre);
          mensajeRespuesta += `\n\n✅ La carpeta vacía '${path.basename(directorioPadre)}' también ha sido eliminada.`;
        }
      }
      responder(mensajeRespuesta);
    } else {
      return responder(`Archivo no encontrado en esa ruta:\n${rutaObjetivo}`);
    }
  } catch (e) {
    console.error(e);
    responder(`Error al eliminar el plugin:\n${e.message}`);
  }
};

manejador.command = ['delplugin'];
manejador.owner = true;
manejador.help = ['delplugin'];
manejador.tags = ['propietario'];

export default manejador;