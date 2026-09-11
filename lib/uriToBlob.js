// Convert a local file:// or content:// URI into a real Blob that
// Firebase Storage will accept for uploadBytes.
//
// You'd think `await fetch(uri).then(r => r.blob())` would work, and
// it does on the web — but React Native's fetch polyfill on Android
// hands back a Blob-shaped object that Firebase silently uploads as
// zero bytes. The upload "succeeds" and the file exists in Storage,
// it just has no content. XMLHttpRequest with responseType "blob" is
// the workaround Firebase's own React Native docs recommend, and it's
// what we use everywhere the app writes to Storage.
export async function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (!xhr.response || xhr.response.size === 0) {
        reject(new Error("File is empty or unreadable."));
        return;
      }
      resolve(xhr.response);
    };
    xhr.onerror = () => reject(new Error("Could not read the file from disk."));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}
