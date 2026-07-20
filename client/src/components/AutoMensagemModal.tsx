import { useState, useRef, useEffect } from "react";
import {
  X, Eye, EyeOff, Smile, Clock, MessageSquare,
  StopCircle, Play, Timer, CheckCircle2, XCircle,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Status = "idle" | "running" | "stopped";

interface LogEntry {
  time: string;
  text: string;
  ok: boolean;
}

const DISCORD_EMOJIS = [
  "😀","😂","😍","🥰","😎","🤔","😅","🙂","😊","🤩",
  "👍","👎","❤️","🔥","✨","💯","🎉","🚀","⚡","💀",
  "🤣","😭","😤","🥺","😏","🤯","🫡","💪","🙏","👀",
];

async function tick(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

export default function AutoMensagemModal({ open, onClose }: Props) {
  const { toast } = useToast();

  /* ── Form ──────────────────────────────────────── */
  const [showToken,      setShowToken]      = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [token,    setToken]    = useState("");
  const [canalId,  setCanalId]  = useState("");
  const [message,  setMessage]  = useState("");
  const [minTime,  setMinTime]  = useState(30);
  const [maxTime,  setMaxTime]  = useState(60);
  const [lockTime, setLockTime] = useState<number | "">("");

  /* ── Runtime ───────────────────────────────────── */
  const [status,    setStatus]    = useState<Status>("idle");
  const [sent,      setSent]      = useState(0);
  const [errors,    setErrors]    = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [logs,      setLogs]      = useState<LogEntry[]>([]);

  const runningRef    = useRef(false);
  const cdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (!open) stop();
  }, [open]);

  if (!open) return null;

  /* ── Helpers ───────────────────────────────────── */
  function addLog(text: string, ok: boolean) {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs(prev => [...prev, { time, text, ok }].slice(-60));
  }

  function startCd(secs: number) {
    setCountdown(Math.round(secs));
    if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
    cdIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(cdIntervalRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function cancellableSleep(ms: number) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (!runningRef.current) return;
      await tick(Math.min(150, end - Date.now()));
    }
  }

  function stop() {
    runningRef.current = false;
    if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
    setCountdown(0);
    setStatus("stopped");
  }

  /* ── Main loop ─────────────────────────────────── */
  async function runLoop(
    tok: string, ch: string, msg: string,
    mn: number, mx: number, lk: number
  ) {
    let sentN = 0, errN = 0;

    while (runningRef.current) {
      const rand  = mn + Math.random() * (mx - mn);
      const delay = lk > 0 ? Math.max(rand, lk) : rand;

      startCd(delay);
      addLog(`⏱  Próxima mensagem em ${Math.round(delay)}s…`, true);
      await cancellableSleep(delay * 1000);

      if (!runningRef.current) break;

      try {
        const res = await fetch("/api/discord/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tok, channelId: ch, message: msg }),
        });

        if (res.ok) {
          sentN++;
          setSent(sentN);
          addLog(`✓  Mensagem #${sentN} enviada.`, true);
        } else {
          const body = await res.json().catch(() => ({}));
          errN++;
          setErrors(errN);
          const detail = body.message ?? `HTTP ${res.status}`;
          addLog(`✗  Erro: ${detail}`, false);

          if (res.status === 429) {
            const wait = (body.retry_after ?? 5) + 1;
            addLog(`⏳  Rate limit — aguardando ${wait}s`, false);
            startCd(wait);
            await cancellableSleep(wait * 1000);
          }

          if (res.status === 401 || res.status === 403) {
            addLog("🔒  Token inválido ou sem permissão. Parando.", false);
            break;
          }
        }
      } catch (e: unknown) {
        errN++;
        setErrors(errN);
        addLog(`✗  Erro de rede: ${e instanceof Error ? e.message : String(e)}`, false);
      }
    }

    if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
    setCountdown(0);
    setStatus("stopped");
    addLog("⏹  Auto Mensagem encerrada.", false);
  }

  /* ── Validation helpers ────────────────────────── */
  function handleMinChange(v: number) {
    const c = Math.max(30, v);
    setMinTime(c);
    if (maxTime < c) setMaxTime(c);
  }

  function handleMaxChange(v: number) {
    setMaxTime(Math.max(minTime, v));
  }

  function insertEmoji(e: string) {
    setMessage(p => p + e);
    setShowEmojiPicker(false);
  }

  /* ── Submit ─────────────────────────────────────── */
  function handleStart(e: React.FormEvent) {
    e.preventDefault();

    if (!token.trim()) {
      toast({ title: "Token obrigatório", description: "Insira o Token do Discord.", variant: "destructive" });
      return;
    }
    if (!canalId.trim() || !/^\d{17,20}$/.test(canalId.trim())) {
      toast({ title: "ID do canal inválido", description: "Insira um ID numérico válido.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Mensagem obrigatória", description: "Insira a mensagem a ser enviada.", variant: "destructive" });
      return;
    }
    if (minTime < 30) {
      toast({ title: "Tempo mínimo inválido", description: "Mínimo deve ser ≥ 30 segundos.", variant: "destructive" });
      return;
    }
    if (maxTime < minTime) {
      toast({ title: "Tempo máximo inválido", description: "Máximo deve ser ≥ mínimo.", variant: "destructive" });
      return;
    }

    const lk = lockTime !== "" ? Number(lockTime) : 0;

    runningRef.current = true;
    setSent(0);
    setErrors(0);
    setLogs([]);
    setStatus("running");
    addLog("▶  Auto Mensagem iniciada.", true);
    runLoop(token.trim(), canalId.trim(), message.trim(), minTime, maxTime, lk);
  }

  /* ── Render ─────────────────────────────────────── */
  const isRunning = status === "running";
  const isStopped = status === "stopped";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="auto-mensagem-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) { stop(); onClose(); } }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg mx-4 bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
        data-testid="auto-mensagem-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Auto Mensagem</h2>
              <p className="text-xs text-muted-foreground">
                {isRunning ? "Rodando…" : isStopped ? "Encerrado" : "Configure o envio automático"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ativo
              </span>
            )}
            <button
              data-testid="button-close-modal"
              onClick={() => { stop(); onClose(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── CONFIG FORM (idle / stopped) ── */}
          {!isRunning && (
            <form onSubmit={handleStart} className="px-6 py-5 space-y-4">

              {isStopped && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
                  <StopCircle className="w-3.5 h-3.5 shrink-0" />
                  Sessão encerrada — ajuste as configurações e inicie novamente.
                </div>
              )}

              {/* Token */}
              <div className="space-y-1.5">
                <Label htmlFor="token-discord" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Token Discord
                </Label>
                <div className="relative">
                  <Input
                    id="token-discord"
                    data-testid="input-token-discord"
                    type={showToken ? "text" : "password"}
                    placeholder="Insira seu token do Discord…"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="pr-10 bg-muted border-input text-foreground placeholder:text-muted-foreground font-mono text-sm"
                  />
                  <button
                    type="button"
                    data-testid="button-toggle-token-visibility"
                    onClick={() => setShowToken(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mantenha seu token em segurança. Nunca o compartilhe.</p>
              </div>

              {/* Canal ID */}
              <div className="space-y-1.5">
                <Label htmlFor="id-canal" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ID do Canal
                </Label>
                <Input
                  id="id-canal"
                  data-testid="input-id-canal"
                  type="text"
                  placeholder="Ex: 123456789012345678"
                  value={canalId}
                  onChange={e => setCanalId(e.target.value)}
                  className="bg-muted border-input text-foreground placeholder:text-muted-foreground font-mono text-sm"
                />
              </div>

              {/* Mensagem */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mensagem" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mensagem
                  </Label>
                  <button
                    type="button"
                    data-testid="button-emoji-picker"
                    onClick={() => setShowEmojiPicker(p => !p)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    Emoji
                  </button>
                </div>

                {showEmojiPicker && (
                  <div
                    data-testid="emoji-picker"
                    className="p-3 bg-background border border-border rounded-lg grid grid-cols-10 gap-1"
                  >
                    {DISCORD_EMOJIS.map((emoji, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="text-lg hover:bg-muted rounded p-0.5 transition-colors leading-none"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <Textarea
                  id="mensagem"
                  data-testid="textarea-mensagem"
                  placeholder="Digite sua mensagem… Use :emoji: ou clique em Emoji acima"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="bg-muted border-input text-foreground placeholder:text-muted-foreground min-h-24 resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">{message.length} caracteres</p>
              </div>

              {/* Intervalo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Intervalo de Tempo (segundos)
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="min-time" className="text-xs text-muted-foreground">
                      Mínimo <span className="text-primary">(≥ 30s)</span>
                    </Label>
                    <Input
                      id="min-time"
                      data-testid="input-min-time"
                      type="number"
                      min={30}
                      value={minTime}
                      onChange={e => handleMinChange(Number(e.target.value))}
                      className="bg-muted border-input text-foreground text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="max-time" className="text-xs text-muted-foreground">
                      Máximo
                    </Label>
                    <Input
                      id="max-time"
                      data-testid="input-max-time"
                      type="number"
                      min={minTime}
                      value={maxTime}
                      onChange={e => handleMaxChange(Number(e.target.value))}
                      className="bg-muted border-input text-foreground text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lock-time" className="text-xs text-muted-foreground">
                      Lock <span className="text-muted-foreground/60 font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="lock-time"
                      data-testid="input-lock-time"
                      type="number"
                      min={1}
                      placeholder="—"
                      value={lockTime}
                      onChange={e => setLockTime(e.target.value === "" ? "" : Number(e.target.value))}
                      className="bg-muted border-input text-foreground text-sm placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O script enviará a cada intervalo <span className="text-foreground font-medium">{minTime}s – {maxTime}s</span> aleatório
                  {lockTime !== "" && lockTime > 0
                    ? `, respeitando o slowmode de ${lockTime}s do canal.`
                    : ". Lock: defina o slowmode do canal (ex: 10s)."}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1 pb-1">
                <Button
                  type="button"
                  data-testid="button-cancel"
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  data-testid="button-iniciar"
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                >
                  <Play className="w-4 h-4" />
                  Iniciar
                </Button>
              </div>
            </form>
          )}

          {/* ── RUNNING PANEL ── */}
          {isRunning && (
            <div className="px-6 py-5 space-y-4">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center p-3 bg-muted/50 rounded-xl border border-border gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xl font-bold text-foreground">{sent}</span>
                  <span className="text-xs text-muted-foreground">Enviadas</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-muted/50 rounded-xl border border-border gap-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xl font-bold text-foreground">{errors}</span>
                  <span className="text-xs text-muted-foreground">Erros</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-muted/50 rounded-xl border border-border gap-1">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="text-xl font-bold text-foreground">{countdown}</span>
                  <span className="text-xs text-muted-foreground">Próxima (s)</span>
                </div>
              </div>

              {/* Config summary */}
              <div className="px-3 py-2 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Canal: <span className="font-mono text-foreground">{canalId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Intervalo: <span className="text-foreground">{minTime}s – {maxTime}s</span>
                  {lockTime !== "" && lockTime > 0 && (
                    <span className="ml-1">| Lock: {lockTime}s</span>
                  )}
                </div>
              </div>

              {/* Log */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Log</p>
                <div className="bg-background border border-border rounded-xl p-3 space-y-1 max-h-52 overflow-y-auto font-mono text-xs">
                  {logs.map((l, i) => (
                    <div key={i} className={`flex gap-2 ${l.ok ? "text-emerald-400" : "text-red-400"}`}>
                      <span className="text-muted-foreground shrink-0">{l.time}</span>
                      <span>{l.text}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Stop button */}
              <Button
                type="button"
                data-testid="button-stop"
                variant="destructive"
                className="w-full gap-2"
                onClick={stop}
              >
                <StopCircle className="w-4 h-4" />
                Parar Auto Mensagem
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
