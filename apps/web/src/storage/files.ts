const EXTENSION = '.ruda';
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

/** Offers `.ruda` text to the user as a download named after the world. */
export function downloadRudaFile(worldName: string, data: string): void {
  const filename = (worldName.replace(UNSAFE_FILENAME_CHARS, '_').trim() || 'world') + EXTENSION;
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url));
}

export const RUDA_FILE_ACCEPT = `${EXTENSION},application/json`;
