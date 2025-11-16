import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Faqs from "./pages/Faqs";
import Contacts from "./pages/Contacts";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/faqs" element={<Faqs />} />
      <Route path="/contacts" element={<Contacts />} />
    </Routes>
  );
}
