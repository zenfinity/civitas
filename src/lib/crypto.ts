import type { Pack } from './types';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ITERATIONS = 310_000;

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
		'deriveKey'
	]);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
		keyMaterial,
		{ name: ALGORITHM, length: KEY_LENGTH },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encryptPack(pack: Pack, passphrase: string): Promise<Blob> {
	const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
	const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
	const key = await deriveKey(passphrase, salt);
	const encoded = new TextEncoder().encode(JSON.stringify(pack));
	const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);

	// Layout: [4 magic bytes][1 version][16 salt][12 iv][ciphertext]
	const out = new Uint8Array(4 + 1 + 16 + 12 + ciphertext.byteLength);
	out.set([0x43, 0x56, 0x54, 0x53]); // CVTS
	out[4] = 1;
	out.set(salt, 5);
	out.set(iv, 21);
	out.set(new Uint8Array(ciphertext), 33);
	return new Blob([out], { type: 'application/octet-stream' });
}

export async function decryptPack(file: File, passphrase: string): Promise<Pack> {
	const buf = await file.arrayBuffer();
	const bytes = new Uint8Array(buf);

	const magic = String.fromCharCode(...bytes.slice(0, 4));
	if (magic !== 'CVTS') throw new Error('Not a valid civitas pack file');

	const salt = bytes.slice(5, 21);
	const iv = bytes.slice(21, 33);
	const ciphertext = bytes.slice(33);
	const key = await deriveKey(passphrase, salt);

	let plaintext: ArrayBuffer;
	try {
		plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
	} catch {
		throw new Error('Incorrect passphrase or corrupted file');
	}

	return JSON.parse(new TextDecoder().decode(plaintext)) as Pack;
}

export function downloadPack(blob: Blob, filename = 'civitas-pack.cvts') {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
