import { useState } from "react";
import { X, Eye, EyeOff, Smile, Clock, Webhook, Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DISCORD_EMOJIS = [
  "😀","😂","😍","🥰","😎","🤔","😅","🙂","😊","🤩",
  "👍","👎","❤️","🔥","✨","💯","🎉","🚀","⚡","💀",
  "🤣","😭","😤","🥺","😏","🤯","🫡","💪","🙏","👀",
];

export default function AutoMensagemModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [token, setToken] = useState("");
  const [canalId, setCanalId] = useState("");
  const [message, setMessage] = useState("");
  const [minTime, setMinTime] = useState(30);
  const [maxTime, setMaxTime] = useState(60);
  const [webhook, setWebhook] = useState("");
  const [notifMencao, setNotifMencao] = useState(false);
  const [notifDm, setNotifDm] = useState(false);

  if (!open) return null;

  function handleMinTimeChange(val: number) {
    const clamped = Math.max(30, val);
    setMinTime(clamped);
    if (maxTime < clamped) setMaxTime(clamped);
  }

  function handleMaxTimeChange(val: number) {
    const clamped = Math.max(minTime, val);
    setMaxTime(clamped);
  }

  function insertEmoji(emoji: string) {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token.trim()) {
      toast({ title: "Token obrigatório", description: "Insira o Token do Discord.", variant: "destructive" });
      return;
    }
    if (!canalId.trim()) {
      toast({ title: "ID do Canal obrigatório", description: "Insira o ID do canal.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Mensagem obrigatória", description: "Insira a mensagem a ser enviada.", variant: "destructive" });
      return;
    }
    if (minTime < 30) {
      toast({ title: "Tempo mínimo inválido", description: "O tempo mínimo deve ser de pelo menos 30 segundos.", variant: "destructive" });
      return;
    }
    if (maxTime < minTime) {
      toast({ title: "Tempo máximo inválido", description: "O tempo máximo deve ser maior ou igual ao mínimo.", variant: "destructive" });
      return;
    }

    toast({
      title: "Auto Mensagem iniciada!",
      description: `Mensagens serão enviadas a cada ${minTime}–${maxTime}s no canal ${canalId}.`,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="auto-mensagem-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        data-testid="auto-mensagem-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Auto Mensagem</h2>
              <p className="text-xs text-muted-foreground">Configure o envio automático</p>
            </div>
          </div>
          <button
            data-testid="button-close-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Token Discord */}
          <div className="space-y-1.5">
            <Label htmlFor="token-discord" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Token Discord
            </Label>
            <div className="relative">
              <Input
                id="token-discord"
                data-testid="input-token-discord"
                type={showToken ? "text" : "password"}
                placeholder="Insira seu token do Discord..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pr-10 bg-muted border-input text-foreground placeholder:text-muted-foreground font-mono text-sm"
              />
              <button
                type="button"
                data-testid="button-toggle-token-visibility"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Mantenha seu token em segurança. Nunca o compartilhe.</p>
          </div>

          {/* ID Canal */}
          <div className="space-y-1.5">
            <Label htmlFor="id-canal" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ID Canal
            </Label>
            <Input
              id="id-canal"
              data-testid="input-id-canal"
              type="text"
              placeholder="Ex: 123456789012345678"
              value={canalId}
              onChange={(e) => setCanalId(e.target.value)}
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
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <Smile className="w-3.5 h-3.5" />
                Emoji
              </button>
            </div>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div
                data-testid="emoji-picker"
                className="p-3 bg-background border border-border rounded-lg grid grid-cols-10 gap-1"
              >
                {DISCORD_EMOJIS.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    data-testid={`emoji-btn-${i}`}
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
              placeholder="Digite sua mensagem... Use emojis do Discord como :smile: ou clique em Emoji acima"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-muted border-input text-foreground placeholder:text-muted-foreground min-h-24 resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">{message.length} caracteres</p>
          </div>

          {/* Tempo mínimo / máximo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Intervalo de Tempo (segundos)
            </Label>
            <div className="grid grid-cols-2 gap-3">
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
                  onChange={(e) => handleMinTimeChange(Number(e.target.value))}
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
                  onChange={(e) => handleMaxTimeChange(Number(e.target.value))}
                  className="bg-muted border-input text-foreground text-sm"
                />
              </div>
            </div>
            {minTime < 30 && (
              <p className="text-xs text-destructive">O tempo mínimo deve ser pelo menos 30 segundos.</p>
            )}
          </div>

          {/* Webhook */}
          <div className="space-y-1.5">
            <Label htmlFor="webhook" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5" />
              Webhook
            </Label>
            <Input
              id="webhook"
              data-testid="input-webhook"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              className="bg-muted border-input text-foreground placeholder:text-muted-foreground text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">Opcional. URL do webhook para notificações.</p>
          </div>

          {/* Notificações */}
          <div className="space-y-3 pt-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Notificações
            </Label>

            {/* Notificação ao ser mencionado */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Notificação ao ser mencionado</p>
                <p className="text-xs text-muted-foreground">Receba um aviso quando alguém te mencionar.</p>
              </div>
              <Switch
                data-testid="toggle-notif-mencao"
                checked={notifMencao}
                onCheckedChange={setNotifMencao}
              />
            </div>

            {/* Notificação por DM */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Notificação por DM</p>
                <p className="text-xs text-muted-foreground">Receba notificações via mensagem direta.</p>
              </div>
              <Switch
                data-testid="toggle-notif-dm"
                checked={notifDm}
                onCheckedChange={setNotifDm}
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2 pb-1">
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
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Iniciar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
