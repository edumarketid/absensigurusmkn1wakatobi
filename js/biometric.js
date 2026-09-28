// Check apakah perangkat HP mendukung sensor Biometrik/WebAuthn
export function isBiometricSupported() {
  return !!(window.PublicKeyCredential && 
            typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function');
}

// Registrasi Sidik Jari Baru (Saat Guru Sudah Login Manual)
export async function registerBiometric(guru) {
  if (!isBiometricSupported()) {
    alert("Perangkat HP Anda tidak mendukung fitur Biometrik/Sidik Jari.");
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "Presensi Guru Digital" },
        user: {
          id: Uint8Array.from(guru.id_guru, c => c.charCodeAt(0)),
          name: guru.hp,
          displayName: guru.nama
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      }
    });

    if (credential) {
      const bioData = {
        credId: credential.id,
        guru: guru
      };
      localStorage.setItem("biometric_credential", JSON.stringify(bioData));
      alert("Aktivasi Sidik Jari Berhasil!\n\nSelanjutnya Anda bisa login langsung menggunakan sensor sidik jari HP.");
      return true;
    }
  } catch (err) {
    console.error(err);
    if (err.name === 'NotAllowedError') {
      alert("Proses pendaftaran sidik jari dibatalkan oleh pengguna.");
    } else {
      alert("Gagal mendaftarkan sidik jari. Pastikan HP Anda memiliki sistem keamanan layar (PIN/Fingerprint) yang aktif.");
    }
    return false;
  }
}

// Verifikasi Login Menggunakan Sidik Jari
export async function loginWithBiometric() {
  const bioData = JSON.parse(localStorage.getItem("biometric_credential"));
  
  if (!bioData) {
    alert("Kunci sidik jari belum dibuat di HP ini.\n\nSilakan login menggunakan Nomor HP & PIN terlebih dahulu, lalu tekan tombol 'Aktifkan' di halaman Dashboard.");
    return null;
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        userVerification: "required",
        timeout: 60000
      }
    });

    if (assertion) {
      return bioData.guru;
    }
  } catch (err) {
    console.error(err);
    if (err.name === 'NotAllowedError' || err.name === 'InvalidStateError') {
      alert("Kunci sidik jari tidak ditemukan atau verifikasi dibatalkan.\n\nSilakan login dengan PIN terlebih dahulu untuk mengaktifkan ulang sidik jari Anda.");
    } else {
      alert("Gagal verifikasi sidik jari: " + err.message);
    }
    return null;
  }
}
