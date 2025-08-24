import React, { useState, useEffect, useContext } from "react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import Lottie from "react-lottie";
import animationdata from "../../typingAnimation.json";
import {
  Box,
  InputGroup,
  Input,
  Text,
  InputRightElement,
  Button,
  FormControl,
  InputLeftElement,
  useToast,
  useDisclosure,
  Flex,
} from "@chakra-ui/react";
import { FaFileUpload, FaMicrophone, FaStop, FaTrash } from "react-icons/fa";
import { marked } from "marked";

import chatContext from "../../context/chatContext";
import ChatAreaTop from "./ChatAreaTop";
import FileUploadModal from "../miscellaneous/FileUploadModal";
import ChatLoadingSpinner from "../miscellaneous/ChatLoadingSpinner";
import axios from "axios";
import SingleMessage from "./SingleMessage";

const scrollbarconfig = {
  "&::-webkit-scrollbar": {
    width: "5px",
    height: "5px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "gray.300",
    borderRadius: "5px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "gray.400",
  },
  "&::-webkit-scrollbar-track": {
    display: "none",
  },
};

const markdownToHtml = (markdownText) => {
  const html = marked(markdownText);
  return { __html: html };
};

export const ChatArea = () => {
  const context = useContext(chatContext);
  const {
  hostName,
    user,
    receiver,
    socket,
    activeChatId,
    messageList,
    setMessageList,
    isOtherUserTyping,
    setIsOtherUserTyping,
    setActiveChatId,
    setReceiver,
    setMyChatList,
    myChatList,
    isChatLoading,
  } = context;
  const [typing, settyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const timerRef = React.useRef(null);
  // STT + TTS for chatbot
  const [sttListening, setSttListening] = useState(false);
  const recognitionRef = React.useRef(null);
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem("ttsEnabled") === "1");
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Lottie Options for typing
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationdata,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  useEffect(() => {
    const onPopState = () => {
      socket.emit("leave-chat", activeChatId);
      setActiveChatId("");
      setMessageList([]);
      setReceiver({});
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [socket, activeChatId, setActiveChatId, setMessageList, setReceiver]);

  useEffect(() => {
    const onUserJoinedRoom = (userId) => {
      setMessageList((prev) =>
        prev.map((message) => {
          if (message.senderId === user._id && userId !== user._id) {
            const index = (message.seenBy || []).findIndex(
              (seen) => seen.user === userId
            );
            if (index === -1) {
              const nextSeenBy = [...(message.seenBy || []), { user: userId, seenAt: new Date() }];
              return { ...message, seenBy: nextSeenBy };
            }
          }
          return message;
        })
      );
    };

    const onTyping = (data) => {
      if (data.typer !== user._id) setIsOtherUserTyping(true);
    };
    const onStopTyping = (data) => {
      if (data.typer !== user._id) setIsOtherUserTyping(false);
    };
  const onReceiveMessage = (data) => {
      setMessageList((prev) => {
        if (data.clientId) {
          const idx = prev.findIndex((m) => m.clientId === data.clientId);
          if (idx !== -1) {
            const next = prev.slice();
            next[idx] = { ...data, pending: false };
            return next;
          }
        }
        if (data._id) {
          const existsIdx = prev.findIndex((m) => m._id === data._id);
          if (existsIdx !== -1) {
            const next = prev.slice();
            next[existsIdx] = { ...prev[existsIdx], ...data };
            return next;
          }
        }
        return [...prev, data];
      });
      // Speak bot responses aloud if enabled
      try {
        if (
          ttsEnabled &&
          receiver?.email?.includes("bot") &&
          data?.senderId === receiver?._id &&
          data?.text && typeof window !== "undefined" && window.speechSynthesis
        ) {
          const utter = new SpeechSynthesisUtterance(data.text);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      } catch {}
      setTimeout(() => {
        const box = document.getElementById("chat-box");
        box?.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
      }, 100);
  };
    const onMessageDeleted = (data) => {
      const { messageId } = data;
      setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socket.on("user-joined-room", onUserJoinedRoom);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);
    socket.on("receive-message", onReceiveMessage);
    socket.on("message-deleted", onMessageDeleted);

    return () => {
      socket.off("user-joined-room", onUserJoinedRoom);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      socket.off("receive-message", onReceiveMessage);
      socket.off("message-deleted", onMessageDeleted);
    };
  }, [socket, user._id, setIsOtherUserTyping, setMessageList, ttsEnabled, receiver]);

  const handleTyping = () => {
    const messageInput = document.getElementById("new-message");
    if (!messageInput) return;

    if (messageInput.value === "" && typing) {
      settyping(false);
      socket.emit("stop-typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    } else if (messageInput.value !== "" && !typing) {
      settyping(true);
      socket.emit("typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    }
  };

  // STT (speech-to-text) for chatting with bot
  const startStt = async () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        toast({ title: "Speech recognition not supported in this browser", status: "error", duration: 3000, isClosable: true });
        return;
      }
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        let transcript = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        // optionally show interim text in input
        const inputElem = document.getElementById("new-message");
        if (inputElem && !isRecording) inputElem.value = transcript;
      };
      rec.onerror = () => setSttListening(false);
      rec.onend = async () => {
        setSttListening(false);
        const text = (document.getElementById("new-message")?.value || "").trim();
        if (text) {
          const fake = { preventDefault: () => {} };
          await handleSendMessage(fake, text);
        }
      };
      setSttListening(true);
      rec.start();
    } catch (e) {
      setSttListening(false);
      console.error(e);
    }
  };

  const stopStt = () => {
    try {
      if (recognitionRef.current && sttListening) {
        recognitionRef.current.stop();
      }
    } catch {}
    setSttListening(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage(e);
    }
  };

  const formatTime = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const startRecording = async () => {
    try {
      // stop typing if any
      socket.emit("stop-typing", { typer: user._id, conversationId: activeChatId });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let mime = "audio/webm";
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      for (const t of preferred) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          mime = t;
          break;
        }
      }
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      const chunks = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        setRecordedBlob(blob);
      };
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
      mr.start();
    } catch (err) {
      toast({ title: "Microphone permission denied", status: "error", duration: 3000, isClosable: true });
      console.error(err);
    }
  };

  const stopRecording = () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordSeconds(0);
  };

  const sendRecordedVoice = async () => {
    if (!recordedBlob) return;
    const mime = recordedBlob.type || "audio/webm";
    const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: mime });
    // create a fake event for handleSendMessage signature
    const fakeEvent = { preventDefault: () => {} };
    await handleSendMessage(fakeEvent, "", file, true);
    setRecordedBlob(null);
    setRecordSeconds(0);
  };

  const uploadToCloudinary = async (file) => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "unsigned";

  if (!cloudName) throw new Error("Missing REACT_APP_CLOUDINARY_CLOUD_NAME");

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await axios.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response.status !== 200) {
      throw new Error("Failed to upload to Cloudinary");
    }
    return response.data.secure_url;
  };

  const handleSendMessage = async (e, messageText, file, isAudio) => {
    e.preventDefault();

    if (!messageText) {
      messageText = document.getElementById("new-message")?.value || "";
    }

    socket.emit("stop-typing", {
      typer: user._id,
      conversationId: activeChatId,
    });

  if (messageText === "" && !file) {
      toast({
        title: "Message cannot be empty",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

  let uploadedImageUrl;
  let uploadedAudioUrl;
    if (file) {
      try {
        // Try backend upload first (uses Cloudinary server-side)
        const form = new FormData();
        form.append("file", file);
        const endpoint = isAudio ? `${hostName}/message/upload-audio` : `${hostName}/message/upload`;
        const resp = await axios.post(endpoint, form, {
          headers: {
            "auth-token": localStorage.getItem("token"),
          },
        });
        if (resp.status === 200 && resp.data?.url) {
          if (isAudio) uploadedAudioUrl = resp.data.url; else uploadedImageUrl = resp.data.url;
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        // Fallback to direct Cloudinary upload if backend route not available
        try {
          const url = await uploadToCloudinary(file);
          if (isAudio) uploadedAudioUrl = url; else uploadedImageUrl = url;
        } catch (err2) {
          toast({
            title: err2.message,
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }
    }

    const now = new Date();
    const clientId = `c-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    const pendingMessage = {
      _id: `temp-${now.getTime()}`,
      text: messageText,
      conversationId: activeChatId,
      senderId: user._id,
      imageUrl: file && !isAudio ? uploadedImageUrl : null,
      audioUrl: file && isAudio ? uploadedAudioUrl : null,
      seenBy: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      pending: true,
      clientId,
    };

    // Optimistically render
    setMessageList((prev) => [...prev, pendingMessage]);

    const data = {
      text: messageText,
      conversationId: activeChatId,
      senderId: user._id,
      imageUrl: file && !isAudio ? uploadedImageUrl : null,
      audioUrl: file && isAudio ? uploadedAudioUrl : null,
      clientId,
    };

    socket.emit("send-message", data);

    const inputElem = document.getElementById("new-message");
    if (inputElem) {
      inputElem.value = "";
    }

    setTimeout(() => {
      document.getElementById("chat-box")?.scrollTo({
        top: document.getElementById("chat-box").scrollHeight,
        behavior: "smooth",
      });
    }, 100);

  setMyChatList(
      await myChatList
        .map((chat) => {
          if (chat._id === activeChatId) {
      chat.latestmessage = messageText || (file ? (isAudio ? "[voice]" : "[image]") : chat.latestmessage);
            chat.updatedAt = new Date().toUTCString();
          }
          return chat;
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );
  };

  const removeMessageFromList = (messageId) => {
    setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  return (
    <>
      {activeChatId !== "" ? (
        <>
          <Box
            justifyContent="space-between"
            h="100%"
            w={{
              base: "100vw",
              md: "100%",
            }}
          >
            <ChatAreaTop />

            {isChatLoading && <ChatLoadingSpinner />}

            <Box
              id="chat-box"
              h="85%"
              overflowY="auto"
              sx={scrollbarconfig}
              mt={1}
              mx={1}
            >
              {messageList?.map((message, idx) =>
                !message.deletedFrom?.includes(user._id) ? (
                  <SingleMessage
                    key={message._id || `${message.senderId}-${message.createdAt || idx}`}
                    message={message}
                    user={user}
                    receiver={receiver}
                    markdownToHtml={markdownToHtml}
                    scrollbarconfig={scrollbarconfig}
                    socket={socket}
                    activeChatId={activeChatId}
                    removeMessageFromList={removeMessageFromList}
                    toast={toast}
                  />
                ) : null
              )}
            </Box>

            <Box
              py={2}
              position="fixed"
              w={{
                base: "100%",
                md: "70%",
              }}
              bottom={{
                base: 1,
                md: 3,
              }}
              backgroundColor={
                localStorage.getItem("chakra-ui-color-mode") === "dark"
                  ? "#1a202c"
                  : "white"
              }
            >
              <Box
                mx={{
                  base: 6,
                  md: 3,
                }}
                w="fit-content"
              >
                {isOtherUserTyping && (
                  <Lottie
                    options={defaultOptions}
                    height={20}
                    width={20}
                    isStopped={false}
                    isPaused={false}
                  />
                )}
                {isRecording && (
                  <Flex align="center" color="red.400" fontWeight="semibold" gap={3} mt={1}>
                    <Box w="8px" h="8px" bg="red.500" borderRadius="full" />
                    <Text>Recording {formatTime(recordSeconds)}</Text>
                    <Button size="sm" leftIcon={<FaStop />} onClick={stopRecording}>
                      Stop
                    </Button>
                  </Flex>
                )}
                {recordedBlob && !isRecording && (
                  <Flex align="center" gap={3} mt={2}>
                    <audio controls src={URL.createObjectURL(recordedBlob)} style={{ maxWidth: "60vw" }} />
                    <Button size="sm" colorScheme="red" leftIcon={<FaTrash />} onClick={discardRecording}>
                      Discard
                    </Button>
                    <Button size="sm" colorScheme="green" onClick={sendRecordedVoice}>
                      Send voice
                    </Button>
                  </Flex>
                )}
              </Box>
              <FormControl>
                <InputGroup
                  w={{
                    base: "95%",
                    md: "98%",
                  }}
                  m="auto"
                  onKeyDown={handleKeyPress}
                >
                  {(
                    // For human chats: upload + voice-message recording
                    !receiver?.email?.includes("bot")
                  ) && (
                    <InputLeftElement>
                      <Button
                        mx={2}
                        size="sm"
                        onClick={onOpen}
                        borderRadius="lg"
                      >
                        <FaFileUpload />
                      </Button>
                      <Button
                        mx={1}
                        size="sm"
                        onClick={() => (isRecording ? stopRecording() : startRecording())}
                        borderRadius="lg"
                        colorScheme={isRecording ? "red" : undefined}
                      >
                        {isRecording ? <FaStop /> : <FaMicrophone />}
                      </Button>
                    </InputLeftElement>
                  )}
                  {receiver?.email?.includes("bot") && (
                    <InputLeftElement>
                      <Button
                        mx={2}
                        size="sm"
                        onClick={() => (sttListening ? stopStt() : startStt())}
                        borderRadius="lg"
                      >
                        {sttListening ? <FaStop /> : <FaMicrophone />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const next = !ttsEnabled;
                          setTtsEnabled(next);
                          localStorage.setItem("ttsEnabled", next ? "1" : "0");
                        }}
                        aria-label="Toggle TTS"
                      >
                        {ttsEnabled ? "TTS On" : "TTS Off"}
                      </Button>
                    </InputLeftElement>
                  )}

                  <Input
                    placeholder="Type a message"
                    id="new-message"
                    onChange={handleTyping}
                    borderRadius="10px"
                  />

                  <InputRightElement>
                    <Button
                      onClick={(e) =>
                        handleSendMessage(
                          e,
                          document.getElementById("new-message")?.value
                        )
                      }
                      size="sm"
                      mx={2}
                      borderRadius="10px"
                    >
                      <ArrowForwardIcon />
                    </Button>
                  </InputRightElement>
                </InputGroup>
                {isRecording && (
                  <Box mt={2} ml={16} color="red.300" fontSize="sm" display="flex" alignItems="center" gap={2}>
                    <Box as="span" w="8px" h="8px" borderRadius="full" bg="red.400" animation="pulse 1s ease-in-out infinite" />
                    Recording... {formatTime(recordSeconds)}
                  </Box>
                )}
              </FormControl>
            </Box>
          </Box>
          <FileUploadModal
            isOpen={isOpen}
            onClose={onClose}
            handleSendMessage={handleSendMessage}
          />
        </>
      ) : (
        !isChatLoading && (
          <Box
            display={{
              base: "none",
              md: "block",
            }}
            mx="auto"
            w="fit-content"
            mt="30vh"
            textAlign="center"
          >
            <Text fontSize="6vw" fontWeight="bold" fontFamily="Work sans">
              Conversa
            </Text>
            <Text fontSize="2vw">Online chatting app</Text>
            <Text fontSize="md">Select a chat to start messaging</Text>
          </Box>
        )
      )}
    </>
  );
};
