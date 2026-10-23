// Aprovisiona un cliente nuevo: crea su organización con el cupo de
// licencias que compró, y la primera cuenta admin para que desde ahí
// administren el resto de su equipo dentro de ese cupo.
//
// Uso:
//   node scripts/crear-organizacion.js --nombre "Ingeurbe" --slug ingeurbe \
//     --admins 2 --reclutadores 5 \
//     --admin-nombre "Juan Pérez" --admin-email juan@ingeurbe.com
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { hashPassword, generarPasswordTemporal } from "../api/_lib/auth.js";

dotenv.config({ path: ".env.local" });

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const clave = argv[i].slice(2);
      args[clave] = argv[i + 1];
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const { nombre, slug, "admin-nombre": adminNombre, "admin-email": adminEmail } = args;
const admins = Number(args.admins || 1);
const reclutadores = Number(args.reclutadores || 0);

if (!nombre || !slug || !adminNombre || !adminEmail) {
  console.error(
    "Uso: node scripts/crear-organizacion.js --nombre \"Empresa\" --slug empresa " +
      "--admins 2 --reclutadores 5 --admin-nombre \"Nombre\" --admin-email correo@empresa.com"
  );
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI (revisa .env.local).");
  process.exit(1);
}
const slugNormalizado = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

try {
  const db = client.db("agente_voz");
  const organizaciones = db.collection("organizaciones");
  const usuarios = db.collection("usuarios");

  const slugExistente = await organizaciones.findOne({ slug: slugNormalizado });
  if (slugExistente) {
    console.error(`Ya existe una organización con el slug "${slugNormalizado}".`);
    process.exit(1);
  }
  const emailNormalizado = adminEmail.toLowerCase().trim();
  const emailExistente = await usuarios.findOne({ email: emailNormalizado });
  if (emailExistente) {
    console.error(`Ya existe una cuenta con el correo ${emailNormalizado}.`);
    process.exit(1);
  }

  const organizacion = {
    nombre: nombre.trim(),
    slug: slugNormalizado,
    licencias: { admin: admins, reclutador: reclutadores },
    creadoEn: new Date(),
  };
  const { insertedId: organizacionId } = await organizaciones.insertOne(organizacion);

  const passwordTemporal = generarPasswordTemporal();
  const admin = {
    organizacionId,
    nombre: adminNombre.trim(),
    email: emailNormalizado,
    passwordHash: hashPassword(passwordTemporal),
    cargo: "",
    telefono: "",
    rol: "admin",
    debeCambiarPassword: true,
    creadoEn: new Date(),
  };
  await usuarios.insertOne(admin);

  console.log(`✅ Organización "${organizacion.nombre}" creada (slug: ${slugNormalizado}).`);
  console.log(`   Licencias: ${admins} admin, ${reclutadores} reclutador.`);
  console.log(`   Link para candidatos: https://tu-dominio-del-agente-de-voz/e/${slugNormalizado}`);
  console.log(`\n   Admin: ${admin.nombre} (${admin.email})`);
  console.log(`   Contraseña temporal: ${passwordTemporal}`);
  console.log("   Se le va a pedir cambiarla en su primer ingreso.");
} finally {
  await client.close();
}
