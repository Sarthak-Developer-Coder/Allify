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
  Button,
  Input,
  Stack,
  Text,
  Flex,
  IconButton,
  Image,
  Circle,
  Box,
  HStack,
  VStack,
  Checkbox,
  Textarea,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, EditIcon } from "@chakra-ui/icons";
import chatContext from "../../context/chatContext";
import { useToast } from "@chakra-ui/react";

export const ProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const context = useContext(chatContext);
  const { hostName } = context;
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [showEditIcon, setShowEditIcon] = useState(false);
  const [showchangepassword, setshowchangepassword] = useState(false);
  const fileInputRef = React.useRef(null);

  const toast = useToast();

  // if user is not defined then wait for the user to be fetched
  useEffect(() => {
    setEditedUser(user);
  }, [user]);

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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser({ ...editedUser, [name]: value });
  };

  const handleMouseOver = () => {
    setShowEditIcon(true);
  };

  const handleMouseOut = () => {
    setShowEditIcon(false);
  };

  const hdrs = () => ({
    "Content-Type": "application/json",
    "auth-token": localStorage.getItem("token"),
  });

  const addExp = async (payload) => {
    await fetch(`${hostName}/user/experience`, { method: 'POST', headers: hdrs(), body: JSON.stringify(payload) });
  };
  const updateExp = async (id, payload) => {
    await fetch(`${hostName}/user/experience/${id}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(payload) });
  };
  const deleteExp = async (id) => {
    await fetch(`${hostName}/user/experience/${id}`, { method: 'DELETE', headers: hdrs() });
  };
  const addEdu = async (payload) => {
    await fetch(`${hostName}/user/education`, { method: 'POST', headers: hdrs(), body: JSON.stringify(payload) });
  };
  const updateEdu = async (id, payload) => {
    await fetch(`${hostName}/user/education/${id}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(payload) });
  };
  const deleteEdu = async (id) => {
    await fetch(`${hostName}/user/education/${id}`, { method: 'DELETE', headers: hdrs() });
  };
  const addSkill = async (skill) => {
    await fetch(`${hostName}/user/skills`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ skill }) });
  };
  const removeSkill = async (skill) => {
    await fetch(`${hostName}/user/skills/${encodeURIComponent(skill)}`, { method: 'DELETE', headers: hdrs() });
  };
  const setOpenFlags = async (openToWork, openToHire) => {
    await fetch(`${hostName}/user/open`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ openToWork, openToHire }) });
  };

  const onPickAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${hostName}/user/profile-pic`, {
        method: 'POST',
        headers: { 'auth-token': localStorage.getItem('token') },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      const updated = { ...editedUser, profilePic: json.profilePic };
      setEditedUser(updated);
      setUser && setUser(updated);
      context.setUser(updated);
      toast({ title: 'Profile picture updated', status: 'success', duration: 2000 });
    } catch (err) {
      console.error(err);
      toast({ title: 'Avatar upload failed', description: String(err.message || err), status: 'error', duration: 3000 });
    } finally {
      // reset input to allow same file reselect
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
          <Tabs
            isFitted
            variant="enclosed"
            index={editing ? 1 : 0}
            onChange={(index) => setEditing(index === 1)}
          >
            <TabPanels>
              <TabPanel>
                <Stack spacing={2}>
                  <Image
                    borderRadius="full"
                    boxSize={{ base: "100px", md: "150px" }}
                    src={user.profilePic}
                    alt="Dan Abramov"
                    mx="auto"
                  />
                  <Text fontSize="xx-large" fontWeight="bold">
                    {user.name}
                  </Text>
                  <Text fontSize="md">About: {user.about}</Text>
                  <Text fontSize="md">email: {user.email}</Text>
                  {user.headline && <Text fontSize="md">Headline: {user.headline}</Text>}
                  {user.location && <Text fontSize="md">Location: {user.location}</Text>}
                  <HStack mt={2}>
                    {user.openToWork !== undefined && (
                      <Text fontSize="sm">Open to work: {user.openToWork ? 'Yes' : 'No'}</Text>
                    )}
                    {user.openToHire !== undefined && (
                      <Text fontSize="sm">Open to hire: {user.openToHire ? 'Yes' : 'No'}</Text>
                    )}
                  </HStack>
                  <Box mt={3}>
                    <Text fontWeight="bold">Experience</Text>
                    <VStack align='stretch' spacing={2}>
                      {(user.experience || []).map((e) => (
                        <Box key={e._id} borderWidth='1px' borderRadius='md' p={2}>
                          <Text fontWeight='semibold'>{e.title} @ {e.company}</Text>
                          <Text fontSize='sm' color='gray.500'>{e.description}</Text>
                          {editing && (
                            <HStack mt={2}>
                              <Button size='xs' onClick={async () => { await updateExp(e._id, { description: (e.description || '') + '' }); toast({ title: 'Experience updated', status: 'success', duration: 1200 }); }}>Quick update</Button>
                              <Button size='xs' variant='outline' onClick={async () => { await deleteExp(e._id); toast({ title: 'Experience deleted', status: 'info', duration: 1200 }); }}>Delete</Button>
                            </HStack>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                  <Box mt={3}>
                    <Text fontWeight="bold">Education</Text>
                    <VStack align='stretch' spacing={2}>
                      {(user.education || []).map((e) => (
                        <Box key={e._id} borderWidth='1px' borderRadius='md' p={2}>
                          <Text fontWeight='semibold'>{e.school} • {e.degree} {e.field ? `(${e.field})` : ''}</Text>
                          <Text fontSize='sm' color='gray.500'>{e.description}</Text>
                          {editing && (
                            <HStack mt={2}>
                              <Button size='xs' onClick={async () => { await updateEdu(e._id, { description: (e.description || '') + '' }); toast({ title: 'Education updated', status: 'success', duration: 1200 }); }}>Quick update</Button>
                              <Button size='xs' variant='outline' onClick={async () => { await deleteEdu(e._id); toast({ title: 'Education deleted', status: 'info', duration: 1200 }); }}>Delete</Button>
                            </HStack>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                  <Box mt={3}>
                    <Text fontWeight="bold">Skills</Text>
                    <HStack wrap='wrap'>
                      {(user.skills || []).map((s) => (
                        <HStack key={s} spacing={2} borderWidth='1px' borderRadius='full' px={2} py={1}>
                          <Text fontSize='sm'>{s}</Text>
                          {user._id !== context.user?._id && (
                            <Button size='xs' variant='ghost' onClick={async () => {
                              await fetch(`${hostName}/user/${user._id}/skills/${encodeURIComponent(s)}/endorse`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } });
                              toast({ title: `Endorsed ${s}`, status: 'success', duration: 1200 });
                            }}>Endorse</Button>
                          )}
                        </HStack>
                      ))}
                    </HStack>
                  </Box>
                </Stack>
              </TabPanel>
              <TabPanel>
                <Stack spacing={4}>
                  <Circle
                    cursor="pointer"
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={onPickAvatar}
                  >
                    <Image
                      borderRadius="full"
                      boxSize={{ base: "100px", md: "150px" }}
                      src={editedUser.profilePic || user.profilePic}
                      alt="profile-pic"
                      mx="auto"
                    />
                    {showEditIcon && (
                      <Box
                        textAlign={"center"}
                        position="absolute"
                        top="auto"
                        left="auto"
                      >
                        <IconButton
                          aria-label="Edit profile picture"
                          icon={<EditIcon />}
                        ></IconButton>
                        <Text fontSize={"xx-small"}>click to edit profile</Text>
                      </Box>
                    )}
                  </Circle>
                  <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={onAvatarFileChange} />
                  <Input
                    name="name"
                    placeholder="Name"
                    value={editedUser.name}
                    onChange={handleChange}
                  />
                  <Input
                    name="about"
                    placeholder="about"
                    value={editedUser.about}
                    onChange={handleChange}
                  />
                  <Input
                    name="headline"
                    placeholder="headline"
                    value={editedUser.headline || ''}
                    onChange={handleChange}
                  />
                  <Input
                    name="location"
                    placeholder="location"
                    value={editedUser.location || ''}
                    onChange={handleChange}
                  />
                  <HStack>
                    <Checkbox isChecked={!!editedUser.openToWork} onChange={(e) => setEditedUser({ ...editedUser, openToWork: e.target.checked })}>Open to work</Checkbox>
                    <Checkbox isChecked={!!editedUser.openToHire} onChange={(e) => setEditedUser({ ...editedUser, openToHire: e.target.checked })}>Open to hire</Checkbox>
                    <Button size='sm' onClick={() => setOpenFlags(!!editedUser.openToWork, !!editedUser.openToHire)}>Update availability</Button>
                  </HStack>
                  <Box borderWidth='1px' borderRadius='md' p={3}>
                    <Text fontWeight='bold' mb={2}>Add experience</Text>
                    <Input placeholder='Title' id='exp-title' mb={2} />
                    <Input placeholder='Company' id='exp-company' mb={2} />
                    <Textarea placeholder='Description' id='exp-desc' mb={2} />
                    <Button size='sm' onClick={async () => {
                      const title = document.getElementById('exp-title').value;
                      const company = document.getElementById('exp-company').value;
                      const description = document.getElementById('exp-desc').value;
                      await addExp({ title, company, description });
                      toast({ title: 'Experience added', status: 'success', duration: 1500 });
                    }}>Add</Button>
                  </Box>
                  <Box borderWidth='1px' borderRadius='md' p={3}>
                    <Text fontWeight='bold' mb={2}>Add education</Text>
                    <Input placeholder='School' id='edu-school' mb={2} />
                    <Input placeholder='Degree' id='edu-degree' mb={2} />
                    <Input placeholder='Field' id='edu-field' mb={2} />
                    <Textarea placeholder='Description' id='edu-desc' mb={2} />
                    <Button size='sm' onClick={async () => {
                      const school = document.getElementById('edu-school').value;
                      const degree = document.getElementById('edu-degree').value;
                      const field = document.getElementById('edu-field').value;
                      const description = document.getElementById('edu-desc').value;
                      await addEdu({ school, degree, field, description });
                      toast({ title: 'Education added', status: 'success', duration: 1500 });
                    }}>Add</Button>
                  </Box>
                  <Box borderWidth='1px' borderRadius='md' p={3}>
                    <Text fontWeight='bold' mb={2}>Skills</Text>
                    <HStack>
                      <Input placeholder='Add a skill' id='skill-input' />
                      <Button size='sm' onClick={async () => {
                        const val = document.getElementById('skill-input').value.trim();
                        if (!val) return;
                        await addSkill(val);
                        toast({ title: 'Skill added', status: 'success', duration: 1500 });
                      }}>Add</Button>
                    </HStack>
                    <HStack wrap='wrap' mt={2}>
                      {(user.skills || []).map((s) => (
                        <Button key={s} size='xs' variant='outline' onClick={async () => { await removeSkill(s); toast({ title: 'Skill removed', status: 'info', duration: 1500 }); }}>{s} ✕</Button>
                      ))}
                    </HStack>
                  </Box>
                  <Button
                    onClick={() => setshowchangepassword(!showchangepassword)}
                  >
                    change my password{" "}
                    {showchangepassword ? (
                      <ChevronUpIcon />
                    ) : (
                      <ChevronDownIcon />
                    )}
                  </Button>
                  {showchangepassword && (
                    <Box>
                      <Input
                        name="oldpassword"
                        placeholder="old password"
                        type="password"
                        onChange={handleChange}
                        mb={2}
                      />
                      <Input
                        name="newpassword"
                        placeholder="new password"
                        type="password"
                        onChange={handleChange}
                      />
                    </Box>
                  )}
                </Stack>
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
