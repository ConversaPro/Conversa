import React from "react";
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Image } from "@chakra-ui/react";

const ImageLightbox = ({ src, isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" motionPreset="scale">
      <ModalOverlay />
      <ModalContent bg="transparent" boxShadow="none">
        <ModalCloseButton color="white" />
        <ModalBody display="flex" justifyContent="center" alignItems="center" p={0}>
          <Image src={src} maxH="80vh" maxW="90vw" objectFit="contain" borderRadius="lg" />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ImageLightbox;
