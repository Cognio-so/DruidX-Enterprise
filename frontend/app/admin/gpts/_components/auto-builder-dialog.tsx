'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import { Response } from '@/components/ai-elements/response';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader } from '@/components/ai-elements/loader';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createGpt } from '../create-gpt/action';
import type { GptFormValues } from '@/lib/zodSchema';

interface AutoBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CollectedData {
  whatToBuild?: string;
  purpose?: string;
  name?: string;
  description?: string;
  instructions?: string;
  model?: string;
  webSearch?: boolean;
  hybridRag?: boolean;
  image?: boolean;
  video?: boolean;
  imageModel?: string;
  videoModel?: string;
  imageUrl?: string;
  kbFiles?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AutoBuilderDialog({
  open,
  onOpenChange,
}: AutoBuilderDialogProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collectedData, setCollectedData] = useState<CollectedData>({
    model: 'gpt_4o',
    webSearch: false,
    hybridRag: false,
    image: false,
    video: false,
    kbFiles: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const lastMessageRef = useRef<string>('');
  const hasInitializedRef = useRef(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const collectedDataRef = useRef<CollectedData>(collectedData);

  // Keep refs in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    collectedDataRef.current = collectedData;
  }, [collectedData]);

  const handleSendMessage = useCallback(async (textContent: string) => {
    // Prevent multiple simultaneous calls
    if (isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textContent,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gpts/auto-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messagesRef.current.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: textContent,
            },
          ],
          collectedData: collectedDataRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantMessageId = (Date.now() + 1).toString();

      // Add assistant message placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // toTextStreamResponse returns plain text chunks
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        
        // Update the assistant message in real-time
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }

      // Check if completion signal is present
      if (assistantMessage.includes('<complete>true</complete>')) {
        setIsComplete(true);
        await parseAndSubmitForm(assistantMessage);
      } else {
        // Update collected data based on conversation
        updateCollectedData(assistantMessage, [...messagesRef.current, userMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message}`);
      // Don't remove the user message on error - keep it for user to see
      // setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Initialize conversation when dialog opens - only once
  useEffect(() => {
    if (open && messages.length === 0 && !hasInitializedRef.current && !isLoading) {
      hasInitializedRef.current = true;
      // Start the conversation
      const timer = setTimeout(() => {
        handleSendMessage('Hello, I want to create a new GPT.');
      }, 100);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setCollectedData({
        model: 'gpt_4o',
        webSearch: false,
        hybridRag: false,
        image: false,
        video: false,
        kbFiles: [],
      });
      setIsComplete(false);
      setIsLoading(false);
      lastMessageRef.current = '';
      hasInitializedRef.current = false;
    }
  }, [open]);

  const updateCollectedData = (content: string, allMessages: ChatMessage[]) => {
    // Extract data from AI responses and user messages
    const lowerContent = content.toLowerCase();
    const lastUserMessage =
      allMessages.filter((m) => m.role === 'user').pop()?.content || '';

    // Try to extract structured data from XML tags if present
    const dataMatch = content.match(/<data>([\s\S]*?)<\/data>/);
    if (dataMatch) {
      try {
        const parsed = JSON.parse(dataMatch[1]);
        setCollectedData((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        // If JSON parsing fails, continue with text parsing
      }
    }

    // Simple keyword-based extraction (can be improved)
    setCollectedData((prev) => {
      const updated = { ...prev };

      // Extract name
      if (lowerContent.includes('name') && lastUserMessage) {
        const nameMatch = lastUserMessage.match(/name[:\s]+(.+)/i);
        if (nameMatch && nameMatch[1].length > 0) {
          updated.name = nameMatch[1].trim();
        }
      }

      // Extract description
      if (lowerContent.includes('description') && lastUserMessage) {
        const descMatch = lastUserMessage.match(/description[:\s]+(.+)/i);
        if (descMatch && descMatch[1].length > 0) {
          updated.description = descMatch[1].trim();
        }
      }

      // Extract tools - enable based on exact tool names user provides
      const userMsgLower = lastUserMessage.toLowerCase();
      
      // Only update tools if we're in a tools-related conversation
      if (lowerContent.includes('tools') || lowerContent.includes('web search') || lowerContent.includes('image generation') || lowerContent.includes('video generation') || lowerContent.includes('hybrid rag')) {
        // Web Search - enable if user mentions the tool name
        if (lowerContent.includes('web search') || lowerContent.includes('websearch') || lowerContent.includes('tools')) {
          // User provides the tool name directly (e.g., "websearch", "web search")
          const hasWebSearchKeyword = userMsgLower.includes('websearch') || userMsgLower.includes('web search');
          updated.webSearch = hasWebSearchKeyword;
          
          // If not mentioned, set to false
          if (!updated.webSearch) {
            updated.webSearch = false;
          }
        }
        
        // Hybrid RAG - enable if user mentions the tool name
        if (lowerContent.includes('hybrid rag') || lowerContent.includes('rag')) {
          // User provides the tool name directly (e.g., "hybrid rag", "rag")
          const hasRagKeyword = userMsgLower.includes('hybrid rag') || userMsgLower.includes('hybridrag');
          updated.hybridRag = hasRagKeyword;
          
          // If not mentioned, set to false
          if (!updated.hybridRag) {
            updated.hybridRag = false;
          }
        }
        
        // Image generation - enable if user mentions the tool name
        if (lowerContent.includes('image generation') || lowerContent.includes('image')) {
          // User provides the tool name directly (e.g., "image generation", "image")
          // Check for explicit image generation mentions (not just the word "image" in other contexts)
          const hasImageGeneration = userMsgLower.includes('image generation') || 
            (userMsgLower.includes('image') && (userMsgLower.includes('generation') || lowerContent.includes('image generation')));
          updated.image = hasImageGeneration;
          
          // If not mentioned, explicitly set to false
          if (!updated.image) {
            updated.image = false;
            updated.imageModel = undefined;
          }
        } else {
          // If not in image conversation context, ensure it's false
          updated.image = false;
          updated.imageModel = undefined;
        }
        
        // Video generation - enable if user mentions the tool name
        if (lowerContent.includes('video generation') || lowerContent.includes('video')) {
          // User provides the tool name directly (e.g., "video generation", "video")
          // Check for explicit video generation mentions (not just the word "video" in other contexts)
          const hasVideoGeneration = userMsgLower.includes('video generation') || 
            (userMsgLower.includes('video') && (userMsgLower.includes('generation') || lowerContent.includes('video generation')));
          updated.video = hasVideoGeneration;
          
          // If not mentioned, explicitly set to false
          if (!updated.video) {
            updated.video = false;
            updated.videoModel = undefined;
          }
        } else {
          // If not in video conversation context, ensure it's false
          updated.video = false;
          updated.videoModel = undefined;
        }
        
        // If user says "only websearch" or "websearch only", explicitly disable others
        if (userMsgLower.includes('only') && (userMsgLower.includes('websearch') || userMsgLower.includes('web search'))) {
          updated.image = false;
          updated.video = false;
          updated.hybridRag = false;
          updated.imageModel = undefined;
          updated.videoModel = undefined;
        }
        
        // If user only mentions websearch without mentioning image/video, disable them
        if ((userMsgLower.includes('websearch') || userMsgLower.includes('web search')) && 
            !userMsgLower.includes('image') && 
            !userMsgLower.includes('video') && 
            !userMsgLower.includes('rag')) {
          updated.image = false;
          updated.video = false;
          updated.imageModel = undefined;
          updated.videoModel = undefined;
        }
      } else {
        // If not in tools conversation, ensure all tools are false (don't auto-enable)
        if (!updated.webSearch) updated.webSearch = false;
        if (!updated.hybridRag) updated.hybridRag = false;
        if (!updated.image) {
          updated.image = false;
          updated.imageModel = undefined;
        }
        if (!updated.video) {
          updated.video = false;
          updated.videoModel = undefined;
        }
      }

      return updated;
    });
  };

  const parseAndSubmitForm = async (content: string) => {
    try {
      setIsSubmitting(true);

      // Extract JSON data from response
      const dataMatch = content.match(/<data>([\s\S]*?)<\/data>/);
      let formData: any = { ...collectedData };

      if (dataMatch) {
        try {
          const parsed = JSON.parse(dataMatch[1]);
          // Ensure image/video are explicitly false unless explicitly enabled
          // Default to false if not explicitly set to true
          // Also check collectedData to ensure we're not inheriting incorrect values
          if (parsed.image !== true) {
            parsed.image = false;
            parsed.imageModel = undefined;
          }
          if (parsed.video !== true) {
            parsed.video = false;
            parsed.videoModel = undefined;
          }
          
          // Also ensure collectedData doesn't have incorrect image/video values
          if (collectedData.image !== true) {
            collectedData.image = false;
            collectedData.imageModel = undefined;
          }
          if (collectedData.video !== true) {
            collectedData.video = false;
            collectedData.videoModel = undefined;
          }
          
          formData = { ...formData, ...parsed };
        } catch (e) {
          console.error('Failed to parse JSON data:', e);
        }
      }
      
      // Final safety check: ensure image/video are false if not explicitly true
      if (formData.image !== true) {
        formData.image = false;
        formData.imageModel = undefined;
      }
      if (formData.video !== true) {
        formData.video = false;
        formData.videoModel = undefined;
      }

      // Ensure required fields - map from AI response format to form format
      const gptName = formData.name || formData.gptName || collectedData.name;
      const gptDescription = formData.description || formData.gptDescription || collectedData.description;
      const instructions = formData.instructions || collectedData.instructions;
      const modelValue = formData.model || collectedData.model;

      if (!gptName || !gptDescription || !instructions || !modelValue) {
        console.error('Missing fields:', { gptName, gptDescription, instructions, modelValue, formData, collectedData });
        toast.error(`Missing required fields: ${!gptName ? 'name ' : ''}${!gptDescription ? 'description ' : ''}${!instructions ? 'instructions ' : ''}${!modelValue ? 'model' : ''}`);
        setIsSubmitting(false);
        return;
      }

      // Prepare final form data with proper types
      const model = modelValue as GptFormValues['model'];
      
      // Get tool selections
      const webSearchEnabled = Boolean(formData.webSearch ?? collectedData.webSearch ?? false);
      const hybridRagEnabled = Boolean(formData.hybridRag ?? collectedData.hybridRag ?? false);
      
      // Check if image/video were explicitly enabled in collectedData (from conversation)
      // This is more reliable than trusting the AI's JSON response
      const imageExplicitlyEnabled = collectedData.image === true;
      const videoExplicitlyEnabled = collectedData.video === true;
      
      // Ensure image/video are boolean and only set imageModel/videoModel if enabled
      // Use strict check: only true if explicitly enabled in collectedData OR explicitly true in formData
      let imageEnabled = imageExplicitlyEnabled || formData.image === true;
      let videoEnabled = videoExplicitlyEnabled || formData.video === true;
      
      // CRITICAL SAFETY CHECK: If user only selected webSearch, force image/video to false
      // This prevents the AI from incorrectly setting image/video to true in the JSON response
      if (webSearchEnabled && !hybridRagEnabled && !imageExplicitlyEnabled && !videoExplicitlyEnabled) {
        // User only selected webSearch and never explicitly enabled image/video
        // Force them to false regardless of what the AI's JSON says
        imageEnabled = false;
        videoEnabled = false;
      }
      
      const finalData: GptFormValues = {
        gptName,
        gptDescription,
        instructions,
        model: model,
        webSearch: webSearchEnabled,
        hybridRag: hybridRagEnabled,
        image: imageEnabled,
        video: videoEnabled,
        // Only include imageModel/videoModel if the feature is enabled
        imageModel: imageEnabled ? (formData.imageModel || collectedData.imageModel) : undefined,
        videoModel: videoEnabled ? (formData.videoModel || collectedData.videoModel) : undefined,
        imageUrl: formData.imageUrl || collectedData.imageUrl || '',
        docs: formData.docs || collectedData.kbFiles || [],
      };

      // Submit the form
      const result = await createGpt(finalData);

      if (result.success) {
        toast.success('GPT created successfully!');
        onOpenChange(false);
        router.push('/admin/gpts');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to Create Agent');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred while creating the GPT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    const response = await fetch('/api/s3/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { uploadUrl, fileUrl } = await response.json();

    // Upload file to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return fileUrl;
  };


  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

      let textContent = message.text || '';
      const uploadedFiles: string[] = [];

      // Handle file uploads
      if (message.files && message.files.length > 0) {
        try {
          for (const file of message.files) {
            // Check if it's an image (for avatar)
            if (file.type.startsWith('image/')) {
              const imageUrl = await uploadToS3(file);
              setCollectedData((prev) => ({ ...prev, imageUrl }));
              textContent += `\n[Uploaded image: ${file.name}]`;
            } else {
              // KB file
              const fileUrl = await uploadToS3(file);
              uploadedFiles.push(fileUrl);
              textContent += `\n[Uploaded file: ${file.name}]`;
            }
          }

          if (uploadedFiles.length > 0) {
            setCollectedData((prev) => ({
              ...prev,
              kbFiles: [...(prev.kbFiles || []), ...uploadedFiles],
            }));
          }
        } catch (error: any) {
          toast.error(`Failed to upload file: ${error.message}`);
          return;
        }
      }

      // Send message to AI
      await handleSendMessage(textContent);
    },
    [messages, collectedData]
  );

  const formatAssistantContent = (content: string) => {
    if (!content) return "";
    const trimmed = content.trim();
    const match =
      trimmed.match(/<complete[\s\S]*$/i) ||
      trimmed.match(/<summary[\s\S]*$/i) ||
      trimmed.match(/<data[\s\S]*$/i) ||
      trimmed.match(/\{[\s\S]*$/);

    if (!match) {
      return content;
    }

    const index = trimmed.indexOf(match[0]);
    if (index === -1) {
      return content;
    }

    const intro = trimmed.slice(0, index).trim();
    const structured = trimmed.slice(index).trim();
    const lang = structured.startsWith("{")
      ? "json"
      : structured.startsWith("<")
      ? "xml"
      : "markdown";
    const codeBlock = `\`\`\`${lang}\n${structured}\n\`\`\``;

    if (intro) {
      return `${intro}\n\n${codeBlock}`;
    }

    return codeBlock;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Auto-Build GPT</DialogTitle>
          <DialogDescription>
            I&apos;ll guide you through creating your custom GPT step by step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="px-6 py-4">
            {messages.map((message) => {
                const displayContent =
                  message.role === 'assistant'
                    ? formatAssistantContent(message.content)
                    : message.content;
                return (
                <Fragment key={message.id}>
                  <Message from={message.role}>
                    <MessageContent>
                      <Response>{displayContent}</Response>
                    </MessageContent>
                  </Message>
                </Fragment>
              )})}
              {isLoading && <Loader />}
              {isSubmitting && (
                <Message from="assistant">
                  <MessageContent>
                    <Response>Creating your GPT... Please wait.</Response>
                  </MessageContent>
                </Message>
              )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

          <div className="border-t px-6 py-4">
            <PromptInput
              onSubmit={handleSubmit}
              globalDrop
              multiple
              disabled={isSubmitting || isComplete || isLoading}
            >
          <PromptInputHeader>
            <PromptInputAttachments>
                  {(attachment: unknown) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
                <PromptInputTextarea placeholder="Type your response..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
                <PromptInputSubmit
                  disabled={isSubmitting || isComplete || isLoading}
                  status={isLoading ? 'submitted' : undefined}
                />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
      </DialogContent>
    </Dialog>
  );
}
