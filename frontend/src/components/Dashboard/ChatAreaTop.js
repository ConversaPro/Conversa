import {
  Flex,
  Text,
  Button,
  Image,
  Tooltip,
  SkeletonCircle,
  Skeleton,
  Stack,
  Box,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import React, { useContext, useEffect, useCallback, useState } from "react";
import chatContext from "../../context/chatContext";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { useDisclosure } from "@chakra-ui/react";
import { FaPhone, FaVideo } from "react-icons/fa";
import CallOverlay from "../miscellaneous/CallOverlay";
import GroupInfoModal from "../miscellaneous/GroupInfoModal";

const ChatAreaTop = () => {
  const context = useContext(chatContext);

  const {
    receiver,
    setReceiver,
    activeChatId,
    setActiveChatId,
    setMessageList,
    isChatLoading,
    hostName,
    socket,
  } = context;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isGroupOpen,
    onOpen: onGroupOpen,
    onClose: onGroupClose,
  } = useDisclosure();
  const toast = useToast();

  // Call state
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' | 'video'
  const [incoming, setIncoming] = useState(null);

  const getReceiverOnlineStatus = useCallback(async () => {
    if (!receiver._id) {
      return;
    }

    try {
      const repsonse = await fetch(
        `${hostName}/user/online-status/${receiver._id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );
      const data = await repsonse.json();
      setReceiver((receiver) => ({
        ...receiver,
        isOnline: data.isOnline,
      }));
    } catch (error) {}
  }, [hostName, receiver._id, setReceiver]);

  const handleBack = () => {
    socket.emit("leave-chat", activeChatId);
    setActiveChatId("");
    setMessageList([]);
    setReceiver({});
  };

  const startCall = (type) => {
    if (!receiver?._id) {
      toast({ title: "Open a chat first", status: "info", duration: 2000 });
      return;
    }
    setCallType(type);
    setShowCall(true);
  };

  // Listen for incoming calls
  useEffect(() => {
    const onIncoming = (payload) => {
      if (payload.fromUserId && payload.fromUserId !== receiver._id) return; // only for current chat
      setCallType(payload.callType || 'audio');
      setIncoming(payload);
      setShowCall(true);
    };
    socket.on('incoming-call', onIncoming);
    return () => socket.off('incoming-call', onIncoming);
  }, [receiver._id, socket]);

  const getLastSeenString = (lastSeen) => {
    var lastSeenString = "last seen ";
    if (new Date(lastSeen).toDateString() === new Date().toDateString()) {
      lastSeenString += "today ";
    } else if (
      new Date(lastSeen).toDateString() ===
      new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
    ) {
      lastSeenString += "yesterday ";
    } else {
      lastSeenString += `on ${new Date(lastSeen).toLocaleDateString()} `;
    }

    lastSeenString += `at ${new Date(lastSeen).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    return lastSeenString;
  };

  useEffect(() => {
    getReceiverOnlineStatus();
  }, [getReceiverOnlineStatus]);
  return (
    <>
      <Flex w={"100%"} bgGradient={{ base: "linear(to-r, brand.600, accent.500)", md: "linear(to-r, brand.700, accent.500)" }} color="white" align="center">
        <Button
          borderRadius={0}
          height={"inherit"}
          onClick={() => handleBack()}
          variant="ghost"
          color="white"
        >
          <ArrowBackIcon />
        </Button>
        <Tooltip label="View Profile">
          <Flex
            as="button"
            w={"100%"}
            mr={0}
            p={2}
            h={"max-content"}
            justifyContent={"space-between"}
            borderRadius={"0px"}
            onClick={() => (receiver?.isGroup ? onGroupOpen() : onOpen())}
          >
            {isChatLoading ? (
              <>
                <Flex>
                  <SkeletonCircle size="10" mx={2} />
                  <Skeleton
                    height="20px"
                    width="250px"
                    borderRadius={"md"}
                    my={2}
                  />
                </Flex>
              </>
            ) : (
              <>
                <Flex gap={2} alignItems={"center"}>
                  <Image
                    borderRadius="full"
                    boxSize="40px"
                    src={receiver.profilePic}
                    alt=""
                  />

                  <Stack
                    justifyContent={"center"}
                    m={0}
                    p={0}
                    lineHeight={1}
                    gap={0}
                    textAlign={"left"}
                  >
                    <Text mx={1} my={receiver.isOnline ? 0 : 2} fontSize="2xl">
                      {receiver.name}
                    </Text>
                    {receiver?.isGroup && (
                      <Text my={0} mx={1} fontSize={"xs"} color="whiteAlpha.800">
                        {(() => {
                          const chat = context.myChatList.find((c) => c._id === activeChatId);
                          const count = chat?.members?.length || 0;
                          return `Group • ${count} members • tap for info`;
                        })()}
                      </Text>
                    )}
                    {!receiver?.isGroup && receiver.isOnline ? (
                      <Flex mx={1} alignItems="center" fontSize={"small"}>
                        <Box
                          as="span"
                          w="8px"
                          h="8px"
                          bg="green.500"
                          borderRadius="full"
                          display="inline-block"
                          mr={1}
                        />
                        <Text as="span">active now</Text>
                      </Flex>
                    ) : !receiver?.isGroup ? (
                      <Text my={0} mx={1} fontSize={"xx-small"}>
                        {getLastSeenString(receiver.lastSeen)}
                      </Text>
                    ) : null}
                  </Stack>
                </Flex>
                <HStack spacing={2} onClick={(e) => e.stopPropagation()}>
                  <Tooltip label="Voice call">
                    <Button size="sm" variant="ghost" colorScheme="whiteAlpha" onClick={() => startCall('audio')}>
                      <FaPhone />
                    </Button>
                  </Tooltip>
                  <Tooltip label="Video call">
                    <Button size="sm" variant="ghost" colorScheme="whiteAlpha" onClick={() => startCall('video')}>
                      <FaVideo />
                    </Button>
                  </Tooltip>
                </HStack>
              </>
            )}
          </Flex>
        </Tooltip>
      </Flex>

      {!receiver?.isGroup && (
        <ProfileModal isOpen={isOpen} onClose={onClose} user={receiver} />
      )}
      {receiver?.isGroup && (
        <GroupInfoModal
          isOpen={isGroupOpen}
          onClose={onGroupClose}
          conversation={{
            _id: activeChatId,
            name: receiver.name,
            groupIcon: receiver.profilePic,
            admins: context.myChatList.find((c) => c._id === activeChatId)?.admins || [],
            members: context.myChatList.find((c) => c._id === activeChatId)?.members || [],
            description: context.myChatList.find((c) => c._id === activeChatId)?.description || "",
          }}
        />
      )}
    {showCall && (
        <CallOverlay
          onClose={() => setShowCall(false)}
          type={callType}
          receiver={receiver}
      initiator={!incoming}
      incomingPayload={incoming}
        />
      )}
    </>
  );
};

export default ChatAreaTop;
