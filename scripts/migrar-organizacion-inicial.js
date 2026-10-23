// Migración de una sola vez: todo lo que ya existía en Mongo (usuarios,
// vacantes, entrevistas) se creó antes de que existiera el concepto de
// organización. Este script les crea una organización y los etiqueta, para
// que no desaparezcan cuando el filtrado por organizacionId entra en
// vigor. Seguro de correr más de una vez — si el slug ya existe, no crea
// otra organización, solo vuelve a etiquetar lo que falte.
//
// Uso: node scripts/migrar-organizacion-inicial.js "Nombre" slug
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });

const NOMBRE = process.argv[2] || "H-AI-R";
const SLUG = (process.argv[3] || "h-air").toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI (revisa .env.local).");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

try {
  const db = client.db("agente_voz");
  const organizaciones = db.collection("organizaciones");
  const usuarios = db.collection("usuarios");
  const vacantes = db.collection("vacantes");
  const entrevistas = db.collection("entrevistas");

  let organizacion = await organizaciones.findOne({ slug: SLUG });
  if (organizacion) {
    console.log(`La organización "${organizacion.nombre}" (slug: ${SLUG}) ya existe — no se crea otra.`);
  } else {
    const [admins, reclutadores] = await Promise.all([
      usuarios.countDocuments({ rol: "admin", organizacionId: { $exists: false } }),
      usuarios.countDocuments({ rol: "reclutador", organizacionId: { $exists: false } }),
    ]);
    // Cupo con margen sobre lo que ya existe — es la cuenta propia, no un
    // cliente con un plan contratado; ajústalo luego a mano si hace falta.
    const resultado = await organizaciones.insertOne({
      nombre: NOMBRE,
      slug: SLUG,
      licencias: { admin: Math.max(admins, 1) + 2, reclutador: Math.max(reclutadores, 0) + 5 },
      creadoEn: new Date(),
    });
    organizacion = { _id: resultado.insertedId, nombre: NOMBRE, slug: SLUG };
    console.log(`✅ Organización "${NOMBRE}" creada (slug: ${SLUG}).`);
  }

  const [resUsuarios, resVacantes, resEntrevistas] = await Promise.all([
    usuarios.updateMany(
      { organizacionId: { $exists: false } },
      { $set: { organizacionId: organizacion._id } }
    ),
    vacantes.updateMany(
      { organizacionId: { $exists: false } },
      { $set: { organizacionId: organizacion._id } }
    ),
    entrevistas.updateMany(
      { organizacionId: { $exists: false } },
      { $set: { organizacionId: organizacion._id } }
    ),
  ]);

  console.log(`   Usuarios etiquetados: ${resUsuarios.modifiedCount}`);
  console.log(`   Vacantes etiquetadas: ${resVacantes.modifiedCount}`);
  console.log(`   Entrevistas etiquetadas: ${resEntrevistas.modifiedCount}`);
  console.log(`\n   Link para candidatos: https://tu-dominio-del-agente-de-voz/e/${SLUG}`);
} finally {
  await client.close();
}
