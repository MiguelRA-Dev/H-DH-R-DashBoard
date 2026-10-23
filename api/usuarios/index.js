import { ObjectId } from "mongodb";
import { getUsuariosCollection, getOrganizacionesCollection } from "../_lib/mongodb.js";
import { hashPassword, requireLicencia, requireAdmin, ROLES_VALIDOS } from "../_lib/auth.js";
import { conCors } from "../_lib/cors.js";

async function handler(request, response) {
  if (request.method === "GET") {
    const usuario = requireLicencia(request, response);
    if (!usuario) return;

    try {
      const coleccion = await getUsuariosCollection();
      const usuarios = await coleccion
        .find(
          { organizacionId: new ObjectId(usuario.organizacionId) },
          { projection: { passwordHash: 0 } }
        )
        .sort({ creadoEn: 1 })
        .toArray();
      return response.status(200).json({ usuarios });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al listar usuarios" });
    }
  }

  if (request.method === "POST") {
    // Agregar gente al equipo es exclusivo de admin — ya no existe el
    // "arranque sin sesión" de antes: cada organización nace con su primer
    // admin ya creado (ver scripts/crear-organizacion.js), así que esto
    // siempre exige estar logueado como admin de esa organización.
    const admin = requireAdmin(request, response);
    if (!admin) return;

    const { nombre, email, password, cargo, telefono, rol, asignarLicencia } = request.body || {};
    if (!nombre?.trim() || !email?.trim() || !password) {
      return response.status(400).json({ error: "Faltan campos obligatorios." });
    }
    if (password.length < 8) {
      return response.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }
    if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
      return response.status(400).json({ error: "Rol inválido." });
    }

    try {
      const organizacionId = new ObjectId(admin.organizacionId);
      const rolNuevo = rol || "reclutador";
      // Crear la cuenta nunca se bloquea por cupo — el cupo es un techo de
      // cuántas cuentas pueden tener licencia asignada a la vez (estilo
      // Azure AD/M365), no de cuántas cuentas pueden existir. Si no se pide
      // licencia (o no hay cupo), la cuenta igual se crea, solo que sin
      // acceso hasta que alguien se la asigne desde "Usuarios".
      const quiereLicencia = asignarLicencia === true;

      const [organizacionesCol, coleccion] = await Promise.all([
        getOrganizacionesCollection(),
        getUsuariosCollection(),
      ]);

      let licenciaAsignada = false;
      if (quiereLicencia) {
        const organizacion = await organizacionesCol.findOne({ _id: organizacionId });
        if (!organizacion) {
          return response.status(404).json({ error: "No se encontró la organización de esta cuenta." });
        }
        const cupo = organizacion.licencias?.[rolNuevo] ?? 0;
        const enUso = await coleccion.countDocuments({ organizacionId, rol: rolNuevo, licenciaAsignada: true });
        if (enUso >= cupo) {
          return response.status(403).json({
            error: `Ya se usaron las ${cupo} licencias de ${rolNuevo === "admin" ? "administrador" : "reclutador"} contratadas. Puedes crear la cuenta sin licencia, o ampliar el cupo.`,
          });
        }
        licenciaAsignada = true;
      }

      const emailNormalizado = email.toLowerCase().trim();
      const existente = await coleccion.findOne({ email: emailNormalizado });
      if (existente) {
        return response.status(409).json({ error: "Ya existe una cuenta con ese correo." });
      }

      const nuevoUsuario = {
        organizacionId,
        nombre: nombre.trim(),
        email: emailNormalizado,
        passwordHash: hashPassword(password),
        cargo: cargo?.trim() || "",
        telefono: telefono?.trim() || "",
        rol: rolNuevo,
        licenciaAsignada,
        // Cuándo quedó licenciada por última vez — es el criterio para elegir
        // a quién le toca perder la licencia si el superadmin baja el cupo
        // por debajo del uso real (ver api/superadmin/organizaciones/[id].js):
        // se le quita primero a quien la tiene hace menos tiempo.
        licenciaAsignadaEn: licenciaAsignada ? new Date() : null,
        debeCambiarPassword: false,
        creadoEn: new Date(),
      };
      const resultado = await coleccion.insertOne(nuevoUsuario);

      return response.status(201).json({
        _id: resultado.insertedId,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        cargo: nuevoUsuario.cargo,
        telefono: nuevoUsuario.telefono,
        rol: nuevoUsuario.rol,
        licenciaAsignada: nuevoUsuario.licenciaAsignada,
        debeCambiarPassword: nuevoUsuario.debeCambiarPassword,
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al crear el usuario" });
    }
  }

  return response.status(405).json({ error: "Método no permitido" });
}

export default conCors(handler);
