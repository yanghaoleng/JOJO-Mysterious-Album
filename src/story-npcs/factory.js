import { createDocumentCharacter as createCore, supportsDocumentCharacter as supportsCore } from './models.js';
import { createFamilyCharacter, supportsFamilyCharacter } from './family-models.js';
import { createExtendedCharacter, supportsExtendedCharacter } from './extended-models.js';

export const supportsDocumentCharacter = id => supportsCore(id) || supportsFamilyCharacter(id) || supportsExtendedCharacter(id);

export function createDocumentCharacter(options = {}) {
  const id = options.characterId;
  if (supportsCore(id)) return createCore(options);
  if (supportsFamilyCharacter(id)) return createFamilyCharacter(options);
  if (supportsExtendedCharacter(id)) return createExtendedCharacter(options);
  throw new Error(`Unknown document character: ${id}`);
}
