import express from "express";
import path from "path";
import https from "https";
import http from "http";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Headers obligatorios para SharedArrayBuffer (FFmpeg WASM)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Archivos estáticos
app.use(express.static(path.join(process.cwd(), "public")));

// Inicio de servidor local (cuando no está en entorno serverless de Vercel)
if (process.env.VERCEL !== "1" && !process.env.NOW_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  if (fs.existsSync("key.pem") && fs.existsSync("cert.pem")) {
    const sslOptions = {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem")
    };
    https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
      console.log(`\n🐾 BARSALITSUNI VIDEO GENERATOR INICIADO`);
      console.log(`⚡ The Power of the Pudú • El Gatito del Final`);
      console.log(`💻 Local (HTTPS): https://localhost:${PORT}`);
      console.log(`📱 Celular: https://TU_IP_LOCAL:${PORT}`);
    });
  } else {
    http.createServer(app).listen(PORT, "0.0.0.0", () => {
      console.log(`\n🐾 BARSALITSUNI VIDEO GENERATOR INICIADO`);
      console.log(`💻 Local (HTTP): http://localhost:${PORT}`);
    });
  }
}

export default app;
