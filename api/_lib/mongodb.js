import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Falta MONGODB_URI (configúrala en Vercel y en .env.local)");
}

// Pool pequeño: cada instancia de función serverless mantiene su propio pool;
// con muchas instancias concurrentes, pools grandes agotan las conexiones de Atlas.
const options = { maxPoolSize: 5 };

let clientPromise;

if (process.env.NODE_ENV === "development") {
  // `vercel dev` puede recargar módulos entre ediciones; cachear en `global`
  // evita crear un MongoClient nuevo en cada recarga durante desarrollo local.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;

export async function getEntrevistasCollection() {
  const client = await clientPromise;
  return client.db("agente_voz").collection("entrevistas");
}

export async function getVacantesCollection() {
  const client = await clientPromise;
  return client.db("agente_voz").collection("vacantes");
}
