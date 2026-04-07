export async function processCommand(command: string, location?: { lat: number; lng: number; address?: string }) {
  try {
    const response = await fetch("/api/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command, location }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Erro desconhecido no servidor" }));
      const errorMessage = errorData.error || "Erro no servidor";
      
      if (errorMessage.includes("API_KEY") || errorMessage.includes("configured")) {
        return "Senhor, detectei que a chave GEMINI_API_KEY não foi configurada nas variáveis de ambiente da sua hospedagem (Vercel/Cloud Run). Por favor, adicione-a para que eu possa processar seus comandos.";
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "Desculpe, senhor. Tive um problema de conexão com meus servidores centrais.";
  }
}
