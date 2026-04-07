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
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro no servidor");
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "Desculpe, senhor. Tive um problema de conexão com meus servidores centrais.";
  }
}
