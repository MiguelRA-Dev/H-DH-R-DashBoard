import { describe, test, expect, beforeEach, vi } from "vitest";
import { conCors } from "./cors.js";

function crearResponseFake() {
  const headers = {};
  return {
    headers,
    statusCode: null,
    body: null,
    ended: false,
    setHeader(nombre, valor) {
      headers[nombre] = valor;
    },
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.body = cuerpo;
    },
    end() {
      this.ended = true;
    },
  };
}

describe("conCors", () => {
  beforeEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = "https://app.ejemplo.com, https://otro.ejemplo.com";
  });

  test("deja pasar una petición sin header Origin (mismo origen) sin tocar headers de CORS", async () => {
    const handler = vi.fn(async (req, res) => res.status(200).json({ ok: true }));
    const envuelto = conCors(handler);

    const request = { method: "GET", headers: {} };
    const response = crearResponseFake();
    await envuelto(request, response);

    expect(handler).toHaveBeenCalledWith(request, response);
    expect(response.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(response.statusCode).toBe(200);
  });

  test("refleja el origen cuando está en la allowlist", async () => {
    const handler = vi.fn(async (req, res) => res.status(200).json({ ok: true }));
    const envuelto = conCors(handler);

    const request = { method: "GET", headers: { origin: "https://app.ejemplo.com" } };
    const response = crearResponseFake();
    await envuelto(request, response);

    expect(response.headers["Access-Control-Allow-Origin"]).toBe("https://app.ejemplo.com");
    expect(response.headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(handler).toHaveBeenCalled();
  });

  test("no refleja un origen fuera de la allowlist, pero igual deja pasar la petición", async () => {
    const handler = vi.fn(async (req, res) => res.status(200).json({ ok: true }));
    const envuelto = conCors(handler);

    const request = { method: "GET", headers: { origin: "https://evil.example.com" } };
    const response = crearResponseFake();
    await envuelto(request, response);

    expect(response.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(response.headers["Access-Control-Allow-Credentials"]).toBeUndefined();
    // No hay CORS para ese origen, pero esto no reemplaza la auth — la
    // petición sigue llegando al handler, que es quien la rechaza si hace falta.
    expect(handler).toHaveBeenCalled();
  });

  test("responde OPTIONS (preflight) con 204 sin llamar al handler real", async () => {
    const handler = vi.fn();
    const envuelto = conCors(handler);

    const request = { method: "OPTIONS", headers: { origin: "https://app.ejemplo.com" } };
    const response = crearResponseFake();
    await envuelto(request, response);

    expect(response.statusCode).toBe(204);
    expect(response.ended).toBe(true);
    expect(response.headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(handler).not.toHaveBeenCalled();
  });

  test("sin CORS_ALLOWED_ORIGINS configurado, ningún origen se refleja", async () => {
    process.env.CORS_ALLOWED_ORIGINS = "";
    const handler = vi.fn(async (req, res) => res.status(200).json({ ok: true }));
    const envuelto = conCors(handler);

    const request = { method: "GET", headers: { origin: "https://app.ejemplo.com" } };
    const response = crearResponseFake();
    await envuelto(request, response);

    expect(response.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
