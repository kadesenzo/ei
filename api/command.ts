import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { command, location } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
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
    res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Falha ao processar comando com a IA." });
  }
}
