"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLLMConfig } from "@/hooks/useLLMConfig"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface LLMConfigModalProps {
  open: boolean
  onClose: () => void
}

export function LLMConfigModal({ open, onClose }: LLMConfigModalProps) {
  const { config, save, test } = useLLMConfig()

  const [provider, setProvider] = useState("anthropic")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [modelName, setModelName] = useState("claude-opus-4-5")
  const [maxTokens, setMaxTokens] = useState(4096)
  const [temperature, setTemperature] = useState(0.3)

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; latency_ms?: number; error?: string } | null>(null)

  useEffect(() => {
    if (config) {
      setProvider(config.provider)
      setBaseUrl(config.base_url || "")
      setModelName(config.model_name)
      setMaxTokens(config.max_tokens)
      setTemperature(config.temperature)
    }
  }, [config])

  const handleSave = async () => {
    setSaving(true)
    try {
      await save({
        provider,
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
        model_name: modelName,
        max_tokens: maxTokens,
        temperature,
      })
      setApiKey("")
      onClose()
    } catch (e: any) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await test()
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>LLM Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai_compat">OpenAI Compatible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "openai_compat" && (
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-endpoint/v1"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>API Key {config?.api_key_hint ? `(current: …${config.api_key_hint})` : ""}</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.api_key_hint ? "Leave blank to keep current key" : "sk-ant-..."}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="claude-opus-4-5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min={256}
                max={32768}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temperature (0–1)</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {testResult.ok
                ? `Connected · ${testResult.latency_ms}ms`
                : testResult.error || "Connection failed"}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
