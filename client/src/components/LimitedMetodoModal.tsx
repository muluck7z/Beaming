import { X, Star, Gem, ExternalLink, ChevronRight, User, Tag, Zap, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    num: 1,
    title: "Instale o RoPro",
    desc: "Adicione a extensão RoPro ao seu navegador. Ela exibe o Discord das pessoas direto no perfil do Roblox — sem ela o método não funciona.",
    link: { label: "Instalar RoPro", url: "https://chromewebstore.google.com/detail/ropro-tingkatkan-pengalam/adbacgifemdbhdkfppmeilbgppmhaobf" },
  },
  {
    num: 2,
    title: "Acesse o Rolimons",
    desc: "Entre na página de Anúncios de Troca do Rolimons e procure por itens raros: SSHF, Valk, Korblox, Headless, Dominus e similares.",
    link: { label: "Abrir Rolimons Trades", url: "https://www.rolimons.com/trades" },
  },
  {
    num: 3,
    title: "Encontre a vítima",
    desc: "Clique no nome do usuário no anúncio. Com o RoPro instalado, role o perfil do Roblox dele — o Discord vai aparecer automaticamente.",
  },
  {
    num: 4,
    title: "Adicione no Discord",
    desc: "Adicione a pessoa usando o Discord encontrado e mande uma mensagem educada sobre o item que viu no anúncio.",
  },
  {
    num: 5,
    title: "Execute o social",
    desc: "Convença ela a te adicionar como amigo no Roblox. Quando ela disser que não é necessário, fale que só negocia com amigos. Se ela pedir para mudar a configuração, diga que só o responsável pode fazer isso — e que ele não está disponível.",
  },
];

const roproFeatures = [
  "Exibe o Discord das pessoas diretamente no perfil",
  "Calcula valores de troca usando dados do Rolimons",
  "Verifica se um item está acima ou abaixo do preço",
  "Mostra quando a pessoa ficou online pela última vez",
  "Exibe amigos em comum entre você e o usuário",
];

const rolimonsFeatures = [
  "Lista os valores de todos os itens limitados",
  "Histórico de preços e tendência de valorização",
  "Calculadora de trocas — compara se é justo",
  "Página de Anúncios de Troca com usuários ativos",
  "Indica o nível de procura de cada item",
];

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.floor(value) ? "text-yellow-400" : i - 0.5 === value ? "text-yellow-400" : "text-muted-foreground/30"}`} fill="currentColor" viewBox="0 0 20 20">
          {i - 0.5 === value ? (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipPath="inset(0 50% 0 0)" />
          ) : (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          )}
        </svg>
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value}</span>
    </div>
  );
}

export default function LimitedMetodoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — extension-style */}
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#111214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
                <Gem className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base leading-tight">Limited Método</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating value={4.5} />
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium">Difícil</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="w-3 h-3" />
              <span>Muluck7z</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Tag className="w-3 h-3" />
              <div className="flex gap-1">
                {["Tradicional", "Discord", "Roblox", "Social"].map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px]">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">

          {/* Intro */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Um dos melhores métodos para roubar limiteds de usuários. Uma estratégia sólida para caçar suas vítimas usando ferramentas reais de traders.
          </p>

          {/* RoPro */}
          <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-blue-500/5">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">RoPro — Extensão Essencial</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {roproFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-[11px] text-blue-300/70 italic">Sem o RoPro você não consegue ver o Discord das pessoas no perfil do Roblox.</p>
              </div>
              <a
                href="https://chromewebstore.google.com/detail/ropro-tingkatkan-pengalam/adbacgifemdbhdkfppmeilbgppmhaobf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Instalar RoPro
              </a>
            </div>
          </div>

          {/* Rolimons */}
          <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-emerald-500/5">
              <Gem className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Rolimons — Plataforma de Trocas</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {rolimonsFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground">Procure por: <span className="text-emerald-300 font-medium">SSHF, Valk, Korblox, Headless, Dominus</span> e outros itens raros.</p>
              </div>
              <a
                href="https://www.rolimons.com/trades"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Rolimons Trades
              </a>
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Passo a Passo</p>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-violet-400">{step.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white mb-0.5">{step.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                    {step.link && (
                      <a
                        href={step.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {step.link.label}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-yellow-300/70 leading-relaxed">
              Método de dificuldade <strong className="text-yellow-300">Difícil</strong>. Requer paciência e boa comunicação social para convencer a vítima.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-white/8 px-5 py-3 bg-white/2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium">Extensão Falsa</span>
            <span>•</span>
            <span>Categoria: Métodos</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
