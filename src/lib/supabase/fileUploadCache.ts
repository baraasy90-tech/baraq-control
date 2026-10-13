/** Keep successful uploads stable when the same form is retried after a lost response. */
export function createFileUploadCache<T extends object>(upload: (file: T) => Promise<string>) {
  let files = new WeakMap<T, Promise<string>>();
  const cached = (file: T): Promise<string> => {
    const previous = files.get(file);
    if (previous) return previous;
    const pending = upload(file).catch(error => {
      if (files.get(file) === pending) files.delete(file);
      throw error;
    });
    files.set(file, pending);
    return pending;
  };
  return Object.assign(cached, { clear: () => { files = new WeakMap<T, Promise<string>>(); } });
}
