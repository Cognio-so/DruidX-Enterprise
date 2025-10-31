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

interface UseVoiceChatReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
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
      const message: VoiceMessage = {
        id: Date.now().toString() + Math.random(),
        role,
        content,
        timestamp: new Date().toISOString(),
      };
      onMessage?.(message);
    },
    [onMessage]
  );

  // Helper function to check HTTPS and getUserMedia availability
  const checkMediaPermissions = useCallback(async (): Promise<{ canAccess: boolean; error: string | null }> => {
    // Check if we're in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    
    if (!isSecureContext && location.protocol !== 'http:') {
      return {
        canAccess: false,
        error: "Microphone access requires HTTPS. Please use a secure connection."
      };
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        canAccess: false,
        error: "Microphone access is not supported in this browser. Please use a modern browser."
      };
    }

    // Try to check permissions first (if available)
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          return {
            canAccess: false,
            error: "Microphone permission was denied. Please enable it in your browser settings."
          };
        }
      }
    } catch (permErr) {
      // Permissions API might not be available, continue with attempt
      console.warn("Could not check microphone permissions:", permErr);
    }

    return { canAccess: true, error: null };
  }, []);

  const connect = useCallback(async () => {
    if (!sessionId || connecting || connected) return;

    setConnecting(true);
    setError(null);

    try {
      // Check HTTPS and media permissions before proceeding
      const permissionCheck = await checkMediaPermissions();
      if (!permissionCheck.canAccess) {
        throw new Error(permissionCheck.error || "Cannot access microphone");
      }

      const response = await fetch("/api/voice/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, gptId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || "Failed to get voice connection token");
      }

      const { token, url, roomName } = await response.json();

      // Validate LiveKit URL is HTTPS in production
      if (url && !url.startsWith('wss://') && !url.startsWith('https://')) {
        console.warn("LiveKit URL should use secure protocol (wss://) in production");
      }

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
        console.log("Participant connected:", {
          identity: participant.identity,
          isAgent: participant.identity?.includes("agent") || participant.identity?.includes("assistant"),
          audioTracks: Array.from(participant.audioTrackPublications.values()).length,
          videoTracks: Array.from(participant.videoTrackPublications.values()).length
        });
        
        // Check if this is the agent
        if (participant.identity?.includes("agent") || participant.identity?.includes("assistant")) {
          console.log("✅ Agent participant detected in room!");
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant disconnected:", participant.identity); 
      });

      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log("Connection quality changed:", quality, participant?.identity);
      });

      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("Track published:", {
          kind: publication.kind,
          trackSid: publication.trackSid,
          participant: participant?.identity,
          isSubscribed: publication.isSubscribed,
          isMuted: publication.isMuted
        });
        
        // Log track details for debugging production issues
        if (publication.track) {
          const trackInfo: any = {
            kind: publication.track.kind,
          };
          
          // Safely access track properties
          if ('id' in publication.track) {
            trackInfo.id = (publication.track as any).id;
          }
          if ('readyState' in publication.track) {
            trackInfo.readyState = (publication.track as any).readyState;
          }
          if ('enabled' in publication.track) {
            trackInfo.enabled = (publication.track as any).enabled;
          }
          
          console.log("Track details:", trackInfo);
        } else {
          console.warn("Track published but track object is null/undefined", {
            publicationKind: publication.kind,
            participant: participant?.identity
          });
        }
      });

      room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
        console.log("Track unpublished:", publication.kind, participant?.identity);
      });

      room.on(RoomEvent.MediaDevicesError, (error) => {
        console.error("Media devices error:", error);
        
        // Provide user-friendly error messages based on error type
        let errorMessage = "Media error: ";
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
            errorMessage = "Microphone permission was denied. Please allow microphone access and try again.";
          } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
            errorMessage = "No microphone found. Please connect a microphone and try again.";
          } else if (error.name === 'NotReadableError' || error.message.includes('not readable')) {
            errorMessage = "Microphone is being used by another application. Please close other apps and try again.";
          } else {
            errorMessage = `Media error: ${error.message || error}`;
          }
        } else {
          errorMessage += String(error);
        }
        
        setError(errorMessage);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("Connection state changed:", state);
        if (state === "disconnected") {
          setConnected(false);
          setConnecting(false);
        }
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const data = JSON.parse(decoder.decode(payload));
          
          console.log("Data received:", data);
          
          if (data.type === "transcription") {
            const { text, role } = data;
            if (text && text.trim()) {
              addMessage(role === "user" ? "user" : "assistant", text);
            }
          } else if (data.text) {
            addMessage(participant?.identity?.includes("agent") ? "assistant" : "user", data.text);
          }
        } catch (err) {
          console.error("Error parsing voice data:", err);
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("Track subscribed:", {
          kind: track.kind,
          participant: participant?.identity,
          isAgent: participant?.identity?.includes("agent") || participant?.identity?.includes("assistant"),
          trackSid: track.sid
        });
        
        if (track.kind === "audio" && participant && participant.identity !== room.localParticipant.identity && track.sid) {
          console.log("🎤 Setting up audio playback for participant:", participant.identity);
          const audioElement = new Audio();
          track.attach(audioElement);
          audioElementsRef.current.set(track.sid, audioElement);
          audioElement.play().catch((err) => {
            console.error("Error playing audio:", err);
          });
          console.log("✅ Audio playback set up successfully");
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

      // Wait for connection to be fully established
      await new Promise<void>((resolve) => {
        if (room.state === 'connected') {
          resolve();
        } else {
          const checkConnected = () => {
            if (room.state === 'connected') {
              room.off(RoomEvent.Connected, checkConnected);
              resolve();
            }
          };
          room.on(RoomEvent.Connected, checkConnected);
        }
      });

      // Enable microphone with retry logic and proper error handling
      let micEnabled = false;
      let retries = 3;
      
      while (!micEnabled && retries > 0) {
        try {
          console.log(`Attempting to enable microphone (${4 - retries}/3)...`);
          await room.localParticipant.setMicrophoneEnabled(true);
          
          // Wait for track to be published with timeout
          const waitForTrack = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout waiting for track to be published"));
            }, 5000);
            
            // Check if local participant published an audio track
            const checkTrack = (publication: any, participant: any) => {
              // Check if this is the local participant and it's an audio track
              if (participant?.identity === room.localParticipant.identity && publication.kind === 'audio') {
                clearTimeout(timeout);
                room.off(RoomEvent.TrackPublished, checkTrack);
                resolve();
              }
            };
            
            room.on(RoomEvent.TrackPublished, checkTrack);
            
            // Also check immediately in case track was already published
            const micPublications = Array.from(room.localParticipant.audioTrackPublications.values());
            const micPublication = micPublications.find(pub => pub.kind === 'audio');
            if (micPublication && micPublication.track) {
              clearTimeout(timeout);
              room.off(RoomEvent.TrackPublished, checkTrack);
              resolve();
            }
          });
          
          try {
            await waitForTrack;
            
            // Verify track is actually published and ready
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for track to fully initialize
            
            const micPublications = Array.from(room.localParticipant.audioTrackPublications.values());
            const micPublication = micPublications.find(pub => pub.kind === 'audio');
            
            if (micPublication && micPublication.track) {
              const trackInfo: any = {
                trackSid: micPublication.trackSid,
              };
              
              // Safely access track properties
              if ('id' in micPublication.track) {
                trackInfo.trackId = (micPublication.track as any).id;
              }
              if ('readyState' in micPublication.track) {
                trackInfo.readyState = (micPublication.track as any).readyState;
              }
              
              console.log("Microphone track published successfully:", trackInfo);
              micEnabled = true;
            } else {
              throw new Error("Track published but not found in publications");
            }
          } catch (waitError) {
            console.warn(`Track publishing wait failed (attempt ${4 - retries}/3):`, waitError);
            // Continue to retry
          }
          
          if (!micEnabled) {
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (micError) {
          console.error(`Error enabling microphone (attempt ${4 - retries}/3):`, micError);
          retries--;
          
          if (retries === 0) {
            // Provide specific error message
            if (micError instanceof Error) {
              if (micError.name === 'NotAllowedError' || micError.message.includes('permission')) {
                throw new Error("Microphone permission was denied. Please allow microphone access in your browser settings.");
              } else if (micError.name === 'NotFoundError') {
                throw new Error("No microphone found. Please connect a microphone and try again.");
              } else if (micError.name === 'NotReadableError') {
                throw new Error("Microphone is being used by another application. Please close other apps and try again.");
              }
            }
            throw micError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!micEnabled) {
        throw new Error("Failed to enable microphone after multiple attempts. Please check your microphone permissions and try again.");
      }
      
      // Get the microphone stream for visualization with better error handling
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        audioStreamRef.current = stream;
        setAudioStream(stream);
        console.log("Audio stream obtained for visualization");
      } catch (streamErr) {
        console.warn("Could not get audio stream for visualization:", streamErr);
        // Don't fail the connection if visualization stream fails
        // The room's microphone track should still work
      }
    } catch (err) {
      console.error("Voice connection error:", err);
      
      let errorMessage = "Failed to connect";
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Log detailed error information for production debugging
        console.error("Connection error details:", {
          name: err.name,
          message: err.message,
          stack: err.stack,
          url: window.location.href,
          protocol: window.location.protocol,
          secureContext: window.isSecureContext,
          userAgent: navigator.userAgent
        });
      }
      
      setError(errorMessage);
      setConnecting(false);
      
      // Cleanup on error
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
        } catch (disconnectErr) {
          console.error("Error during cleanup disconnect:", disconnectErr);
        }
        roomRef.current = null;
      }
      
      // Cleanup audio stream if it was created
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        audioStreamRef.current = null;
        setAudioStream(null);
      }
    }
  }, [sessionId, gptId, connecting, connected, addMessage, checkMediaPermissions]);

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
