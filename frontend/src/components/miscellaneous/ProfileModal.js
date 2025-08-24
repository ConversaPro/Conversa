import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabPanels,
  TabPanel,
  TabList,
  Tab,
  Button,
  Input,
  Stack,
  Text,
  Flex,
  IconButton,
  Image,
  Circle,
  Box,
  Switch,
  FormControl,
  FormLabel,
  HStack,
  Select,
  SimpleGrid,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, EditIcon } from "@chakra-ui/icons";
import chatContext from "../../context/chatContext";
import { useToast } from "@chakra-ui/react";

export const ProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const context = useContext(chatContext);
  const { hostName } = context;
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [showchangepassword, setshowchangepassword] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const toast = useToast();

  // Sync edited user whenever the base user changes
  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const uploadViaBackend = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${hostName}/message/upload`, {
      method: "POST",
      headers: { "auth-token": localStorage.getItem("token") },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return data.url || data.secure_url || data.path;
  };

  const handleSave = async () => {
    try {
      setUser(editedUser);
    } catch (error) {}

    context.setUser(editedUser);

    // send the updated user to the server

    try {
      const response = await fetch(`${hostName}/user/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
  body: JSON.stringify(editedUser),
      });

      const json = await response.json();

      if (response.status !== 200) {
        toast({
          title: "An error occurred.",
          description: json.error,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "User updated",
          description: "User updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setEditing(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  setActiveTabIndex(1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser({ ...editedUser, [name]: value });
  };

  // no-op hover handlers (legacy)

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader p={6} borderBottomWidth="1px" borderColor="gray.100">
          <Flex mt={3} justify="space-between" align="center">
            <Text fontSize="xl" fontWeight="bold">
              Profile
            </Text>
            <IconButton
              aria-label="Edit profile"
              icon={<EditIcon />}
              variant="ghost"
              colorScheme="purple"
              display={user._id !== context.user?._id ? "none" : "block"}
              onClick={handleEdit}
            />
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs isFitted variant="enclosed" index={activeTabIndex} onChange={setActiveTabIndex}>
            <TabList>
              <Tab>Info</Tab>
              <Tab>Edit</Tab>
              <Tab>Privacy</Tab>
              <Tab>Security</Tab>
              <Tab>Devices</Tab>
              <Tab>Media</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Stack spacing={3}>
                  {user?.coverPhoto && (
                    <Image src={user.coverPhoto} alt="cover" borderRadius="md" maxH="140px" objectFit="cover" />
                  )}
                  <Image
                    borderRadius="full"
                    boxSize={{ base: "100px", md: "150px" }}
                    src={user?.profilePic || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || 'U')}
                    alt="avatar"
                    mx="auto"
                  />
                  <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                    {user.name}
                  </Text>
                  {user.username && <Text textAlign="center" color="gray.400">@{user.username}</Text>}
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                    <Box><Text color="gray.400">About</Text><Text>{user.about || "—"}</Text></Box>
                    <Box><Text color="gray.400">Email</Text><Text>{user.email}</Text></Box>
                    <Box><Text color="gray.400">Phone</Text><Text>{user.phone || "—"}</Text></Box>
                    <Box><Text color="gray.400">Last seen</Text><Text>{new Date(user.lastSeen).toLocaleString()}</Text></Box>
                  </SimpleGrid>
                </Stack>
              </TabPanel>
              <TabPanel>
                <Stack spacing={4}>
                  <HStack>
                    <Circle cursor="pointer" position="relative" overflow="hidden">
                      <Image
                        borderRadius="full"
                        boxSize={{ base: "80px", md: "120px" }}
                        src={editedUser?.profilePic || user?.profilePic}
                        alt="profile-pic"
                        mx="auto"
                      />
                    </Circle>
                    <Button as="label" leftIcon={<EditIcon />}>Change avatar
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = await uploadViaBackend(file);
                          setEditedUser((u) => ({ ...u, profilePic: url }));
                        }}
                      />
                    </Button>
                    <Button as="label" variant="outline" leftIcon={<EditIcon />}>Change cover
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = await uploadViaBackend(file);
                          setEditedUser((u) => ({ ...u, coverPhoto: url }));
                        }}
                      />
                    </Button>
                  </HStack>
                  <Input name="name" placeholder="Name" value={editedUser.name || ""} onChange={handleChange} />
                  <Input name="username" placeholder="Username" value={editedUser.username || ""} onChange={handleChange} />
                  <Input name="about" placeholder="About" value={editedUser.about || ""} onChange={handleChange} />
                  <Input name="phone" placeholder="Phone" value={editedUser.phone || ""} onChange={handleChange} />
                  <Button onClick={() => setshowchangepassword(!showchangepassword)}>
                    Change password {showchangepassword ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </Button>
                  {showchangepassword && (
                    <Box>
                      <Input name="oldpassword" placeholder="Old password" type="password" onChange={handleChange} mb={2} />
                      <Input name="newpassword" placeholder="New password" type="password" onChange={handleChange} />
                    </Box>
                  )}
                  <FormControl>
                    <FormLabel>Theme</FormLabel>
                    <Select name="themePreference" value={editedUser.themePreference || "system"} onChange={handleChange}>
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </Select>
                  </FormControl>
                </Stack>
              </TabPanel>
              <TabPanel>
                <Stack spacing={3}>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Show last seen</FormLabel>
                    <Switch
                      isChecked={!!editedUser?.privacy?.showLastSeen}
                      onChange={(e) => setEditedUser((u) => ({ ...u, privacy: { ...(u.privacy || {}), showLastSeen: e.target.checked } }))}
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Show profile photo</FormLabel>
                    <Switch
                      isChecked={!!editedUser?.privacy?.showProfilePhoto}
                      onChange={(e) => setEditedUser((u) => ({ ...u, privacy: { ...(u.privacy || {}), showProfilePhoto: e.target.checked } }))}
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Show About</FormLabel>
                    <Switch
                      isChecked={!!editedUser?.privacy?.showAbout}
                      onChange={(e) => setEditedUser((u) => ({ ...u, privacy: { ...(u.privacy || {}), showAbout: e.target.checked } }))}
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Read receipts</FormLabel>
                    <Switch
                      isChecked={!!editedUser?.privacy?.readReceipts}
                      onChange={(e) => setEditedUser((u) => ({ ...u, privacy: { ...(u.privacy || {}), readReceipts: e.target.checked } }))}
                    />
                  </FormControl>
                </Stack>
              </TabPanel>
              <TabPanel>
                <Stack spacing={3}>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Two-factor authentication</FormLabel>
                    <Switch
                      isChecked={!!editedUser?.twoFactorEnabled}
                      onChange={(e) => setEditedUser((u) => ({ ...u, twoFactorEnabled: e.target.checked }))}
                    />
                  </FormControl>
                  <Text fontSize="sm" color="gray.400">For demo, toggling is client-only; backend accepts persistence in user update.</Text>
                </Stack>
              </TabPanel>
              <TabPanel>
                <Text fontSize="sm" color="gray.400">Active sessions device list coming soon.</Text>
              </TabPanel>
              <TabPanel>
                <Text fontSize="sm" color="gray.400">Shared media gallery coming soon.</Text>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          {editing ? (
            <Button colorScheme="purple" mr={3} onClick={handleSave}>
              Save
            </Button>
          ) : (
            <Button
              colorScheme="purple"
              display={user._id !== context.user?._id ? "none" : "block"}
              mr={3}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
          {editing && <Button onClick={() => setEditing(false)}>Back</Button>}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
