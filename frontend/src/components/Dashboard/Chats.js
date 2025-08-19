import React, { useState } from "react";
import { Tabs, TabPanel, TabPanels, TabList, Tab } from "@chakra-ui/react";
import MyChatList from "./MyChatList";
import NewChats from "./NewChats";
import Feed from "./Feed";
import Reels from "./Reels";
import Games from "./Games";
import Jobs from "./Jobs";
import MyNetwork from "./MyNetwork";

const Chats = () => {
  const [activeTab, setactiveTab] = useState(0);

  return (
    <>
      <Tabs
        isFitted
        variant="enclosed"
        w={{ base: "95vw", md: "100%" }}
        index={activeTab}
        colorScheme="purple"
        h={"100%"}
      >
        <TabList mb={1} flexWrap="wrap">
          <Tab onClick={() => setactiveTab(0)}>Chats</Tab>
          <Tab onClick={() => setactiveTab(1)}>New</Tab>
        </TabList>
        <TabList mb={2} flexWrap="wrap">
          <Tab onClick={() => setactiveTab(2)}>Explore</Tab>
          <Tab onClick={() => setactiveTab(3)}>Reels</Tab>
          <Tab onClick={() => setactiveTab(4)}>Network</Tab>
          <Tab onClick={() => setactiveTab(5)}>Jobs</Tab>
          <Tab onClick={() => setactiveTab(6)}>Games</Tab>
        </TabList>
        <TabPanels>
          <TabPanel
            py={1}
            mt={{ base: 2, md: 0 }}
            px={2}
            w={{ base: "96vw", md: "29vw" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
            h={{
              base: "85vh",
              md: "88.5vh",
            }}
          >
            <MyChatList setactiveTab={setactiveTab} />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w={{ base: "96vw", md: "29vw" }}
            // h={{ base: "80vh", md: "88.5vh" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <NewChats setactiveTab={setactiveTab} />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w={{ base: "96vw", md: "29vw" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <Feed />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w={{ base: "96vw", md: "29vw" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <Reels />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w={{ base: "96vw", md: "29vw" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <MyNetwork />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w={{ base: "96vw", md: "29vw" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <Jobs />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w={{ base: "96vw", md: "29vw" }}
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <Games />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
};

export default Chats;
