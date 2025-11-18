"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { frontendToBackend } from "@/lib/modelMapping";

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
}

interface ChatSessionHook {
  sessionId: string | null;
  isInitializing: boolean;
  error: string | null;
  hybridRag: boolean;
  uploadDocument: (docs: UploadedDoc[]) => Promise<void>;
  loadGPTKnowledgeBase: (gptId: string) => Promise<void>;
  updateGPTConfig: (model: string) => Promise<void>;
  updateVoiceSettings: (voiceConfig: Partial<VoiceSettingsPayload>) => Promise<void>;
}

interface VoiceSettingsPayload {
  voiceAgentEnabled?: boolean;
  voiceAgentName?: string | null;
  voiceConfidenceThreshold?: number | null;
  voiceSttProvider?: string | null;
  voiceSttModelId?: string | null;
  voiceSttModelName?: string | null;
  voiceTtsProvider?: string | null;
  voiceTtsModelId?: string | null;
  voiceTtsModelName?: string | null;
}

export function useChatSession(): ChatSessionHook {
  const params = useParams();
  const gptId = params.id as string;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hybridRag, setHybridRag] = useState<boolean>(false);
  const [gptConfig, setGptConfig] = useState<any>(null);

  // Create session
  const createSession = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      return data.session_id;
    } catch (error) {
      throw error;
    }
  }, []);

  // Update GPT config with new model
  const syncGptConfig = useCallback(
    async (partialConfig: Record<string, any>) => {
      if (!sessionId || !gptConfig) {
        return;
      }

      const updatedConfig = {
        ...gptConfig,
        ...partialConfig,
      };

      setGptConfig(updatedConfig);

      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/gpt-config`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedConfig),
          }
        );
      } catch (backendError) {
        // Swallow config sync errors to avoid interrupting chat flow
      }
    },
    [sessionId, gptConfig]
  );

  const updateGPTConfig = useCallback(
    async (model: string) => {
      await syncGptConfig({ model });
    },
    [syncGptConfig]
  );

  const updateVoiceSettings = useCallback(
    async (voiceConfig: Partial<VoiceSettingsPayload>) => {
      await syncGptConfig(voiceConfig);
    },
    [syncGptConfig]
  );

  // Load GPT configuration and knowledge base
  const loadGPTKnowledgeBase = useCallback(
    async (gptId: string, sessionId: string) => {
      try {
        console.log("=== FRONTEND: Loading GPT Knowledge Base ===");
        console.log("GPT ID:", gptId);
        console.log("Session ID:", sessionId);
        
        const gptResponse = await fetch(`/api/gpts/${gptId}`);
        if (!gptResponse.ok) {
          const errorText = await gptResponse.text();
          console.error("Failed to fetch GPT:", errorText);
          return;
        }

        const gpt = await gptResponse.json();
        console.log("GPT Data from API:", gpt);

        setHybridRag(gpt.hybridRag || false);

        const backendModelName = frontendToBackend(gpt.model);

        const gptConfigData = {
          model: backendModelName,
          webBrowser: gpt.webBrowser,
          hybridRag: gpt.hybridRag,
          instruction: gpt.instruction,
          name: gpt.name,
          description: gpt.description,
          gpt_id: gptId,
          userId: gpt.userId,  // Include userId for MCP operations
          image: gpt.imageEnabled || false,
          video: gpt.videoEnabled || false,
          imageModel: gpt.imageModel || undefined,
          videoModel: gpt.videoModel || undefined,
          voiceAgentEnabled: gpt.voiceAgentEnabled || false,
          voiceAgentName: gpt.voiceAgentName || null,
          voiceConfidenceThreshold: gpt.voiceConfidenceThreshold ?? 0.4,
          voiceSttProvider: gpt.voiceSttProvider || null,
          voiceSttModelId: gpt.voiceSttModelId || null,
          voiceSttModelName: gpt.voiceSttModelName || null,
          voiceTtsProvider: gpt.voiceTtsProvider || null,
          voiceTtsModelId: gpt.voiceTtsModelId || null,
          voiceTtsModelName: gpt.voiceTtsModelName || null,
        };

        setGptConfig(gptConfigData);

        

        try {
        console.log("=== FRONTEND: Setting GPT Config ===");
        console.log("Session ID:", sessionId);
        console.log("GPT Config Data:", gptConfigData);
        console.log("Instruction:", gptConfigData.instruction);
        console.log("NEXT_PUBLIC_BACKEND_URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
        console.log("Backend URL:", `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/gpt-config`);
          
          const configResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/gpt-config`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(gptConfigData),
            }
          );

          if (!configResponse.ok) {
            const errorText = await configResponse.text();
            console.error("GPT Config Error:", errorText);
          } else {
            console.log("GPT Config set successfully");
          }
        } catch (backendError) {
          console.error("GPT Config Exception:", backendError);
        }

        // Fetch and send API keys to backend
        try {
          console.log("=== FRONTEND: Fetching API Keys ===");
          const apiKeysResponse = await fetch("/api/api-keys");
          if (apiKeysResponse.ok) {
            const apiKeysData = await apiKeysResponse.json();
            if (apiKeysData.success && apiKeysData.apiKeys) {
              console.log("=== FRONTEND: Sending API Keys to Backend ===");
              const apiKeysResponseBackend = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/api-keys`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ apiKeys: apiKeysData.apiKeys }),
                }
              );

              if (!apiKeysResponseBackend.ok) {
                const errorText = await apiKeysResponseBackend.text();
                console.error("API Keys Error:", errorText);
              } else {
                console.log("API Keys sent successfully to backend");
              }
            }
          }
        } catch (apiKeysError) {
          console.error("API Keys Exception:", apiKeysError);
          // Don't fail the whole initialization if API keys fail
        }

        if (gpt.knowledgeBase) {
          const kbDocs = JSON.parse(gpt.knowledgeBase);

          const documentsPayload = {
            documents: kbDocs.map((url: string, index: number) => ({
              id: `kb-${index}`,
              filename: url.split("/").pop() || `kb-doc-${index}`,
              file_url: url,
              file_type: "application/pdf",
              size: 0,
            })),
            doc_type: "kb",
          };

          try {
            const kbResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/add-documents`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(documentsPayload),
              }
            );

            if (!kbResponse.ok) {
              const errorText = await kbResponse.text();
            } else {
              const responseData = await kbResponse.json();
            }
          } catch (backendError) {
            // Don't throw here, just log the error and continue
          }
        }
      } catch (error) {
        // Handle error silently
      }
    },
    []
  );

  // Handle document upload from user - accepts array of documents
  const uploadDocument = useCallback(
    async (docs: UploadedDoc[]) => {
      if (!sessionId) {
        throw new Error("No session ID available");
      }

      if (!docs || docs.length === 0) {
        return; // No documents to upload
      }

      try {
        // Send all documents as an array to backend in one request
        const documentsPayload = docs.map((doc, index) => ({
          id: `${Date.now()}-${index}`,
          filename: doc.filename,
          file_url: doc.url,
          file_type: doc.type || "application/pdf", // Backend will detect actual type, but provide what we know
          size: 0,
        }));

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/add-documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              documents: documentsPayload,
              doc_type: "user",
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to upload documents: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`Successfully uploaded ${docs.length} document(s) as an array`);
      } catch (error) {
        throw error;
      }
    },
    [sessionId]
  );

  // Initialize session and load GPT knowledge base
  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const newSessionId = await createSession();

        if (isMounted) {
          setSessionId(newSessionId);

          // Load GPT configuration and knowledge base
          await loadGPTKnowledgeBase(gptId, newSessionId);
        }
      } catch (error) {
        if (isMounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initialize session"
          );
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    if (!sessionId) {
      initializeSession();
    }

    return () => {
      isMounted = false;
    };
  }, [gptId, createSession, loadGPTKnowledgeBase, sessionId]);

  return {
    sessionId,
    isInitializing,
    error,
    hybridRag,
    uploadDocument,
    loadGPTKnowledgeBase: (gptId: string) =>
      loadGPTKnowledgeBase(gptId, sessionId!),
    updateGPTConfig,
    updateVoiceSettings,
  };
}
