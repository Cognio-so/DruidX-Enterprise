"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Key, Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { getApiKeys, deleteApiKey } from "../action";
import { addApiKey, updateApiKey } from "../action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ApiKey {
  id: string;
  keyType: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

const COMMON_KEY_TYPES = [
  { value: "composio", label: "Composio" },
  { value: "tavily", label: "Tavily" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "groq", label: "Groq" },
  { value: "replicate", label: "Replicate" },
];

export default function ApiKeysManager() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    keyType: "",
    value: "",
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const result = await getApiKeys();
      if (result.success && result.apiKeys) {
        setApiKeys(result.apiKeys);
      }
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (key?: ApiKey) => {
    if (key) {
      setEditingKey(key);
      setFormData({
        keyType: key.keyType,
        value: "", // Don't show existing value for security
      });
    } else {
      setEditingKey(null);
      setFormData({ keyType: "", value: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingKey(null);
    setFormData({ keyType: "", value: "" });
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.keyType) {
      toast.error("Please select a key type");
      return;
    }

    // Value is required for new keys, optional for updates
    if (!editingKey && !formData.value) {
      toast.error("Please enter an API key value");
      return;
    }

    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append("keyType", formData.keyType);
      formDataObj.append("value", formData.value || ""); 
      
      let result;
      if (editingKey) {
        formDataObj.append("id", editingKey.id);
        result = await updateApiKey(formDataObj);
      } else {
        result = await addApiKey(formDataObj);
      }
      
      if (result.success) {
        handleCloseDialog();
        router.refresh();
        toast.success(result.message || (editingKey ? "API key updated successfully" : "API key added successfully"));
        loadApiKeys();
      } else {
        toast.error(result.error || "Failed to save API key");
      }
    } catch (error) {
      toast.error("Failed to save API key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await deleteApiKey(id);
      if (result.success) {
        toast.success("API key deleted successfully");
        router.refresh();
        loadApiKeys();
      } else {
        toast.error(result.error || "Failed to delete API key");
      }
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys Management
              </CardTitle>
              <CardDescription>
                Manage API keys for external services. Keys are encrypted and stored securely.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingKey ? "Edit API Key" : "Add New API Key"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingKey
                        ? "Update the API key. Leave value empty to keep the existing key."
                        : "Add a new API key. The key will be encrypted before storage."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyType">Key Type</Label>
                      <select
                        id="keyType"
                        value={formData.keyType}
                        onChange={(e) =>
                          setFormData({ ...formData, keyType: e.target.value })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                        disabled={!!editingKey || submitting}
                      >
                        <option value="">Select key type</option>
                        {COMMON_KEY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">API Key Value</Label>
                      <div className="relative">
                        <Input
                          id="value"
                          type={showPassword ? "text" : "password"}
                          value={formData.value}
                          onChange={(e) =>
                            setFormData({ ...formData, value: e.target.value })
                          }
                          placeholder={editingKey ? "Enter new key or leave empty to keep existing" : "Enter API key"}
                          required={!editingKey}
                          className="pr-10"
                          disabled={submitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingKey ? "Updating..." : "Adding..."}
                        </>
                      ) : (
                        <>
                          {editingKey ? "Update" : "Add"} API Key
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys configured. Click &quot;Add API Key&quot; to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium capitalize">{key.keyType}</div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(key)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(key.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

