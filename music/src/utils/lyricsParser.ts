/**
 * Pure TypeScript Zero-Dependency ID3v2 Parser for Embedded Lyrics (USLT frame)
 * Works flawlessly in Browser, Electron, and mobile environments without native module compiling.
 */

export async function extractLyricsFromAudio(fileUrlOrBlob: string | Blob): Promise<string | null> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (fileUrlOrBlob instanceof Blob) {
      // Local offline file - slice the first 512KB
      arrayBuffer = await fileUrlOrBlob.slice(0, 512 * 1024).arrayBuffer();
    } else {
      // Stream url - fetch only the first 512KB using HTTP Range request
      try {
        const res = await fetch(fileUrlOrBlob, {
          headers: { Range: "bytes=0-524287" },
        });
        if (res.status === 206 || res.ok) {
          arrayBuffer = await res.arrayBuffer();
        } else {
          throw new Error("Range not supported, fallback to normal fetch");
        }
      } catch (e) {
        // Fallback for servers not supporting Range header
        const res = await fetch(fileUrlOrBlob);
        arrayBuffer = await res.arrayBuffer();
      }
    }

    const view = new DataView(arrayBuffer);
    if (view.byteLength < 10) return null;

    // Check ID3 tag signature: "ID3" (0x49, 0x44, 0x33)
    if (
      view.getUint8(0) !== 0x49 ||
      view.getUint8(1) !== 0x44 ||
      view.getUint8(2) !== 0x33
    ) {
      return null;
    }

    const majorVersion = view.getUint8(3);
    if (majorVersion < 2 || majorVersion > 4) return null; // ID3v2.2, ID3v2.3, ID3v2.4

    // Read ID3 tag size (synchsafe integer: 4 bytes, 7 bits per byte)
    const s1 = view.getUint8(6);
    const s2 = view.getUint8(7);
    const s3 = view.getUint8(8);
    const s4 = view.getUint8(9);
    const tagSize = (s1 << 21) | (s2 << 14) | (s3 << 7) | s4;

    let offset = 10;
    const endOffset = Math.min(tagSize + 10, view.byteLength);

    // Parse frames in ID3v2
    while (offset + 10 < endOffset) {
      let frameId = "";
      let frameSize = 0;

      if (majorVersion === 2) {
        // ID3v2.2 uses 3-char frame IDs and 3-byte size
        for (let i = 0; i < 3; i++) {
          frameId += String.fromCharCode(view.getUint8(offset + i));
        }
        frameSize =
          (view.getUint8(offset + 3) << 16) |
          (view.getUint8(offset + 4) << 8) |
          view.getUint8(offset + 5);

        if (frameSize <= 0 || offset + 6 + frameSize > view.byteLength) break;

        // Lyrics in ID3v2.2 is usually "ULT"
        if (frameId === "ULT") {
          const dataOffset = offset + 6;
          const encoding = view.getUint8(dataOffset);
          const bytes = new Uint8Array(arrayBuffer, dataOffset + 4, frameSize - 4);
          return decodeText(bytes, encoding);
        }

        offset += 6 + frameSize;
      } else {
        // ID3v2.3 and ID3v2.4 use 4-char frame IDs and 4-byte size
        for (let i = 0; i < 4; i++) {
          frameId += String.fromCharCode(view.getUint8(offset + i));
        }

        if (majorVersion === 4) {
          // ID3v2.4 uses synchsafe size for frames
          const f1 = view.getUint8(offset + 4);
          const f2 = view.getUint8(offset + 5);
          const f3 = view.getUint8(offset + 6);
          const f4 = view.getUint8(offset + 7);
          frameSize = (f1 << 21) | (f2 << 14) | (f3 << 7) | f4;
        } else {
          // ID3v2.3 uses regular 32-bit big-endian integer
          frameSize = view.getUint32(offset + 4);
        }

        if (frameSize <= 0 || offset + 10 + frameSize > view.byteLength) break;

        // Lyrics in ID3v2.3 / ID3v2.4 is "USLT"
        if (frameId === "USLT") {
          const dataOffset = offset + 10;
          const encoding = view.getUint8(dataOffset);
          const bytes = new Uint8Array(arrayBuffer, dataOffset + 4, frameSize - 4);
          return decodeText(bytes, encoding);
        }

        offset += 10 + frameSize;
      }
    }
  } catch (err) {
    console.warn("Failed to extract ID3 embedded lyrics:", err);
  }
  return null;
}

function decodeText(bytes: Uint8Array, encoding: number): string {
  let decoder: TextDecoder;
  
  switch (encoding) {
    case 1:
      // UTF-16 with BOM
      decoder = new TextDecoder("utf-16");
      break;
    case 2:
      // UTF-16BE without BOM
      decoder = new TextDecoder("utf-16be");
      break;
    case 3:
      // UTF-8
      decoder = new TextDecoder("utf-8");
      break;
    case 0:
    default:
      // ISO-8859-1 (fallback to Windows-1252 to support more characters)
      decoder = new TextDecoder("windows-1252");
      break;
  }

  const fullText = decoder.decode(bytes);

  // The USLT frame content: [Language (3B)] + [Content descriptor (Terminated by null)] + [Actual Lyrics]
  // Since we already skipped the Language (we started offset at 4 bytes in, which is 1B encoding + 3B lang),
  // the text starts directly with the Content Descriptor, then a null character \0, then the lyrics text!
  const nullCharIndex = fullText.indexOf("\0");
  if (nullCharIndex !== -1) {
    return fullText.substring(nullCharIndex + 1).trim();
  }

  return fullText.trim();
}
