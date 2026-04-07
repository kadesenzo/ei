import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Terminal, Search, Globe, Layout, Cpu, MapPin, X, ExternalLink, Lightbulb, Thermometer, Shield, Music, Smartphone, Settings } from "lucide-react";
import JarvisCore from "./components/JarvisCore";
import { processCommand } from "./services/gemini";

interface Log {
  id: number;
  text: string;
  type: "user" | "jarvis" | "system";
}

interface SiteData {
  name: string;
  hero: string;
  colors: { primary: string; secondary: string };
  features: string[];
}

interface AutomationTask {
  id: string;
  taskName: string;
  description: string;
  duration: string;
  icon: string;
  progress: number;
}

interface SmartHomeDevice {
  id: string;
  name: string;
  type: "luz" | "ar" | "seguranca" | "som";
  status: "on" | "off";
  value?: string;
}

interface AppAction {
  id: string;
  app: string;
  action: string;
  params?: string;
}

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState("SISTEMA ONLINE");
  const [leads, setLeads] = useState<any[]>([]);
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [showSiteBuilder, setShowSiteBuilder] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [activeTasks, setActiveTasks] = useState<AutomationTask[]>([]);
  const [homeDevices, setHomeDevices] = useState<SmartHomeDevice[]>([
    { id: "1", name: "Luzes da Sala", type: "luz", status: "off" },
    { id: "2", name: "Ar Condicionado", type: "ar", status: "off", value: "22°C" },
    { id: "3", name: "Câmeras de Segurança", type: "seguranca", status: "on" },
    { id: "4", name: "Sistema de Som", type: "som", status: "off" },
  ]);
  const [appActions, setAppActions] = useState<AppAction[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: string; data: any; callback: () => void } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    // Task progress simulator
    const interval = setInterval(() => {
      setActiveTasks(prev => prev.map(task => ({
        ...task,
        progress: task.progress < 100 ? task.progress + Math.random() * 5 : 0
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "pt-BR";
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleCommand(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Auto-get location
    requestLocation();

    addLog("Protocolo Jarvis ativo. Bem-vindo de volta, Criador.", "system");
  }, []);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      setStatus("LOCALIZANDO...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          addLog("Localização triangulada. Coordenadas confirmadas.", "system");
          setStatus("SISTEMA ONLINE");
        },
        (error) => {
          console.error("Location error:", error);
          addLog("Falha no GPS. Usando backup de localização.", "system");
          setStatus("SISTEMA ONLINE");
        }
      );
    }
  };

  const addLog = (text: string, type: "user" | "jarvis" | "system") => {
    setLogs(prev => [{ id: Date.now() + Math.random(), text, type }, ...prev].slice(0, 10));
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      addLog("Voz interrompida pelo Criador.", "system");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
      setStatus("ESCUTANDO...");
    }
  };

  const handleCommand = async (transcript: string) => {
    addLog(transcript, "user");
    setStatus("PROCESSANDO...");
    
    const response = await processCommand(transcript, location || undefined);
    
    // Helper for confirmation
    const requestConfirmation = (type: string, data: any, callback: () => void) => {
      setPendingAction({ type, data, callback });
      const msg = `Senhor, recebi uma solicitação para ${type}. Devo prosseguir?`;
      addLog(msg, "jarvis");
      speak(msg);
    };

    // Parse actions
    if (response.includes("[ACTION:BUSCAR_LEADS]")) {
      requestConfirmation("buscar leads de negócios", null, () => {
        setStatus("BUSCANDO LEADS...");
        setTimeout(() => {
          setLeads([
            { name: "Padaria da Esquina", address: "Próximo a você", status: "Sem Site" },
            { name: "Oficina Mecânica Kaen", address: "2km de distância", status: "Site Antigo" },
            { name: "Pet Shop Amigo", address: "Bairro vizinho", status: "Sem presença online" }
          ]);
          addLog("Leads locais identificados, Senhor.", "system");
        }, 1500);
      });
    }

    if (response.includes("[ACTION:OPEN_URL]")) {
      const urlMatch = response.match(/https?:\/\/[^\s\]]+/);
      if (urlMatch) {
        requestConfirmation(`abrir a URL: ${urlMatch[0]}`, urlMatch[0], () => {
          addLog(`Abrindo recurso externo: ${urlMatch[0]}`, "system");
          window.open(urlMatch[0], "_blank");
        });
      }
    }

    // Parse Home Control
    const homeMatch = response.match(/<HOME_JSON>([\s\S]*?)<\/HOME_JSON>/);
    if (homeMatch) {
      try {
        const homeData = JSON.parse(homeMatch[1]);
        requestConfirmation(`controlar ${homeData.device}`, homeData, () => {
          setHomeDevices(prev => prev.map(device => 
            device.type === homeData.device 
              ? { ...device, status: homeData.action === "on" ? "on" : "off", value: homeData.value || device.value }
              : device
          ));
          addLog(`Controle residencial: ${homeData.device} -> ${homeData.action}`, "system");
        });
      } catch (e) {
        console.error("Failed to parse home JSON", e);
      }
    }

    // Parse App Control
    const appMatch = response.match(/<APP_JSON>([\s\S]*?)<\/APP_JSON>/);
    if (appMatch) {
      try {
        const appData = JSON.parse(appMatch[1]);
        requestConfirmation(`executar ação no app ${appData.app}`, appData, () => {
          const newAppAction: AppAction = {
            id: Date.now().toString(),
            ...appData
          };
          setAppActions(prev => [newAppAction, ...prev].slice(0, 5));
          addLog(`Ação em aplicativo: ${appData.app} -> ${appData.action}`, "system");
        });
      } catch (e) {
        console.error("Failed to parse app JSON", e);
      }
    }

    // Parse Automation Task
    const taskMatch = response.match(/<TASK_JSON>([\s\S]*?)<\/TASK_JSON>/);
    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1]);
        requestConfirmation(`iniciar automação: ${taskData.taskName}`, taskData, () => {
          const newTask: AutomationTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...taskData,
            progress: 0
          };
          setActiveTasks(prev => [newTask, ...prev]);
          addLog(`Tarefa de automação iniciada: ${newTask.taskName}`, "system");
        });
      } catch (e) {
        console.error("Failed to parse task JSON", e);
      }
    }

    // Parse Site JSON
    const siteMatch = response.match(/<SITE_JSON>([\s\S]*?)<\/SITE_JSON>/);
    if (siteMatch) {
      try {
        const data = JSON.parse(siteMatch[1]);
        requestConfirmation(`gerar o site para ${data.name}`, data, () => {
          setSiteData(data);
          setShowSiteBuilder(true);
          addLog("Estrutura do site gerada conforme solicitado.", "system");
        });
      } catch (e) {
        console.error("Failed to parse site JSON", e);
      }
    }

    const cleanResponse = response.replace(/\[ACTION:.*\]/g, "").replace(/<SITE_JSON>[\s\S]*?<\/SITE_JSON>/g, "").replace(/<TASK_JSON>[\s\S]*?<\/TASK_JSON>/g, "").replace(/<HOME_JSON>[\s\S]*?<\/HOME_JSON>/g, "").replace(/<APP_JSON>[\s\S]*?<\/APP_JSON>/g, "").trim();
    if (cleanResponse && !pendingAction) {
      addLog(cleanResponse, "jarvis");
      speak(cleanResponse);
    }
    setStatus("SISTEMA ONLINE");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 font-mono overflow-hidden flex flex-col p-6 relative">
      {/* Background Grid Decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="absolute inset-0 bg-radial-at-t from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center border-b border-cyan-900/50 pb-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="w-8 h-8 animate-pulse text-cyan-400" />
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-cyan-500 rounded-full blur-md"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest">JARVIS V2.0</h1>
            <p className="text-[10px] text-cyan-600 font-black uppercase tracking-[0.3em]">Protocolo: Criador Reconhecido</p>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2 text-[10px] opacity-70">
            <MapPin className={`w-3 h-3 ${location ? "text-green-500" : "text-red-500"}`} />
            <span>{location ? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : "GPS OFFLINE"}</span>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-50 uppercase">Status</p>
            <p className={`text-sm font-bold ${status === "SISTEMA ONLINE" ? "text-green-500" : "text-yellow-500"}`}>
              {status}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Panel: Logs & Terminal */}
        <section className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm h-[400px] lg:h-full">
          <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-2">
            <Terminal className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase">Interface de Comando</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {logs.map(log => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-xs p-2 rounded ${
                    log.type === "user" ? "bg-cyan-900/20 border-l-2 border-cyan-500" : 
                    log.type === "jarvis" ? "bg-purple-900/20 border-l-2 border-purple-500" : 
                    "bg-slate-800/50 italic opacity-70"
                  }`}
                >
                  <span className="font-bold mr-2">
                    {log.type === "user" ? "> CRIADOR:" : log.type === "jarvis" ? "> JARVIS:" : "[SYS]:"}
                  </span>
                  {log.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Chat Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                handleCommand(chatInput);
                setChatInput("");
              }
            }}
            className="relative mt-2"
          >
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite um comando..."
              className="w-full bg-slate-950/50 border border-cyan-900/50 rounded-lg py-2 px-4 text-xs focus:outline-none focus:border-cyan-500 transition-colors pr-10"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Center: Jarvis Core */}
        <section className="flex flex-col items-center justify-center gap-8 py-8 lg:py-0">
          <JarvisCore isListening={isListening} isSpeaking={isSpeaking} />
          
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleListening}
                className={`group relative p-8 rounded-full transition-all duration-500 ${
                  isListening ? "bg-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.4)]" : "bg-cyan-500/10 hover:bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                }`}
              >
                <div className="absolute inset-0 rounded-full border border-cyan-500/50 group-hover:scale-110 transition-transform" />
                {isListening ? (
                  <MicOff className="w-12 h-12 text-red-500" />
                ) : (
                  <Mic className="w-12 h-12 text-cyan-400" />
                )}
              </button>

              {isSpeaking && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={stopSpeaking}
                  className="p-4 bg-red-500/20 border border-red-500/50 rounded-full text-red-500 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                  PARAR VOZ
                </motion.button>
              )}
            </div>
            <p className="text-sm animate-pulse text-cyan-600 font-bold tracking-widest uppercase text-center">
              {isListening ? "Escutando Criador..." : "Aguardando Instruções"}
            </p>
          </div>

          {/* Mobile Smart Home Quick Access */}
          <div className="lg:hidden grid grid-cols-4 gap-4 w-full px-4">
            {homeDevices.map(device => (
              <div key={device.id} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${device.status === 'on' ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-900/50 border-cyan-900/30 opacity-50'}`}>
                {device.type === 'luz' && <Lightbulb className="w-5 h-5" />}
                {device.type === 'ar' && <Thermometer className="w-5 h-5" />}
                {device.type === 'seguranca' && <Shield className="w-5 h-5" />}
                {device.type === 'som' && <Music className="w-5 h-5" />}
              </div>
            ))}
          </div>
        </section>

        {/* Right Panel: Intelligence & Automation */}
        <section className="space-y-6 overflow-y-auto custom-scrollbar pr-2 h-full">
          {/* Smart Home HUD */}
          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-2 mb-4">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase">Controle Residencial</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {homeDevices.map(device => (
                <div key={device.id} className={`p-3 rounded-lg border transition-all ${device.status === 'on' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-800/30 border-cyan-900/20 opacity-60'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {device.type === 'luz' && <Lightbulb className="w-3 h-3" />}
                    {device.type === 'ar' && <Thermometer className="w-3 h-3" />}
                    {device.type === 'seguranca' && <Shield className="w-3 h-3" />}
                    {device.type === 'som' && <Music className="w-3 h-3" />}
                    <span className="text-[10px] font-bold uppercase">{device.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] px-1 rounded ${device.status === 'on' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {device.status === 'on' ? 'ATIVO' : 'OFFLINE'}
                    </span>
                    {device.value && <span className="text-[8px] opacity-50">{device.value}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* App Actions HUD */}
          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-2 mb-4">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase">Execução de Apps</h2>
            </div>
            <div className="space-y-2">
              {appActions.length > 0 ? (
                appActions.map(action => (
                  <div key={action.id} className="text-[10px] p-2 bg-cyan-900/10 border border-cyan-900/30 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-cyan-300 uppercase">{action.app}</span>
                      <span className="mx-2 opacity-50">→</span>
                      <span className="opacity-70">{action.action}</span>
                    </div>
                    {action.params && <span className="text-[8px] opacity-40">[{action.params}]</span>}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 opacity-30 text-xs italic">
                  Nenhuma ação recente.
                </div>
              )}
            </div>
          </div>

          {/* System Resources HUD */}
          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex justify-between text-[8px] mb-2">
              <span>CPU LOAD</span>
              <span>MEMORY</span>
              <span>NETWORK</span>
            </div>
            <div className="flex gap-2 h-1">
              <div className="flex-1 bg-cyan-900/30 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["20%", "45%", "30%"] }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-cyan-500" />
              </div>
              <div className="flex-1 bg-cyan-900/30 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["60%", "65%", "62%"] }} transition={{ duration: 5, repeat: Infinity }} className="h-full bg-purple-500" />
              </div>
              <div className="flex-1 bg-cyan-900/30 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["10%", "90%", "15%"] }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-green-500" />
              </div>
            </div>
          </div>

          {/* Automation Tasks */}
          <div className="bg-slate-900/50 border border-purple-900/30 rounded-lg p-4 flex flex-col backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-purple-900/30 pb-2 mb-4">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase text-purple-400">Automações Ativas</h2>
            </div>
            <div className="space-y-4">
              {activeTasks.length > 0 ? (
                activeTasks.map((task) => (
                  <div key={task.id} className="bg-purple-900/10 border border-purple-900/30 p-3 rounded-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                        <Cpu className="w-3 h-3" />
                      </motion.div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-purple-300 uppercase">{task.taskName}</p>
                      <span className="text-[10px] opacity-50">{Math.round(task.progress)}%</span>
                    </div>
                    <p className="text-[10px] opacity-70 mb-2">{task.description}</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-purple-500 h-full"
                        animate={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 opacity-30 text-xs italic">
                  Nenhuma automação em execução.
                </div>
              )}
            </div>
          </div>

          {/* Leads Panel */}
          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 flex flex-col backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-2 mb-4">
              <Search className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase">Inteligência de Mercado</h2>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {leads.length > 0 ? (
                leads.map((lead, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    className="text-[10px] p-2 bg-cyan-900/10 border border-cyan-900/30 rounded hover:bg-cyan-900/20 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-cyan-300">{lead.name}</p>
                      <MapPin className="w-2 h-2 text-cyan-600" />
                    </div>
                    <p className="opacity-70">{lead.address}</p>
                    <span className="text-yellow-500 mt-1 block font-bold">{lead.status}</span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-4 opacity-30 text-xs">
                  Aguardando comando de busca...
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 h-[calc(50%-1.5rem)] flex flex-col backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-2 mb-4">
              <Layout className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase">Projetos de Web</h2>
            </div>
            {siteData ? (
              <div className="flex-1 flex flex-col gap-3">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                  <p className="text-[10px] uppercase opacity-50 mb-1">Cliente</p>
                  <p className="text-xs font-bold text-white">{siteData.name}</p>
                </div>
                <button 
                  onClick={() => setShowSiteBuilder(true)}
                  className="mt-auto w-full py-3 bg-cyan-500 text-slate-950 font-bold text-xs rounded hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  <ExternalLink className="w-3 h-3" /> ABRIR CONSTRUTOR
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-xs text-center gap-2">
                <Globe className="w-8 h-8 opacity-20" />
                Diga: "Jarvis, crie um site para a [Nome]"
              </div>
            )}
          </div>
        </section>

        {/* Site Builder Modal */}
        <AnimatePresence>
          {showSiteBuilder && siteData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12"
            >
              <div className="w-full max-w-5xl h-full bg-slate-900 border border-cyan-500/30 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(6,182,212,0.2)]">
                {/* Modal Header */}
                <div className="p-4 border-b border-cyan-900/50 flex justify-between items-center bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center text-slate-950 font-bold">J</div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest">Jarvis Web Builder</h3>
                      <p className="text-[10px] text-cyan-600">PREVISUALIZAÇÃO EM TEMPO REAL</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSiteBuilder(false)}
                    className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-y-auto bg-white text-slate-900 font-sans">
                  {/* Hero Section */}
                  <section 
                    className="py-20 px-8 text-center"
                    style={{ backgroundColor: siteData.colors.primary, color: '#fff' }}
                  >
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-4xl lg:text-6xl font-black mb-6"
                    >
                      {siteData.name}
                    </motion.h1>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">{siteData.hero}</p>
                    <button 
                      className="px-8 py-4 rounded-full font-bold text-lg shadow-xl"
                      style={{ backgroundColor: siteData.colors.secondary }}
                    >
                      Saiba Mais
                    </button>
                  </section>

                  {/* Features */}
                  <section className="py-16 px-8 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-12">Nossos Diferenciais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {siteData.features.map((f, i) => (
                        <div key={i} className="flex gap-4 items-start p-6 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: siteData.colors.primary + '20', color: siteData.colors.primary }}>
                            {i + 1}
                          </div>
                          <p className="text-lg font-medium">{f}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Footer */}
                  <footer className="py-12 bg-slate-900 text-white text-center">
                    <p className="opacity-50">© 2026 {siteData.name}. Criado pelo Jarvis.</p>
                  </footer>
                </div>

                {/* Modal Controls */}
                <div className="p-4 bg-slate-950/80 border-t border-cyan-900/50 flex justify-between items-center">
                  <p className="text-[10px] opacity-50 uppercase">Tecnologia: React + Tailwind + Gemini AI</p>
                  <div className="flex gap-4">
                    <button className="px-6 py-2 border border-cyan-500/30 rounded text-xs font-bold hover:bg-cyan-500/10">EDITAR CÓDIGO</button>
                    <button className="px-6 py-2 bg-cyan-500 text-slate-950 rounded text-xs font-bold hover:bg-cyan-400">PUBLICAR AGORA</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {pendingAction && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-cyan-500/20 rounded-xl">
                    <Shield className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Confirmação Stark</h2>
                    <p className="text-xs text-cyan-600 uppercase tracking-widest">Protocolo de Segurança</p>
                  </div>
                </div>
                
                <p className="text-cyan-100 mb-8 leading-relaxed">
                  Senhor, recebi uma solicitação para <span className="text-cyan-400 font-bold">{pendingAction.type}</span>. 
                  Deseja que eu execute esta ação agora?
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      addLog("Ação cancelada pelo Criador.", "system");
                      setPendingAction(null);
                    }}
                    className="py-3 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={() => {
                      pendingAction.callback();
                      setPendingAction(null);
                    }}
                    className="py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                    EXECUTAR
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <footer className="mt-8 flex justify-between items-end opacity-30 text-[8px] tracking-[0.2em]">
        <div>
          <p>ENCRYPTION: AES-256-GCM</p>
          <p>SATELLITE LINK: ACTIVE</p>
        </div>
        <div className="flex gap-4">
          <p>MARK 85 ARMOR STATUS: READY</p>
          <p>© 2026 STARK INDUSTRIES</p>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(6, 182, 212, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
