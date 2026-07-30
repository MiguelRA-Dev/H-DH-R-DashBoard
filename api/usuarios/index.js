import { getUsuariosCollection } from "../_lib/mongodb.js";
import { hashPassword, crearTokenSesion, escribirCookieSesion, requireAuth } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method === "GET") {
    const usuario = requireAuth(request, response);
    if (!usuario) return;

    try {
      const coleccion = await getUsuariosCollection();
      const usuarios = await coleccion
        .find({}, { projection: { passwordHash: 0 } })
        .sort({ creadoEn: 1 })
        .toArray();
      return response.status(200).json({ usuarios });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al listar usuarios" });
    }
  }

  if (request.method === "POST") {
    const { nombre, email, password } = request.body || {};
    if (!nombre?.trim() || !email?.trim() || !password) {
      return response.status(400).json({ error: "Faltan campos obligatorios." });
    }
    if (password.length < 8) {
      return response.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }

    try {
      const coleccion = await getUsuariosCollection();
      const total = await coleccion.countDocuments();

      // Crear una cuenta sin sesión solo está permitido si todavía no existe
      // NINGUNA (arranque inicial del dashboard). Habiendo al menos una, hace
      // falta estar autenticado para agregar más gente del equipo — evita
      // que cualquiera con la URL se autoregistre en el dashboard de RRHH.
      let esArranque = total === 0;
      if (!esArranque) {
        const sesionActual = requireAuth(request, response);
        if (!sesionActual) return;
      }

      const emailNormalizado = email.toLowerCase().trim();
      const existente = await coleccion.findOne({ email: emailNormalizado });
      if (existente) {
        return response.status(409).json({ error: "Ya existe una cuenta con ese correo." });
      }

      const nuevoUsuario = {
        nombre: nombre.trim(),
        email: emailNormalizado,
        passwordHash: hashPassword(password),
        creadoEn: new Date(),
      };
      const resultado = await coleccion.insertOne(nuevoUsuario);
      const usuarioCreado = {
        _id: resultado.insertedId,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
      };

      // Al primer usuario (arranque) lo dejamos con sesión iniciada de una
      // vez, para no pedirle login justo después de crear su propia cuenta.
      if (esArranque) {
        const token = crearTokenSesion(usuarioCreado);
        escribirCookieSesion(response, token);
      }

      return response.status(201).json(usuarioCreado);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al crear el usuario" });
    }
  }

  return response.status(405).json({ error: "Método no permitido" });
}
