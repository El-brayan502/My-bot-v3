import fs from 'fs-extra';
import path from 'path';

const listJsFilesRecursively = (directory) => {
  const results = [];
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        results.push(...listJsFilesRecursively(fullPath));
      } else if (entry.isFile() && fullPath.endsWith(".js")) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Gagal membaca direktori: ${directory}`, e);
  }
  return results;
};

let handler = async (m, { reply }) => {
  try {
    const rootDir = process.cwd();
    const cmdDir = path.resolve(rootDir, './cmd');

    if (!await fs.pathExists(cmdDir)) {
      return reply('No se encontró la carpeta `./cmd/`.');
    }

    const files = listJsFilesRecursively(cmdDir);

    if (files.length === 0) {
      return reply('Tidak ada plugin yang ditemukan di dalam folder `./cmd/`.');
    }

    const fileList = files.map(fullPath => {
      return `• ${path.relative(cmdDir, fullPath).replace(/\\/g, '/')}`;
    }).join('\n');

    reply(`📦 *Lista de complementos instalados:*\n\n${fileList}`);

  } catch (e) {
    console.error(e);
    reply(`No se pudo obtener la lista de complementos:\n${e.message}`);
  }
};

handler.command = ['listplugin'];
handler.owner = true;
handler.help = ['listplug'];
handler.tags = ['owner'];

export default handler;