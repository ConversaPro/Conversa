import React, { useEffect, useRef, useState, useContext } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  IconButton,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { CloseIcon, PhoneIcon } from "@chakra-ui/icons";
import { FaMicrophoneSlash, FaMicrophone, FaVideo, FaVideoSlash } from "react-icons/fa";
import chatContext from "../../context/chatContext";

// Simple 1:1 WebRTC Call Overlay using existing socket.io signaling
// Props: type: 'audio'|'video', receiver: user, onClose: fn
export default function CallOverlay({ type = "audio", receiver, onClose, initiator = true, incomingPayload = null }) {
  const { user, socket, activeChatId } = useContext(chatContext);
  const toast = useToast();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  // optionally track call connection state if needed
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(type === "audio");
  const [startedAt, setStartedAt] = useState(null);

  const endCall = (status = "ended") => {
    try {
      socket.emit("call-end", { fromUserId: user._id, toUserId: receiver._id });
      socket.emit("log-call", {
        conversationId: activeChatId,
        senderId: user._id,
        callType: type,
        callStatus: status,
        startedAt,
        endedAt: Date.now(),
      });
    } catch {}
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    onClose?.();
  };

  const createPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc-ice-candidate", {
          toUserId: receiver._id,
          fromUserId: user._id,
          candidate: e.candidate,
        });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    return pc;
  };

  const start = async () => {
    try {
      const constraints = { audio: true, video: type === "video" };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pcRef.current = pc;

      if (initiator) {
        // initiate call
        socket.emit("call-initiate", {
          fromUserId: user._id,
          toUserId: receiver._id,
          conversationId: activeChatId,
          callType: type,
        });
      } else if (incomingPayload) {
        // directly accept call as callee
        socket.emit("call-accept", {
          fromUserId: incomingPayload.fromUserId,
          toUserId: user._id,
          conversationId: activeChatId,
          callType: type,
        });
      }

      setStartedAt(Date.now());
    } catch (e) {
      toast({ title: "Failed to access mic/camera", status: "error" });
      onClose?.();
    }
  };

  // Signaling listeners
  useEffect(() => {
  const onIncoming = async (payload) => {
      if (payload.fromUserId !== receiver._id) return;
      // accept immediately and create offer flow (callee)
      try {
        const constraints = { audio: true, video: type === "video" };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = createPeer();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pcRef.current = pc;

        socket.emit("call-accept", {
          fromUserId: payload.fromUserId,
          toUserId: user._id,
          conversationId: activeChatId,
          callType: type,
        });
      } catch (e) {
        socket.emit("call-reject", { fromUserId: payload.fromUserId, toUserId: user._id, reason: "media-error" });
        onClose?.();
      }
    };

    const onAccepted = async () => {
      // caller creates offer
      if (!pcRef.current) return;
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit("webrtc-offer", { toUserId: receiver._id, fromUserId: user._id, sdp: offer });
    };

    const onOffer = async (data) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("webrtc-answer", { toUserId: receiver._id, fromUserId: user._id, sdp: answer });
  // connected
    };

    const onAnswer = async (data) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
  // connected
    };

    const onIce = async (data) => {
      if (!pcRef.current || !data.candidate) return;
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
    };

    const onEnded = () => endCall("ended");
    const onBusy = () => {
      toast({ title: "User is busy", status: "info" });
      onClose?.();
    };

    socket.on("incoming-call", onIncoming);
    socket.on("call-accepted", onAccepted);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIce);
    socket.on("call-ended", onEnded);
    socket.on("call-busy", onBusy);

  // start media depending on role
  start();

    return () => {
      socket.off("incoming-call", onIncoming);
      socket.off("call-accepted", onAccepted);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIce);
      socket.off("call-ended", onEnded);
      socket.off("call-busy", onBusy);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks?.() || [];
    tracks.forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  };

  const toggleVideo = () => {
    const tracks = localStreamRef.current?.getVideoTracks?.() || [];
    tracks.forEach((t) => (t.enabled = videoOff));
    setVideoOff((v) => !v);
  };

  return (
    <Box position="fixed" inset={0} bg="blackAlpha.700" zIndex={1000}>
      <Flex direction="column" align="center" justify="center" h="100%" p={4}>
        <Text color="white" mb={3}>
          {type === "video" ? "Video Call" : "Voice Call"} with {receiver?.name}
        </Text>
        {type === "video" ? (
          <Box bg="black" p={2} borderRadius="md" w={{ base: "95vw", md: "70vw" }} h={{ base: "60vh", md: "60vh" }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", right: 20, bottom: 20, width: 140, height: 100, objectFit: "cover", borderRadius: 8 }} />
          </Box>
        ) : null}
        <HStack mt={4} spacing={3}>
          <IconButton onClick={toggleMute} colorScheme={muted ? "red" : "gray"} icon={muted ? <FaMicrophoneSlash /> : <FaMicrophone />} />
          {type === "video" && (
            <IconButton onClick={toggleVideo} colorScheme={videoOff ? "red" : "gray"} icon={videoOff ? <FaVideoSlash /> : <FaVideo />} />
          )}
          <Button colorScheme="red" leftIcon={<PhoneIcon />} onClick={() => endCall("ended")}>End</Button>
          <IconButton aria-label="Close" icon={<CloseIcon />} onClick={() => endCall("ended")} />
        </HStack>
      </Flex>
    </Box>
  );
}
