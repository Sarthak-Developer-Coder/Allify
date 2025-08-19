import "./App.css";
import { useColorMode } from "@chakra-ui/react";
import Navbar from "./components/Navbar/Navbar";
import { useContext } from "react";
import chatContext from "./context/chatContext";
import AnimeBackground from "./components/miscellaneous/AnimeBackground";
import AnimeImageBackground from "./components/miscellaneous/AnimeImageBackground";

function App(props) {
  const { toggleColorMode } = useColorMode();
  const context = useContext(chatContext);

  return (
    <div className="App" style={{ position: 'relative' }}>
  <AnimeBackground />
  <AnimeImageBackground />
      <Navbar toggleColorMode={toggleColorMode} context={context} />
    </div>
  );
}

export default App;
