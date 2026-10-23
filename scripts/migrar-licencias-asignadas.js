// Migración de una sola vez: hasta ahora, toda cuenta que existía "contaba"
// contra el cupo de licencias de su rol (crear se bloqueaba por cupo). Con
// licencias por usuario, ya solo cuentan quienes tengan licenciaAsignada:
// true — así que a todo el mundo que ya existía se le pone ese campo en
// true, para que nadie pierda acceso el día que esto se despliega (el
// estado post-migración es idéntico al de hoy). Seguro de correr más de una
// vez: solo toca usuarios que todavía no tienen el campo.
//
// Si una organización queda con más usuarios licenciados que su cupo actual
// (porque el superadmin bajó el cupo después de que esa gente ya existía),
// este script NO le quita la licencia a nadie en silencio — queda
// "sobre-cupo", visible en la barra de Usuarios.jsx, y es el admin de esa
// organización quien decide a quién quitarle la licencia.
//
// Uso: node scripts/migrar-licencias-asignadas.js
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI (revisa .env.local).");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

try {
  const db = client.db("agente_voz");
  const usuarios = db.collection("usuarios");

  const resultado = await usuarios.updateMany(
    { licenciaAsignada: { $exists: false } },
    { $set: { licenciaAsignada: true } }
  );
  console.log(`✅ Usuarios migrados a licenciaAsignada: true — ${resultado.modifiedCount}.`);

  const organizaciones = db.collection("organizaciones");
  const orgs = await organizaciones.find({}).toArray();
  for (const org of orgs) {
    const [admins, reclutadores] = await Promise.all([
      usuarios.countDocuments({ organizacionId: org._id, rol: "admin", licenciaAsignada: true }),
      usuarios.countDocuments({ organizacionId: org._id, rol: "reclutador", licenciaAsignada: true }),
    ]);
    const cupoAdmin = org.licencias?.admin ?? 0;
    const cupoReclutador = org.licencias?.reclutador ?? 0;
    const sobreCupo = admins > cupoAdmin || reclutadores > cupoReclutador;
    console.log(
      `${sobreCupo ? "⚠️ " : "   "}${org.nombre}: admin ${admins}/${cupoAdmin}, reclutador ${reclutadores}/${cupoReclutador}` +
        (sobreCupo ? "  <- sobre cupo, revisar en Usuarios" : "")
    );
  }
} finally {
  await client.close();
}
