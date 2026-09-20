import { writeFile, rename } from 'node:fs/promises';
import { MODULE_CATALOG } from '../modules/catalog.js';
import { COMMANDS } from '../runtime/contracts.js';
const temporary = `dev/modules/catalog.json.${process.pid}.tmp`;
await writeFile(temporary,JSON.stringify({version:1,modules:MODULE_CATALOG,commands:COMMANDS},null,2)+'\n');
await rename(temporary, 'dev/modules/catalog.json');
console.log(`Published ${MODULE_CATALOG.length} reusable modules in the machine-readable catalog.`);
