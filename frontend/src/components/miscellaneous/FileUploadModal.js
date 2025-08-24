import { Button, CloseButton, Input, Modal } from "@chakra-ui/react";
import React, { useRef, useState } from "react";
import {
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Box,
  Text,
  Flex,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";

const FileUploadModal = (props) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAudio, setIsAudio] = useState(false);
  const [message, setmessage] = useState("");

  const handleFileUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAudio && file.type.startsWith("image/")) {
      setSelectedFile(file);
    } else if (isAudio && (file.type.startsWith("audio/") || file.type === 'application/octet-stream')) {
      setSelectedFile(file);
    } else {
      fileInputRef.current.value = null;
      setSelectedFile(null);
      alert(isAudio ? "Please select a valid audio file." : "Please select a valid image file.");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <>
      <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display={"flex"} justifyContent={"space-between"}>
            <Text w={"max-content"}>{isAudio ? "Send a voice message" : "Send a photo"}</Text>
            <CloseButton onClick={props.onClose} />
          </ModalHeader>
          <ModalBody>
            <Input
              type="file"
              display={"none"}
              ref={fileInputRef}
              onChange={handleFileInputChange}
            />
            <Box display={"flex"} justifyContent={"space-between"}>
              <Flex>
                <Button mr={3} onClick={handleFileUpload}>
                  <Text>{isAudio ? "Choose audio" : "Choose a photo"}</Text>
                </Button>
                <Button variant="ghost" onClick={() => { setIsAudio(!isAudio); setSelectedFile(null); }} mr={2}>
                  {isAudio ? "Image" : "Voice"}
                </Button>
                {selectedFile && (
                  <Box
                    display={"flex"}
                    alignItems={"center"}
                    justifyContent={"space-between"}
                  >
                    <Text>
                      {selectedFile.name.length > 10
                        ? selectedFile.name.substring(0, 10) + "..."
                        : selectedFile.name}
                    </Text>
                    <CloseButton onClick={removeFile} ml={2} />
                  </Box>
                )}
              </Flex>
              <Button
                onClick={(e) => {
                  props.handleSendMessage(e, message, selectedFile, isAudio);
                  props.onClose();
                }}
                isDisabled={!selectedFile}
                size={"md"}
              >
                send
                <ArrowForwardIcon />
              </Button>
            </Box>
            <Input
              type="text"
              placeholder="Add a message..."
              mt={3}
              onChange={(e) => {
                setmessage(e.target.value);
              }}
            ></Input>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FileUploadModal;
