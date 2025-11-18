"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

export const STT_PROVIDER_LABELS = {
  deepgram: "Deepgram",
  cartesia: "Cartesia",
} as const

export const TTS_PROVIDER_LABELS = {
  deepgram: "Deepgram",
  cartesia: "Cartesia",
  cartesia_sonic3: "Cartesia Sonic-3",
  elevenlabs: "ElevenLabs",
  hume: "Hume",
} as const

export const STT_MODEL_OPTIONS: Record<
  keyof typeof STT_PROVIDER_LABELS,
  { id: string; label: string }[]
> = {
  deepgram: [
    { id: "nova-3", label: "Nova-3" },
    { id: "nova-2", label: "Nova-2" },
  ],
  cartesia: [
    { id: "ink-whisper", label: "Ink Whisper" },
    { id: "ink-whisper-2025-06-04", label: "Ink Whisper (2025-06-04)" },
  ],
}

export const TTS_MODEL_OPTIONS: Record<
  keyof typeof TTS_PROVIDER_LABELS,
  { id: string; label: string }[]
> = {
  deepgram: [
    { id: "aura-2-ophelia-en", label: "Ophelia · Aura 2" },
    { id: "aura-2-helena-en", label: "Helena · Aura 2" },
    { id: "aura-2-mars-en", label: "Mars · Aura 2" },
  ],
  cartesia: [
    { id: "f786b574-daa5-4673-aa0c-cbe3e8534c02", label: "Lyra" },
    { id: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc", label: "Solstice" },
  ],
  cartesia_sonic3: [{ id: "sonic-3", label: "Sonic Pulse" }],
  elevenlabs: [
    { id: "ODq5zmih8GrVes37Dizd", label: "Elliot" },
    { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Aria" },
    { id: "iP95p4xoKVk53GoZ742B", label: "Noah" },
  ],
  hume: [
    { id: "Colton Rivers", label: "Colton Rivers" },
    { id: "Ava Song", label: "Ava Song" },
    { id: "Priya", label: "Priya" },
    { id: "Suresh", label: "Suresh" },
  ],
}

export interface VoiceAgentConfig {
  voiceAgentEnabled: boolean
  voiceAgentName: string
  voiceConfidenceThreshold: number
  voiceSttProvider: keyof typeof STT_PROVIDER_LABELS | null
  voiceSttModelId: string | null
  voiceSttModelName: string | null
  voiceTtsProvider: keyof typeof TTS_PROVIDER_LABELS | null
  voiceTtsModelId: string | null
  voiceTtsModelName: string | null
}

interface VoiceConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: VoiceAgentConfig
  onSave: (config: VoiceAgentConfig) => void
  title?: string
  description?: string
}

export function VoiceConfigDialog({
  open,
  onOpenChange,
  value,
  onSave,
  title = "Configure Voice Agent",
  description = "Pick STT and TTS providers, assign friendly names, and set the confidence threshold used to filter transcripts.",
}: VoiceConfigDialogProps) {
  const [draft, setDraft] = useState<VoiceAgentConfig>(value)

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  const selectedSttModels = useMemo(() => {
    if (!draft.voiceSttProvider) return []
    return STT_MODEL_OPTIONS[draft.voiceSttProvider] ?? []
  }, [draft.voiceSttProvider])

  const selectedTtsModels = useMemo(() => {
    if (!draft.voiceTtsProvider) return []
    return TTS_MODEL_OPTIONS[draft.voiceTtsProvider] ?? []
  }, [draft.voiceTtsProvider])

  const isValid =
    draft.voiceAgentName.trim().length >= 2 &&
    draft.voiceSttProvider &&
    draft.voiceSttModelId &&
    draft.voiceTtsProvider &&
    draft.voiceTtsModelId &&
    typeof draft.voiceConfidenceThreshold === "number"

  const handleSave = () => {
    if (!isValid) return

    const sttModelName =
      selectedSttModels.find((m) => m.id === draft.voiceSttModelId)?.label ??
      draft.voiceSttModelName ??
      ""
    const ttsModelName =
      selectedTtsModels.find((m) => m.id === draft.voiceTtsModelId)?.label ??
      draft.voiceTtsModelName ??
      ""

    onSave({
      ...draft,
      voiceAgentEnabled: true,
      voiceSttModelName: sttModelName,
      voiceTtsModelName: ttsModelName,
    })
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 pb-2">
            <div className="space-y-2">
              <Label htmlFor="voice-agent-name">Voice Agent Name</Label>
              <Input
                id="voice-agent-name"
                placeholder="e.g. Retail Concierge"
                value={draft.voiceAgentName}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    voiceAgentName: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <Label>STT Provider</Label>
                  <p className="text-xs text-muted-foreground">
                    Converts speech to text in real time.
                  </p>
                </div>
                <Select
                  value={draft.voiceSttProvider ?? undefined}
                  onValueChange={(provider) =>
                    setDraft((prev) => ({
                      ...prev,
                      voiceSttProvider:
                        provider as keyof typeof STT_PROVIDER_LABELS,
                      voiceSttModelId: null,
                      voiceSttModelName: null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STT_PROVIDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draft.voiceSttModelId ?? undefined}
                  onValueChange={(modelId) =>
                    setDraft((prev) => ({
                      ...prev,
                      voiceSttModelId: modelId,
                      voiceSttModelName:
                        selectedSttModels.find((m) => m.id === modelId)?.label ??
                        null,
                    }))
                  }
                  disabled={!draft.voiceSttProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select STT model" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSttModels.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Select a provider first
                      </div>
                    )}
                    {selectedSttModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <Label>TTS Provider</Label>
                  <p className="text-xs text-muted-foreground">
                    Generates the agent voice that replies to users.
                  </p>
                </div>
                <Select
                  value={draft.voiceTtsProvider ?? undefined}
                  onValueChange={(provider) =>
                    setDraft((prev) => ({
                      ...prev,
                      voiceTtsProvider:
                        provider as keyof typeof TTS_PROVIDER_LABELS,
                      voiceTtsModelId: null,
                      voiceTtsModelName: null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TTS_PROVIDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draft.voiceTtsModelId ?? undefined}
                  onValueChange={(modelId) =>
                    setDraft((prev) => ({
                      ...prev,
                      voiceTtsModelId: modelId,
                      voiceTtsModelName:
                        selectedTtsModels.find((m) => m.id === modelId)?.label ??
                        null,
                    }))
                  }
                  disabled={!draft.voiceTtsProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select TTS model" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTtsModels.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Select a provider first
                      </div>
                    )}
                    {selectedTtsModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Confidence Threshold</Label>
                  <p className="text-xs text-muted-foreground">
                    Transcripts below this score will be discarded.
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {(draft.voiceConfidenceThreshold ?? 0.4).toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[draft.voiceConfidenceThreshold ?? 0.4]}
                onValueChange={(values) =>
                  setDraft((prev) => ({
                    ...prev,
                    voiceConfidenceThreshold: values[0] ?? 0.4,
                  }))
                }
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Voice Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

