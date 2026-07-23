import { useState } from "react";
import { MessageSquare, Zap, Shield, Settings, ChevronRight, Bot, Wrench, Gem, BookOpen } from "lucide-react";
import AutoMensagemModal from "@/components/AutoMensagemModal";
import LimitedMetodoModal from "@/components/LimitedMetodoModal";

const tools = [
  {
    id: "auto-mensagem",
    name: "Auto Mensagem",
    description: "Envie mensagens automáticas em canais do Discord com intervalos personalizados.",
    icon: MessageSquare,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    category: "ferramentas",
  },
  {
    id: "limited-metodo",
    name: "Limited Método",
    description: "Roube limiteds de usuários usando RoPro e Rolimons para encontrar e abordar suas vítimas.",
    icon: Gem,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    category: "metodos",
  },
];

const categories = [
  {
    id: "ferramentas",
    label: "Ferramentas",
    icon: Wrench,
  },
  {
    id: "metodos",
    label: "Métodos",
    icon: BookOpen,
  },
];

const STORAGE_KEY = "beaming_automessage_state";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("ferramentas");
  const [autoMensagemOpen, setAutoMensagemOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.status === "running";
      }
    } catch {}
    return false;
  });
  const [limitedMetodoOpen, setLimitedMetodoOpen] = useState(false);

  const filteredTools = tools.filter((t) => t.category === activeCategory);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-bold text-sidebar-foreground text-sm tracking-wide">Beaming</span>
            <p className="text-xs text-muted-foreground">Discord Tools</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Categorias
          </p>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                data-testid={`nav-category-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">v1.0.0</p>
              <p className="text-xs text-muted-foreground">Beaming Bot</p>
            </div>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {categories.find((c) => c.id === activeCategory)?.label}
            </span>
            <Zap className="w-3.5 h-3.5 text-primary ml-1" />
          </div>
          <h1 className="text-xl font-bold text-foreground mt-0.5">
            {categories.find((c) => c.id === activeCategory)?.label}
          </h1>
        </div>

        {/* Tools grid */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  data-testid={`tool-card-${tool.id}`}
                  onClick={() => {
                    if (tool.id === "auto-mensagem") setAutoMensagemOpen(true);
                    if (tool.id === "limited-metodo") setLimitedMetodoOpen(true);
                  }}
                  className="group text-left bg-card border border-card-border rounded-xl p-5 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg ${tool.bgColor} ${tool.borderColor} border flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${tool.color}`} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{tool.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AutoMensagemModal
        open={autoMensagemOpen}
        onClose={() => setAutoMensagemOpen(false)}
      />
      <LimitedMetodoModal
        open={limitedMetodoOpen}
        onClose={() => setLimitedMetodoOpen(false)}
      />
    </div>
  );
}
