// The web preview has no file system or share sheet: the image is a blob URL
// and "save" downloads it. Only there for checking layouts.
export class SaveRefused extends Error {}

export async function storeImage(bytes: ArrayBuffer, _name: string) {
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}

export function dropImage(uri: string) {
  URL.revokeObjectURL(uri);
}

export async function shareImage(uri: string) {
  await saveImage(uri);
}

export async function saveImage(uri: string) {
  const a = document.createElement('a');
  a.href = uri;
  a.download = 'kotes.png';
  a.click();
}
