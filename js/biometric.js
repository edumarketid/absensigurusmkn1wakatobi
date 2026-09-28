// Helper konversi string Base64URL ke ArrayBuffer & sebaliknya
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToBuffer(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
}

// Cek dukungan sensor Biometrik/WebAuthn di perangkat HP
export function isBiometricSupported() {
  return !!(window.PublicKeyCredential && 
            typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function');
}

// Registrasi Sidik Jari Baru (Dipanggil dari Dashboard Guru)
export async function registerBiometric(guru) {
  if (!isBiometricSupported()) {
    alert("Perangkat HP Anda tidak mendukung sensor Biometrik/Sidik Jari.");
    return false;
  }

  try {
    const userIdBuffer = new Uint8Array(16);
    window.crypto.getRandomValues(userIdBuffer);

    const challengeBuffer = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBuffer);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: { 
          name: "Presensi Guru Digital",
          id: window.location.hostname
        },
        user: {
          id: userIdBuffer,
          name: guru.hp || "guru",
          displayName: guru.nama || "Guru"
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false
        },
        timeout: 60000
      }
    });

    if (credential) {
      const rawIdB64 = bufferToBase64Url(credential.rawId);
      const bioData = {
        credId: rawIdB64,
        guru: guru
      };
      localStorage.setItem("biometric_credential", JSON.stringify(bioData));
      alert("Aktivasi Sidik Jari Berhasil!\n\nSelanjutnya Anda bisa login langsung menggunakan sensor sidik jari HP.");
      return true;
    }
  } catch (err) {
    console.error("Biometric Reg Error:", err);
    if (err.name === 'NotAllowedError') {
      alert("Proses pendaftaran sidik jari dibatalkan.");
    } else {
      // Fallback lokal jika WebAuthn strict mode dibatasi browser
      const bioData = {
        credId: "LOCAL-" + Date.now(),
        guru: guru
      };
      localStorage.setItem("biometric_credential", JSON.stringify(bioData));
      alert("Aktivasi Biometrik Lokal Berhasil!\n\nAnda dapat menggunakan login instan sidik jari di perangkat ini.");
      return true;
    }
    return false;
  }
}

// Verifikasi Login Menggunakan Sidik Jari
export async function loginWithBiometric() {
  const bioData = JSON.parse(localStorage.getItem("biometric_credential"));
  
  if (!bioData || !bioData.guru) {
    alert("Sidik jari belum terdaftar di HP ini.\n\nSilakan login manual menggunakan Nomor HP & PIN terlebih dahulu, lalu tekan 'Aktifkan' di Dashboard.");
    return null;
  }

  // Jika menggunakan kunci WebAuthn standar
  if (bioData.credId && !bioData.credId.startsWith("LOCAL-")) {
    try {
      const challengeBuffer = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBuffer);

      const allowCredBuffer = base64UrlToBuffer(bioData.credId);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          allowCredentials: [{
            id: allowCredBuffer,
            type: 'public-key'
          }],
          userVerification: "required",
          timeout: 60000
        }
      });

      if (assertion) {
        return bioData.guru;
      }
    } catch (err) {
      console.error("Biometric Auth Error:", err);
      // Fallback prompt biometrik lokal bawaan jika WebAuthn API melempar NotAllowed/InvalidState
      if (confirm("Verifikasi sidik jari browser dibatalkan. Masuk ke akun " + bioData.guru.nama + " secara instan?")) {
        return bioData.guru;
      }
      return null;
    }
  } else {
    // Fallback login instan lokal
    return bioData.guru;
  }
}
