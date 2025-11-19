"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Room, RoomEvent } from "livekit-client";

interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface UseVoiceChatProps {
  sessionId: string | null;
  gptId?: string;
  onMessage?: (message: VoiceMessage) => void;
}

export interface VoiceConnectOverrides {
  voiceAgentName?: string;
  voiceConfidenceThreshold?: number | null;
  voiceSttProvider?: string | null;
  voiceSttModelId?: string | null;
  voiceSttModelName?: string | null;
  voiceTtsProvider?: string | null;
  voiceTtsModelId?: string | null;
  voiceTtsModelName?: string | null;
  minSilenceDuration?: number;
  minSpeechDuration?: number;
  maxBufferedSpeech?: number;
}

interface UseVoiceChatReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: (overrides?: VoiceConnectOverrides) => Promise<void>;
  disconnect: () => Promise<void>;
  room: Room | null;
  audioStream: MediaStream | null;
}

export function useVoiceChat({
  sessionId,
  gptId,
  onMessage,
}: UseVoiceChatProps): UseVoiceChatReturn {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioStreamRef = useRef<MediaStream | null>(null);

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      console.log("🔊 addMessage called:", { 
        role, 
        content: content.substring(0, 100), 
        contentLength: content.length 
      });
      
      const message: VoiceMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        role,
        content,
        timestamp: new Date().toISOString(),
      };
      
      console.log("✨ Creating message:", message.id, role);
      onMessage?.(message);
    },
    [onMessage]
  );

  const connect = useCallback(async (overrides?: VoiceConnectOverrides) => {
    if (!sessionId || connecting || connected) return;

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/voice/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          gptId,
          voiceConfig: overrides,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || "Failed to get voice connection token");
      }

      const { token, url, roomName } = await response.json();

      const room = new Room({
        adaptiveStream: true,
      });

      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        console.log("Voice room connected");
        setConnected(true);
        setConnecting(false);
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log("Voice room disconnected", reason);
        setConnected(false);
        setConnecting(false);
        if (reason) {
          setError(`Disconnected: ${reason}`);
        }
        if (roomRef.current) {
          roomRef.current = null;
        }
      });

      room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
        console.log("Room metadata changed:", metadata);
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant connected:", participant.identity);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant disconnected:", participant.identity); 
      });

      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log("Connection quality changed:", quality, participant?.identity);
      });

      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("Track published:", publication.kind, participant?.identity);
      });

      room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
        console.log("Track unpublished:", publication.kind, participant?.identity);
      });

      room.on(RoomEvent.MediaDevicesError, (error) => {
        console.error("Media devices error:", error);
        setError(`Media error: ${error.message || error}`);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("Connection state changed:", state);
        if (state === "disconnected") {
          setConnected(false);
          setConnecting(false);
        }
      });

      // Register text stream handler for LiveKit transcriptions
      // This is the correct way to receive transcriptions from LiveKit
      room.registerTextStreamHandler("lk.transcription", async (reader, participantIdentity) => {
        try {
          const participantId = typeof participantIdentity === "string" 
            ? participantIdentity 
            : participantIdentity?.identity || "";
          
          console.log("📝 Text stream handler registered for transcriptions");
          console.log("📝 Participant:", participantId);
          console.log("📝 Stream info:", {
            topic: reader.info.topic,
            attributes: reader.info.attributes,
          });

          const messages: string[] = [];
          let fullMessage = "";

          // Read all messages from the stream using async iteration
          // TextStreamReader is an async iterable
          for await (const value of reader) {
            if (typeof value === "string") {
              messages.push(value);
              fullMessage += value;
            }
          }

          // Check if this is a transcription
          const attributes = reader.info.attributes;
          const isTranscription = attributes?.["lk.transcribed_track_id"] != null;
          const isFinal = attributes?.["lk.transcription_final"] === "true";
          const segmentId = attributes?.["lk.segment_id"];
          const transcribedTrackId = attributes?.["lk.transcribed_track_id"];

          console.log("📝 Transcription received:", {
            participantId,
            isTranscription,
            isFinal,
            segmentId,
            transcribedTrackId,
            messageLength: fullMessage.length,
            messagePreview: fullMessage.substring(0, 100),
          });

          if (isTranscription && fullMessage.trim()) {
            // Determine role based on participant identity
            // Agent transcriptions come from the agent participant
            // User transcriptions come from the local participant
            const role = participantId.includes("agent") || 
                        participantId.includes("assistant") ||
                        participantId !== room.localParticipant.identity
              ? "assistant"
              : "user";

            console.log("✅ Processing transcription:", {
              role,
              isFinal,
              content: fullMessage.substring(0, 100),
            });

            // Only add final transcriptions to avoid duplicates
            // Interim transcriptions can be used for live typing indicators if needed
            if (isFinal) {
              addMessage(role, fullMessage);
            } else {
              // For interim transcriptions, you could update a streaming message
              // For now, we'll only show final transcriptions
              console.log("⏳ Interim transcription (not displaying):", fullMessage.substring(0, 50));
            }
          } else {
            console.log("ℹ️ Non-transcription text stream:", fullMessage.substring(0, 100));
          }
        } catch (err) {
          console.error("❌ Error reading text stream:", err);
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "audio" && participant && participant.identity !== room.localParticipant.identity && track.sid) {
          const audioElement = new Audio();
          track.attach(audioElement);
          audioElementsRef.current.set(track.sid, audioElement);
          audioElement.play().catch(console.error);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.sid) {
          const audioElement = audioElementsRef.current.get(track.sid);
          if (audioElement) {
            track.detach(audioElement);
            audioElement.pause();
            audioElement.srcObject = null;
            audioElementsRef.current.delete(track.sid);
          }
        }
      });

      await room.connect(url, token);

      await room.localParticipant.setMicrophoneEnabled(true);
      
      // Get the microphone stream for visualization
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        setAudioStream(stream);
      } catch (streamErr) {
        console.warn("Could not get audio stream for visualization:", streamErr);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect";
      setError(errorMessage);
      setConnecting(false);
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
        } catch (disconnectErr) {
          console.error("Error during cleanup disconnect:", disconnectErr);
        }
        roomRef.current = null;
      }
    }
  }, [sessionId, gptId, connecting, connected, addMessage]);

  const disconnect = useCallback(async () => {
      try {
      // Set connected to false first so LiveWaveform cleanup triggers
      setConnected(false);
      setConnecting(false);

      // Clean up audio elements
        audioElementsRef.current.forEach((audioElement) => {
          audioElement.pause();
          audioElement.srcObject = null;
        });
        audioElementsRef.current.clear();

      // Disable microphone on room's local participant before disconnecting
      if (roomRef.current?.localParticipant) {
        try {
          await roomRef.current.localParticipant.setMicrophoneEnabled(false);
          // Get and stop all audio media tracks from local participant
          roomRef.current.localParticipant.trackPublications.forEach((publication) => {
            if (publication.kind === 'audio' && publication.track) {
              publication.track.stop();
            }
          });
        } catch (err) {
          console.warn("Error disabling microphone:", err);
        }
      }

      // Clean up separate audio stream used for visualization
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        audioStreamRef.current = null;
          setAudioStream(null);
      } else if (audioStream) {
        audioStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        setAudioStream(null);
      }

      // Get room name before disconnecting
      const roomName = roomRef.current?.name;

      // Disconnect from room
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
      }

      // Note: LiveWaveform component will handle its own cleanup when active becomes false
      // All known streams (room's mic, audioStreamRef) have been stopped above

      // Call backend disconnect API
      if (sessionId && roomName) {
          try {
            await fetch("/api/voice/disconnect", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId, roomName }),
            });
          } catch (fetchErr) {
            console.error("Error calling disconnect API:", fetchErr);
          }
        }
      } catch (err) {
        console.error("Error disconnecting:", err);
        setConnected(false);
        setConnecting(false);
      // Force cleanup even if disconnect failed
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        audioStreamRef.current = null;
        setAudioStream(null);
      } else if (audioStream) {
        audioStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        setAudioStream(null);
      }
      if (roomRef.current) {
        roomRef.current = null;
      }
    }
  }, [sessionId, audioStream]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount only - ensure all media tracks are released
      audioElementsRef.current.forEach((audioElement) => {
        audioElement.pause();
        audioElement.srcObject = null;
      });
      audioElementsRef.current.clear();
      
      // Stop all media tracks from audio stream using ref (won't cause re-runs)
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        audioStreamRef.current = null;
      }
      
      // Disable microphone and disconnect room
      if (roomRef.current) {
        const room = roomRef.current;
        // Disable microphone
        if (room.localParticipant) {
          room.localParticipant.setMicrophoneEnabled(false).catch(console.error);
          // Stop all audio tracks
          room.localParticipant.trackPublications.forEach((publication) => {
            if (publication.kind === 'audio' && publication.track) {
              publication.track.stop();
            }
          });
        }
        // Disconnect room
        room.disconnect().catch(console.error);
        roomRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run cleanup on unmount

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    room: roomRef.current,
    audioStream,
  };
}
