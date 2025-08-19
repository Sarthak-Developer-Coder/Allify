import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  HStack,
  VStack,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import MotionButton from './ui/MotionButton';
import LampContainer from './ui/LampEffect';
import { FiLock, FiZap, FiPhoneCall } from "react-icons/fi";
import Auth from "./Authentication/Auth";
import { useContext, useEffect } from "react";
import chatContext from "../context/chatContext";
import { Link, useNavigate } from "react-router-dom";

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

  const accent = useColorModeValue("brand.500", "brand.400");
  const sub = useColorModeValue("gray.600", "gray.300");

  return (
    <Box h="max-content" verticalAlign="middle">
      {/* Hero */}
      <LampContainer height="82vh">
        <Flex direction="column" align="center" justify="center" minH="82vh" px={{ base: 4, md: 8 }}>
          <VStack spacing={6} textAlign="center" maxW="5xl">
            <Box as={motion.h1}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Text fontSize={{ base: "5xl", md: "7xl" }} fontWeight="extrabold" lineHeight="1.1"
                bgGradient="linear(to-r, brand.400, cyan.300)" bgClip="text">
                Allify
              </Text>
            </Box>
            <Text color={sub} fontSize={{ base: "lg", md: "2xl" }}>
              Where chatting, fun, and friends come alive
            </Text>

            <HStack spacing={4} as={motion.div}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MotionButton size="lg" variant="outline" onClick={handleloginopen}>
                Login
              </MotionButton>
              <MotionButton size="lg" onClick={handlesignupopen}>
                Get started free
              </MotionButton>
            </HStack>

            {/* Quick features */}
            <HStack spacing={{ base: 3, md: 6 }} pt={4} color={sub} wrap="wrap" justify="center">
              <HStack>
                <Icon as={FiZap} color={accent} />
                <Text>Realtime messaging</Text>
              </HStack>
              <HStack>
                <Icon as={FiPhoneCall} color={accent} />
                <Text>Voice notes support</Text>
              </HStack>
              <HStack>
                <Icon as={FiLock} color={accent} />
                <Text>JWT-secured</Text>
              </HStack>
            </HStack>
          </VStack>
        </Flex>
      </LampContainer>
      {/* Copyright */}
      <Box
        fontSize="sm"
        position={"fixed"}
        bottom={2}
        left={"calc(50% - 155px)"}
        mt={4}
        textAlign="center"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
  <Text as="span">&copy; 2025 Allify. All rights reserved.</Text>
        <Link to="https://github.com/Sarthak-Developer-Coder" target="_blank">
          <Text as="u" color="purple.500" ml={1} display="inline">
            Sarthak Nag
          </Text>
        </Link>
      </Box>
      {/* <Auth /> */}
      <Modal isOpen={isOpen} onClose={onClose} size={{ base: "md", md: "xl" }}>
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent w={{ base: "95vw" }} bgGradient="linear(to-b, blackAlpha.800, blackAlpha.700)" backdropFilter="blur(10px)" borderWidth="1px" borderColor="whiteAlpha.200">
          <ModalHeader pt={6}></ModalHeader>
          <ModalBody pb={8}>
            <Auth tabindex={index} />
          </ModalBody>
          <ModalCloseButton />
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Home;
