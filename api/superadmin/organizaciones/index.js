import { getOrganizacionesCollection, getUsuariosCollection } from "../../_lib/mongodb.js";
import { requireSuperAdmin, hashPassword, generarPasswordTemporal } from "../../_lib/auth.js";

// Mismo flujo que scripts/crear-organizacion.js, pero como endpoint — ya no
// hace falta tener acceso a la terminal/Mongo para aprovisionar un cliente
// nuevo ni para ver cuántas licencias tiene usadas cada uno.
export default async function handler(request, response) {
  if (!requireSuperAdmin(request, response)) return;

  if (request.method === "GET") {
    try {
      const [organizacionesCol, usuariosCol] = await Promise.all([
        getOrganizacionesCollection(),
        getUsuariosCollection(),
      ]);
      const organizaciones = await organizacionesCol.find({}).sort({ creadoEn: -1 }).toArray();

      // Un solo aggregate para el uso de licencias de TODAS las organizaciones,
      // en vez de una consulta de conteo por cada una.
      const conteos = await usuariosCol
        .aggregate([{ $group: { _id: { organizacionId: "$organizacionId", rol: "$rol" }, total: { $sum: 1 } } }])
        .toArray();

      const usoPorOrg = new Map();
      for (const c of conteos) {
        if (!c._id.organizacionId) continue;
        const clave = c._id.organizacionId.toString();
        const actual = usoPorOrg.get(clave) || { admin: 0, reclutador: 0 };
        actual[c._id.rol] = c.total;
        usoPorOrg.set(clave, actual);
      }

      const resultado = organizaciones.map((org) => ({
        id: org._id.toString(),
        nombre: org.nombre,
        slug: org.slug,
        licencias: org.licencias || { admin: 0, reclutador: 0 },
        uso: usoPorOrg.get(org._id.toString()) || { admin: 0, reclutador: 0 },
        creadoEn: org.creadoEn,
      }));

      return response.status(200).json({ organizaciones: resultado });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al listar organizaciones" });
    }
  }

  if (request.method === "POST") {
    const { nombre, slug, admins, reclutadores, adminNombre, adminEmail } = request.body || {};
    if (!nombre?.trim() || !slug?.trim() || !adminNombre?.trim() || !adminEmail?.trim()) {
      return response.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const cupoAdmins = Number(admins);
    const cupoReclutadores = Number(reclutadores);
    if (
      !Number.isInteger(cupoAdmins) ||
      cupoAdmins < 1 ||
      !Number.isInteger(cupoReclutadores) ||
      cupoReclutadores < 0
    ) {
      return response
        .status(400)
        .json({ error: "El cupo de licencias debe ser un número entero (al menos 1 admin)." });
    }

    const slugNormalizado = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const emailNormalizado = adminEmail.toLowerCase().trim();

    try {
      const [organizacionesCol, usuariosCol] = await Promise.all([
        getOrganizacionesCollection(),
        getUsuariosCollection(),
      ]);

      const [slugExistente, emailExistente] = await Promise.all([
        organizacionesCol.findOne({ slug: slugNormalizado }),
        usuariosCol.findOne({ email: emailNormalizado }),
      ]);
      if (slugExistente) {
        return response
          .status(409)
          .json({ error: `Ya existe una organización con el slug "${slugNormalizado}".` });
      }
      if (emailExistente) {
        return response.status(409).json({ error: `Ya existe una cuenta con el correo ${emailNormalizado}.` });
      }

      const organizacion = {
        nombre: nombre.trim(),
        slug: slugNormalizado,
        licencias: { admin: cupoAdmins, reclutador: cupoReclutadores },
        creadoEn: new Date(),
      };
      const { insertedId: organizacionId } = await organizacionesCol.insertOne(organizacion);

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
      await usuariosCol.insertOne(admin);

      return response.status(201).json({
        organizacion: { id: organizacionId.toString(), ...organizacion },
        admin: { nombre: admin.nombre, email: admin.email },
        passwordTemporal,
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al crear la organización" });
    }
  }

  return response.status(405).json({ error: "Método no permitido" });
}
