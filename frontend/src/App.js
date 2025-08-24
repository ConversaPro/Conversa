import "./App.css";
import Navbar from "./components/Navbar/Navbar";
import { useContext } from "react";
import chatContext from "./context/chatContext";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

function App(props) {
  const context = useContext(chatContext);

  return (
    <div className="App">
      <Navbar context={context} />
      <AnimatePresence mode="wait">
        <motion.div
          key={useLocation().pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
