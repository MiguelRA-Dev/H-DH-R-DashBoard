// Recuperación de emergencia: restablece la contraseña de una cuenta por correo,
// escribiendo directo en Mongo. Existe porque el endpoint normal de reseteo
// (PATCH /api/usuarios/:id) exige una sesión de admin válida — si la única
// cuenta admin se queda sin acceso (contraseña olvidada, nadie más logueado),
// no hay forma de usar el dashboard para recuperarla.
//
// Uso: node scripts/reset-admin-password.js correo@empresa.com
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { hashPassword, generarPasswordTemporal } from "../api/_lib/auth.js";

dotenv.config({ path: ".env.local" });

const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/reset-admin-password.js correo@empresa.com");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI (revisa .env.local).");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

try {
  const coleccion = client.db("agente_voz").collection("usuarios");
  const emailNormalizado = email.toLowerCase().trim();
  const passwordTemporal = generarPasswordTemporal();

  // Igual que el reseteo manual que ya hace un admin desde la pantalla de
  // Usuarios: contraseña temporal + debeCambiarPassword, para que el login
  // obligue a poner una propia antes de usar el resto del dashboard.
  const usuario = await coleccion.findOneAndUpdate(
    { email: emailNormalizado },
    { $set: { passwordHash: hashPassword(passwordTemporal), debeCambiarPassword: true } },
    { returnDocument: "after", projection: { passwordHash: 0 } }
  );

  if (!usuario) {
    console.error(`No existe ningún usuario con el correo ${emailNormalizado}.`);
    process.exit(1);
  }

  console.log(`✅ Contraseña restablecida para ${usuario.nombre} (${usuario.email}, rol ${usuario.rol}).`);
  console.log(`Contraseña temporal: ${passwordTemporal}`);
  console.log("El próximo login la va a pedir cambiar antes de poder usar el resto del dashboard.");
} finally {
  await client.close();
}
