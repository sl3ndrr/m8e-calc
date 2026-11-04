import type { Environment } from '../../engine';
import { downloadFile } from '../../app/fileTransfer';
import {
  DefinitionBackupError,
  exportDefinitionBackup,
  MAX_DEFINITION_FILE_BYTES,
  parseDefinitionBackup,
  type DefinitionBackup,
} from './definitionBackup';

// Never derive the download name from imported names, paths or expressions.
export const DEFINITION_DOWNLOAD_NAME = 'm8e-calc-definitions-v1.json';
export function downloadDefinitions(environment: Environment): void {
  downloadFile(
    exportDefinitionBackup(environment),
    DEFINITION_DOWNLOAD_NAME,
    'application/json',
  );
}
export async function readDefinitionFile(
  file: File,
): Promise<DefinitionBackup> {
  if (file.size > MAX_DEFINITION_FILE_BYTES)
    throw new DefinitionBackupError('tooLarge');
  return parseDefinitionBackup(await file.text());
}
