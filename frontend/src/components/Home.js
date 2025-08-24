import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Flex,
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
} from "@chakra-ui/react";
import Auth from "./Authentication/Auth";
import { useContext, useEffect } from "react";
import chatContext from "../context/chatContext";
import { useNavigate } from "react-router-dom";

const Home = () => {
  // context
  const context = useContext(chatContext);
  const { isAuthenticated } = context;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [index, setindex] = useState();
  const navigator = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigator("/dashboard");
    }
  });

  const handleloginopen = () => {
    setindex(0);
    onOpen();
  };

  const handlesignupopen = () => {
    setindex(1);
    onOpen();
  };

  return (
    <Box h="100vh" position="relative">
      <Box
        position="absolute"
        inset={0}
        bgGradient={useColorModeValue(
          "radial(900px 500px at 0% 0%, brand.100 0%, transparent 50%), linear(to-b, white, brand.50)",
          "radial(1000px 600px at 10% 0%, rgba(79,70,229,.25) 0%, rgba(0,0,0,0) 40%), linear(to-b, #0b1020, #0e1325)"
        )}
      />
      <Flex direction="column" align="center" justify="center" minH="85vh" px={4} position="relative">
        <Box as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}
          textAlign="center" p={8} layerStyle="card">
          <Text as={motion.h1} initial={{ scale: .95 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            fontSize={{ base: "5xl", md: "7xl" }} fontWeight="bold" bgGradient="linear(to-r, brand.600, accent.500)" bgClip="text">
            Conversa
          </Text>
          <Text fontSize={{ base: "md", md: "xl" }} fontWeight="semibold" mb={6} color={useColorModeValue("gray.600", "gray.300")}>
            Online Chatting App
          </Text>
          <Button mr={3} onClick={handleloginopen} variant="gradient">
            Login
          </Button>
          <Button variant="outline" onClick={handlesignupopen}>
            Sign Up
          </Button>
        </Box>
      </Flex>
      {/* Copyright */}
      <Flex position="absolute" bottom={4} w="100%" justify="center">
        <Text fontSize="sm" color="gray.500">
          &copy; 2024 Conversa. All rights reserved.
        </Text>
      </Flex>
      {/* <Auth /> */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        colorScheme="red"
        size={{ base: "md", md: "xl" }}
      >
        <ModalOverlay />
        <ModalContent w={{ base: "95vw" }}>
          <ModalHeader></ModalHeader>
          <ModalBody>
            <Auth tabindex={index} />
          </ModalBody>
          <ModalCloseButton />
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Home;
