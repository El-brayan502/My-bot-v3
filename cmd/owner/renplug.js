import fs from 'fs-extra';
import path from 'path';

let handler = async (m, { q, reply }) => {
  try {
    if (!q.includes('|')) {
      return reply('Formato no válido.\nEjemplo: `.renplug path/old.js | path/new.js``');
    }

    let [oldPath, newPath] = q.split('|').map(p => p.trim());

    if (!oldPath || !newPath) {
      return reply('El camino antiguo y el camino nuevo no pueden estar vacíos..');
    }

    if (!oldPath.endsWith('.js')) oldPath += '.js';
    if (!newPath.endsWith('.js')) newPath += '.js';

    const rootDir = process.cwd();
    const cmdDir = path.resolve(rootDir, './cmd');
    
    const targetOldPath = path.resolve(cmdDir, oldPath);
    const targetNewPath = path.resolve(cmdDir, newPath);

    const relOld = path.relative(cmdDir, targetOldPath);
    const relNew = path.relative(cmdDir, targetNewPath);

    if (relOld.startsWith('..') || path.isAbsolute(relOld) || relNew.startsWith('..') || path.isAbsolute(relNew)) {
      return reply('Error: Se detectó un recorrido de ruta ilegal.\nSolo puede mover archivos dentro de la carpeta `./cmd/`.`');
    }

    if (!await fs.pathExists(targetOldPath)) {
      return reply(`Archivo antiguo no encontrado:\n${targetOldPath}`);
    }

    if (await fs.pathExists(targetNewPath)) {
      return reply(`El archivo en la nueva ruta ya existe:\n${targetNewPath}\n\nElimine primero el archivo si desea reemplazarlo..`);
    }
    
    await fs.move(targetOldPath, targetNewPath);

    reply(`✅ Complemento movido correctamente:\nDesde: ${oldPath}\nA: ${newPath}\n\nLos cambios estarán activos (recarga en caliente) en unos segundos.`);

  } catch (e) {
    console.error(e);
    reply(`Error al mover el complemento:\n${e.message}`);
  }
};

handler.command = ['mvplugin'];
handler.owner = true;
handler.help = ['renplug'];
handler.tags = ['owner'];

export default handler;