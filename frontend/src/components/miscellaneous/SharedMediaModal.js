import React from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, SimpleGrid, Image } from '@chakra-ui/react';

const SharedMediaModal = ({ isOpen, onClose, items = [] }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Shared Media</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            {items.map((src, idx) => (
              <Image key={idx} src={src} borderRadius="md" objectFit="cover" />
            ))}
          </SimpleGrid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SharedMediaModal;
