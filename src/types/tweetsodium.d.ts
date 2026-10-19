declare module 'tweetsodium' {
  export function seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  const tweetsodium: {
    seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  };
  export default tweetsodium;
}
