export function isBiometricSupported() {
  return !!(window.PublicKeyCredential && 
            typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function');
}

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
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
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
      alert("Aktivasi Sidik Jari / Biometrik Berhasil! Anda dapat login menggunakan sidik jari selanjutnya.");
      return true;
    }
  } catch (err) {
    console.error(err);
    alert("Batal / Gagal mendaftarkan sidik jari.");
    return false;
  }
}

export async function loginWithBiometric() {
  const bioData = JSON.parse(localStorage.getItem("biometric_credential"));
  if (!bioData) {
    alert("Sidik jari belum terdaftar di HP ini. Silakan login manual dengan PIN terlebih dahulu.");
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
    alert("Verifikasi sidik jari dibatalkan atau gagal.");
    return null;
  }
}
