"use client";

import * as React from "react";
import {
  Check,
  Copy,
  KeyRound,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiKeyItem,
  KeyEnvironment,
  generateRandomSecretKey,
  getStoredApiKeys,
  saveStoredApiKeys,
} from "@/lib/api-keys";

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<ApiKeyItem[]>([]);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Create key modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [keyName, setKeyName] = React.useState("");
  const [keyEnv, setKeyEnv] = React.useState<KeyEnvironment>("production");
  const [keyExpires, setKeyExpires] = React.useState("90 days");

  // Newly generated key reveal modal state
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null);
  const [revealedCopied, setRevealedCopied] = React.useState(false);

  // Revoke / Delete state
  const [keyToRevoke, setKeyToRevoke] = React.useState<ApiKeyItem | null>(null);
  const [keyToDelete, setKeyToDelete] = React.useState<ApiKeyItem | null>(null);

  // Load keys from storage on mount
  React.useEffect(() => {
    setKeys(getStoredApiKeys());
  }, []);

  const persistKeys = (updated: ApiKeyItem[]) => {
    setKeys(updated);
    saveStoredApiKeys(updated);
  };

  const handleStartCreate = () => {
    setKeyName("");
    setKeyEnv("production");
    setKeyExpires("90 days");
    setIsCreateOpen(true);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = keyName.trim() || `${keyEnv.charAt(0).toUpperCase() + keyEnv.slice(1)} Key`;
    const fullSecret = generateRandomSecretKey(keyEnv);
    const prefix = `${fullSecret.slice(0, 10)}••••••••${fullSecret.slice(-4)}`;

    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: finalName,
      keyPrefix: prefix,
      fullKey: fullSecret,
      environment: keyEnv,
      permissions: ["telemetry:write", "telemetry:read"],
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      lastUsedAt: "Never",
      status: "active",
      rateLimit: "25,000 req/min",
      expiresAt: keyExpires,
    };

    persistKeys([newKey, ...keys]);
    setIsCreateOpen(false);
    setRevealedKey(fullSecret);
    setRevealedCopied(false);
  };

  const handleCopyKey = (key: ApiKeyItem) => {
    const text = key.fullKey || key.keyPrefix;
    navigator.clipboard.writeText(text);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyRevealed = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setRevealedCopied(true);
    setTimeout(() => setRevealedCopied(false), 2000);
  };

  const handleRevokeConfirm = () => {
    if (!keyToRevoke) return;
    const updated = keys.map((k) =>
      k.id === keyToRevoke.id ? { ...k, status: "revoked" as const } : k
    );
    persistKeys(updated);
    setKeyToRevoke(null);
  };

  const handleDeleteConfirm = () => {
    if (!keyToDelete) return;
    const updated = keys.filter((k) => k.id !== keyToDelete.id);
    persistKeys(updated);
    setKeyToDelete(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-10 space-y-8 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage secret keys for authenticating API and SDK requests.
          </p>
        </div>
        <div>
          <Button onClick={handleStartCreate} className="gap-2 font-medium">
            <Plus className="h-4 w-4" />
            <span>Create new secret key</span>
          </Button>
        </div>
      </div>

      {/* Keys Table Container */}
      <div className="rounded-md border bg-card shadow-xs">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No API keys</p>
              <p className="text-xs text-muted-foreground">
                You haven&apos;t created any secret keys yet.
              </p>
            </div>
            <Button size="sm" onClick={handleStartCreate} className="mt-2">
              Create new secret key
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead>Secret Key</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => {
                const isRevoked = key.status === "revoked";

                return (
                  <TableRow
                    key={key.id}
                    className={isRevoked ? "opacity-60" : undefined}
                  >
                    {/* Name */}
                    <TableCell className="font-medium text-foreground">
                      <div className="truncate max-w-[260px]">{key.name}</div>
                    </TableCell>

                    {/* Key Prefix & Copy */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground/80">
                          {key.keyPrefix}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCopyKey(key)}
                          title="Copy key"
                        >
                          {copiedId === key.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="sr-only">Copy key</span>
                        </Button>
                      </div>
                    </TableCell>

                    {/* Environment */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          key.environment === "production"
                            ? "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 font-normal"
                            : key.environment === "staging"
                            ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-normal"
                            : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 font-normal"
                        }
                      >
                        {key.environment}
                      </Badge>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-muted-foreground text-xs">
                      {key.createdAt}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={isRevoked ? "secondary" : "outline"}
                        className={
                          !isRevoked
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-normal"
                            : "text-muted-foreground font-normal"
                        }
                      >
                        {isRevoked ? "Revoked" : "Active"}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isRevoked && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setKeyToRevoke(key)}
                            className="text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setKeyToDelete(key)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CREATE NEW KEY DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-5 text-card-foreground">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Create new secret key
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmCreate} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Name (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Production Agent Ingestion"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Environment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={keyEnv === "production" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setKeyEnv("production")}
                    className="w-full text-xs"
                  >
                    Production
                  </Button>
                  <Button
                    type="button"
                    variant={keyEnv === "staging" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setKeyEnv("staging")}
                    className="w-full text-xs"
                  >
                    Staging
                  </Button>
                  <Button
                    type="button"
                    variant={keyEnv === "development" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setKeyEnv("development")}
                    className="w-full text-xs"
                  >
                    Development
                  </Button>
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Expiration
                </label>
                <select
                  value={keyExpires}
                  onChange={(e) => setKeyExpires(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="30 days">30 days</option>
                  <option value="60 days">60 days</option>
                  <option value="90 days">90 days</option>
                  <option value="1 year">1 year</option>
                  <option value="Never">Never</option>
                </select>
              </div>

              {/* Dialog Footer */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create secret key</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAVE SECRET KEY REVEAL DIALOG */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl space-y-4 text-card-foreground">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Save your secret key
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please save this secret key in a secure location. For your protection, you won&apos;t be able to view it again.
              </p>
            </div>

            {/* Key Field with Copy */}
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={revealedKey}
                className="font-mono text-xs select-all bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyRevealed}
                className="shrink-0 gap-1.5"
              >
                {revealedCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setRevealedKey(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE KEY CONFIRMATION */}
      {keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl space-y-4 text-card-foreground">
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Revoke secret key
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to revoke &ldquo;{keyToRevoke.name}&rdquo;? Any requests using this key will immediately be rejected.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKeyToRevoke(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeConfirm}
              >
                Revoke key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE KEY CONFIRMATION */}
      {keyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl space-y-4 text-card-foreground">
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Delete secret key
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete &ldquo;{keyToDelete.name}&rdquo;? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKeyToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
              >
                Delete key
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
