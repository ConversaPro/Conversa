import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Image,
  Text,
  Button,
  Tooltip,
  Flex,
  Circle,
  Stack,
  useDisclosure,
} from "@chakra-ui/react";
import { CopyIcon, DeleteIcon, CheckCircleIcon } from "@chakra-ui/icons";
import DeleteMessageModal from "../miscellaneous/DeleteMessageModal";
import ImageLightbox from "../miscellaneous/ImageLightbox";

const SingleMessage = ({
  message,
  user,
  receiver,
  markdownToHtml,
  scrollbarconfig,
  socket,
  activeChatId,
  removeMessageFromList,
  toast,
}) => {
  const isSender = message.senderId === user._id;
  const messageTime = `${new Date(message.createdAt).getHours()}:${new Date(
    message.createdAt
  ).getMinutes()}`;

  const [isHovered, setIsHovered] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const {
    isOpen: isDeleteModalOpen,
    onOpen: onOpenDeleteModal,
    onClose: onCloseDeleteModal,
  } = useDisclosure();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      toast({
        duration: 1000,
        render: () => (
          <Text color="white" p={3} bg="purple.300" borderRadius="lg">
            Message copied to clipboard!!
          </Text>
        ),
      });
    });
  };

  const handleDeleteMessage = async (deletefrom) => {
    // Remove message from UI
    removeMessageFromList(message._id);
    onCloseDeleteModal();

    const deleteFrom = [user._id];
    if (deletefrom === 2) {
      deleteFrom.push(receiver._id);
    }

    const data = {
      messageId: message._id,
      conversationId: activeChatId,
      deleteFrom,
    };

    socket.emit("delete-message", data);
  };

  return (
    <>
      <Flex
        as={motion.div}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, mass: .5 }}
        justify={isSender ? "end" : "start"}
        mx={2}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isSender && isHovered && (
          <Box margin={2} display="flex">
            <Tooltip label="Copy" placement="top">
              <Button
                size="sm"
                variant="ghost"
                mr={2}
                onClick={handleCopy}
                borderRadius="md"
              >
                <CopyIcon />
              </Button>
            </Tooltip>

            <Tooltip label="Delete" placement="top">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDeleteModal();
                }}
                borderRadius="md"
              >
                <DeleteIcon />
              </Button>
            </Tooltip>
          </Box>
        )}
        <Flex w="max-content" position="relative">
          {!isSender && receiver?.profilePic && (
            <Image
              borderRadius="50%"
              src={receiver.profilePic}
              alt="Sender"
              w="20px"
              h="20px"
              mr={1}
              alignSelf="center"
            />
          )}

          <Stack spacing={0} position="relative">
            {message.replyto && (
              <Box
                my={1}
                p={2}
                borderRadius={10}
                bg={isSender ? "purple.200" : "blue.200"}
                mx={2}
                color="white"
                w="max-content"
                maxW="60vw"
                alignSelf={isSender ? "flex-end" : "flex-start"}
              >
                reply to
              </Box>
            )}

            <Box
              alignSelf={isSender ? "flex-end" : "flex-start"}
              position="relative"
              my={1}
              p={2}
              borderRadius={10}
              bg={isSender ? "purple.300" : "blue.300"}
              color="white"
              w="max-content"
              maxW="60vw"
              as={motion.div}
              whileHover={{ translateY: -1 }}
              whileTap={{ scale: 0.995 }}
            >
              {message.imageUrl && (
                <>
                  <Image
                    src={message.imageUrl}
                    alt="image"
                    w="200px"
                    maxW="40vw"
                    borderRadius="10px"
                    mb={2}
                    cursor="zoom-in"
                    onClick={() => setLightboxOpen(true)}
                  />
                  <ImageLightbox src={message.imageUrl} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
                </>
              )}
              {message.audioUrl && (
                <Box mb={2}>
                  <audio controls src={message.audioUrl} style={{ maxWidth: "60vw" }} />
                </Box>
              )}
              {message.callType && (
                <Box mb={2}>
                  <Text fontSize="sm">
                    {message.callStatus === 'missed'
                      ? `Missed ${message.callType} call`
                      : message.callStatus === 'rejected'
                      ? `Rejected ${message.callType} call`
                      : `Ended ${message.callType} call`}
                    {message.callDurationMs ? ` • ${Math.ceil(message.callDurationMs / 1000)}s` : ''}
                  </Text>
                </Box>
              )}
              <Box
                as="div"
                overflowX="scroll"
                sx={scrollbarconfig}
                dangerouslySetInnerHTML={markdownToHtml(message.text)}
              />
              <Flex justify="end" align="center" mt={1}>
                <Text align="end" fontSize="10px" color="#e6e5e5">
                  {messageTime}
                </Text>

                {isSender &&
                  message.seenBy?.find(
                    (element) => element.user === receiver._id
                  ) && (
                    <Circle ml={1} fontSize="x-small" color="green.100">
                      <CheckCircleIcon />
                    </Circle>
                  )}
              </Flex>

              {message.reaction && (
                <Box
                  fontSize="xs"
                  position="absolute"
                  bg={isSender ? "purple.300" : "blue.300"}
                  bottom={-1}
                  left={-1}
                  borderRadius="lg"
                >
                  {message.reaction}
                </Box>
              )}

              {/* Hover controls */}
              {!isSender && isHovered && (
                <Box position="absolute" top="0" right="-50px" display="flex">
                  <Tooltip label="Copy" placement="top">
                    <Button
                      size="sm"
                      variant="ghost"
                      mr={2}
                      onClick={handleCopy}
                      borderRadius="md"
                    >
                      <CopyIcon />
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Stack>
        </Flex>
      </Flex>

      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        handleDeleteMessage={handleDeleteMessage}
        onClose={onCloseDeleteModal}
      />
    </>
  );
};

export default SingleMessage;
