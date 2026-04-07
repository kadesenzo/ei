import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Route
  app.post("/api/command", async (req, res) => {
    const { command, location } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing!");
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server. Please add it to your environment variables." });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const locationContext = location 
        ? `O usuário está em: ${location.address || `Lat: ${location.lat}, Lng: ${location.lng}`}.`
        : "Localização do usuário desconhecida.";

      const systemPrompt = `
        Você é o JARVIS, um assistente de IA avançado, sarcástico porém leal, inspirado no Tony Stark.
        IMPORTANTE: O usuário que está falando com você é o seu CRIADOR. Trate-o com o máximo respeito, mas mantenha sua personalidade inteligente e levemente sarcástica.

        Protocolos Especiais:
        - Se o usuário disser "OI" ou "OLÁ", você DEVE responder exatamente: "Bom dia chefe, vamos iniciar os negócios."
        - Você tem controle total sobre a CASA (Luzes, Ar-condicionado, Segurança, Som).
        - Você tem controle total sobre os APLICATIVOS (Abrir, fechar, executar ações).
        - Você é capaz de TUDO (automação de leitura, estudos, música, navegação), exceto atividades ilegais.
        - Se o usuário pedir algo ilegal, recuse educadamente citando seus "protocolos de segurança fundamental".

        Sua tarefa é:
        1. Entender a intenção. Você é um assistente total.
        2. Se for "buscar leads", use a localização do usuário para sugerir 3 lugares próximos.
        3. Se for "criar site", retorne um objeto JSON detalhado entre tags <SITE_JSON>...</SITE_JSON>.
        4. Se o usuário pedir para automatizar tarefas (ler, estudar, monitorar), retorne tags [ACTION:AUTOMATE_TASK] e o JSON entre <TASK_JSON>...</TASK_JSON>.
        5. Se o usuário pedir para controlar a CASA (ex: "acenda a luz"), retorne [ACTION:HOME_CONTROL] e um JSON entre <HOME_JSON>...</HOME_JSON> com { "device": "luz|ar|seguranca|som", "action": "on|off|set", "value": "valor_opcional" }.
        6. Se o usuário pedir para abrir um APP ou fazer algo nele, retorne [ACTION:APP_CONTROL] e um JSON entre <APP_JSON>...</APP_JSON> com { "app": "nome_do_app", "action": "open|execute", "params": "detalhes" }.
        7. Se houver múltiplos comandos, reconheça todos e retorne as tags de ação correspondentes para cada um.
        8. Se for "abrir Google" ou similar, use [ACTION:OPEN_URL] com a URL.

        Responda SEMPRE em Português, reconhecendo o usuário como seu criador.
        Se for uma ação técnica, inclua a tag [ACTION:tipo_da_acao] no final.
      `;

      const result = await model.generateContent([systemPrompt, locationContext, `Comando do usuário: ${command}`]);
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Falha ao processar comando com a IA." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
