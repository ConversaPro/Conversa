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
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
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
  }, [socket, user._id, setIsOtherUserTyping, setMessageList]);

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

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage(e);
    }
  };

  const uploadToCloudinary = async (file) => {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset =
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "chat-app";

    if (!cloudName) {
      throw new Error("Cloudinary is not configured in the frontend env");
    }

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

  const handleSendMessage = async (e, messageText, file) => {
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
    if (file) {
      try {
        // Try backend upload first (uses Cloudinary server-side)
        const form = new FormData();
        form.append("file", file);
        const resp = await axios.post(`${hostName}/message/upload`, form, {
          headers: {
            "auth-token": localStorage.getItem("token"),
          },
        });
        if (resp.status === 200 && resp.data?.url) {
          uploadedImageUrl = resp.data.url;
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        // Fallback to direct Cloudinary upload if backend route not available
        try {
          uploadedImageUrl = await uploadToCloudinary(file);
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
      imageUrl: file ? uploadedImageUrl : null,
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
      imageUrl: file ? uploadedImageUrl : null,
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
      chat.latestmessage = messageText || (file ? "[image]" : chat.latestmessage);
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
                  {!receiver?.email?.includes("bot") && (
                    <InputLeftElement>
                      <Button
                        mx={2}
                        size="sm"
                        onClick={onOpen}
                        borderRadius="lg"
                      >
                        <FaFileUpload />
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
