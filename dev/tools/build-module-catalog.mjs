import { writeFile } from 'node:fs/promises';
import { MODULE_CATALOG } from '../modules/catalog.js';
import { COMMANDS } from '../runtime/contracts.js';
await writeFile('dev/modules/catalog.json',JSON.stringify({version:1,modules:MODULE_CATALOG,commands:COMMANDS},null,2)+'\n');
console.log(`Published ${MODULE_CATALOG.length} reusable modules in the machine-readable catalog.`);
