import { ObjectId } from "mongodb";
import { getUsuariosCollection, getOrganizacionesCollection } from "../_lib/mongodb.js";
import { requireAdmin, hashPassword, generarPasswordTemporal } from "../_lib/auth.js";

// Reseteo manual de contraseña: en vez de un flujo de "olvidé mi contraseña"
// por correo (que requeriría un proveedor de email nuevo), un admin genera
// acá una contraseña temporal y se la comparte a la persona por fuera del
// dashboard (WhatsApp, en persona, etc.). Queda marcada con
// debeCambiarPassword para que el login la obligue a poner una propia.
//
// asignarLicencia/quitarLicencia: el admin prende/apaga el acceso real de
// una cuenta ya creada (ver api/usuarios/index.js — crear ya no depende del
// cupo, solo asignar licencia sí).
export default async function handler(request, response) {
  const admin = requireAdmin(request, response);
  if (!admin) return;

  if (request.method !== "PATCH") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido." });
  }

  const body = request.body || {};
  const organizacionId = new ObjectId(admin.organizacionId);
  const coleccion = await getUsuariosCollection();

  if (body.accion === "resetPassword") {
    try {
      const passwordTemporal = generarPasswordTemporal();
      const usuario = await coleccion.findOneAndUpdate(
        { _id: new ObjectId(id), organizacionId },
        { $set: { passwordHash: hashPassword(passwordTemporal), debeCambiarPassword: true } },
        { returnDocument: "after", projection: { passwordHash: 0 } }
      );
      if (!usuario) {
        return response.status(404).json({ error: "Usuario no encontrado." });
      }
      return response.status(200).json({ usuario, passwordTemporal });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al restablecer la contraseña." });
    }
  }

  if (body.accion === "asignarLicencia") {
    try {
      const objetivo = await coleccion.findOne(
        { _id: new ObjectId(id), organizacionId },
        { projection: { passwordHash: 0 } }
      );
      if (!objetivo) {
        return response.status(404).json({ error: "Usuario no encontrado." });
      }
      if (objetivo.licenciaAsignada) {
        return response.status(200).json({ usuario: objetivo });
      }

      const organizacionesCol = await getOrganizacionesCollection();
      const organizacion = await organizacionesCol.findOne({ _id: organizacionId });
      const cupo = organizacion?.licencias?.[objetivo.rol] ?? 0;
      const enUso = await coleccion.countDocuments({
        organizacionId,
        rol: objetivo.rol,
        licenciaAsignada: true,
      });
      if (enUso >= cupo) {
        return response.status(403).json({
          error: `Ya se usaron las ${cupo} licencias de ${objetivo.rol === "admin" ? "administrador" : "reclutador"} contratadas. Quita una licencia a otra persona o amplía el cupo.`,
        });
      }

      const usuario = await coleccion.findOneAndUpdate(
        { _id: new ObjectId(id), organizacionId },
        { $set: { licenciaAsignada: true } },
        { returnDocument: "after", projection: { passwordHash: 0 } }
      );
      return response.status(200).json({ usuario });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al asignar la licencia." });
    }
  }

  if (body.accion === "quitarLicencia") {
    try {
      const objetivo = await coleccion.findOne(
        { _id: new ObjectId(id), organizacionId },
        { projection: { passwordHash: 0 } }
      );
      if (!objetivo) {
        return response.status(404).json({ error: "Usuario no encontrado." });
      }
      if (!objetivo.licenciaAsignada) {
        return response.status(200).json({ usuario: objetivo });
      }

      // Nunca te puedes quedar sin ningún admin con acceso real — si esta es
      // la última licencia de admin con uso, no se deja quitar, sea de quien
      // sea (no solo de uno mismo): asigna otro admin primero.
      if (objetivo.rol === "admin") {
        const adminsLicenciados = await coleccion.countDocuments({
          organizacionId,
          rol: "admin",
          licenciaAsignada: true,
        });
        if (adminsLicenciados <= 1) {
          return response.status(400).json({
            error: "Es el único administrador con licencia activa — asigna otro admin antes de quitarle la licencia a este.",
          });
        }
      }

      const usuario = await coleccion.findOneAndUpdate(
        { _id: new ObjectId(id), organizacionId },
        { $set: { licenciaAsignada: false } },
        { returnDocument: "after", projection: { passwordHash: 0 } }
      );
      return response.status(200).json({ usuario });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al quitar la licencia." });
    }
  }

  return response.status(400).json({ error: "Acción no reconocida." });
}
